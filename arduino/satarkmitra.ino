#include <Servo.h>

#define TRIG D5   // GPIO14
#define ECHO D2   // GPIO4
#define SERVO_PIN D4  // GPIO2

long duration;
float distance;

Servo gateServo;

void setup() {
  Serial.begin(115200);

  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);

  gateServo.attach(SERVO_PIN);
  gateServo.write(0); // Gate initially CLOSED
}

void loop() {
  // Trigger ultrasonic pulse
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);

  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  // Read echo
  duration = pulseIn(ECHO, HIGH);

  // Calculate distance
  distance = duration * 0.034 / 2;

  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");

  // 🚪 Dam Gate Logic
  if (distance < 10) {
    Serial.println("Water HIGH → Gate OPEN");
    gateServo.write(90);   // Open gate
  }
  else if (distance > 20) {
    Serial.println("Water LOW → Gate CLOSED");
    gateServo.write(0);    // Close gate
  }

  delay(500);
}