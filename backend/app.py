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

app = Flask(__name__)
CORS(app) # Allows your Next.js frontend to talk to this backend

# ==========================================
# 1. LOAD AI MODELS (The "Brain")
# ==========================================
print("⏳ Loading SatarkMitra AI Models...")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'ml_models')

try:
    # Load Scalers
    scaler_dl = joblib.load(os.path.join(MODEL_DIR, 'scaler_dl.pkl'))
    scaler_hybrid = joblib.load(os.path.join(MODEL_DIR, 'scaler_hybrid.pkl'))
    
    # Load Deep Learning Models (Forecast)
    # compile=False prevents errors with custom losses
    gru_model = tf.keras.models.load_model(os.path.join(MODEL_DIR, 'gru_standalone_model.h5'), compile=False)
    tcn_model = tf.keras.models.load_model(os.path.join(MODEL_DIR, 'tcn_standalone_model.h5'), compile=False)
    
    # Load Classical Classifiers (Decision)
    xgb_model = joblib.load(os.path.join(MODEL_DIR, 'xgb_hybrid_model.pkl'))
    svm_model = joblib.load(os.path.join(MODEL_DIR, 'svm_hybrid_model.pkl'))
    
    print("✅ All Models Loaded Successfully!")
except Exception as e:
    print(f"❌ Error loading models: {e}")
    print("Make sure you created the 'ml_models' folder and copied the 6 files there!")

# ==========================================
# 2. EXISTING DATA STRUCTURES
# ==========================================
# Temporary in-memory storage (replace with PostgreSQL/PostGIS later)
weather_data_store = []
alerts_store = []

# --- Pydantic models for validation ---
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
# 3. AI PREDICTION ENDPOINT (The Feature 1)
# ==========================================
@app.route("/api/predict", methods=["POST"])
def predict_flood_risk():
    try:
        # 1. Get Data from Frontend/Sensor
        data = request.json
        curr_river = float(data.get('river_level'))
        curr_rain = float(data.get('rainfall'))

        # 2. Simulate History (Creating the Time-Series)
        # We simulate a 6-day trend ending at the current value
        history_sim = []
        for i in range(6):
            factor = 1.0 - (0.02 * (5 - i)) 
            history_sim.append([curr_river * factor, curr_rain])
        input_seq = np.array([history_sim]) 

        # 3. Deep Learning Forecasts
        seq_scaled = scaler_dl.transform(input_seq.reshape(6, 2)).reshape(1, 6, 2)
        gru_forecast = gru_model.predict(seq_scaled, verbose=0)[0][0]
        tcn_forecast = tcn_model.predict(seq_scaled, verbose=0)[0][0]

        # 4. Feature Engineering (23 Features)
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
        
        # Enforce column order for XGBoost
        cols = ['river_water_area_sqkm', 'rainfall_mm', 'river_rolling_mean_3', 'river_rolling_std_3', 
                'rainfall_rolling_sum_3', 'rainfall_rolling_mean_3', 'river_lag_1', 'river_lag_2', 
                'rainfall_lag_1', 'rainfall_lag_2', 'river_change', 'rainfall_change', 
                'mean_elevation_meters', 'mean_slope_degrees', 'land_cover_class_10_percent', 
                'land_cover_class_20_percent', 'land_cover_class_30_percent', 'land_cover_class_40_percent', 
                'land_cover_class_50_percent', 'land_cover_class_60_percent', 'land_cover_class_80_percent', 
                'GRU_Forecast', 'TCN_Forecast']
        
        df_input = pd.DataFrame([features])[cols]

        # 5. Ensemble Prediction
        xgb_pred = xgb_model.predict(df_input)[0]
        input_scaled = scaler_hybrid.transform(df_input)
        svm_pred = svm_model.predict(input_scaled)[0]

        # 6. Consensus Logic
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
# 4. EXISTING ENDPOINTS (Weather & Alerts)
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
            "predict": "/api/predict (POST)",
            "health": "/health (GET)"
        }
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)

