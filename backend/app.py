# -*- coding: utf-8 -*-
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import os
import requests
import numpy as np
import pandas as pd
import joblib
import tensorflow as tf
from dotenv import load_dotenv
from pymongo import MongoClient
from datetime import datetime
import re

# =====================================================
# 0. CONFIGURATION
# =====================================================
load_dotenv()

app = FastAPI(
    title="SatarkMitra AI Backend",
    version="1.2.1"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # OK for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "ml_models")

# =====================================================
# 1. MONGODB SETUP
# =====================================================
MONGO_URI = "mongodb://localhost:27017"
mongo_client = MongoClient(MONGO_URI)

db = mongo_client["satarkmitra"]
citizen_reports = db["citizen_reports"]

# =====================================================
# 2. SAFE MODEL LOADING
# =====================================================
scaler_dl = None
scaler_hybrid = None
gru_model = None
tcn_model = None
xgb_model = None
svm_model = None
delhi_model = None

def safe_load_joblib(path, name):
    try:
        model = joblib.load(path)
        print(f"✅ Loaded {name}")
        return model
    except Exception as e:
        print(f"⚠️ Failed to load {name}: {e}")
        return None

def safe_load_tf(path, name):
    try:
        model = tf.keras.models.load_model(path, compile=False)
        print(f"✅ Loaded {name}")
        return model
    except Exception as e:
        print(f"⚠️ Failed to load {name}: {e}")
        return None

scaler_dl = safe_load_joblib(os.path.join(MODEL_DIR, "scaler_dl.pkl"), "scaler_dl")
scaler_hybrid = safe_load_joblib(os.path.join(MODEL_DIR, "scaler_hybrid.pkl"), "scaler_hybrid")
gru_model = safe_load_tf(os.path.join(MODEL_DIR, "gru_standalone_model.h5"), "GRU model")
tcn_model = safe_load_tf(os.path.join(MODEL_DIR, "tcn_standalone_model.h5"), "TCN model")
xgb_model = safe_load_joblib(os.path.join(MODEL_DIR, "xgb_hybrid_model.pkl"), "XGBoost model")
svm_model = safe_load_joblib(os.path.join(MODEL_DIR, "svm_hybrid_model.pkl"), "SVM model")
delhi_model = safe_load_joblib(os.path.join(MODEL_DIR, "drainage_risk_model.pkl"), "Delhi Drainage model")

# =====================================================
# 3. STATIC DATA
# =====================================================
DELHI_ZONES = [
    {"name": "Minto Bridge (Connaught Place)", "lat": 28.6327, "lon": 77.2197, "elevation": 208, "drainage": "POOR"},
    {"name": "ITO Junction", "lat": 28.6289, "lon": 77.2413, "elevation": 210, "drainage": "MODERATE"},
    {"name": "Okhla Underpass", "lat": 28.5367, "lon": 77.2714, "elevation": 212, "drainage": "POOR"},
    {"name": "Civil Lines", "lat": 28.6816, "lon": 77.2281, "elevation": 218, "drainage": "GOOD"},
    {"name": "Dwarka Sector 12", "lat": 28.5921, "lon": 77.0390, "elevation": 215, "drainage": "MODERATE"},
    {"name": "Sangam Vihar", "lat": 28.5028, "lon": 77.2435, "elevation": 213, "drainage": "POOR"},
]

# =====================================================
# 4. SCHEMAS
# =====================================================
class KedarnathRequest(BaseModel):
    river_level: float = 1.0
    rainfall: float = 5.0

class CitizenReport(BaseModel):
    type: str = Field(..., example="flood")
    description: str = Field(..., min_length=5)
    latitude: float
    longitude: float
    source: str = Field(default="citizen")

# =====================================================
# 5. HONEYPOT VERIFICATION ENGINE
# =====================================================
SCAM_PATTERNS = [
    r"donate",
    r"upi",
    r"account",
    r"http[s]?://",
    r"pay",
    r"fund",
    r"urgent",
    r"send money",
]

def honeypot_verify_report(text: str) -> str:
    text = text.lower()
    matches = sum(1 for p in SCAM_PATTERNS if re.search(p, text))

    if matches >= 2:
        return "suspicious"
    return "trusted"

# =====================================================
# 6. CORE ROUTES
# =====================================================
@app.get("/")
def home():
    return {"status": "running", "message": "SatarkMitra AI Backend is Active"}

@app.get("/health")
def health():
    return {"status": "ok"}

# -----------------------------------------------------
# Kedarnath Prediction
# -----------------------------------------------------
@app.post("/api/predict")
def predict_kedarnath(data: KedarnathRequest):
    if not all([scaler_dl, gru_model, tcn_model]):
        raise HTTPException(status_code=503, detail="Core ML models not available")

    river = data.river_level
    rain = data.rainfall

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

# -----------------------------------------------------
# Delhi Zones
# -----------------------------------------------------
@app.get("/api/delhi/zones")
def delhi_zones():
    if delhi_model is None:
        raise HTTPException(status_code=503, detail="Delhi ML model not loaded")

    X = pd.DataFrame([{
        "river_water_area_sqkm": 6.5,
        "upstream_runoff_mm": 1.2,
        "rainfall_mm": 60,
        "ggn_runoff_mm": 0.9,
        "ggn_rainfall_mm": 55,
        "month": 7
    }])

    score = float(delhi_model.predict(X)[0])

    def status(s):
        if s >= 30: return "CRITICAL"
        if s >= 20: return "HIGH"
        if s >= 10: return "MODERATE"
        return "LOW"

    return [{
        "zone_name": z["name"],
        "latitude": z["lat"],
        "longitude": z["lon"],
        "risk_score": round(score, 2),
        "risk_status": status(score),
        "details": {
            "elevation": z["elevation"],
            "drainage": z["drainage"]
        }
    } for z in DELHI_ZONES]

# -----------------------------------------------------
# Weather
# -----------------------------------------------------
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

# -----------------------------------------------------
# 🧠 CITIZEN REPORT + HONEYPOT
# -----------------------------------------------------
@app.post("/api/report")
def submit_report(report: CitizenReport):
    verification = honeypot_verify_report(report.description)

    record = {
        "type": report.type,
        "description": report.description,
        "location": {
            "lat": report.latitude,
            "lon": report.longitude
        },
        "source": report.source,
        "verification_status": verification,
        "created_at": datetime.utcnow()
    }

    result = citizen_reports.insert_one(record)

    return {
        "status": "received",
        "verification_status": verification,
        "report_id": str(result.inserted_id)
    }
