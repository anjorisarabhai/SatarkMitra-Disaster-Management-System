import random

HONEYPOT_REPLIES = [
    "I want to help but please explain the payment process.",
    "Is this government approved? Please share account details.",
    "My internet is slow, can you resend the UPI or bank info?",
    "Can you send the payment link again?",
    "Please share full bank or UPI details to proceed."
]

def engage_scammer(scam_message: str):
    """
    Autonomous honeypot agent.
    Encourages scammer to reveal payment details.
    """
    return random.choice(HONEYPOT_REPLIES)
