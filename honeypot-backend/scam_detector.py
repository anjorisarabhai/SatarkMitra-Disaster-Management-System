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
    "claim",
    "help"
]

def detect_scam(message: str):
    msg = message.lower()
    hits = sum(word in msg for word in SCAM_KEYWORDS)

    return {
        "is_scam": hits >= 2,
        "confidence": min(0.6 + hits * 0.1, 0.95),
        "category": "disaster_relief_scam"
    }
