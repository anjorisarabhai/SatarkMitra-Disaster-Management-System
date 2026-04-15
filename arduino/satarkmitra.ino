#include <Servo.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define TRIG D5        // GPIO14
#define ECHO D3        // GPIO0 (UPDATED)
#define SERVO_PIN D4   // GPIO2

long duration;
float distance;



// Change address if needed (0x27 or 0x3F)
LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  Serial.begin(115200);

  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);

  gateServo.attach(SERVO_PIN);
  gateServo.write(0); // Gate CLOSED

  // LCD setup
  Wire.begin(D2, D1); // SDA, SCL
  lcd.init();
  lcd.backlight();

  lcd.setCursor(0, 0);
  lcd.print("System Starting");
  delay(2000);
  lcd.clear();
}

void loop() {
  // Ultrasonic Trigger
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);

  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  // Read Echo
  duration = pulseIn(ECHO, HIGH);

  // Distance Calculation
  distance = duration * 0.034 / 2;

  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");

  String status = "";

  // 🚪 Gate Logic
  if (distance < 10) {
    Serial.println("Water HIGH → Gate OPEN");
    gateServo.write(90);
    status = "Gate OPEN";
  }
  else if (distance > 20) {
    Serial.println("Water LOW → Gate CLOSED");
    gateServo.write(0);
    status = "Gate CLOSED";
  }

  // 📺 LCD Display
  lcd.clear();

  // Line 1 → Distance
  lcd.setCursor(0, 0);
  lcd.print("Dist: ");
  lcd.print(distance);
  lcd.print(" cm");

  // Line 2 → Status
  lcd.setCursor(0, 1);
  lcd.print(status);

  delay(500);
}
