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

### 🔹 Scripts (`/scripts`)
- NLP data generation  
- Sentiment analysis pipelines  

---

### 🔹 CI/CD (`/.github/workflows`)
- GitHub Actions for frontend deployment  

---

## ⚙️ Tech Stack

| Layer        | Technology |
|-------------|-----------|
| Frontend    | React, TypeScript, Vite, Tailwind |
| Backend     | Python (FastAPI/Flask) |
| Database    | MongoDB |
| ML/DL       | TensorFlow, Scikit-learn, XGBoost |
| IoT         | NodeMCU ESP8266 |
| Communication | Twilio (SMS), USSD APIs |

---

## 🧪 Machine Learning Models

- GRU (Time-series prediction)  
- TCN (Temporal modeling)  
- SVM (Classification)  
- XGBoost (Ensemble learning)  
- Hybrid Models (GRU/TCN + SVM)  

---

## 📡 Key Modules

- Flood Risk Prediction  
- Drainage Risk Calculation  
- Citizen Reporting System  
- Scam Detection (Rule-based)  
- Alert Dissemination (SMS/USSD)  
- Dashboard Visualization  

---

## 🛠️ Setup Instructions

### 1. Clone Repository
```bash
git clone https://github.com/your-repo/SatarkMitra.git
cd SatarkMitra
```
### 2. Backend Setup
```bash
pip install -r requirements.txt
python backend/app.py
```
### 3. Frontend Setup
cd frontend
npm install
npm run dev
📊 Data Sources
Rainfall datasets (2018–2025)

River & drainage datasets (GEE)

Reservoir data (CWC)

Synthetic distress & sentiment data

### 🔐 Design Principles
✅ Explainable (Rule-based + Hybrid ML)

✅ Auditable (MongoDB logging)

✅ Scalable (Modular architecture)

✅ Accessible (SMS + USSD support)

✅ Real-time capable

### 📌 Future Enhancements
NLP-based scam detection

Explainable AI (SHAP/LIME)

Real-time IoT scaling

Mobile app integration

Multi-city deployment

### 👥 Contributors
Anjori Sarabhai

Vaani Tyagi

Mitali Dogra

### 📄 License
This project is developed for academic purposes.


---
