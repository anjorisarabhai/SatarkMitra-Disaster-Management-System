import re

def extract_entities(text: str):
    return {
        "upi_ids": re.findall(r"\b[\w.-]+@[\w.-]+\b", text),
        "bank_accounts": re.findall(r"\b\d{9,18}\b", text),
        "ifsc_codes": re.findall(r"\b[A-Z]{4}0[A-Z0-9]{6}\b", text),
        "links": re.findall(r"https?://\S+", text)
    }
