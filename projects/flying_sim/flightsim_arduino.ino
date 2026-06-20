/*
  FLIGHT SIM CONTROLLER — Arduino Uno + 2x Analog Joysticks
  ------------------------------------------------------------
  Wiring (typical KY-023 / PS2-style joystick modules):

  Joystick 1 (PITCH / ROLL):
    VRx -> A0   (roll  - left/right)
    VRy -> A1   (pitch - forward/back)
    SW  -> D2   (button, optional - used as "reset view")
    +5V -> 5V
    GND -> GND

  Joystick 2 (THROTTLE / YAW):
    VRx -> A2   (yaw      - left/right)
    VRy -> A3   (throttle - forward/back)
    SW  -> D3   (button, optional - used as "fire/flaps" toggle)
    +5V -> 5V
    GND -> GND

  Serial protocol (115200 baud):
    One line per reading, comma-separated, newline-terminated:
      roll,pitch,yaw,throttle,btn1,btn2\n
    Each axis is sent as raw 0-1023 ADC value (browser does the mapping/deadzone).
    Buttons are 0 or 1 (1 = pressed).

  This keeps the Arduino dead simple — all calibration, deadzone and
  smoothing logic lives in the web app so you can tune it without
  reflashing.
*/

const int PIN_ROLL     = A0;
const int PIN_PITCH    = A1;
const int PIN_YAW      = A2;
const int PIN_THROTTLE = A3;

const int PIN_BTN1 = 2;
const int PIN_BTN2 = 3;

const unsigned long SEND_INTERVAL_MS = 20; // ~50Hz, plenty smooth for flight controls
unsigned long lastSend = 0;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BTN1, INPUT_PULLUP);
  pinMode(PIN_BTN2, INPUT_PULLUP);
}

void loop() {
  unsigned long now = millis();
  if (now - lastSend >= SEND_INTERVAL_MS) {
    lastSend = now;

    int roll     = analogRead(PIN_ROLL);
    int pitch    = analogRead(PIN_PITCH);
    int yaw      = analogRead(PIN_YAW);
    int throttle = analogRead(PIN_THROTTLE);

    int btn1 = digitalRead(PIN_BTN1) == LOW ? 1 : 0; // INPUT_PULLUP -> LOW when pressed
    int btn2 = digitalRead(PIN_BTN2) == LOW ? 1 : 0;

    Serial.print(roll);
    Serial.print(',');
    Serial.print(pitch);
    Serial.print(',');
    Serial.print(yaw);
    Serial.print(',');
    Serial.print(throttle);
    Serial.print(',');
    Serial.print(btn1);
    Serial.print(',');
    Serial.println(btn2);
  }
}
