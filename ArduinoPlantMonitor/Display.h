#ifndef DISPLAY_H
#define DISPLAY_H

#include <Arduino.h>
#include <Wire.h>
#include <U8g2lib.h>

#include "Sensors.h"

enum class DisplayScreen {
    HEALTHY,
    HIGH_STRESSED,
    MODERATE_STRESSED,
    PUMPING,
    SENSORS
};

class Display {
public:
    Display();

    bool begin();
    
    void showHealthy();
    void showHighStressed();
    void showModerateStressed();
    void showPumping(int duration);
    void showSensors(const SensorData& data);

private:
    U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2;

    void drawCentered(const char* text, int y);
    void drawHeader(const char* title);

    void drawHealthyScreen();
    void drawHighStressedScreen();
    void drawModerateStressedScreen();
    void drawPumpingScreen(int duration);
    void drawSensorsScreen(const SensorData& data);
};

#endif