# -*- coding: utf-8 -*-
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
import numpy as np
import pandas as pd
import joblib
import tensorflow as tf
from dotenv import load_dotenv

# =====================================================
# 0. CONFIGURATION & SETUP
# =====================================================
load_dotenv()

app = Flask(__name__)
CORS(app)

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

if not OPENWEATHER_API_KEY:
    print("⚠️ WARNING: OPENWEATHER_API_KEY not found in .env file.")

# =====================================================
# 1. LOAD KEDARNATH MODELS
# =====================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "ml_models")

try:
    scaler_dl = joblib.load(os.path.join(MODEL_DIR, "scaler_dl.pkl"))
    scaler_hybrid = joblib.load(os.path.join(MODEL_DIR, "scaler_hybrid.pkl"))
    gru_model = tf.keras.models.load_model(os.path.join(MODEL_DIR, "gru_standalone_model.h5"), compile=False)
    tcn_model = tf.keras.models.load_model(os.path.join(MODEL_DIR, "tcn_standalone_model.h5"), compile=False)
    xgb_model = joblib.load(os.path.join(MODEL_DIR, "xgb_hybrid_model.pkl"))
    svm_model = joblib.load(os.path.join(MODEL_DIR, "svm_hybrid_model.pkl"))
    print("✅ Kedarnath Models Loaded Successfully")
except Exception as e:
    print(f"⚠️ Warning: Could not load some Kedarnath models. Error: {e}")

# =====================================================
# ✅ STEP 1: LOAD DELHI ML MODEL (ADDED)
# =====================================================
DELHI_MODEL_PATH = os.path.join(BASE_DIR, "ml_models", "drainage_risk_model.pkl")
delhi_model = joblib.load(DELHI_MODEL_PATH)
print("✅ Delhi Drainage Risk Model Loaded")

# =====================================================
# 2. STATIC DATA: DELHI ZONES
# =====================================================
DELHI_ZONES = [
    {
        "id": "zone_1",
        "name": "Minto Bridge (Connaught Place)",
        "lat": 28.6327,
        "lon": 77.2197,
        "elevation_meters": 208,
        "drainage_quality": "POOR"
    },
    {
        "id": "zone_2",
        "name": "ITO Junction",
        "lat": 28.6289,
        "lon": 77.2413,
        "elevation_meters": 210,
        "drainage_quality": "MODERATE"
    },
    {
        "id": "zone_3",
        "name": "Okhla Underpass",
        "lat": 28.5367,
        "lon": 77.2714,
        "elevation_meters": 212,
        "drainage_quality": "POOR"
    },
    {
        "id": "zone_4",
        "name": "Civil Lines",
        "lat": 28.6816,
        "lon": 77.2281,
        "elevation_meters": 218,
        "drainage_quality": "GOOD"
    },
    {
        "id": "zone_5",
        "name": "Dwarka Sector 12",
        "lat": 28.5921,
        "lon": 77.0390,
        "elevation_meters": 215,
        "drainage_quality": "MODERATE"
    },
    {
        "id": "zone_6",
        "name": "Sangam Vihar",
        "lat": 28.5028,
        "lon": 77.2435,
        "elevation_meters": 213,
        "drainage_quality": "POOR"
    }
]

# =====================================================
# 3. EXISTING KEDARNATH ENDPOINT (UNCHANGED)
# =====================================================
@app.route("/api/predict", methods=["POST"])
def predict_kedarnath():
    try:
        data = request.json or {}
        river = float(data.get("river_level", 1.0))
        rain = float(data.get("rainfall", 5.0))

        history = [[river * (1 - 0.02 * i), rain] for i in range(6)]
        seq = np.array([history])

        scaled = scaler_dl.transform(seq.reshape(6, 2)).reshape(1, 6, 2)
        gru_forecast = float(gru_model.predict(scaled, verbose=0)[0][0])
        tcn_forecast = float(tcn_model.predict(scaled, verbose=0)[0][0])

        df = pd.DataFrame([{
            "river_water_area_sqkm": river,
            "rainfall_mm": rain,
            "river_rolling_mean_3": river,
            "river_rolling_std_3": 0.5,
            "rainfall_rolling_sum_3": rain * 3,
            "rainfall_rolling_mean_3": rain,
            "river_lag_1": river,
            "river_lag_2": river,
            "rainfall_lag_1": rain,
            "rainfall_lag_2": rain,
            "river_change": 0,
            "rainfall_change": 0,
            "mean_elevation_meters": 295,
            "mean_slope_degrees": 5.2,
            "land_cover_class_10_percent": 25,
            "land_cover_class_20_percent": 1.5,
            "land_cover_class_30_percent": 10,
            "land_cover_class_40_percent": 20,
            "land_cover_class_50_percent": 17,
            "land_cover_class_60_percent": 12,
            "land_cover_class_80_percent": 14.5,
            "GRU_Forecast": gru_forecast,
            "TCN_Forecast": tcn_forecast
        }])

        xgb_pred = int(xgb_model.predict(df)[0])
        svm_pred = int(svm_model.predict(scaler_hybrid.transform(df))[0])

        risk = "HIGH" if (xgb_pred or svm_pred) else "LOW"

        return jsonify({
            "status": "success",
            "location": "Kedarnath",
            "alert_level": risk
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# =====================================================
# ✅ STEP 2: NEW ML-BASED DELHI ZONES ENDPOINT (ADDED)
# =====================================================
@app.route("/api/delhi/zones", methods=["GET"])
def delhi_ml_zones():
    results = []

    sample_input = {
        "river_water_area_sqkm": 6.5,
        "upstream_runoff_mm": 1.2,
        "rainfall_mm": 60,
        "ggn_runoff_mm": 0.9,
        "ggn_rainfall_mm": 55,
        "month": 7
    }

    X = pd.DataFrame([sample_input])
    predicted_score = float(delhi_model.predict(X)[0])

    def get_status(score):
        if score >= 30:
            return "CRITICAL"
        elif score >= 20:
            return "HIGH"
        elif score >= 10:
            return "MODERATE"
        return "LOW"

    for zone in DELHI_ZONES:
        results.append({
            "zone_name": zone["name"],
            "latitude": zone["lat"],
            "longitude": zone["lon"],
            "risk_score": round(predicted_score, 2),
            "risk_status": get_status(predicted_score),
            "details": {
                "elevation": zone["elevation_meters"],
                "drainage": zone["drainage_quality"]
            }
        })

    return jsonify(results)

# =====================================================
# 4. EXISTING DELHI WEATHER ENDPOINT (UNCHANGED)
# =====================================================
@app.route("/api/predict_delhi", methods=["GET", "POST"])
def predict_delhi_zones():
    """
    Fetches live weather for Delhi and calculates risk for multiple zones
    based on their static administrative attributes (elevation, drainage).
    """
    try:
        if not OPENWEATHER_API_KEY:
            return jsonify({"status": "error", "message": "Server API Key missing"}), 500

        # 1. Fetch City-Wide Weather
        base_lat, base_lon = "28.6139", "77.2090" 
        
        # Using the secure API Key variable
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={base_lat}&lon={base_lon}&appid={OPENWEATHER_API_KEY}&units=metric"
        response = requests.get(url, timeout=5)
        
        if response.status_code != 200:
            return jsonify({"status": "error", "message": "Weather API Provider Error"}), 502
            
        w_data = response.json()
        
        # Live Weather Data
        rain_1h = w_data.get("rain", {}).get("1h", 0.0)
        weather_desc = w_data.get("weather", [{}])[0].get("description", "Clear")
        temp = w_data.get("main", {}).get("temp")
        humidity = w_data.get("main", {}).get("humidity")

        results = []

        # 2. Iterate Zones and Calculate Risk
        for zone in DELHI_ZONES:
            risk_score = 0
            
            # --- FACTOR A: DYNAMIC (Live Weather) ---
            if rain_1h > 15:
                risk_score += 50
            elif rain_1h > 5:
                risk_score += 30
            elif rain_1h > 0.5:
                risk_score += 10
            
            # --- FACTOR B: STATIC (Infrastructure) ---
            # Elevation Penalty
            if zone["elevation_meters"] < 210:
                risk_score += 30
            elif zone["elevation_meters"] < 215:
                risk_score += 15
                
            # Drainage Penalty
            if zone["drainage_quality"] == "POOR":
                risk_score += 30
            elif zone["drainage_quality"] == "MODERATE":
                risk_score += 10
            
            # --- DETERMINE STATUS ---
            status = "LOW"
            if risk_score >= 70:
                status = "CRITICAL"
            elif risk_score >= 40:
                status = "HIGH"
            elif risk_score >= 20:
                status = "MODERATE"

            results.append({
                "zone_name": zone["name"],
                "latitude": zone["lat"],
                "longitude": zone["lon"],
                "risk_status": status,
                "risk_score": risk_score,
                "details": {
                    "elevation": zone["elevation_meters"],
                    "drainage": zone["drainage_quality"]
                }
            })

        return jsonify({
            "status": "success",
            "city_weather": {
                "description": weather_desc,
                "rain_1h": rain_1h,
                "temperature": temp,
                "humidity": humidity
            },
            "zones_data": results
        })

    except Exception as e:
        return jsonify({
            "status": "error", 
            "message": str(e),
            "note": "Internal Server Error"
        }), 500

# =====================================================
# 5. UTILITY ROUTES
# =====================================================
@app.route("/")
def home():
    return jsonify({
        "status": "running",
        "message": "SatarkMitra AI Backend is Active"
    })

@app.route("/health")
def health():
    return jsonify({"status": "ok"})

@app.route("/api/weather_by_location", methods=["GET"])
def weather_by_location():
    lat = request.args.get("lat")
    lon = request.args.get("lon")

    if not lat or not lon:
        return jsonify({"status": "error", "message": "Location missing"}), 400

    url = (
        f"https://api.openweathermap.org/data/2.5/weather"
        f"?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
    )

    res = requests.get(url, timeout=5)
    data = res.json()

    return jsonify({
        "status": "success",
        "weather": {
            "temperature": data["main"]["temp"],
            "humidity": data["main"]["humidity"],
            "rain_1h": data.get("rain", {}).get("1h", 0),
            "description": data["weather"][0]["description"]
        }
    })



# =====================================================
if __name__ == "__main__":
    app.run(debug=True, port=8000)
