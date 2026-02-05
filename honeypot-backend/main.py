from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from schemas import ScamRequest, ScamResponse
from scam_detector import detect_scam
from agent import engage_scammer
from extractor import extract_entities

app = FastAPI(
    title="Agentic HoneyPot – Scam Detection & Intelligence API",
    description="Autonomous AI honeypot that detects scams and extracts payment intelligence",
    version="1.0"
)

# ---------------- AUTH ----------------
security = HTTPBearer()
API_KEY = "honeypot-secret-key"

def verify_api_key(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    if credentials.credentials != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized"
        )

# ---------------- ENDPOINT ----------------
@app.post("/analyze", response_model=ScamResponse)
def analyze_message(
    request: ScamRequest,
    _=Depends(verify_api_key)
):
    detection = detect_scam(request.message)

    # Not a scam → exit early
    if not detection["is_scam"]:
        return {
            "scam_detected": False,
            "confidence_score": detection["confidence"],
            "scam_category": "none",
            "conversation_log": [],
            "extracted_entities": {}
        }

    # Honeypot engages
    agent_reply = engage_scammer(request.message)

    # Simulated scammer reply (Mock API behavior)
    simulated_scammer_reply = (
        "Send money to helpfund@upi or bank account 123456789012. "
        "IFSC SBIN0001234. More details at http://fake-relief.in"
    )

    extracted = extract_entities(simulated_scammer_reply)

    return {
        "scam_detected": True,
        "confidence_score": detection["confidence"],
        "scam_category": detection["category"],
        "conversation_log": [
            f"Scammer: {request.message}",
            f"Agent: {agent_reply}",
            f"Scammer: {simulated_scammer_reply}"
        ],
        "extracted_entities": extracted
    }
