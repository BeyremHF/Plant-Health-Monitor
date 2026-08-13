#ifndef FIREBASE_H
#define FIREBASE_H

#include <Arduino.h>
#include "Sensors.h"

void initWiFi();

bool isWiFiConnected();

String getFirebase(const String& path);

bool putFirebase(
    const String& path,
    const String& data
);

bool postFirebase(
    const String& path,
    const String& data
);

bool checkPump(int &duration);

void sendSensorData(const SensorData& data);

#endif