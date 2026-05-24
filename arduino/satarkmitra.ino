#include <Servo.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define TRIG D5
#define ECHO D3
#define SERVO_PIN D4

// YOUR PINS
#define GREEN_LED D6
#define RED_LED   D7
#define BUZZER    D8

long duration;
float distance;

Servo gateServo;
LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  Serial.begin(115200);

  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);

  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  // Turn LEDs OFF initially (active LOW → HIGH = OFF)
  digitalWrite(GREEN_LED, HIGH);
  digitalWrite(RED_LED, HIGH);
  digitalWrite(BUZZER, LOW);

  gateServo.attach(SERVO_PIN);
  gateServo.write(0);

  Wire.begin(D2, D1);
  lcd.init();
  lcd.backlight();

  lcd.setCursor(0, 0);
  lcd.print("System Starting");
  delay(2000);
  lcd.clear();
}

void loop() {
  // Ultrasonic trigger
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  duration = pulseIn(ECHO, HIGH);
  distance = duration * 0.034 / 2;

  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");

  String status = "";

  // 🚪 LOGIC (ACTIVE LOW LEDs)
  if (distance < 10) {
    // 🚨 HIGH WATER
    gateServo.write(90);
    status = "Gate OPEN";

    digitalWrite(RED_LED, LOW);     // ON
    digitalWrite(GREEN_LED, HIGH);  // OFF
    digitalWrite(BUZZER, HIGH);
  }
  else if (distance > 20) {
    // ✅ LOW WATER
    gateServo.write(0);
    status = "Gate CLOSED";

    digitalWrite(RED_LED, HIGH);    // OFF
    digitalWrite(GREEN_LED, LOW);   // ON
    digitalWrite(BUZZER, LOW);
  }
  else {
    // ⚖️ SAFE ZONE
    status = "Stable";

    digitalWrite(RED_LED, HIGH);    // OFF
    digitalWrite(GREEN_LED, LOW);   // ON
    digitalWrite(BUZZER, LOW);
  }

  // 📺 LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Dist: ");
  lcd.print(distance);
  lcd.print(" cm");

  lcd.setCursor(0, 1);
  lcd.print(status);

  delay(500);
}
