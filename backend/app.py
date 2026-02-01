# -*- coding: utf-8 -*-
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import requests
import numpy as np
import pandas as pd
import joblib
import tensorflow as tf
from dotenv import load_dotenv

# =====================================================
# 0. CONFIGURATION
# =====================================================
load_dotenv()

app = FastAPI(
    title="SatarkMitra AI Backend",
    version="1.0.0"
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
# 1. SAFE MODEL LOADING (CRITICAL FIX)
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
# 2. STATIC DATA
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
# 3. SCHEMAS
# =====================================================
class KedarnathRequest(BaseModel):
    river_level: float = 1.0
    rainfall: float = 5.0

# =====================================================
# 4. ENDPOINTS
# =====================================================

@app.get("/")
def home():
    return {"status": "running", "message": "SatarkMitra AI Backend is Active"}

@app.get("/health")
def health():
    return {"status": "ok"}

# -----------------------------------------------------
# ✅ FIXED /api/predict (NO MORE 500)
# -----------------------------------------------------
@app.post("/api/predict")
def predict_kedarnath(data: KedarnathRequest):

    if not all([scaler_dl, gru_model, tcn_model]):
        raise HTTPException(
            status_code=503,
            detail="Core ML models not available"
        )

    river = data.river_level
    rain = data.rainfall

    history = [[river * (1 - 0.02 * i), rain] for i in range(6)]
    seq = np.array([history])

    scaled = scaler_dl.transform(seq.reshape(6, 2)).reshape(1, 6, 2)

    gru_forecast = float(gru_model.predict(scaled, verbose=0)[0][0])
    tcn_forecast = float(tcn_model.predict(scaled, verbose=0)[0][0])

    risk_votes = []

    if xgb_model is not None:
        df = pd.DataFrame([{
            "river_water_area_sqkm": river,
            "rainfall_mm": rain,
            "GRU_Forecast": gru_forecast,
            "TCN_Forecast": tcn_forecast
        }])
        try:
            risk_votes.append(int(xgb_model.predict(df)[0]))
        except:
            pass

    if svm_model is not None and scaler_hybrid is not None:
        try:
            risk_votes.append(int(svm_model.predict(scaler_hybrid.transform(df))[0]))
        except:
            pass

    risk = "HIGH" if any(risk_votes) else "LOW"

    return {
        "location": "Kedarnath",
        "alert_level": risk,
        "gru_forecast": round(gru_forecast, 3),
        "tcn_forecast": round(tcn_forecast, 3)
    }

# -----------------------------------------------------
# DELHI ZONES
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

    return [
        {
            "zone_name": z["name"],
            "latitude": z["lat"],
            "longitude": z["lon"],
            "risk_score": round(score, 2),
            "risk_status": status(score),
            "details": {
                "elevation": z["elevation"],
                "drainage": z["drainage"]
            }
        }
        for z in DELHI_ZONES
    ]

# -----------------------------------------------------
# WEATHER
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
