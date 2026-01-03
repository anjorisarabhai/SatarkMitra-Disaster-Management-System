# -*- coding: utf-8 -*-
from flask import Flask, request, jsonify
from flask_cors import CORS
from pydantic import BaseModel, ValidationError
from datetime import datetime
import os
import numpy as np
import pandas as pd
import joblib
import tensorflow as tf
import requests  # <--- NEW IMPORT for Weather API

app = Flask(__name__)
CORS(app) 

# ==========================================
# 1. LOAD KEDARNATH AI MODELS
# ==========================================
print("⏳ Loading SatarkMitra AI Models...")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'ml_models')

try:
    scaler_dl = joblib.load(os.path.join(MODEL_DIR, 'scaler_dl.pkl'))
    scaler_hybrid = joblib.load(os.path.join(MODEL_DIR, 'scaler_hybrid.pkl'))
    gru_model = tf.keras.models.load_model(os.path.join(MODEL_DIR, 'gru_standalone_model.h5'), compile=False)
    tcn_model = tf.keras.models.load_model(os.path.join(MODEL_DIR, 'tcn_standalone_model.h5'), compile=False)
    xgb_model = joblib.load(os.path.join(MODEL_DIR, 'xgb_hybrid_model.pkl'))
    svm_model = joblib.load(os.path.join(MODEL_DIR, 'svm_hybrid_model.pkl'))
    print("✅ All Models Loaded Successfully!")
except Exception as e:
    print(f"❌ Error loading models: {e}")

# ==========================================
# 2. DATA STRUCTURES
# ==========================================
weather_data_store = []
alerts_store = []

class WeatherData(BaseModel):
    station_id: str
    temperature: float
    humidity: float
    wind_speed: float
    timestamp: datetime

class AlertData(BaseModel):
    region: str
    alert_type: str
    message: str
    timestamp: datetime

# ==========================================
# 3. KEDARNATH PREDICTION (ML Model)
# ==========================================
@app.route("/api/predict", methods=["POST"])
def predict_flood_risk():
    try:
        data = request.json
        curr_river = float(data.get('river_level'))
        curr_rain = float(data.get('rainfall'))

        # Simulate 6-day history
        history_sim = []
        for i in range(6):
            factor = 1.0 - (0.02 * (5 - i)) 
            history_sim.append([curr_river * factor, curr_rain])
        input_seq = np.array([history_sim]) 

        # Forecasts
        seq_scaled = scaler_dl.transform(input_seq.reshape(6, 2)).reshape(1, 6, 2)
        gru_forecast = gru_model.predict(seq_scaled, verbose=0)[0][0]
        tcn_forecast = tcn_model.predict(seq_scaled, verbose=0)[0][0]

        # Features
        rivers = input_seq[0, :, 0]
        rains = input_seq[0, :, 1]
        features = {
            'river_water_area_sqkm': curr_river, 'rainfall_mm': curr_rain,
            'river_rolling_mean_3': np.mean(rivers[-3:]), 'river_rolling_std_3': np.std(rivers[-3:]),
            'rainfall_rolling_sum_3': np.sum(rains[-3:]), 'rainfall_rolling_mean_3': np.mean(rains[-3:]),
            'river_lag_1': rivers[-2], 'river_lag_2': rivers[-3],
            'rainfall_lag_1': rains[-2], 'rainfall_lag_2': rains[-3],
            'river_change': curr_river - rivers[-2], 'rainfall_change': curr_rain - rains[-2],
            'mean_elevation_meters': 295.0, 'mean_slope_degrees': 5.2,
            'land_cover_class_10_percent': 25.0, 'land_cover_class_20_percent': 1.5,
            'land_cover_class_30_percent': 10.0, 'land_cover_class_40_percent': 20.0,
            'land_cover_class_50_percent': 17.0, 'land_cover_class_60_percent': 12.0,
            'land_cover_class_80_percent': 14.5,
            'GRU_Forecast': gru_forecast, 'TCN_Forecast': tcn_forecast
        }
        
        cols = ['river_water_area_sqkm', 'rainfall_mm', 'river_rolling_mean_3', 'river_rolling_std_3', 
                'rainfall_rolling_sum_3', 'rainfall_rolling_mean_3', 'river_lag_1', 'river_lag_2', 
                'rainfall_lag_1', 'rainfall_lag_2', 'river_change', 'rainfall_change', 
                'mean_elevation_meters', 'mean_slope_degrees', 'land_cover_class_10_percent', 
                'land_cover_class_20_percent', 'land_cover_class_30_percent', 'land_cover_class_40_percent', 
                'land_cover_class_50_percent', 'land_cover_class_60_percent', 'land_cover_class_80_percent', 
                'GRU_Forecast', 'TCN_Forecast']
        
        df_input = pd.DataFrame([features])[cols]

        xgb_pred = xgb_model.predict(df_input)[0]
        input_scaled = scaler_hybrid.transform(df_input)
        svm_pred = svm_model.predict(input_scaled)[0]

        final_risk = 1 if (xgb_pred == 1 or svm_pred == 1) else 0
        final_prob = float((xgb_model.predict_proba(df_input)[0][1] * 0.6) + (svm_model.predict_proba(input_scaled)[0][1] * 0.4))

        return jsonify({
            'status': 'success',
            'alert_level': 'HIGH' if final_risk == 1 else 'LOW',
            'flood_probability': round(final_prob * 100, 2),
            'model_details': {
                'xgboost_risk': int(xgb_pred),
                'svm_risk': int(svm_pred),
                'gru_forecast': float(gru_forecast)
            }
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ==========================================
# 4. DELHI WATER-LOGGING PREDICTION (Live API)
# ==========================================
@app.route("/api/predict_delhi", methods=["POST"])
def predict_delhi_waterlogging():
    try:
        data = request.json
        
        # 1. User Inputs
        drainage = float(data.get('drainage_capacity', 50))
        elevation = float(data.get('elevation', 210))
        
        # 2. Fetch Live Weather
        API_KEY = "3763b01ad8620621fd5a75814252f105"
        LAT, LON = "28.6139", "77.2090" # Delhi Coordinates
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={LAT}&lon={LON}&appid={API_KEY}&units=metric"
        
        rain_1h = 0.0
        weather_desc = "Clear"
        
        try:
            r = requests.get(url, timeout=5)
            if r.status_code == 200:
                w_data = r.json()
                weather_desc = w_data['weather'][0]['description']
                if 'rain' in w_data:
                    rain_1h = w_data['rain'].get('1h', 0.0)
                    if rain_1h == 0:
                        rain_1h = w_data['rain'].get('3h', 0.0) / 3.0
        except Exception as e:
            print(f"Weather API Error: {e}")

        # 3. Calculate Risk Logic
        risk_score = 0
        if rain_1h > 15: risk_score += 50
        elif rain_1h > 5: risk_score += 30
        
        if drainage < 30: risk_score += 40
        elif drainage < 60: risk_score += 20
        
        if elevation < 205: risk_score += 10
        
        status = "LOW"
        if risk_score > 60: status = "CRITICAL"
        elif risk_score > 30: status = "HIGH"

        return jsonify({
            'status': 'success',
            'water_logging_risk': status,
            'risk_score': risk_score,
            'details': {
                'live_rain_1h': rain_1h,
                'weather': weather_desc
            }
        })

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ==========================================
# 5. OTHER ENDPOINTS
# ==========================================
@app.route("/api/weather", methods=["POST"])
def receive_weather():
    try:
        data = WeatherData(**request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400
    weather_data_store.append(data.dict())
    return jsonify({"status": "success", "message": "Weather data received"}), 201

@app.route("/api/alerts", methods=["POST"])
def send_alert():
    try:
        data = AlertData(**request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400
    alerts_store.append(data.dict())
    return jsonify({"status": "success", "message": "Alert information stored"}), 201

@app.route("/api/debug/weather", methods=["GET"])
def get_weather_data():
    return jsonify(weather_data_store)

@app.route("/api/debug/alerts", methods=["GET"])
def get_alerts():
    return jsonify(alerts_store)

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"})

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "running",
        "message": "SatarkMitra AI Backend is Active",
        "endpoints": {
            "predict_kedarnath": "/api/predict (POST)",
            "predict_delhi": "/api/predict_delhi (POST)"
        }
    })

if __name__ == "__main__":
    app.run(debug=True, port=8000)