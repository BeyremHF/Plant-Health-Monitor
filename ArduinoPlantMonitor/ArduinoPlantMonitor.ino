#include <Arduino.h>

#include "Config.h"
#include "Led.h"
#include "Sensors.h"
#include "Firebase.h"


unsigned long lastSensorSend = 0;


void setup() {

    Serial.begin(115200);

    delay(1000);

    Serial.println();
    Serial.println("Plant Monitor");

    // LED
    initLED();

    // Relay
    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, LOW);

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
}


void loop() {
    // WiFi
    if (!isWiFiConnected()) {
        setLED(255, 0, 0);
        initWiFi();
    }


    // Pump
    int duration;
    if (checkPump(duration)) {
        Serial.println("Pump ON");
        digitalWrite(RELAY_PIN, HIGH);
        delay(duration * 1000UL);
        digitalWrite(RELAY_PIN, LOW);
        Serial.println("Pump OFF");
        putFirebase(
            "/pump/trigger.json",
            "false"
        );
    }

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
        sendSensorData(data);
        setLED(0, 0, 0);
        lastSensorSend = millis();
    }

    delay(2000);
}