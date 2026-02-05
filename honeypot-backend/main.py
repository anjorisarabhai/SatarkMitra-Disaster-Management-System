from fastapi import FastAPI, Header, HTTPException
from schemas import ScamRequest, ScamResponse
from scam_detector import detect_scam
from agent import engage_scammer
from extractor import extract_entities

app = FastAPI(title="Agentic HoneyPot – Scam Detection & Intelligence API")

API_KEY = "honeypot-secret-key"

@app.post("/analyze", response_model=ScamResponse)
def analyze_message(
    request: ScamRequest,
    x_api_key: str | None = Header(default=None),
    authorization: str | None = Header(default=None)
):
    api_key = None

    # Accept both header styles
    if x_api_key:
        api_key = x_api_key
    elif authorization and authorization.startswith("Bearer "):
        api_key = authorization.replace("Bearer ", "")

    if api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

    detection = detect_scam(request.message)

    if not detection["is_scam"]:
        return {
            "scam_detected": False,
            "confidence_score": detection["confidence"],
            "scam_category": "none",
            "conversation_log": [],
            "extracted_entities": {}
        }

    agent_reply = engage_scammer(request.message)

    simulated_scammer_reply = (
        "Send money to helpfund@upi or bank account 123456789012. "
        "More details at http://fake-relief.in"
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
