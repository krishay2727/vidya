/*
 * Smart Navigation Assistance for Blind People
 * Developer: Shaheena Rai
 *
 * Connections:
 * - Ultrasonic Sensor: 
 *   VCC to Arduino 5V
 *   GND to Arduino GND
 *   Trig to Arduino Digital Pin 2
 *   Echo to Arduino Digital Pin 3
 * - Buzzer: 
 *   Positive (+) to Arduino Digital Pin 4
 *   Negative (-) to Arduino GND
 */

#define TRIG_PIN 2
#define ECHO_PIN 3
#define BUZZER_PIN 4

// Alert distance threshold in centimeters
const int SAFE_DISTANCE = 50; 

void setup() {
  // Initialize serial communication for debugging
  Serial.begin(9600);
  
  // Set up pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  // Test buzzer on startup
  digitalWrite(BUZZER_PIN, HIGH);
  delay(200);
  digitalWrite(BUZZER_PIN, LOW);
  
  Serial.println("Smart Navigation Assistance System Initialized.");
}

void loop() {
  // Send a 10 microsecond pulse to trigger the sensor
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  // Measure the duration of the incoming echo pulse
  long duration = pulseIn(ECHO_PIN, HIGH);
  
  // Calculate distance in cm (Speed of sound = 343 m/s = 0.0343 cm/us)
  float distance = (duration * 0.0343) / 2;
  
  // Debug output
  Serial.print("Obstacle Distance: ");
  Serial.print(distance);
  Serial.println(" cm");
  
  // Buzzer alert logic
  if (distance > 0 && distance < SAFE_DISTANCE) {
    // Obstacle detected! Determine beep interval based on proximity
    // Closer obstacle = faster beeping frequency
    int delayTime = map(distance, 2, SAFE_DISTANCE, 50, 400);
    
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100); // Beep duration
    digitalWrite(BUZZER_PIN, LOW);
    
    delay(max(10, delayTime)); // Wait between beeps
  } else {
    // No obstacle nearby, keep buzzer off
    digitalWrite(BUZZER_PIN, LOW);
    delay(100); 
  }
}
