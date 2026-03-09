# -*- coding: utf-8 -*-

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import os
import requests
import numpy as np
import pandas as pd
import joblib
import tensorflow as tf
from dotenv import load_dotenv
from datetime import datetime
import re

from db.mongo import citizen_reports
from db.models import CitizenReport

# =====================================================
# CONFIGURATION
# =====================================================

load_dotenv()

app = FastAPI(
    title="SatarkMitra AI Backend",
    version="1.4.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "ml_models")

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
# DELHI ZONES
# =====================================================

DELHI_ZONES = [
    {"name": "Minto Bridge", "lat": 28.6327, "lon": 77.2197, "elevation": 208, "drainage": "POOR"},
    {"name": "ITO Junction", "lat": 28.6289, "lon": 77.2413, "elevation": 210, "drainage": "MODERATE"},
    {"name": "Okhla Underpass", "lat": 28.5367, "lon": 77.2714, "elevation": 212, "drainage": "POOR"},
    {"name": "Civil Lines", "lat": 28.6816, "lon": 77.2281, "elevation": 218, "drainage": "GOOD"},
]

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
# DELHI ZONES RISK
# =====================================================

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
        if s >= 30:
            return "CRITICAL"
        if s >= 20:
            return "HIGH"
        if s >= 10:
            return "MODERATE"
        return "LOW"

    return [{
        "zone_name": z["name"],
        "latitude": z["lat"],
        "longitude": z["lon"],
        "risk_score": round(score, 2),
        "risk_status": status(score)
    } for z in DELHI_ZONES]


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
            "created_at": datetime.utcnow()
        }

        result = citizen_reports.insert_one(record)

        print("Report saved:", record)

        return {
            "status": "received",
            "verification_status": verification,
            "scam_score": scam_score,
            "report_id": str(result.inserted_id)
        }

    except Exception as e:

        print("ERROR saving report:", e)

        raise HTTPException(status_code=500, detail="Report failed")


# =====================================================
# FETCH REPORTS FOR DASHBOARDS
# =====================================================

@app.get("/api/reports")
def get_reports():

    reports = list(citizen_reports.find().sort("created_at", -1))

    for r in reports:
        r["_id"] = str(r["_id"])

    return reports