from fastapi import FastAPI
from schemas import ScamRequest, ScamResponse
from scam_detector import detect_scam
from agent import engage_scammer
from extractor import extract_entities

app = FastAPI(title="SatarkMitra Agentic Honeypot API")

@app.post("/analyze", response_model=ScamResponse)
def analyze_message(request: ScamRequest):
    detection = detect_scam(request.message)

    if not detection["is_scam"]:
        return {
            "scam_detected": False,
            "confidence_score": detection["confidence"],
            "scam_category": "none",
            "conversation_log": [],
            "extracted_entities": {}
        }

    # Honeypot agent replies
    agent_reply = engage_scammer(request.message)

    # Simulated scammer response (Mock API behavior)
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
