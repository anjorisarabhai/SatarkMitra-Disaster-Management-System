from transformers import pipeline

classifier = pipeline("sentiment-analysis")

def analyze_report(text: str):
    text_lower = text.lower()

    # 🔥 Rule-based boost (VERY IMPORTANT for disasters)
    panic_words = ["help", "urgent", "trapped", "drowning", "stuck"]

    score = 0

    for word in panic_words:
        if word in text_lower:
            score += 30

    # ML sentiment
    result = classifier(text)[0]

    if result["label"] == "NEGATIVE":
        score += int(result["score"] * 50)

    # cap score
    score = min(score, 100)

    # categorize
    if score >= 75:
        category = "PANIC"
    elif score >= 50:
        category = "URGENT"
    elif score >= 25:
        category = "MODERATE"
    else:
        category = "CALM"

    return {
        "score": score,
        "category": category
    }