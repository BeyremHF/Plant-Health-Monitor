#include "Display.h"
#include "Config.h"

Display::Display()
    : u8g2(
        U8G2_R0,
        U8X8_PIN_NONE
      )
{
}

bool Display::begin() {
    Wire.begin(I2C_SDA, I2C_SCL);
    u8g2.begin();
    Serial.println("OLED initialized.");
    // Show startup screen
    u8g2.clearBuffer();
    u8g2.setFont(u8g2_font_6x10_tr);
    drawCentered("PLANT MONITOR", 20);
    drawCentered("OLED CONNECTED", 40);
    drawCentered("Starting...", 58);

    u8g2.sendBuffer();

    return true;
}

void Display::drawCentered(
    const char* text,
    int y
) {
    int width = u8g2.getStrWidth(text);

    int x = (128 - width) / 2;

    u8g2.drawStr(x, y, text);
}

void Display::drawHealthyScreen() {

    u8g2.setFontMode(1);
    u8g2.setBitmapMode(1);

    u8g2.setFont(u8g2_font_6x10_tr);

    drawCentered("PLANT STATUS", 15);

    u8g2.setFont(u8g2_font_10x20_tr);

    drawCentered("HEALTHY", 42);

    u8g2.setFont(u8g2_font_5x7_tr);

    drawCentered("Everything looks good", 58);
}

void Display::drawHighStressedScreen() {

    u8g2.setFontMode(1);
    u8g2.setBitmapMode(1);

    u8g2.setFont(u8g2_font_6x10_tr);

    drawCentered("PLANT STATUS", 15);

    u8g2.setFont(u8g2_font_10x20_tr);

    drawCentered("High STRESSED", 42);

    u8g2.setFont(u8g2_font_5x7_tr);

    drawCentered("Needs attention", 58);
}

void Display::drawModerateStressedScreen() {

    u8g2.setFontMode(1);
    u8g2.setBitmapMode(1);

    u8g2.setFont(u8g2_font_6x10_tr);

    drawCentered("PLANT STATUS", 15);

    u8g2.setFont(u8g2_font_10x20_tr);

    drawCentered("Moderate STRESSED", 42);

    u8g2.setFont(u8g2_font_5x7_tr);

    drawCentered("Needs attention", 58);
}

void Display::drawPumpingScreen(int duration) {

    u8g2.setFontMode(1);
    u8g2.setBitmapMode(1);

    u8g2.setFont(u8g2_font_6x10_tr);

    drawCentered("WATERING", 15);

    u8g2.setFont(u8g2_font_10x20_tr);

    drawCentered("PUMP ON", 42);

    u8g2.setFont(u8g2_font_5x7_tr);

    char buffer[32];

    snprintf(
        buffer,
        sizeof(buffer),
        "%d seconds",
        duration
    );

    drawCentered(buffer, 58);
}

void Display::drawSensorsScreen(const SensorData& data) {

    u8g2.setFontMode(1);
    u8g2.setBitmapMode(1);

    u8g2.setFont(u8g2_font_6x10_tr);

    drawCentered("SENSORS", 10);

    char buffer[32];

    u8g2.setFont(u8g2_font_5x7_tr);

    snprintf(
        buffer,
        sizeof(buffer),
        "Temp:     %.1f C",
        data.temperature
    );
    u8g2.drawStr(5, 25, buffer);

    snprintf(
        buffer,
        sizeof(buffer),
        "Humidity: %.0f %%",
        data.humidity
    );
    u8g2.drawStr(5, 35, buffer);

    snprintf(
        buffer,
        sizeof(buffer),
        "Soil:     %.0f %%",
        data.soilMoisture
    );
    u8g2.drawStr(5, 45, buffer);

    snprintf(
        buffer,
        sizeof(buffer),
        "Light:    %.0f lx",
        data.light
    );
    u8g2.drawStr(5, 55, buffer);
}

void Display::showHealthy() {

    u8g2.clearBuffer();

    drawHealthyScreen();

    u8g2.sendBuffer();
}


void Display::showHighStressed() {

    u8g2.clearBuffer();

    drawHighStressedScreen();

    u8g2.sendBuffer();
}

void Display::showModerateStressed() {

    u8g2.clearBuffer();

    drawModerateStressedScreen();

    u8g2.sendBuffer();
}

void Display::showPumping(int duration) {

    u8g2.clearBuffer();

    drawPumpingScreen(duration);

    u8g2.sendBuffer();
}


void Display::showSensors(const SensorData& data) {

    u8g2.clearBuffer();

    drawSensorsScreen(data);

    u8g2.sendBuffer();
}