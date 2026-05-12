import network
import time
import urequests
import json
import machine
import bme280_float as bme280

# WiFi
wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect("Galaxy A52", "CPS2026POG")

while not wlan.isconnected():
    time.sleep(1)
    print("connecting...")

print("Connected!")

# Sensors
i2c = machine.I2C(0, sda=machine.Pin(8), scl=machine.Pin(9))
bme = bme280.BME280(i2c=i2c)

adc = machine.ADC(machine.Pin(1))
adc.atten(machine.ADC.ATTN_11DB)
DRY = 2650
WET = 950

FIREBASE_URL = "https://plant-health-monitor-esp32-default-rtdb.europe-west1.firebasedatabase.app"

while True:
    # BH1750
    i2c.writeto(35, bytes([0x10]))
    time.sleep(0.2)
    light_data = i2c.readfrom(35, 2)
    lux = (light_data[0] << 8 | light_data[1]) / 1.2

    # Soil moisture
    raw = adc.read()
    moisture = (DRY - raw) / (DRY - WET) * 100
    moisture = max(0, min(100, moisture))

    # Send to Firebase
    data = {
        "temperature": float(bme.values[0].replace("C", "")),
        "humidity": float(bme.values[2].replace("%", "")),
        "pressure": float(bme.values[1].replace("hPa", "")),
        "light": round(lux, 1),
        "soil_moisture": round(moisture, 1)
    }

    response = urequests.put(
        FIREBASE_URL + "/sensors.json",
        data=json.dumps(data)
    )
    response.close()
    print("Sent:", data)

    time.sleep(30)