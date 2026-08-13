#include "Firebase.h"
#include "Config.h"
#include "Led.h"

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>


// ==========================
// WiFi
// ==========================

void initWiFi() {

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    Serial.print("Connecting to WiFi");

    while (WiFi.status() != WL_CONNECTED) {
        setLED(255, 0, 0);
        delay(500);
        setLED(0, 0, 0);
        delay(500);
        Serial.print(".");
    }

    Serial.println();
    Serial.println("WiFi connected");

    setLED(0, 255, 0);

    delay(2000);

    setLED(0, 0, 0);

    // NTP
    configTime(
        0,
        0,
        "pool.ntp.org",
        "time.nist.gov"
    );
}


bool isWiFiConnected() {
    return WiFi.status() == WL_CONNECTED;
}


// ==========================
// GET
// ==========================

String getFirebase(const String& path) {

    HTTPClient http;

    http.begin(
        String(FIREBASE_URL) + path
    );

    int code = http.GET();

    if (code > 0) {

        String response = http.getString();

        http.end();

        return response;
    }

    http.end();

    return "";
}


// ==========================
// PUT
// ==========================

bool putFirebase(
    const String& path,
    const String& data
) {

    HTTPClient http;

    http.begin(
        String(FIREBASE_URL) + path
    );

    http.addHeader(
        "Content-Type",
        "application/json"
    );

    int code = http.PUT(data);

    http.end();

    return code > 0;
}


// ==========================
// POST
// ==========================

bool postFirebase(
    const String& path,
    const String& data
) {

    HTTPClient http;

    http.begin(
        String(FIREBASE_URL) + path
    );

    http.addHeader(
        "Content-Type",
        "application/json"
    );

    int code = http.POST(data);

    http.end();

    return code > 0;
}


// ==========================
// Pump
// ==========================

bool checkPump(int &duration) {

    String response =
        getFirebase("/pump.json");

    if (response == "") {
        return false;
    }

    JsonDocument doc;

    if (deserializeJson(doc, response)) {
        return false;
    }

    bool trigger =
        doc["trigger"] | false;

    if (!trigger) {
        return false;
    }

    duration =
        doc["duration"] | 3;

    return true;
}

// Send sensors
void sendSensorData(
    const SensorData& data
) {

    JsonDocument doc;

    doc["temperature"] =
        round(data.temperature * 10) / 10.0;

    doc["humidity"] =
        round(data.humidity * 10) / 10.0;

    doc["pressure"] =
        round(data.pressure * 10) / 10.0;

    doc["light"] =
        round(data.light * 10) / 10.0;

    doc["soil_moisture"] =
        round(data.soilMoisture * 10) / 10.0;

    time_t now;

    time(&now);

    doc["timestamp"] =
        (unsigned long)now;

    String json;

    serializeJson(doc, json);

    // Live sensors
    putFirebase(
        "/sensors.json",
        json
    );

    // History
    postFirebase(
        "/history/" +
        String(PLANT_ID) +
        ".json",
        json
    );

    Serial.println("Sent:");
    Serial.println(json);
}