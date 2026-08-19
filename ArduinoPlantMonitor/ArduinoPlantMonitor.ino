#include <Arduino.h>

#include "Config.h"
#include "Led.h"
#include "Sensors.h"
#include "Firebase.h"
#include "Display.h"

unsigned long lastSensorSend = 0;
Display display;

void setup() {

    Serial.begin(115200);

    delay(1000);

    Serial.println();
    Serial.println("Plant Monitor");

    // LED
    initLED();

    // Relay
    pinMode(RELAY_PUMP_PIN, OUTPUT);
    digitalWrite(RELAY_PUMP_PIN, LOW);

    pinMode(RELAY_LIGHT_PIN, OUTPUT);
    digitalWrite(RELAY_LIGHT_PIN, LOW);
    //Display
    display.begin();

    // Sensors
    while (!initSensors()) {
        Serial.println("Sensor initialization failed.");
        Serial.println("Retrying in 3 seconds...");
        setLED(255, 80, 0);
        delay(3000);
    }
    // WiFi
    initWiFi();
    Serial.println("System ready!");
    display.showHealthy();

}


void loop() {
    int pump_duration;

    // WiFi
    if (!isWiFiConnected()) {
        setLED(255, 0, 0);
        initWiFi();
    }


    // Pump
    if (checkPump(pump_duration)) {
        Serial.print("Pump ON for ");
        Serial.print(pump_duration);
        Serial.println(" seconds");
        display.showPumping(pump_duration);

        digitalWrite(RELAY_PUMP_PIN, HIGH);
        delay(pump_duration * 1000UL);
        digitalWrite(RELAY_PUMP_PIN, LOW);
        Serial.println("Pump OFF");
        firebaseRequest(
        "PUT",
        "/pump/trigger.json",
        "false");
    }

    digitalWrite(RELAY_LIGHT_PIN, HIGH);
    delay(3000);
    digitalWrite(RELAY_LIGHT_PIN, LOW);


    // Sensors every SENSOR_INTERVAL seconds
    if (
        millis() - lastSensorSend
        >= SENSOR_INTERVAL
    ) {
        Serial.println("Reading sensors...");

        SensorData data =
            readSensors();
        // Blue LED while sending
        setLED(0, 0, 255);
        display.showSensors(data);
        sendSensorData(data);
        setLED(0, 0, 0);
        lastSensorSend = millis();
    }

    delay(2000);
}