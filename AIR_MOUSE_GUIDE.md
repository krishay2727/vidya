# ESP32 Bluetooth HID Air Mouse Guide

This guide details how to build, configure, and use your ESP32-based Bluetooth LE (BLE) Air Mouse with an MPU6500 IMU and Left/Right physical click buttons.

---

## 🛠️ Hardware Requirements

*   **ESP32 Development Board** (e.g., ESP32 DevKit V1)
*   **MPU6500 IMU Sensor Module** (or MPU6050/MPU9250 with compatible I2C pins)
*   **2x Push Buttons** (Momentary Tactile Switches)
*   **Breadboard & Jumper Wires**

---

## 🔌 Wiring Diagram

Connect the components to the ESP32 according to the tables below:

### 1. MPU6500 IMU to ESP32

| MPU6500 Pin | ESP32 GPIO | Description |
| :--- | :--- | :--- |
| **VCC** | **3V3** (or 3.3V) | Power supply (3.3V) |
| **GND** | **GND** | Ground reference |
| **SDA** | **GPIO 21** | I2C Data Line |
| **SCL** | **GPIO 22** | I2C Clock Line |

### 2. Buttons to ESP32

Since internal pull-up resistors are enabled in the code, you do **not** need external resistors. Just connect one leg of the button to the GPIO and the other leg to GND.

| Button | ESP32 GPIO | Other Connection | Active State |
| :--- | :--- | :--- | :--- |
| **Left Click** | **GPIO 13** | **GND** | `LOW` (Pressed) |
| **Right Click** | **GPIO 12** | **GND** | `LOW` (Pressed) |

---

## 📦 Software Libraries Setup

To compile the firmware, you must install the **ESP32-BLE-Mouse** library in the Arduino IDE:

1.  Open the Arduino IDE.
2.  Go to **Sketch** -> **Include Library** -> **Manage Libraries...**
3.  Search for **ESP32-BLE-Mouse** (by *T-vK*).
4.  Click **Install**.
    *   *Note: Under the hood, this library uses NimBLE or standard ESP32 BLE stacks.*

---

## 🚀 Pairing & Usage

### 💻 Laptop (Windows / macOS / Linux)
1.  Upload `Air.ino` to your ESP32 board.
2.  Open your computer's Bluetooth settings and turn on Bluetooth.
3.  Click **Add device** -> **Bluetooth**.
4.  Select **ESP32 Air Mouse** from the list of available devices.
5.  Once connected, wave the board to move the mouse cursor!
6.  Press the button on GPIO 13 for left clicks (and click-and-drag) and GPIO 12 for right clicks.

### 📱 Android Phone / Tablet
1.  Go to **Settings** -> **Connected devices** -> **Pair new device**.
2.  Select **ESP32 Air Mouse** under available devices.
3.  Confirm pairing. A mouse cursor will appear on your Android screen!
4.  Control the cursor by tilting/moving the controller, and use the physical buttons to click and navigate apps.

---

## 🎯 Drift Calibration & Tuning

*   **Initial Calibration:** Upon startup, keep the board completely flat and still for 1 second. The IMU will calibrate itself to account for gyro offset biases.
*   **Re-calibration:** If the mouse cursor starts drifting, open the Serial Monitor (115200 baud) or the Web Serial dashboard and send the word `calibrate`.
*   **Sensitivity Adjustment:** You can adjust the pointer speed dynamically by sending `sensitivity:X` (e.g. `sensitivity:1.5`) over the serial console.
