SCAM_KEYWORDS = [
    "urgent",
    "relief",
    "fund",
    "donation",
    "upi",
    "account",
    "kyc",
    "click",
    "link",
    "claim"
]

def detect_scam(message: str):
    message = message.lower()
    hits = sum(keyword in message for keyword in SCAM_KEYWORDS)

    return {
        "is_scam": hits >= 2,
        "confidence": min(0.6 + hits * 0.1, 0.95),
        "category": "disaster_relief_scam"
    }
