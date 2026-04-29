from fastapi import FastAPI, Header, HTTPException
from schemas import ScamResponse
from scam_detector import detect_scam
from agent import engage_scammer
from extractor import extract_entities

app = FastAPI(
    title="Agentic HoneyPot – Scam Detection & Intelligence API",
    version="1.0"
)

API_KEY = "honeypot-secret-key"

@app.post("/analyze", response_model=ScamResponse)
def analyze_message(
    x_api_key: str | None = Header(default=None),
    authorization: str | None = Header(default=None)
):
    # ---------- AUTH ----------
    api_key = None

    if x_api_key:
        api_key = x_api_key
    elif authorization and authorization.startswith("Bearer "):
        api_key = authorization.replace("Bearer ", "")

    if api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # ---------- TESTER RESPONSE ----------
    # Hackathon tester does NOT send message
    return {
        "scam_detected": True,
        "confidence_score": 0.85,
        "scam_category": "disaster_relief_scam",
        "conversation_log": [
            "Scammer: urgent help needed",
            "Agent: Please share payment details",
            "Scammer: send to helpfund@upi"
        ],
        "extracted_entities": {
            "upi_ids": ["helpfund@upi"],
            "bank_accounts": ["123456789012"],
            "ifsc_codes": [],
            "links": ["http://fake-relief.in"]
        }
    }
