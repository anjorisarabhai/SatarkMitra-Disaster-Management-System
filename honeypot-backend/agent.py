import random

HONEYPOT_REPLIES = [
    "I lost my house in the floods. Please explain how to send money.",
    "Is this government approved? Please send full payment details.",
    "My phone network is weak. Can you resend the UPI or bank info?",
    "I want to help but I need the exact account details again.",
    "Can you send the QR code or payment link once more?"
]

def engage_scammer(scam_message: str):
    """
    Scripted honeypot agent to extract scammer intelligence.
    """
    return random.choice(HONEYPOT_REPLIES)
