import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

mongo_client = MongoClient(MONGO_URI)

# 📦 Database
db = mongo_client["satarkmitra"]

# =========================
# 📁 COLLECTIONS
# =========================

citizen_reports = db["citizen_reports"]

# ✅ USER & ALERT COLLECTIONS
users_collection = db["users"]
alerts_collection = db["alerts"]
subscribers_collection = db["subscribers"]

# 🆕 CHAT HISTORY COLLECTION (for persistent multi-turn conversations)
chat_history_collection = db["chat_history"]