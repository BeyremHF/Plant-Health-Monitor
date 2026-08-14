#ifndef CONFIG_H
#define CONFIG_H

// WiFi
#define WIFI_SSID     "pianokill"
#define WIFI_PASSWORD "pianokill"

// Firebase
#define FIREBASE_URL \
  "https://plant-health-monitor-esp32-default-rtdb.europe-west1.firebasedatabase.app"

#define PLANT_ID "basil-1"

// Pins
#define LED_PIN    48
#define ADC_PIN     1
#define RELAY_PIN   2

#define I2C_SDA     8
#define I2C_SCL     9

// Sensors
#define BH1750_ADDR 0x23

// Soil moisture calibration
#define SOIL_DRY 2650
#define SOIL_WET 950

// Timing
#define SENSOR_INTERVAL 30000UL

#endif