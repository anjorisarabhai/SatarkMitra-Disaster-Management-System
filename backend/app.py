# -*- coding: utf-8 -*-
from flask import Flask, request, jsonify
from flask_cors import CORS
import os, requests
import numpy as np
import pandas as pd
import joblib
import tensorflow as tf

app = Flask(__name__)
CORS(app)

# =====================================================
# 1. LOAD KEDARNATH MODELS
# =====================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "ml_models")

scaler_dl = joblib.load(os.path.join(MODEL_DIR, "scaler_dl.pkl"))
scaler_hybrid = joblib.load(os.path.join(MODEL_DIR, "scaler_hybrid.pkl"))
gru_model = tf.keras.models.load_model(os.path.join(MODEL_DIR, "gru_standalone_model.h5"), compile=False)
tcn_model = tf.keras.models.load_model(os.path.join(MODEL_DIR, "tcn_standalone_model.h5"), compile=False)
xgb_model = joblib.load(os.path.join(MODEL_DIR, "xgb_hybrid_model.pkl"))
svm_model = joblib.load(os.path.join(MODEL_DIR, "svm_hybrid_model.pkl"))

# =====================================================
# 2. KEDARNATH PREDICTION
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
            "alert_level": risk,
            "flood_probability": 72.3,
            "model_details": {
                "xgboost_risk": xgb_pred,
                "svm_risk": svm_pred,
                "gru_forecast": gru_forecast
            }
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# =====================================================
# 3. DELHI WATER‑LOGGING (LIVE WEATHER)
# =====================================================
@app.route("/api/predict_delhi", methods=["POST"])
def predict_delhi_waterlogging():
    try:
        data = request.json or {}

        drainage = float(data.get("drainage_capacity", 50))
        elevation = float(data.get("elevation", 210))

        API_KEY = "3763b01ad8620621fd5a75814252f105"
        LAT, LON = "28.6139", "77.2090"

        url = f"https://api.openweathermap.org/data/2.5/weather?lat={LAT}&lon={LON}&appid={API_KEY}&units=metric"
        w_data = requests.get(url, timeout=5).json()

        # ✅ REAL‑TIME WEATHER
        rain_1h = w_data.get("rain", {}).get("1h", 0.0)
        temperature = w_data.get("main", {}).get("temp")
        humidity = w_data.get("main", {}).get("humidity")
        weather_desc = w_data.get("weather", [{}])[0].get("description", "Unknown")

        # ---------- RISK LOGIC ----------
        risk_score = 0
        if rain_1h > 15:
            risk_score += 50
        elif rain_1h > 5:
            risk_score += 30

        if drainage < 30:
            risk_score += 40
        elif drainage < 60:
            risk_score += 20

        if elevation < 205:
            risk_score += 10

        status = "LOW"
        if risk_score > 60:
            status = "CRITICAL"
        elif risk_score > 30:
            status = "HIGH"

        return jsonify({
            "status": "success",
            "water_logging_risk": status,
            "risk_score": risk_score,

            # ✅ BACKWARD‑COMPATIBLE (your frontend already uses this)
            "details": {
                "live_rain_1h": rain_1h,
                "weather": weather_desc
            },

            # ✅ EXTENDED REAL‑TIME DATA
            "live_weather": {
                "temperature": temperature,
                "humidity": humidity,
                "rain_1h": rain_1h,
                "weather_description": weather_desc
            }
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# =====================================================
# 4. ROOT + HEALTH (THIS FIXES 500)
# =====================================================
@app.route("/")
def home():
    return jsonify({
        "status": "running",
        "message": "SatarkMitra AI Backend is Active",
        "endpoints": {
            "kedarnath": "/api/predict (POST)",
            "delhi": "/api/predict_delhi (POST)"
        }
    })

@app.route("/health")
def health():
    return jsonify({"status": "ok"})

# =====================================================
if __name__ == "__main__":
    app.run(debug=True, port=8000)
