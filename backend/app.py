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
    citizen_reports
)
from db.mongo import db  # 🆕 Import db for new collections
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

def is_delhi_region(lat, lon):
    return (
        28.45 <= lat <= 28.90 and
        77.02 <= lon <= 77.33
    )

def generate_delhi_hotspots():
    lat_min, lat_max = 28.45, 28.90
    lon_min, lon_max = 77.00, 77.35

    step = 0.02
    hotspots = []

    for lat in np.arange(lat_min, lat_max, step):
        for lon in np.arange(lon_min, lon_max, step):

            if not is_delhi_region(lat, lon):
                continue

            hotspots.append({
                "name": f"Delhi_{round(lat,3)}_{round(lon,3)}",
                "lat": float(lat),
                "lon": float(lon),
                "elevation": 210,
                "drainage": "MODERATE"
            })

    return hotspots

DELHI_ZONES = generate_delhi_hotspots()

def get_balanced_zones(zones, limit):
    north, central, south = [], [], []

    for z in zones:
        lat = z["lat"]

        if lat > 28.75:
            north.append(z)
        elif lat > 28.60:
            central.append(z)
        else:
            south.append(z)

    per_region = max(1, limit // 3)

    import random
    random.seed(42)

    selected = (
        random.sample(north, min(per_region, len(north))) +
        random.sample(central, min(per_region, len(central))) +
        random.sample(south, min(per_region, len(south)))
    )

    return selected[:limit]

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

    import random
    random.seed(42)  # ✅ stable output
    zones = get_balanced_zones(DELHI_ZONES, limit)
    for z in zones[:limit]:
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
    context_summary: Optional[List[str]] = None

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
    
    # 2. Delhi risk zones - LIMIT 3
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
# 🆕 REPORT LOGGING FROM CHAT
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
            "user_id": user_id,
            "created_at": datetime.utcnow()
        }
        
        result = citizen_reports.insert_one(record)
        return str(result.inserted_id)
    except Exception as e:
        print(f"Error logging report from chat: {e}")
        return None

# =====================================================
# 🤖 CHATBOT ENDPOINT
# =====================================================

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: Request, chat_request: ChatRequest):
    """
    AI Chatbot with Groq Llama 3.3 (FREE)
    """
    # Rate limiting
    rate_limiter(request, "chat", max_requests=CHAT_RATE_LIMIT_MAX)
    
    user_id = chat_request.user_id or "default"
    
    # Clear history if requested
    if chat_request.clear_history:
        clear_chat_history(user_id)
        return ChatResponse(
            response="Chat history cleared. How can I help you?",
            role=chat_request.role,
            language=chat_request.language,
            source="system",
            context_used=False
        )
    
    # Check for disaster intent first
    disaster_type, is_disaster = detect_disaster_intent(chat_request.message)
    if is_disaster and disaster_type:
        response_text = DISASTER_RESPONSES.get(disaster_type, {}).get(
            chat_request.language, 
            DISASTER_RESPONSES[disaster_type]["en"]
        )
        
        # Log report automatically for disaster keywords
        log_report_from_chat(chat_request.message, user_id, chat_request.location)
        
        return ChatResponse(
            response=response_text,
            role=chat_request.role,
            language=chat_request.language,
            source="disaster_intent",
            priority="HIGH",
            context_used=False
        )
    
    # Check for shelter query
    if any(word in chat_request.message.lower() for word in ["shelter", "ashray", "आश्रय", "safe place"]):
        shelter_response = get_shelter_response(chat_request.language)
        return ChatResponse(
            response=shelter_response["response"],
            role=chat_request.role,
            language=chat_request.language,
            source="shelter_db",
            actions=shelter_response.get("actions", []),
            context_used=False
        )
    
    # Get dynamic context
    context, context_summary = get_dynamic_context(
        chat_request.role, 
        chat_request.location,
        chat_request.message
    )
    
    # Get role-specific prompt
    role_prompt = get_role_prompt(chat_request.role, chat_request.language)
    
    # Get chat history
    chat_history = get_chat_history_from_db(user_id)
    
    # Prepare messages for Groq
    messages = [
        {"role": "system", "content": f"{role_prompt}\n\n{context}"}
    ]
    
    # Add chat history
    for msg in chat_history[-6:]:  # Last 6 messages for context
        messages.append(msg)
    
    # Add current message
    messages.append({"role": "user", "content": chat_request.message})
    
    # Try Groq first, fallback to offline
    if groq_client:
        try:
            completion = groq_client.chat.completions.create(
                model="llama3-8b-8192",  # FREE model
                messages=messages,
                temperature=0.7,
                max_tokens=500,
                top_p=1
            )
            
            response_text = completion.choices[0].message.content
            
            # Save to history
            add_to_chat_history(user_id, "user", chat_request.message)
            add_to_chat_history(user_id, "assistant", response_text)
            
            # Log if it seems like a report
            if any(word in chat_request.message.lower() for word in ["report", "help", "emergency", "बाढ़", "flood"]):
                log_report_from_chat(chat_request.message, user_id, chat_request.location)
            
            return ChatResponse(
                response=response_text,
                role=chat_request.role,
                language=chat_request.language,
                source="groq_llama3",
                model="Llama 3.3 8B",
                context_used=bool(context),
                context_summary=context_summary if context_summary else None
            )
        except Exception as e:
            print(f"Groq error: {e}")
            # Fall through to offline response
    
    # Offline fallback responses
    responses = {
        "en": "I understand you're asking about emergency preparedness. Please visit our website or call 1078 for immediate assistance from disaster management authorities.",
        "hi": "मैं समझ गया हूं कि आप आपातकालीन तैयारियों के बारे में पूछ रहे हैं। कृपया हमारी वेबसाइट पर जाएं या आपदा प्रबंधन अधिकारियों से तत्काल सहायता के लिए 1078 पर कॉल करें।"
    }
    
    response_text = responses.get(chat_request.language, responses["en"])
    
    return ChatResponse(
        response=response_text,
        role=chat_request.role,
        language=chat_request.language,
        source="offline_fallback",
        context_used=bool(context),
        context_summary=context_summary if context_summary else None
    )

# =====================================================
# BASIC ROUTES
# =====================================================

@app.get("/")
def home():
    return {"status": "running", "message": "SatarkMitra AI Backend is Active", "version": "2.1.0"}

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

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
        "tcn_forecast": round(tcn_forecast, 3),
        "flood_probability": round(max(gru_forecast, tcn_forecast) * 100, 1)
    }

# =====================================================
# DELHI MICRO HOTSPOT RISK ENGINE
# =====================================================

@app.get("/api/delhi/zones")
def delhi_zones(limit: int = 30):
    if delhi_model is None:
        raise HTTPException(status_code=503, detail="Delhi ML model not loaded")
    
    return get_delhi_zones_data(limit)

# =====================================================
# 🆕 DELHI HEATMAP DATA
# =====================================================

@app.get("/api/delhi/heatmap")
def get_delhi_heatmap():
    """
    Generate heatmap data for Delhi region with risk scores
    """
    if delhi_model is None:
        raise HTTPException(status_code=503, detail="Delhi ML model not loaded")
    
    heatmap_data = []
    
    for zone in DELHI_ZONES[:200]:  # Limit for performance
        # Calculate risk for each zone
        rainfall = np.random.uniform(40, 90)
        runoff = np.random.uniform(0.8, 1.5)
        
        X = pd.DataFrame([{
            "river_water_area_sqkm": 6.5,
            "upstream_runoff_mm": runoff,
            "rainfall_mm": rainfall,
            "ggn_runoff_mm": runoff * 0.8,
            "ggn_rainfall_mm": rainfall * 0.9,
            "month": datetime.utcnow().month
        }])
        
        risk_score = float(delhi_model.predict(X)[0])
        
        heatmap_data.append({
            "lat": zone["lat"],
            "lng": zone["lon"],
            "intensity": round(risk_score / 100, 2),  # Normalize to 0-1
            "risk_score": round(risk_score, 2),
            "zone_name": zone["name"]
        })
    
    return heatmap_data

# =====================================================
# KEDARNATH SHELTERS API
# =====================================================

def generate_kedarnath_shelters():
    lat_min, lat_max = 30.70, 30.80
    lon_min, lon_max = 79.00, 79.10

    step = 0.01
    shelters = []

    for lat in np.arange(lat_min, lat_max, step):
        for lon in np.arange(lon_min, lon_max, step):
            shelters.append({
                "name": f"Shelter_{round(lat,3)}_{round(lon,3)}",
                "lat": float(lat),
                "lon": float(lon),
                "capacity": int(np.random.randint(100, 500))
            })

    return shelters

KEDARNATH_SHELTERS = generate_kedarnath_shelters()

@app.get("/api/kedarnath/shelters")
def get_kedarnath_shelters(limit: int = 30):
    import random
    random.seed(42)

    selected = random.sample(
        KEDARNATH_SHELTERS,
        min(limit, len(KEDARNATH_SHELTERS))
    )

    return [
        {
            "name": s["name"],
            "latitude": s["lat"],
            "longitude": s["lon"],
            "capacity": s["capacity"]
        }
        for s in selected
    ]

# =====================================================
# 🆕 KEDARNATH SPECIFIC ENDPOINTS
# =====================================================

@app.get("/api/kedarnath/risk")
def get_kedarnath_risk():
    """
    Get current Kedarnath flood risk assessment
    """
    import random
    risk_level = random.choice(["LOW", "MODERATE", "HIGH"])
    risk_score = random.uniform(0, 100)
    
    return {
        "location": "Kedarnath",
        "risk_level": risk_level,
        "risk_score": round(risk_score, 1),
        "alert_threshold": 70,
        "recommendation": "Monitor water levels" if risk_level != "HIGH" else "Immediate evacuation recommended"
    }

@app.get("/api/kedarnath/water-stations")
def get_kedarnath_water_stations():
    """
    Get water monitoring stations data for Kedarnath
    """
    stations = [
        {
            "id": "station-a",
            "name": "Mandakini River",
            "location": "Near Temple Bridge",
            "currentLevel": 8.5,
            "status": "critical",
            "capacity": 10.0,
            "lastUpdated": "2 min ago"
        },
        {
            "id": "station-b",
            "name": "Gaurikund Station",
            "location": "Entry Point",
            "currentLevel": 6.2,
            "status": "warning",
            "capacity": 9.0,
            "lastUpdated": "1 min ago"
        },
        {
            "id": "station-c",
            "name": "Kedarnath Base",
            "location": "Downstream Checkpoint",
            "currentLevel": 4.1,
            "status": "normal",
            "capacity": 8.5,
            "lastUpdated": "3 min ago"
        }
    ]
    return stations

@app.get("/api/kedarnath/shelters-list")
def get_kedarnath_shelters_list():
    """
    Get shelter list for Kedarnath region
    """
    shelters = [
        {"id": 1, "name": "Govt. Primary School Shelter", "location": "Rampur Village", "dist": "2km", "capacity": 150, "current_occupancy": 45, "status": "Open"},
        {"id": 2, "name": "Community Hall Shelter", "location": "Sitapur", "dist": "3km", "capacity": 250, "current_occupancy": 200, "status": "Open"},
        {"id": 3, "name": "Old Temple Guesthouse", "location": "Gaurikund", "dist": "1.5km", "capacity": 80, "current_occupancy": 80, "status": "Full"},
    ]
    return shelters

@app.get("/api/kedarnath/heatmap")
def get_kedarnath_heatmap():
    """
    Generate heatmap data for Kedarnath region
    """
    import random
    random.seed(42)
    
    lat_min, lat_max = 30.70, 30.80
    lon_min, lon_max = 79.00, 79.10
    
    heatmap_data = []
    
    for lat in np.arange(lat_min, lat_max, 0.01):
        for lon in np.arange(lon_min, lon_max, 0.01):
            risk_intensity = random.uniform(0.3, 0.9)
            
            heatmap_data.append({
                "lat": float(lat),
                "lng": float(lon),
                "intensity": round(risk_intensity, 3)
            })
    
    return heatmap_data[:500]

# =====================================================
# 🆕 EMERGENCY CONTACTS
# =====================================================

@app.get("/api/emergency-contacts")
def get_emergency_contacts():
    """
    Get emergency contact numbers
    """
    contacts = [
        {"id": 1, "name": "NDRF Command Center", "role": "Disaster Response", "contact": "108"},
        {"id": 2, "name": "State Disaster Mgmt.", "role": "Coordination", "contact": "1070"},
        {"id": 3, "name": "District Control Room", "role": "Local Operations", "contact": "1077"},
        {"id": 4, "name": "Ambulance", "role": "Medical Emergency", "contact": "102"},
        {"id": 5, "name": "Police Control Room", "role": "Law & Order", "contact": "100"},
        {"id": 6, "name": "Fire Brigade", "role": "Fire Emergency", "contact": "101"},
    ]
    return contacts

# =====================================================
# 🆕 SYSTEM STATISTICS
# =====================================================

@app.get("/api/stats")
def get_system_stats(
    admin_email: Optional[str] = Header(None),
    admin_token: Optional[str] = Header(None)
):
    """
    Get system statistics (protected for admin)
    """
    try:
        # Try to verify admin if credentials provided
        is_admin = False
        if admin_email and admin_token:
            try:
                verify_admin_session(admin_email, admin_token)
                is_admin = True
            except:
                pass
        
        # Basic stats (always available)
        stats = {
            "total_reports": citizen_reports.count_documents({}),
            "total_users": users_collection.count_documents({}),
            "active_alerts": alerts_collection.count_documents({"acknowledged": False}),
        }
        
        # Advanced stats (admin only)
        if is_admin:
            stats.update({
                "suspicious_reports": citizen_reports.count_documents({"verification_status": "suspicious"}),
                "registered_subscribers": subscribers_collection.count_documents({"subscribed": True}),
                "total_admins": users_collection.count_documents({"role": "admin"}),
            })
        
        return stats
    except Exception as e:
        return {
            "total_reports": 0,
            "total_users": 0,
            "active_alerts": 0,
            "error": str(e)
        }

# =====================================================
# WEATHER API
# =====================================================

@app.get("/api/weather_by_location")
def weather_by_location(lat: float = Query(...), lon: float = Query(...)):
    if not OPENWEATHER_API_KEY:
        raise HTTPException(status_code=500, detail="Missing OpenWeather API key")

    result = weather_by_location_sync(lat, lon)
    if not result:
        raise HTTPException(status_code=503, detail="Weather service unavailable")
    
    return result

@app.get("/api/weather")
def get_weather(lat: float = Query(...), lon: float = Query(...)):
    """Simple weather endpoint for the dashboard"""
    if not OPENWEATHER_API_KEY:
        raise HTTPException(status_code=500, detail="Missing OpenWeather API key")
    
    result = weather_by_location_sync(lat, lon)
    if not result:
        raise HTTPException(status_code=503, detail="Weather service unavailable")
    
    return result

@app.get("/api/weather/forecast")
def weather_forecast(lat: float = Query(...), lon: float = Query(...)):
    """
    Get 5-day weather forecast
    """
    if not OPENWEATHER_API_KEY:
        raise HTTPException(status_code=500, detail="Missing OpenWeather API key")
    
    url = (
        f"https://api.openweathermap.org/data/2.5/forecast"
        f"?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
    )
    
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        
        forecasts = []
        for item in data.get("list", [])[:8]:
            forecasts.append({
                "timestamp": item["dt"],
                "datetime": item["dt_txt"],
                "temperature": item["main"]["temp"],
                "humidity": item["main"]["humidity"],
                "rain": item.get("rain", {}).get("3h", 0),
                "description": item["weather"][0]["description"],
                "icon": item["weather"][0]["icon"]
            })
        
        return {
            "city": data.get("city", {}).get("name", "Unknown"),
            "country": data.get("city", {}).get("country", ""),
            "forecasts": forecasts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Weather API error: {str(e)}")

# =====================================================
# ALERTS MANAGEMENT
# =====================================================

@app.get("/api/alerts")
def get_alerts(limit: int = 50):
    """
    Fetch recent alerts from database
    """
    alerts = []
    cursor = alerts_collection.find().sort("created_at", -1).limit(limit)
    
    for alert in cursor:
        alerts.append({
            "id": str(alert["_id"]),
            "type": alert.get("type", "info"),
            "title": alert.get("title", ""),
            "location": alert.get("location", ""),
            "time": alert.get("created_at", datetime.utcnow()).strftime("%Y-%m-%d %H:%M:%S"),
            "acknowledged": alert.get("acknowledged", False)
        })
    
    return alerts

@app.post("/api/alerts")
def create_alert(alert_data: dict):
    """
    Create a new alert
    """
    alert = {
        "type": alert_data.get("type", "info"),
        "title": alert_data.get("title", ""),
        "location": alert_data.get("location", ""),
        "description": alert_data.get("description", ""),
        "acknowledged": False,
        "created_at": datetime.utcnow(),
        "created_by": alert_data.get("created_by", "system")
    }
    
    result = alerts_collection.insert_one(alert)
    
    # Send SMS alerts to subscribers for critical/warning alerts
    if alert["type"] in ["critical", "warning"]:
        send_alert_to_all(f"🚨 {alert['title']} at {alert['location']}")
    
    return {
        "status": "created",
        "id": str(result.inserted_id),
        "message": "Alert created successfully"
    }

@app.put("/api/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str):
    """
    Mark an alert as acknowledged
    """
    from bson import ObjectId
    
    result = alerts_collection.update_one(
        {"_id": ObjectId(alert_id)},
        {"$set": {"acknowledged": True, "acknowledged_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {"status": "acknowledged"}

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

# =====================================================
# SMS SUBSCRIPTION MANAGEMENT
# =====================================================

@app.post("/api/subscribe")
def subscribe_alerts(phone: str = Form(...), subscribe: bool = Form(True)):
    """
    Subscribe or unsubscribe a phone number from SMS alerts
    """
    if subscribe:
        subscribers_collection.update_one(
            {"phone": phone},
            {"$set": {"subscribed": True, "subscribed_at": datetime.utcnow()}},
            upsert=True
        )
        return {"status": "subscribed", "phone": phone}
    else:
        subscribers_collection.update_one(
            {"phone": phone},
            {"$set": {"subscribed": False, "unsubscribed_at": datetime.utcnow()}}
        )
        return {"status": "unsubscribed", "phone": phone}

@app.get("/api/subscribers")
def get_subscribers(
    request: Request,
    admin_email: str = Header(...),
    admin_token: str = Header(...)
):
    """
    Get all SMS subscribers (Admin only)
    """
    verify_admin_session(admin_email, admin_token, request)
    
    subscribers = []
    cursor = subscribers_collection.find({"subscribed": True})
    
    for sub in cursor:
        subscribers.append({
            "phone": sub.get("phone"),
            "subscribed_at": sub.get("subscribed_at").isoformat() if sub.get("subscribed_at") else None
        })
    
    return {"total": len(subscribers), "subscribers": subscribers}

# =====================================================
# ENHANCED USSD ROUTE
# =====================================================

@app.api_route("/ussd", methods=["GET", "POST"], response_class=PlainTextResponse)
async def ussd_handler(
    sessionId: str = Form(default=""),
    serviceCode: str = Form(default=""),
    phoneNumber: str = Form(default=""),
    text: str = Form(default="")
):
    print(f"📩 USSD Request - Session: {sessionId}, Phone: {phoneNumber}, Text: {text}")
    
    if text == "":
        return """CON SatarkMitra - Flood Alert System
1. Check Flood Risk
2. Report Flood Situation
3. Find Nearest Shelter
4. Emergency Contacts
5. Weather Update"""
    
    inputs = text.split("*")
    main_option = inputs[0]
    
    # Option 1: Check Risk
    if main_option == "1":
        if len(inputs) == 1:
            return "CON Select location\n1. Kedarnath\n2. Delhi\n3. Other Area"
        elif len(inputs) == 2:
            if inputs[1] == "1":
                return "END Kedarnath Risk: HIGH\nWater level critical. Evacuate low-lying areas. Helpline: 1077"
            elif inputs[1] == "2":
                return "END Delhi Risk: MODERATE\nMonitor alerts. High rainfall expected."
            else:
                return "END Risk assessment unavailable. Call 1070 for assistance."
    
    # Option 2: Report Flood
    elif main_option == "2":
        if len(inputs) == 1:
            return "CON Enter your flood report\n(Location and water level description)"
        elif len(inputs) == 2:
            report_text = inputs[1]
            try:
                print(f"USSD Report from {phoneNumber}: {report_text}")
                return "END Report received! Authorities notified. Stay safe."
            except:
                return "END Report received! Thank you."
    
    # Option 3: Find Shelter
    elif main_option == "3":
        if len(inputs) == 1:
            return "CON Select area\n1. Kedarnath Region\n2. Delhi Region"
        elif len(inputs) == 2:
            if inputs[1] == "1":
                return """END Nearest Shelters in Kedarnath:
1. Primary School - 2km (150 capacity)
2. Community Hall - 3km (250 capacity)
3. Temple Guesthouse - 1.5km (80 cap, FULL)
Call 1070 for transport assistance."""
            elif inputs[1] == "2":
                return """END Nearest Shelters in Delhi:
1. Lajpat Nagar Community Hall
2. Karol Bagh Govt School
3. Dwarka Sports Complex
Visit Disaster Portal for maps."""
    
    # Option 4: Emergency Contacts
    elif main_option == "4":
        return """END Emergency Contacts:
• NDRF: 108
• State Control: 1070
• District: 1077
• Ambulance: 102
• Police: 100
• Fire: 101"""
    
    # Option 5: Weather Update
    elif main_option == "5":
        return "END Weather Alert: Heavy rainfall expected in next 24 hours. Stay indoors and monitor official updates."
    
    return "END Invalid option. Please try again or call 1070 for help."

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
    """
    Invalidate admin session
    """
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
    """
    Check if admin session is valid
    """
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
# PUBLIC REGISTRATION (CITIZENS ONLY)
# =====================================================

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: str

@app.post("/register")
async def register(request: Request, user: RegisterRequest):
    """
    PUBLIC REGISTRATION ENDPOINT
    All self-registered users are assigned 'citizen' role by default.
    """
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

    return {
        "message": "User registered successfully as citizen",
        "role": "citizen",
        "email": user.email
    }

# =====================================================
# USER LOGIN (MONGODB AUTH)
# =====================================================

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/login")
async def login(request: Request, user: LoginRequest):
    """
    USER LOGIN (for citizens + all roles)
    """
    print("LOGIN INPUT:", user)
    
    rate_limiter(request, "user_login")
    
    existing_user = users_collection.find_one({"email": user.email})
    
    print("FOUND USER:", existing_user)
    
    if not existing_user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if not verify_password(user.password, existing_user.get("password")):
        raise HTTPException(status_code=401, detail="Incorrect password")
    
    # Generate JWT token
    jwt_token = create_jwt_token({"email": user.email, "role": existing_user.get("role")})
    
    return {
        "message": "Login successful",
        "token": jwt_token,
        "user": {
            "name": existing_user.get("name"),
            "email": existing_user.get("email"),
            "role": existing_user.get("role")
        }
    }

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
    admin_email: str = Header(..., description="Admin email for authentication"),
    admin_token: str = Header(..., description="Admin session token")
):
    """
    SECURE ADMIN-ONLY ENDPOINT
    Creates users with privileged roles
    """
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
    """
    SECURE ADMIN-ONLY ENDPOINT
    Retrieves all registered users with their roles
    """
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
    """
    SECURE ADMIN-ONLY ENDPOINT
    Retrieves users filtered by role
    """
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
        {"$push": {"emergency_contacts": contact}}
    )
    return {"message": "Contact added"}

@app.get("/contacts/{phone}")
def get_contacts(phone: str):
    user = users_collection.find_one({"phone": phone})
    return user.get("emergency_contacts", [])

# =====================================================
# SPA FALLBACK (for React Router)
# =====================================================

@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    """
    Serve index.html for all non-API routes to support React Router
    """
    # Skip API routes
    if full_path.startswith("api/") or full_path.startswith("admin/") or full_path in ["", "health", "test-alert", "ussd"]:
        raise HTTPException(status_code=404, detail="Not found")
    
    # For production, you'd serve the React build/index.html
    return {"message": "React app would be served here", "path": full_path}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)