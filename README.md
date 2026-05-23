# 🌊 SatarkMitra: Disaster Management System

AI-driven flood prediction and disaster response platform with hyperlocal risk assessment, IoT integration, and multi-channel communication (Web, SMS, USSD).

---

## 🚀 Features

- 🌧️ Flood Prediction using ML/DL Hybrid Models (GRU, TCN, SVM, XGBoost)
- 📍 Hyperlocal Risk Mapping (Delhi, Kedarnath, Gurugram)
- 📡 IoT Integration (NodeMCU + Ultrasonic Sensors)
- 📊 Multi-Dashboard System (Citizen, Admin, Government, Responders)
- 📲 SMS & USSD Alert System
- 🤖 AI Chatbot & Distress Reporting
- 🛡️ Scam Detection & Report Validation
- 📦 MongoDB-based Real-Time Data Storage

---

## 🧠 System Architecture
User → Frontend → Backend API → ML Models → Alerts → Dashboard / SMS / USSD
↓
MongoDB


---

## 📁 Project Structure

### 🔹 Frontend (`/frontend`)
- React + TypeScript + Vite  
- Dashboards for:
  - Citizen  
  - Government  
  - Admin  
  - First Responders  
- Maps, alerts, chatbot, accessibility tools  

---

### 🔹 Backend (`/backend`)
- API (`app.py`)  
- MongoDB integration (`db/`)  
- ML Models (`ml_models/`)  
- SMS Integration (`sms.py`)  
- Utilities (e.g., sentiment analysis)  

---

### 🔹 ML & Notebooks (`/Notebooks`)
- Model training & experimentation  
- Hybrid model testing  
- Saved models (`.pkl`, `.h5`)  
- Feature engineering pipelines  

---

### 🔹 Data (`/data`)
- Rainfall datasets (2018-2025)  
- River & drainage data  
- Reservoir (dam) data  
- Sentiment & distress datasets  
- Final merged datasets for modeling  

---

### 🔹 IoT (`/arduino`)
- NodeMCU-based flood monitoring  
- Ultrasonic sensor integration  
- Real-time water level detection  

---

### 🔹 Honeypot Backend (`/honeypot-backend`)
- Scam detection system  
- Report validation logic  
- Data extraction & classification  

---
