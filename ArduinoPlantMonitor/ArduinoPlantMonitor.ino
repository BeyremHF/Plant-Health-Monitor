#include <Arduino.h>

#include "Config.h"
#include "Led.h"
#include "Sensors.h"
#include "Firebase.h"
#include "Display.h"

unsigned long lastSensorSend = 0;
Display display;

// Works out which face to show from the latest reading. This lives on the
// board on purpose: the screen keeps telling the truth even with no WiFi and
// no backend running.
PlantState evaluatePlantState(const SensorData& data) {

    if (data.soilMoisture >= MOISTURE_HEALTHY_MIN) {
        return PlantState::HEALTHY;
    }

    if (data.soilMoisture >= MOISTURE_MODERATE_MIN) {
        return PlantState::MODERATE_STRESSED;
    }

    return PlantState::HIGH_STRESSED;
}

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
        // Animates the startup bar while waiting, instead of freezing it.
        display.updateFor(3000);
    }

    // WiFi
    display.showConnecting();
    initWiFi();
    display.clearOverride();

    Serial.println("System ready!");
    display.update();
}


void loop() {
    int pump_duration;

    // WiFi
    if (!isWiFiConnected()) {
        setLED(255, 0, 0);
        display.showConnecting();
        initWiFi();
        display.clearOverride();
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
        display.clearOverride();
        firebaseRequest(
        "PUT",
        "/pump/trigger.json",
        "false");
    }

    digitalWrite(RELAY_LIGHT_PIN, HIGH);
    display.updateFor(3000);
    digitalWrite(RELAY_LIGHT_PIN, LOW);


    // Sensors every SENSOR_INTERVAL seconds
    if (
        millis() - lastSensorSend
        >= SENSOR_INTERVAL
    ) {
        Serial.println("Reading sensors...");

        // readSensors() only takes about 200 ms, so without a short hold the
        // sensing bar would flash past unseen.
        display.showScanning();
        display.updateFor(SCAN_SCREEN_MS);

        SensorData data =
            readSensors();

        // The face follows the newest reading.
        display.setPlantState(
            evaluatePlantState(data)
        );

        // Show what was just measured, then fall back to the face on its own.
        display.showSensors(data, SENSOR_SCREEN_MS);

        // Blue LED while sending
        setLED(0, 0, 255);
        sendSensorData(data);
        setLED(0, 0, 0);
        lastSensorSend = millis();
    }

    // Keeps the screen animating instead of freezing on one frame.
    display.updateFor(LOOP_INTERVAL);
}
