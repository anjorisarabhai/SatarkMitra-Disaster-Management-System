import os
from dotenv import load_dotenv
from twilio.rest import Client

load_dotenv()

TWILIO_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

# 👇 NEW
ALERT_NUMBERS = os.getenv("ALERT_NUMBERS", "")

client = Client(TWILIO_SID, TWILIO_AUTH)


def send_sms(to, message):
    print("🔥 TWILIO CALL:", to)

    try:
        msg = client.messages.create(
            body=message,
            from_=TWILIO_NUMBER,
            to=to
        )
        print("✅ SENT:", to)
    except Exception as e:
        print("❌ ERROR:", e)


def send_alert_to_all(message):
    numbers = ALERT_NUMBERS.split(",")

    print("🚀 ALERT NUMBERS:", numbers)   # 👈 ADD THIS

    for number in numbers:
        number = number.strip()
        if number:
            print("📤 Sending to:", number)   # 👈 ADD THIS
            send_sms(number, message)