#ifndef SENSORS_H
#define SENSORS_H

#include <Arduino.h>

struct SensorData {
    float temperature;
    float humidity;
    float pressure;
    float light;
    float soilMoisture;
};

bool initSensors();

SensorData readSensors();

#endif