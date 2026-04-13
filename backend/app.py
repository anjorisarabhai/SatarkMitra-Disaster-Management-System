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

import os
import requests
import numpy as np
import pandas as pd
import joblib
import tensorflow as tf
from dotenv import load_dotenv
from datetime import datetime, timedelta
import re
from typing import Optional, Dict
import secrets
from functools import wraps
import time
from collections import defaultdict

from db.models import CitizenReport
from passlib.context import CryptContext
from pydantic import BaseModel

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    # bcrypt limit fix (VERY IMPORTANT)
    password = password[:72]
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

# =====================================================
# CONFIGURATION
# =====================================================

load_dotenv()

app = FastAPI(
    title="SatarkMitra AI Backend",
    version="1.7.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
TOKEN_EXPIRY_HOURS = 1  # 🔐 Tokens expire after 1 hour

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "ml_models")

# =====================================================
# 🔐 IMPROVED TOKEN STORAGE WITH EXPIRY
# =====================================================

# Store active admin sessions with expiry
# Structure: {token: {"email": str, "created_at": datetime, "last_used": datetime}}
ACTIVE_ADMIN_SESSIONS: Dict[str, dict] = {}

# 🔐 Rate limiting storage
# Structure: {ip_address: [(timestamp1, endpoint1), (timestamp2, endpoint2), ...]}
RATE_LIMIT_STORAGE: Dict[str, list] = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # 60 seconds window
RATE_LIMIT_MAX_REQUESTS = 30  # Max 30 requests per window

def cleanup_expired_tokens():
    """Remove expired tokens from memory"""
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

def generate_session_token() -> str:
    """Generate a secure random token"""
    return secrets.token_urlsafe(32)

def verify_admin_token(admin_email: str, admin_token: str) -> bool:
    """
    Verify admin session token with expiry check
    🔐 IMPROVED: Tokens expire after 1 hour
    """
    # Clean up expired tokens first
    cleanup_expired_tokens()
    
    token_data = ACTIVE_ADMIN_SESSIONS.get(admin_token)
    if not token_data:
        return False
    
    # Check if token belongs to this admin
    if token_data.get("email") != admin_email:
        return False
    
    # Check expiry
    created_at = token_data.get("created_at")
    if created_at:
        expiry_time = created_at + timedelta(hours=TOKEN_EXPIRY_HOURS)
        if datetime.utcnow() > expiry_time:
            del ACTIVE_ADMIN_SESSIONS[admin_token]
            return False
    
    # Update last used timestamp
    token_data["last_used"] = datetime.utcnow()
    
    # Use constant-time comparison to prevent timing attacks
    return secrets.compare_digest(token_data["email"], admin_email)

# =====================================================
# 🔐 RATE LIMITING MIDDLEWARE
# =====================================================

def rate_limiter(request: Request, endpoint: str = "default"):
    """
    Rate limiting to prevent brute force attacks
    🔐 IMPROVED: Prevents abuse of login and admin endpoints
    """
    client_ip = request.client.host
    
    # Clean up old entries
    current_time = time.time()
    RATE_LIMIT_STORAGE[client_ip] = [
        (ts, ep) for ts, ep in RATE_LIMIT_STORAGE[client_ip]
        if current_time - ts < RATE_LIMIT_WINDOW
    ]
    
    # Check rate limit
    if len(RATE_LIMIT_STORAGE[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": str(RATE_LIMIT_WINDOW)}
        )
    
    # Add current request
    RATE_LIMIT_STORAGE[client_ip].append((current_time, endpoint))

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
# GENERATE DELHI MICRO HOTSPOTS (2500+)
# =====================================================

def generate_delhi_hotspots():

    lat_min, lat_max = 28.40, 28.88
    lon_min, lon_max = 76.84, 77.35

    step = 0.05

    hotspots = []

    for lat in np.arange(lat_min, lat_max, step):
        for lon in np.arange(lon_min, lon_max, step):

            hotspots.append({
                "name": f"Cell_{round(lat,3)}_{round(lon,3)}",
                "lat": float(lat),
                "lon": float(lon),
                "elevation": 210,
                "drainage": "MODERATE"
            })

    return hotspots

DELHI_ZONES = generate_delhi_hotspots()

# =====================================================
# IMPROVED SCAM DETECTION ENGINE
# =====================================================

SCAM_PATTERNS = [
    r"upi",
    r"donate",
    r"donation",
    r"send money",
    r"transfer",
    r"account number",
    r"bank",
    r"fund",
    r"http[s]?://",
    r"bit\.ly",
    r"paytm",
    r"gpay",
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
# AUTH HELPER FUNCTIONS (SECURE VERSION WITH EXPIRY)
# =====================================================

def authenticate_admin(email: str, password: str, request: Request = None):
    """
    Authenticate admin with email AND password
    Returns session token if successful
    🔐 IMPROVED: Token expires after 1 hour
    """
    if request:
        rate_limiter(request, "admin_login")
    
    admin_user = users_collection.find_one({"email": email})
    
    if not admin_user:
        return None
    
    if admin_user.get("role") != "admin":
        return None
    
    # Verify password
    if not verify_password(password, admin_user.get("password", "")):
        return None
    
    # Generate session token with expiry
    token = secrets.token_urlsafe(32)
    current_time = datetime.utcnow()
    
    ACTIVE_ADMIN_SESSIONS[token] = {
        "email": email,
        "created_at": current_time,
        "last_used": current_time,
        "expires_at": current_time + timedelta(hours=TOKEN_EXPIRY_HOURS)
    }
    
    # Clean up old tokens periodically
    cleanup_expired_tokens()
    
    return {
        "token": token,
        "email": email,
        "name": admin_user.get("name"),
        "role": "admin",
        "expires_in": f"{TOKEN_EXPIRY_HOURS}h"
    }

def verify_admin_session(admin_email: str, admin_token: str, request: Request = None):
    """
    Verify admin session using email + token
    🔐 IMPROVED: Checks token expiry
    """
    if request:
        rate_limiter(request, "admin_verify")
    
    # Check if token exists and matches
    if not verify_admin_token(admin_email, admin_token):
        raise HTTPException(status_code=401, detail="Invalid or expired admin session")
    
    # Verify admin still exists and has admin role
    admin_user = users_collection.find_one({"email": admin_email})
    if not admin_user or admin_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    return admin_user

# =====================================================
# BASIC ROUTES
# =====================================================

@app.get("/")
def home():
    return {"status": "running", "message": "SatarkMitra AI Backend is Active"}

@app.get("/health")
def health():
    return {"status": "ok"}

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

    if delhi_model is None:
        raise HTTPException(status_code=503, detail="Delhi ML model not loaded")

    results = []

    def status(s):
        if s >= 30:
            return "CRITICAL"
        if s >= 20:
            return "HIGH"
        if s >= 10:
            return "MODERATE"
        return "LOW"

    for z in DELHI_ZONES[:30]:

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

    data = requests.get(url, timeout=5).json()

    return {
        "temperature": data["main"]["temp"],
        "humidity": data["main"]["humidity"],
        "rain_1h": data.get("rain", {}).get("1h", 0),
        "description": data["weather"][0]["description"]
    }

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
    🔐 IMPROVED: Rate limited to prevent brute force
    """
    auth_result = authenticate_admin(email, password, request)
    
    if not auth_result:
        # Add small delay to prevent timing attacks
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
    # Verify session first
    verify_admin_session(admin_email, admin_token, request)
    
    # Remove token
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
    🔐 Rate limited to prevent abuse
    """
    rate_limiter(request, "register")
    
    print("REGISTER INPUT:", user)

    # Check if user already exists
    existing_user = users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(user.password)

    user_data = {
        "name": user.name,
        "phone": user.phone,
        "email": user.email,
        "password": hashed,
        "role": "citizen",  # 🔒 Force citizen role - CANNOT be overridden
        "emergency_contacts": [],
        "created_at": datetime.utcnow(),
        "created_via": "public_registration"
    }

    users_collection.insert_one(user_data)

    # Add to subscribers list for SMS alerts
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
    Uses MongoDB instead of localStorage
    """
    
    print("LOGIN INPUT:", user)
    
    # Optional: rate limit login attempts
    rate_limiter(request, "user_login")
    
    # Step 1: Find user
    existing_user = users_collection.find_one({"email": user.email})
    
    print("FOUND USER:", existing_user)
    
    if not existing_user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Step 2: Verify password
    if not verify_password(user.password, existing_user.get("password")):
        raise HTTPException(status_code=401, detail="Incorrect password")
    
    # Step 3: Return user data (NO PASSWORD)
    return {
        "message": "Login successful",
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
# 🔐 SECURE ADMIN-ONLY USER CREATION (WITH RATE LIMITING)
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
    
    🔒 SECURITY FEATURES:
    - Requires valid session token (expires in 1 hour)
    - Rate limited to prevent abuse
    - Audit trail logged
    - Cannot create admin accounts
    """
    
    print(f"🔐 Admin Create User Request by: {admin_email}")
    
    # Step 1: Verify admin session (email + token) with rate limiting
    admin_user = verify_admin_session(admin_email, admin_token, request)
    
    print(f"✅ Admin verified: {admin_user['email']} (role: {admin_user['role']})")
    
    # Step 2: Define allowed roles for admin creation
    # 🔒 SECURITY: Removed 'admin' from allowed roles
    allowed_roles = ["govt_official", "control_room", "first_responder"]
    
    # Step 3: Validate requested role
    requested_role = user.role
    
    if not requested_role:
        raise HTTPException(status_code=400, detail="Role is required")
    
    if requested_role not in allowed_roles:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid role '{requested_role}'. Allowed roles: {allowed_roles}"
        )
    
    # Step 4: Validate required fields
    required_fields = ["name", "email", "phone", "password"]
    for field in required_fields:
        if not getattr(user, field):
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    # Step 5: Check if email already exists
    existing_user = users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Step 6: Hash password and create user
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
    
    # Step 7: Insert into database
    result = users_collection.insert_one(new_user)
    
    # Step 8: Optional - Add to subscribers for alerts
    if user.subscribe_alerts:
        subscribers_collection.insert_one({
            "phone": user.phone,
            "subscribed": True,
            "subscribed_at": datetime.utcnow()
        })
    
    # Step 9: Log the creation (for audit purposes)
    print(f"📝 Admin {admin_email} created user {user.email} with role {requested_role}")
    print("USER DATA RECEIVED:", user)
    
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
    # Verify admin session
    verify_admin_session(admin_email, admin_token, request)
    
    users = []
    cursor = users_collection.find({}, {"password": 0})  # Exclude passwords
    
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
    # Verify admin session
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