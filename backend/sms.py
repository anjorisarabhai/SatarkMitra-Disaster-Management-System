import os
from twilio.rest import Client
from dotenv import load_dotenv

# Load env variables
load_dotenv()

ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

# Load users as list
ALERT_USERS = os.getenv("ALERT_USERS", "")
USER_LIST = [num.strip() for num in ALERT_USERS.split(",") if num.strip()]

client = Client(ACCOUNT_SID, AUTH_TOKEN)


def send_sms(to_number: str, message: str):
    try:
        client.messages.create(
            body=message,
            from_=TWILIO_NUMBER,
            to=to_number
        )
        print(f"✅ SMS sent to {to_number}")
    except Exception as e:
        print(f"❌ SMS ERROR ({to_number}):", e)


# 🔥 BROADCAST FUNCTION
def send_alert_to_all(message: str):
    for user in USER_LIST:
        send_sms(user, message)