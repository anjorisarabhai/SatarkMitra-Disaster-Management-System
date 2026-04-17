# -*- coding: utf-8 -*-

from fastapi import FastAPI, HTTPException, Query, Header, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from fastapi import FastAPI, Form
from utils.sentiment import analyze_report
from sms import send_alert_to_all
from db.mongo import (
    users_collection,
    alerts_collection,
    subscribers_collection,
    citizen_reports,
    db  # 🆕 Import db for new collections
)

import os
import requests
import numpy as np
import pandas as pd
import joblib
import tensorflow as tf
from dotenv import load_dotenv
from datetime import datetime, timedelta
import re
from typing import Optional, Dict, List, Tuple
import secrets
from functools import wraps
import time
from collections import defaultdict
import jwt  # 🆕 For user authentication

from db.models import CitizenReport
from passlib.context import CryptContext
from pydantic import BaseModel

# =====================================================
# GROQ AI INTEGRATION (FREE - LLAMA 3.3)
# =====================================================
from groq import Groq

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 🆕 JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "satarkmitra-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

def hash_password(password: str):
    password = password[:72]
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# 🆕 JWT Functions
def create_jwt_token(data: dict) -> str:
    """Create JWT token with expiry"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> Optional[dict]:
    """Decode and verify JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

# =====================================================
# CONFIGURATION
# =====================================================

load_dotenv()

app = FastAPI(
    title="SatarkMitra AI Backend",
    version="2.1.0"  # 🚀 Version bump with fixes
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
TOKEN_EXPIRY_HOURS = 1

if GROQ_API_KEY:
    groq_client = Groq(api_key=GROQ_API_KEY)
    print("✅ Groq AI configured successfully (Llama 3.3 - FREE)")
else:
    groq_client = None
    print("⚠️ Groq API key not found - chatbot will use offline mode")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "ml_models")

# =====================================================
# 🆕 PERSISTENT CHAT MEMORY COLLECTION (MongoDB)
# =====================================================

# Initialize chat history collection
chat_history_collection = db["chat_history"]

# Create TTL index for auto-cleanup (7 days)
try:
    chat_history_collection.create_index("updated_at", expireAfterSeconds=7 * 24 * 60 * 60)
except Exception as e:
    print(f"⚠️ Could not create TTL index: {e}")

MAX_HISTORY_LENGTH = 10

def get_chat_history_from_db(user_id: str) -> list:
    """Get chat history from MongoDB"""
    try:
        doc = chat_history_collection.find_one({"user_id": user_id})
        if doc:
            return doc.get("history", [])
        return []
    except Exception as e:
        print(f"Error fetching chat history: {e}")
        return []

def save_chat_history_to_db(user_id: str, history: list):
    """Save chat history to MongoDB"""
    try:
        chat_history_collection.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "history": history,
                    "updated_at": datetime.utcnow()
                },
                "$setOnInsert": {
                    "created_at": datetime.utcnow()
                }
            },
            upsert=True
        )
    except Exception as e:
        print(f"Error saving chat history: {e}")

def add_to_chat_history(user_id: str, role: str, content: str):
    """Add message to persistent chat history"""
    try:
        history = get_chat_history_from_db(user_id)
        history.append({"role": role, "content": content})
        
        if len(history) > MAX_HISTORY_LENGTH:
            history = history[-MAX_HISTORY_LENGTH:]
        
        save_chat_history_to_db(user_id, history)
    except Exception as e:
        print(f"Error adding to chat history: {e}")

def clear_chat_history(user_id: str):
    """Clear conversation history from MongoDB"""
    try:
        chat_history_collection.delete_one({"user_id": user_id})
    except Exception as e:
        print(f"Error clearing chat history: {e}")

# =====================================================
# 🔐 RATE LIMITING STORAGE
# =====================================================

ACTIVE_ADMIN_SESSIONS: Dict[str, dict] = {}
RATE_LIMIT_STORAGE: Dict[str, list] = defaultdict(list)
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX_REQUESTS = 30
CHAT_RATE_LIMIT_MAX = 20  # 🆕 Stricter limit for chat endpoint

def rate_limiter(request: Request, endpoint: str = "default", max_requests: int = None):
    """Rate limiting with configurable max requests"""
    if max_requests is None:
        max_requests = RATE_LIMIT_MAX_REQUESTS
    
    client_ip = request.client.host
    current_time = time.time()
    
    RATE_LIMIT_STORAGE[client_ip] = [
        (ts, ep) for ts, ep in RATE_LIMIT_STORAGE[client_ip]
        if current_time - ts < RATE_LIMIT_WINDOW
    ]
    
    if len(RATE_LIMIT_STORAGE[client_ip]) >= max_requests:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Please try again in {RATE_LIMIT_WINDOW} seconds.",
            headers={"Retry-After": str(RATE_LIMIT_WINDOW)}
        )
    
    RATE_LIMIT_STORAGE[client_ip].append((current_time, endpoint))

def cleanup_expired_tokens():
    current_time = datetime.utcnow()
    expired_tokens = []
    
    for token, data in ACTIVE_ADMIN_SESSIONS.items():
        created_at = data.get("created_at")
        if created_at:
            expiry_time = created_at + timedelta(hours=TOKEN_EXPIRY_HOURS)
            if current_time > expiry_time:
                expired_tokens.append(token)
    
    for token in expired_tokens:
        del ACTIVE_ADMIN_SESSIONS[token]
        print(f"🗑️ Expired token removed: {token[:10]}...")
    
    return len(expired_tokens)

def verify_admin_token(admin_email: str, admin_token: str) -> bool:
    cleanup_expired_tokens()
    
    token_data = ACTIVE_ADMIN_SESSIONS.get(admin_token)
    if not token_data:
        return False
    
    if token_data.get("email") != admin_email:
        return False
    
    created_at = token_data.get("created_at")
    if created_at:
        expiry_time = created_at + timedelta(hours=TOKEN_EXPIRY_HOURS)
        if datetime.utcnow() > expiry_time:
            del ACTIVE_ADMIN_SESSIONS[admin_token]
            return False
    
    token_data["last_used"] = datetime.utcnow()
    return secrets.compare_digest(token_data["email"], admin_email)

# =====================================================
# SAFE MODEL LOADING
# =====================================================

scaler_dl = None
gru_model = None
tcn_model = None
delhi_model = None

def safe_load_joblib(path, name):
    try:
        model = joblib.load(path)
        print(f"Loaded {name}")
        return model
    except Exception as e:
        print(f"Failed loading {name}: {e}")
        return None

def safe_load_tf(path, name):
    try:
        model = tf.keras.models.load_model(path, compile=False)
        print(f"Loaded {name}")
        return model
    except Exception as e:
        print(f"Failed loading {name}: {e}")
        return None

scaler_dl = safe_load_joblib(os.path.join(MODEL_DIR, "scaler_dl.pkl"), "Scaler")
gru_model = safe_load_tf(os.path.join(MODEL_DIR, "gru_standalone_model.h5"), "GRU Model")
tcn_model = safe_load_tf(os.path.join(MODEL_DIR, "tcn_standalone_model.h5"), "TCN Model")
delhi_model = safe_load_joblib(os.path.join(MODEL_DIR, "drainage_risk_model.pkl"), "Delhi Drainage Model")

# =====================================================
# GENERATE DELHI MICRO HOTSPOTS
# =====================================================

def generate_delhi_hotspots():
    lat_min, lat_max = 28.50, 28.85
    lon_min, lon_max = 77.00, 77.30
    step = 0.03
    hotspots = []

    for lat in np.arange(lat_min, lat_max, step):
        for lon in np.arange(lon_min, lon_max, step):
            if lon < 77.00:
                continue
            hotspots.append({
                "name": f"Delhi_Cell_{round(lat,3)}_{round(lon,3)}",
                "lat": float(lat),
                "lon": float(lon),
                "elevation": 210,
                "drainage": "MODERATE"
            })
    return hotspots

DELHI_ZONES = generate_delhi_hotspots()

# =====================================================
# 🆕 HELPER: Get Delhi Zones Data (FIXED)
# =====================================================

def get_delhi_zones_data(limit: int = 30) -> list:
    """Get Delhi risk zone data - FIXED: Separate function, not calling route"""
    if delhi_model is None:
        return []

    results = []

    def status(s):
        if s >= 30:
            return "CRITICAL"
        if s >= 20:
            return "HIGH"
        if s >= 10:
            return "MODERATE"
        return "LOW"

    for z in DELHI_ZONES[:limit]:
        rainfall = np.random.uniform(40, 90)
        runoff = np.random.uniform(0.8, 1.5)

        X = pd.DataFrame([{
            "river_water_area_sqkm": 6.5,
            "upstream_runoff_mm": runoff,
            "rainfall_mm": rainfall,
            "ggn_runoff_mm": runoff * 0.8,
            "ggn_rainfall_mm": rainfall * 0.9,
            "month": 7
        }])

        score = float(delhi_model.predict(X)[0])

        results.append({
            "zone_name": z["name"],
            "latitude": z["lat"],
            "longitude": z["lon"],
            "risk_score": round(score, 2),
            "risk_status": status(score)
        })

    return results

# =====================================================
# IMPROVED SCAM DETECTION ENGINE
# =====================================================

SCAM_PATTERNS = [
    r"upi", r"donate", r"donation", r"send money", r"transfer",
    r"account number", r"bank", r"fund", r"http[s]?://",
    r"bit\.ly", r"paytm", r"gpay",
]

def honeypot_verify_report(text: str):
    text = text.lower()
    score = 0
    for pattern in SCAM_PATTERNS:
        if re.search(pattern, text):
            score += 1
    if score >= 1:
        return "suspicious", score
    return "trusted", score

# =====================================================
# AUTH HELPER FUNCTIONS
# =====================================================

def authenticate_admin(email: str, password: str, request: Request = None):
    if request:
        rate_limiter(request, "admin_login")
    
    admin_user = users_collection.find_one({"email": email})
    
    if not admin_user:
        return None
    
    if admin_user.get("role") != "admin":
        return None
    
    if not verify_password(password, admin_user.get("password", "")):
        return None
    
    token = secrets.token_urlsafe(32)
    current_time = datetime.utcnow()
    
    ACTIVE_ADMIN_SESSIONS[token] = {
        "email": email,
        "created_at": current_time,
        "last_used": current_time,
        "expires_at": current_time + timedelta(hours=TOKEN_EXPIRY_HOURS)
    }
    
    cleanup_expired_tokens()
    
    return {
        "token": token,
        "email": email,
        "name": admin_user.get("name"),
        "role": "admin",
        "expires_in": f"{TOKEN_EXPIRY_HOURS}h"
    }

def verify_admin_session(admin_email: str, admin_token: str, request: Request = None):
    if request:
        rate_limiter(request, "admin_verify")
    
    if not verify_admin_token(admin_email, admin_token):
        raise HTTPException(status_code=401, detail="Invalid or expired admin session")
    
    admin_user = users_collection.find_one({"email": admin_email})
    if not admin_user or admin_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    return admin_user

# =====================================================
# 🚀 CHATBOT SCHEMAS (WITH JWT AUTH)
# =====================================================

class ChatRequest(BaseModel):
    message: str
    language: str = "en"
    role: Optional[str] = "citizen"
    location: Optional[dict] = None
    user_id: Optional[str] = "default"
    clear_history: Optional[bool] = False
    auth_token: Optional[str] = None  # 🆕 JWT token

class ChatResponse(BaseModel):
    response: str
    role: str
    language: str
    source: str
    model: Optional[str] = None
    priority: Optional[str] = None
    actions: Optional[List[dict]] = None
    context_used: Optional[bool] = False
    context_summary: Optional[List[str]] = None  # 🆕 Source attribution

# =====================================================
# 🧠 DISASTER-SPECIFIC INTENT DETECTION
# =====================================================

DISASTER_RESPONSES = {
    "flood": {
        "en": "🚨 FLOOD ALERT: Move to higher ground immediately. Avoid walking/driving through flood waters. Keep emergency kit ready. Emergency: NDRF 011-26107953.",
        "hi": "🚨 बाढ़ की चेतावनी: तुरंत ऊंचे स्थान पर जाएं। बाढ़ के पानी में न चलें/गाड़ी न चलाएं। आपातकालीन किट तैयार रखें। आपातकालीन: NDRF 011-26107953।"
    },
    "earthquake": {
        "en": "🚨 EARTHQUAKE: DROP to the ground, take COVER under sturdy furniture, HOLD ON. Stay away from windows. Move outside only after shaking stops completely.",
        "hi": "🚨 भूकंप: जमीन पर बैठ जाएं (DROP), मजबूत फर्नीचर के नीचे शरण लें (COVER), और मजबूती से पकड़ें (HOLD)। खिड़कियों से दूर रहें।"
    },
    "fire": {
        "en": "🔥 FIRE EMERGENCY: Evacuate immediately if safe. Stay low to avoid smoke. Call Fire Brigade: 101. Do not use elevators.",
        "hi": "🔥 आग की आपातकाल: सुरक्षित हो तो तुरंत बाहर निकलें। धुएं से बचने के लिए नीचे रहें। फायर ब्रिगेड: 101। लिफ्ट का उपयोग न करें।"
    },
    "cyclone": {
        "en": "🌪️ CYCLONE WARNING: Stay indoors, away from windows. Keep emergency supplies ready. Listen to official updates.",
        "hi": "🌪️ चक्रवात चेतावनी: घर के अंदर रहें, खिड़कियों से दूर। आपातकालीन आपूर्ति तैयार रखें। आधिकारिक अपडेट सुनें।"
    },
    "landslide": {
        "en": "⛰️ LANDSLIDE RISK: Evacuate to safer ground immediately. Avoid steep slopes. Listen for unusual sounds.",
        "hi": "⛰️ भूस्खलन जोखिम: तुरंत सुरक्षित स्थान पर जाएं। खड़ी ढलानों से बचें। असामान्य आवाज़ों पर ध्यान दें।"
    }
}

def detect_disaster_intent(message: str) -> Tuple[Optional[str], bool]:
    message_lower = message.lower()
    
    disaster_keywords = {
        "flood": ["flood", "baadh", "बाढ़", "water level", "inundation", "overflow"],
        "earthquake": ["earthquake", "bhukamp", "भूकंप", "tremor", "seismic"],
        "fire": ["fire", "aag", "आग", "blaze", "burning"],
        "cyclone": ["cyclone", "toofan", "तूफान", "storm", "hurricane"],
        "landslide": ["landslide", "bhooskhalan", "भूस्खलन", "mudslide"]
    }
    
    for disaster_type, keywords in disaster_keywords.items():
        if any(keyword in message_lower for keyword in keywords):
            return disaster_type, True
    
    return None, False

def get_shelter_response(language: str = "en") -> dict:
    shelters = {
        "en": """🏠 NEAREST SHELTERS:
1. Community Hall, Lajpat Nagar (Capacity: 500)
2. Govt School, Karol Bagh (Capacity: 300)
3. DDA Sports Complex, Dwarka (Capacity: 800)

Route: Check map for directions.
Contact Disaster Helpline: 1078""",
        "hi": """🏠 नजदीकी शेल्टर:
1. कम्युनिटी हॉल, लाजपत नगर (क्षमता: 500)
2. सरकारी स्कूल, करोल बाग (क्षमता: 300)
3. डीडीए स्पोर्ट्स कॉम्प्लेक्स, द्वारका (क्षमता: 800)

रास्ता: मैप पर दिशा देखें।
आपदा हेल्पलाइन: 1078"""
    }
    
    return {
        "response": shelters.get(language, shelters["en"]),
        "actions": [
            {"label": "View on Map", "type": "navigate", "path": "/map", "action": "view_shelters"},
            {"label": "Get Directions", "type": "action", "action": "get_directions"},
            {"label": "Call Helpline", "type": "call", "number": "1078"}
        ]
    }

# =====================================================
# 🆕 WEATHER FETCH WITH TIMEOUT (FIXED)
# =====================================================

def weather_by_location_sync(lat: float, lon: float) -> Optional[dict]:
    """Synchronous weather fetch with timeout"""
    if not OPENWEATHER_API_KEY:
        return None
    
    url = (
        f"https://api.openweathermap.org/data/2.5/weather"
        f"?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
    )
    
    try:
        response = requests.get(url, timeout=2)  # 🆕 2 second timeout
        data = response.json()
        return {
            "temperature": data["main"]["temp"],
            "humidity": data["main"]["humidity"],
            "rain_1h": data.get("rain", {}).get("1h", 0),
            "description": data["weather"][0]["description"]
        }
    except Exception as e:
        print(f"Weather fetch timeout/error: {e}")
        return None

# =====================================================
# 🧠 DYNAMIC CONTEXT INJECTION (WITH LIMITS)
# =====================================================

def get_dynamic_context(role: str, location: Optional[dict] = None, query: str = "") -> Tuple[str, List[str]]:
    """
    Build dynamic context with size limits
    Returns: (context_string, context_summary_list)
    🆕 FIXED: Aggressive limits, uses helper function, weather only when relevant
    """
    context_parts = []
    context_summary = []
    
    context_parts.append("=== SATARKMITRA SYSTEM CONTEXT ===")
    
    # Only fetch weather if query is weather-related
    weather_keywords = ["weather", "mausam", "मौसम", "temperature", "rain", "baarish", "बारिश"]
    should_fetch_weather = any(kw in query.lower() for kw in weather_keywords)
    
    # 1. Live reports - LIMIT 3
    if role in ["first_responder", "control_room"]:
        try:
            recent_reports = list(citizen_reports.find().sort("created_at", -1).limit(3))
            
            if recent_reports:
                context_parts.append("\n📋 RECENT DISTRESS REPORTS:")
                for i, r in enumerate(recent_reports, 1):
                    loc = r.get('location', {})
                    context_parts.append(
                        f"{i}. {r.get('description', 'N/A')[:80]} "
                        f"at ({loc.get('lat', 0):.3f}, {loc.get('lon', 0):.3f})"
                    )
                context_summary.append(f"Used {len(recent_reports)} recent reports")
        except Exception as e:
            print(f"Error fetching reports: {e}")
    
    # 2. Delhi risk zones - LIMIT 3 - 🆕 FIXED: Using helper function
    if role == "govt_official":
        try:
            zones = get_delhi_zones_data(limit=30)
            high_risk = [z for z in zones if z["risk_status"] in ["HIGH", "CRITICAL"]][:3]
            
            if high_risk:
                context_parts.append("\n⚠️ HIGH RISK ZONES:")
                for z in high_risk:
                    context_parts.append(
                        f"- {z['zone_name']}: {z['risk_status']} "
                        f"(Score: {z['risk_score']:.1f})"
                    )
                context_summary.append(f"Used {len(high_risk)} high-risk zones")
        except Exception as e:
            print(f"Error fetching zones: {e}")
    
    # 3. Active alerts - LIMIT 2
    try:
        recent_alerts = list(alerts_collection.find().sort("created_at", -1).limit(2))
        if recent_alerts:
            context_parts.append("\n🚨 ACTIVE ALERTS:")
            for alert in recent_alerts:
                context_parts.append(f"- {alert.get('message', 'N/A')[:100]}")
            context_summary.append(f"Used {len(recent_alerts)} active alerts")
    except:
        pass
    
    # 4. Weather context - ONLY if query is weather-related
    if should_fetch_weather and location and location.get('lat') and location.get('lng'):
        try:
            weather = weather_by_location_sync(location['lat'], location['lng'])
            if weather:
                context_parts.append(f"\n🌤️ CURRENT LOCATION WEATHER:")
                context_parts.append(f"- Temperature: {weather['temperature']}°C")
                context_parts.append(f"- Humidity: {weather['humidity']}%")
                context_parts.append(f"- Rainfall (1h): {weather['rain_1h']}mm")
                context_parts.append(f"- Conditions: {weather['description']}")
                context_summary.append("Used real-time weather data")
        except Exception as e:
            print(f"Weather fetch error: {e}")
    
    # 5. System statistics
    if role in ["admin", "control_room"]:
        try:
            total_reports = citizen_reports.count_documents({})
            total_users = users_collection.count_documents({})
            context_parts.append(f"\n📊 SYSTEM STATS:")
            context_parts.append(f"- Total Reports: {total_reports}")
            context_parts.append(f"- Registered Users: {total_users}")
            context_summary.append("Used system statistics")
        except:
            pass
    
    context_parts.append("\n=== END CONTEXT ===\n")
    
    return "\n".join(context_parts), context_summary

# =====================================================
# 🧠 ROLE-SPECIFIC PROMPTS
# =====================================================

def get_role_prompt(role: str, language: str = "en") -> str:
    prompts = {
        "citizen": {
            "en": """You are SatarkMitra AI assistant for citizens in India.

INSTRUCTIONS:
- Give SIMPLE, actionable steps (max 2-3 sentences)
- NEVER use technical jargon
- ALWAYS include emergency helpline if there's any risk
- Be calm and reassuring
- Use the real-time context provided below

Remember: NDRF: 011-26107953, Disaster: 1078""",
            "hi": """आप भारत में नागरिकों के लिए सतर्कमित्र AI सहायक हैं।

निर्देश:
- सरल, कार्रवाई योग्य कदम दें (अधिकतम 2-3 वाक्य)
- तकनीकी शब्दों का प्रयोग न करें
- यदि कोई जोखिम हो तो हमेशा आपातकालीन हेल्पलाइन बताएं

याद रखें: NDRF: 011-26107953, आपदा: 1078"""
        },
        "first_responder": {
            "en": """You are SatarkMitra AI for first responders (NDRF, Police, Medical).

INSTRUCTIONS:
- Prioritize URGENT distress reports
- Provide actionable coordination info
- Mention exact incident locations from context
- Be concise and operation-focused""",
            "hi": """आप पहले प्रतिक्रियाकर्ताओं के लिए सतर्कमित्र AI हैं।
- जरूरी संकट रिपोर्ट को प्राथमिकता दें
- कार्रवाई योग्य समन्वय जानकारी दें"""
        },
        "govt_official": {
            "en": """You are SatarkMitra AI for government officials.

INSTRUCTIONS:
- Provide RISK SUMMARIES with numbers
- Highlight critical zones from context
- Be data-driven and professional""",
            "hi": """आप सरकारी अधिकारियों के लिए सतर्कमित्र AI हैं।
- संख्याओं के साथ जोखिम सारांश दें
- डेटा-संचालित और पेशेवर रहें"""
        },
        "control_room": {
            "en": """You are SatarkMitra AI for control room operations.
- Focus on ACTIVE incidents
- Provide coordination updates
- Be precise and real-time aware""",
            "hi": """आप नियंत्रण कक्ष संचालन के लिए सतर्कमित्र AI हैं।
- सक्रिय घटनाओं पर ध्यान दें
- समन्वय अपडेट दें"""
        },
        "admin": {
            "en": """You are SatarkMitra AI for system administrators.
- Focus on system health
- Provide technical but clear information
- Be concise and actionable""",
            "hi": """आप सिस्टम प्रशासकों के लिए सतर्कमित्र AI हैं।
- सिस्टम स्वास्थ्य पर ध्यान दें
- तकनीकी लेकिन स्पष्ट जानकारी दें"""
        }
    }
    
    role_prompts = prompts.get(role, prompts["citizen"])
    return role_prompts.get(language, role_prompts["en"])

# =====================================================
# 🆕 REPORT LOGGING FROM CHAT (NEW FEATURE)
# =====================================================

def log_report_from_chat(message: str, user_id: str, location: Optional[dict] = None) -> Optional[str]:
    """Log a report directly from chat"""
    try:
        verification, scam_score = honeypot_verify_report(message)
        sentiment = analyze_report(message)
        
        record = {
            "type": "chat_report",
            "description": message,
            "location": location or {"lat": 0, "lon": 0},
            "source": "chatbot",
            "verification_status": verification,
            "scam_score": scam_score,
            "urgency_score": sentiment["score"],
            "category": sentiment["category"],
            "reported_by": user_id,
            "created_at": datetime.utcnow()
        }
        
        result = citizen_reports.insert_one(record)
        return str(result.inserted_id)
    except Exception as e:
        print(f"Error logging report from chat: {e}")
        return None

# =====================================================
# BASIC ROUTES
# =====================================================

@app.get("/")
def home():
    return {"status": "running", "message": "SatarkMitra AI Backend is Active", "version": "2.1.0"}

@app.get("/health")
def health():
    return {"status": "ok"}

# =====================================================
# 🚀 UPGRADED CHAT ENDPOINT (WITH ALL FIXES)
# =====================================================

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, request: Request):
    """
    🚀 PRODUCTION-READY AI Chatbot with:
    - Rate limiting (🆕 FIXED)
    - Persistent memory via MongoDB (🆕 FIXED)
    - Proper context size limits (🆕 FIXED)
    - Source attribution (🆕 FIXED)
    - JWT auth for users (🆕 FIXED)
    """
    try:
        # 🆕 Rate limiting for chat endpoint
        rate_limiter(request, "chat", max_requests=CHAT_RATE_LIMIT_MAX)
        
        # 🆕 Authenticate user if token provided
        authenticated_user_id = req.user_id
        authenticated_role = req.role
        if req.auth_token:
            payload = decode_jwt_token(req.auth_token)
            if payload:
                authenticated_user_id = payload.get("email", req.user_id)
                authenticated_role = payload.get("role", req.role)
        
        user_id = authenticated_user_id or "default"
        user_role = authenticated_role or "citizen"
        message_lower = req.message.lower()
        
        # Clear history if requested
        if req.clear_history:
            clear_chat_history(user_id)
        
        # =============================================
        # 🧠 INTENT DETECTION - Smart Rule Layer
        # =============================================
        
        # Emergency/Help detection
        if any(word in message_lower for word in ["help", "emergency", "madad", "मदद", "bachao", "बचाओ"]):
            response_text = {
                "en": "🚨 EMERGENCY: Call NDRF immediately: 011-26107953 or Disaster Helpline: 1078. Share your exact location with the operator.",
                "hi": "🚨 आपातकाल: तुरंत NDRF को कॉल करें: 011-26107953 या आपदा हेल्पलाइन: 1078। ऑपरेटर को अपना सटीक स्थान बताएं।"
            }.get(req.language, "🚨 EMERGENCY: Call NDRF immediately: 011-26107953 or Disaster Helpline: 1078.")
            
            # 🆕 Log emergency report
            log_report_from_chat(req.message, user_id, req.location)
            
            return ChatResponse(
                response=response_text,
                role=user_role,
                language=req.language,
                source="intent_rule",
                priority="critical",
                actions=[
                    {"label": "Call NDRF", "type": "call", "number": "01126107953"},
                    {"label": "Share Location", "type": "action", "action": "share_location"},
                    {"label": "View Shelters", "type": "navigate", "path": "/map"}
                ],
                context_summary=["Emergency protocol activated"]
            )
        
        # Shelter query detection
        if any(word in message_lower for word in ["shelter", "aashray", "आश्रय", "camp", "safe place"]):
            shelter_data = get_shelter_response(req.language)
            
            return ChatResponse(
                response=shelter_data["response"],
                role=user_role,
                language=req.language,
                source="intent_rule",
                priority="high",
                actions=shelter_data["actions"],
                context_summary=["Shelter information provided"]
            )
        
        # Disaster-specific detection
        disaster_type, detected = detect_disaster_intent(req.message)
        if detected and disaster_type in DISASTER_RESPONSES:
            response_text = DISASTER_RESPONSES[disaster_type].get(
                req.language, 
                DISASTER_RESPONSES[disaster_type]["en"]
            )
            
            # 🆕 Log disaster report
            log_report_from_chat(req.message, user_id, req.location)
            
            return ChatResponse(
                response=response_text,
                role=user_role,
                language=req.language,
                source="disaster_rule",
                priority="high",
                actions=[
                    {"label": "Emergency Contacts", "type": "action", "action": "show_contacts"},
                    {"label": "Safety Tips", "type": "action", "action": f"safety_{disaster_type}"},
                    {"label": "Report Update", "type": "action", "action": "report_update"}
                ],
                context_summary=[f"{disaster_type.title()} safety protocol activated"]
            )
        
        # 🆕 Report via chat detection
        report_keywords = ["report", "riport", "रिपोर्ट", "i see", "there is", "happening"]
        if any(kw in message_lower for kw in report_keywords) and len(req.message) > 20:
            report_id = log_report_from_chat(req.message, user_id, req.location)
            if report_id:
                add_to_chat_history(user_id, "system", f"Report logged: {report_id}")
        
        # =============================================
        # 🧠 DYNAMIC CONTEXT INJECTION (WITH LIMITS)
        # =============================================
        
        dynamic_context, context_summary = get_dynamic_context(user_role, req.location, req.message)
        context_used = len(context_summary) > 0
        
        # =============================================
        # 🧠 ROLE-SPECIFIC SYSTEM PROMPT
        # =============================================
        
        system_prompt = get_role_prompt(user_role, req.language)
        
        if req.location:
            system_prompt += f"\n\nUser is at coordinates: {req.location.get('lat')}, {req.location.get('lng')}."
        
        # =============================================
        # 🧠 PERSISTENT MULTI-TURN MEMORY (MongoDB)
        # =============================================
        
        history = get_chat_history_from_db(user_id)
        
        messages = [{"role": "system", "content": system_prompt}]
        
        if dynamic_context:
            messages.append({"role": "system", "content": dynamic_context})
        
        messages.extend(history[-6:])
        messages.append({"role": "user", "content": req.message})
        
        # =============================================
        # 🧠 AI RESPONSE GENERATION
        # =============================================
        
        ai_response = None
        source = "offline"
        model_used = None
        
        if groq_client:
            try:
                completion = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=messages,
                    max_tokens=200,
                    temperature=0.7
                )
                
                ai_response = completion.choices[0].message.content
                source = "groq"
                model_used = "llama-3.3-70b-versatile"
                context_summary.append("AI: Groq Llama 3.3")
                
            except Exception as e:
                print(f"Groq API error: {e}")
                context_summary.append("AI: Fallback (API error)")
        
        if ai_response is None:
            fallback_responses = {
                "en": {
                    "citizen": "I'm currently in offline mode. Emergency: NDRF 011-26107953, Disaster 1078. Shelters: Lajpat Nagar, Karol Bagh.",
                    "first_responder": "Offline mode. Check dashboard for critical reports.",
                    "govt_official": "Offline mode. Check dashboard for risk analytics.",
                    "control_room": "Offline mode. Use dashboard for live updates.",
                    "admin": "Offline mode. Check admin panel for system status."
                },
                "hi": {
                    "citizen": "मैं अभी ऑफलाइन मोड में हूं। आपातकालीन: NDRF 011-26107953, आपदा 1078।",
                    "first_responder": "ऑफलाइन मोड। महत्वपूर्ण रिपोर्ट के लिए डैशबोर्ड देखें।",
                    "govt_official": "ऑफलाइन मोड। जोखिम विश्लेषण के लिए डैशबोर्ड देखें।",
                    "control_room": "ऑफलाइन मोड। लाइव अपडेट के लिए डैशबोर्ड का उपयोग करें।",
                    "admin": "ऑफलाइन मोड। सिस्टम स्थिति के लिए एडमिन पैनल देखें।"
                }
            }
            
            lang = req.language if req.language in fallback_responses else "en"
            role = user_role if user_role in fallback_responses[lang] else "citizen"
            ai_response = fallback_responses[lang][role]
            context_summary.append("Mode: Offline fallback")
        
        # =============================================
        # 🧠 UPDATE PERSISTENT MEMORY
        # =============================================
        
        add_to_chat_history(user_id, "user", req.message)
        add_to_chat_history(user_id, "assistant", ai_response)
        
        # =============================================
        # 🧠 SMART ACTIONS FOR FRONTEND
        # =============================================
        
        actions = []
        
        if user_role in ["citizen"]:
            actions = [
                {"label": "Report Emergency", "type": "action", "action": "report_emergency"},
                {"label": "View Map", "type": "navigate", "path": "/map"},
                {"label": "Voice Input", "type": "action", "action": "voice_input"}
            ]
        elif user_role in ["first_responder", "control_room"]:
            actions = [
                {"label": "View Reports", "type": "navigate", "path": "/reports"},
                {"label": "Team Status", "type": "action", "action": "team_status"},
                {"label": "Active Incidents", "type": "action", "action": "active_incidents"}
            ]
        elif user_role in ["govt_official"]:
            actions = [
                {"label": "Risk Dashboard", "type": "navigate", "path": "/dashboard"},
                {"label": "Analytics", "type": "action", "action": "view_analytics"},
                {"label": "Export Report", "type": "action", "action": "export_report"}
            ]
        
        return ChatResponse(
            response=ai_response,
            role=user_role,
            language=req.language,
            source=source,
            model=model_used,
            priority="normal",
            actions=actions if actions else None,
            context_used=context_used,
            context_summary=context_summary if context_summary else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Chat service temporarily unavailable")

# =====================================================
# 🆕 CLEAR CHAT HISTORY ENDPOINT
# =====================================================

@app.post("/chat/clear")
async def clear_chat(user_id: str = "default", auth_token: Optional[str] = None):
    """Clear conversation history with optional JWT auth"""
    if auth_token:
        payload = decode_jwt_token(auth_token)
        if payload:
            user_id = payload.get("email", user_id)
    
    clear_chat_history(user_id)
    return {"status": "success", "message": f"Chat history cleared for {user_id}"}

# =====================================================
# 🆕 GET CHAT HISTORY ENDPOINT
# =====================================================

@app.get("/chat/history")
async def get_chat_history(user_id: str = "default", auth_token: Optional[str] = None):
    """Get conversation history"""
    if auth_token:
        payload = decode_jwt_token(auth_token)
        if payload:
            user_id = payload.get("email", user_id)
    
    history = get_chat_history_from_db(user_id)
    return {"user_id": user_id, "history": history, "message_count": len(history)}

# =====================================================
# KEDARNATH FLOOD PREDICTION
# =====================================================

@app.post("/api/predict")
def predict_kedarnath(data: dict):

    if not all([scaler_dl, gru_model, tcn_model]):
        raise HTTPException(status_code=503, detail="Core ML models not available")

    river = data.get("river_level", 1.0)
    rain = data.get("rainfall", 5.0)

    history = [[river * (1 - 0.02 * i), rain] for i in range(6)]

    seq = np.array([history])

    scaled = scaler_dl.transform(seq.reshape(6, 2)).reshape(1, 6, 2)

    gru_forecast = float(gru_model.predict(scaled, verbose=0)[0][0])
    tcn_forecast = float(tcn_model.predict(scaled, verbose=0)[0][0])

    risk = "HIGH" if max(gru_forecast, tcn_forecast) > 0.6 else "LOW"

    return {
        "location": "Kedarnath",
        "alert_level": risk,
        "gru_forecast": round(gru_forecast, 3),
        "tcn_forecast": round(tcn_forecast, 3)
    }

# =====================================================
# DELHI MICRO HOTSPOT RISK ENGINE
# =====================================================

@app.get("/api/delhi/zones")
def delhi_zones():
    """Route that uses the helper function - FIXED"""
    if delhi_model is None:
        raise HTTPException(status_code=503, detail="Delhi ML model not loaded")
    
    return get_delhi_zones_data(limit=30)

# =====================================================
# WEATHER API
# =====================================================

@app.get("/api/weather_by_location")
def weather_by_location(lat: float = Query(...), lon: float = Query(...)):

    if not OPENWEATHER_API_KEY:
        raise HTTPException(status_code=500, detail="Missing OpenWeather API key")

    url = (
        f"https://api.openweathermap.org/data/2.5/weather"
        f"?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
    )

    try:
        data = requests.get(url, timeout=5).json()
        return {
            "temperature": data["main"]["temp"],
            "humidity": data["main"]["humidity"],
            "rain_1h": data.get("rain", {}).get("1h", 0),
            "description": data["weather"][0]["description"]
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail="Weather service unavailable")

# =====================================================
# CITIZEN REPORT + SCAM DETECTION
# =====================================================

@app.post("/api/report")
def submit_report(report: CitizenReport):

    try:

        verification, scam_score = honeypot_verify_report(report.description)
        sentiment = analyze_report(report.description)

        record = {
            "type": report.type,
            "description": report.description,
            "location": {
                "lat": report.latitude,
                "lon": report.longitude
            },
            "source": report.source,
            "verification_status": verification,
            "scam_score": scam_score,
            "urgency_score": sentiment["score"],
            "category": sentiment["category"],
            "created_at": datetime.utcnow()
        }
       

        result = citizen_reports.insert_one(record)

        return {
            "status": "received",
            "verification_status": verification,
            "scam_score": scam_score,
            "urgency_score": sentiment["score"],
            "category": sentiment["category"],
            "report_id": str(result.inserted_id)

        }

    except Exception as e:
        print("ERROR saving report:", e)
        raise HTTPException(status_code=500, detail="Report failed")

# =====================================================
# FETCH REPORTS (FOR MAP)
# =====================================================

@app.get("/api/reports")
def get_reports():

    reports = []

    cursor = citizen_reports.find().sort("created_at", -1).limit(200)

    for r in cursor:
        reports.append({
            "id": str(r["_id"]),
            "lat": r.get("location", {}).get("lat", 0),
            "lng": r.get("location", {}).get("lon", 0),
            "note": r.get("description", ""),
            "verification_status": r.get("verification_status", "trusted"),
            "urgency_score": r.get("urgency_score", 0),
            "category": r.get("category", "NORMAL"),
            "created_at": r.get("created_at")
        })

    return reports

# USSD ROUTE
@app.api_route("/ussd", methods=["GET", "POST"], response_class=PlainTextResponse)
async def ussd_handler(
    sessionId: str = Form(default=""),
    serviceCode: str = Form(default=""),
    phoneNumber: str = Form(default=""),
    text: str = Form(default="")
):
    print("📩 USSD HIT:", text)

    if text == "":
        return "CON SatarkMitra\n1. Check Risk\n2. Report Flood\n3. Shelter"

    inputs = text.split("*")

    if inputs[0] == "1":
        return "END Risk: HIGH"

    if inputs[0] == "2":
        if len(inputs) == 1:
            return "CON Enter description"
        return "END Report submitted successfully"

    if inputs[0] == "3":
        return "END Shelter: Lajpat Nagar"

    return "END Invalid"

@app.get("/test-alert")
def test_alert():
    send_alert_to_all("🚨 Test Flood Alert from SatarkMitra")
    return {"status": "alerts sent"}

# =====================================================
# 🔐 ADMIN LOGIN (WITH RATE LIMITING)
# =====================================================

@app.post("/admin/login")
async def admin_login(request: Request, email: str = Form(...), password: str = Form(...)):
    """
    SECURE ADMIN LOGIN
    Returns a session token that expires after 1 hour
    """
    auth_result = authenticate_admin(email, password, request)
    
    if not auth_result:
        time.sleep(0.5)
        raise HTTPException(status_code=401, detail="Invalid credentials or not an admin")
    
    return {
        "message": "Admin login successful",
        "token": auth_result["token"],
        "email": auth_result["email"],
        "name": auth_result["name"],
        "expires_in": auth_result["expires_in"]
    }

@app.post("/admin/logout")
async def admin_logout(
    request: Request,
    admin_email: str = Header(...),
    admin_token: str = Header(...)
):
    verify_admin_session(admin_email, admin_token, request)
    
    if admin_token in ACTIVE_ADMIN_SESSIONS:
        del ACTIVE_ADMIN_SESSIONS[admin_token]
    
    return {"message": "Logged out successfully"}

@app.get("/admin/session-status")
async def session_status(
    request: Request,
    admin_email: str = Header(...),
    admin_token: str = Header(...)
):
    try:
        verify_admin_session(admin_email, admin_token, request)
        
        token_data = ACTIVE_ADMIN_SESSIONS.get(admin_token, {})
        expires_at = token_data.get("expires_at")
        time_left = None
        
        if expires_at:
            time_left = str(expires_at - datetime.utcnow()).split('.')[0]
        
        return {
            "valid": True,
            "email": admin_email,
            "expires_at": expires_at.isoformat() if expires_at else None,
            "time_remaining": time_left
        }
    except:
        return {
            "valid": False,
            "message": "Session expired or invalid"
        }

# =====================================================
# 🆕 PUBLIC REGISTRATION (WITH JWT TOKEN)
# =====================================================

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: str

@app.post("/register")
async def register(request: Request, user: RegisterRequest):
    rate_limiter(request, "register")
    
    print("REGISTER INPUT:", user)

    existing_user = users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(user.password)

    user_data = {
        "name": user.name,
        "phone": user.phone,
        "email": user.email,
        "password": hashed,
        "role": "citizen",
        "emergency_contacts": [],
        "created_at": datetime.utcnow(),
        "created_via": "public_registration"
    }

    users_collection.insert_one(user_data)

    subscribers_collection.insert_one({
        "phone": user.phone,
        "subscribed": True,
        "subscribed_at": datetime.utcnow()
    })

    # 🆕 Return JWT token on registration
    token = create_jwt_token({"email": user.email, "role": "citizen", "name": user.name})

    return {
        "message": "User registered successfully as citizen",
        "role": "citizen",
        "email": user.email,
        "token": token,
        "expires_in": f"{JWT_EXPIRY_HOURS}h"
    }

# =====================================================
# 🆕 USER LOGIN (WITH JWT TOKEN)
# =====================================================

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/login")
async def login(request: Request, user: LoginRequest):
    rate_limiter(request, "user_login")
    
    print("LOGIN INPUT:", user)
    
    existing_user = users_collection.find_one({"email": user.email})
    
    print("FOUND USER:", existing_user)
    
    if not existing_user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if not verify_password(user.password, existing_user.get("password")):
        raise HTTPException(status_code=401, detail="Incorrect password")
    
    # 🆕 Create JWT token
    token = create_jwt_token({
        "email": existing_user.get("email"),
        "role": existing_user.get("role"),
        "name": existing_user.get("name")
    })
    
    return {
        "message": "Login successful",
        "token": token,
        "expires_in": f"{JWT_EXPIRY_HOURS}h",
        "user": {
            "name": existing_user.get("name"),
            "email": existing_user.get("email"),
            "role": existing_user.get("role")
        }
    }

# 🆕 Token verification endpoint
@app.post("/verify-token")
async def verify_token(token: str = Form(...)):
    payload = decode_jwt_token(token)
    if payload:
        return {"valid": True, "user": payload}
    return {"valid": False, "message": "Invalid or expired token"}

# =====================================================
# ADMIN CREATE USER REQUEST MODEL
# =====================================================

class AdminCreateUserRequest(BaseModel):
    name: str
    email: str
    phone: str
    password: str
    role: str
    department: Optional[str] = ""
    badge_id: Optional[str] = ""
    subscribe_alerts: Optional[bool] = True

# =====================================================
# 🔐 SECURE ADMIN-ONLY USER CREATION
# =====================================================

@app.post("/admin/create-user")
async def admin_create_user(
    request: Request,
    user: AdminCreateUserRequest,
    admin_email: str = Header(...),
    admin_token: str = Header(...)
):
    print(f"🔐 Admin Create User Request by: {admin_email}")
    
    admin_user = verify_admin_session(admin_email, admin_token, request)
    
    print(f"✅ Admin verified: {admin_user['email']} (role: {admin_user['role']})")
    
    allowed_roles = ["govt_official", "control_room", "first_responder"]
    requested_role = user.role
    
    if not requested_role:
        raise HTTPException(status_code=400, detail="Role is required")
    
    if requested_role not in allowed_roles:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid role '{requested_role}'. Allowed roles: {allowed_roles}"
        )
    
    required_fields = ["name", "email", "phone", "password"]
    for field in required_fields:
        if not getattr(user, field):
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    existing_user = users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(user.password)
    
    new_user = {
        "name": user.name,
        "phone": user.phone,
        "email": user.email,
        "password": hashed,
        "role": requested_role,
        "emergency_contacts": [],
        "department": user.department,
        "badge_id": user.badge_id,
        "created_by": admin_email,
        "created_at": datetime.utcnow(),
        "created_via": "admin_panel"
    }
    
    result = users_collection.insert_one(new_user)
    
    if user.subscribe_alerts:
        subscribers_collection.insert_one({
            "phone": user.phone,
            "subscribed": True,
            "subscribed_at": datetime.utcnow()
        })
    
    print(f"📝 Admin {admin_email} created user {user.email} with role {requested_role}")
    
    return {
        "status": "success",
        "message": f"User created successfully with role: {requested_role}",
        "user_id": str(result.inserted_id),
        "email": user.email,
        "role": requested_role,
        "created_by": admin_email,
        "created_at": datetime.utcnow().isoformat()
    }

# =====================================================
# GET ALL USERS (ADMIN ONLY - SECURE)
# =====================================================

@app.get("/admin/users")
async def get_all_users(
    request: Request,
    admin_email: str = Header(...),
    admin_token: str = Header(...)
):
    verify_admin_session(admin_email, admin_token, request)
    
    users = []
    cursor = users_collection.find({}, {"password": 0})
    
    for user_doc in cursor:
        user_doc["_id"] = str(user_doc["_id"])
        users.append(user_doc)
    
    return {
        "total": len(users),
        "users": users
    }

# =====================================================
# GET USERS BY ROLE (ADMIN ONLY - SECURE)
# =====================================================

@app.get("/admin/users/{role}")
async def get_users_by_role(
    role: str,
    request: Request,
    admin_email: str = Header(...),
    admin_token: str = Header(...)
):
    verify_admin_session(admin_email, admin_token, request)
    
    valid_roles = ["citizen", "govt_official", "control_room", "first_responder", "admin"]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Valid roles: {valid_roles}")
    
    users = []
    cursor = users_collection.find({"role": role}, {"password": 0})
    
    for user_doc in cursor:
        user_doc["_id"] = str(user_doc["_id"])
        users.append(user_doc)
    
    return {
        "role": role,
        "count": len(users),
        "users": users
    }

# =====================================================
# CONTACTS MANAGEMENT
# =====================================================

@app.post("/add-contact")
def add_contact(phone: str, contact: dict):

    users_collection.update_one(
        {"phone": phone},
        {
            "$push": {
                "emergency_contacts": contact
            }
        }
    )

    return {"message": "Contact added"}

@app.get("/contacts/{phone}")
def get_contacts(phone: str):
    user = users_collection.find_one({"phone": phone})
   
    return user.get("emergency_contacts", [])

# =====================================================
# RUN APPLICATION
# =====================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)