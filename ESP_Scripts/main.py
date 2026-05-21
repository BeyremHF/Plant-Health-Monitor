import network
import time
import urequests
import json
import machine
import neopixel
import bme280_float as bme280

# LED setup
led = neopixel.NeoPixel(machine.Pin(48), 1)

def set_led(r, g, b):
    led[0] = (r, g, b)
    led.write()

# WiFi connection
def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect("Galaxy A52", "CPS2026POG")
    
    while not wlan.isconnected():
        set_led(255, 0, 0)
        time.sleep(0.5)
        set_led(0, 0, 0)
        time.sleep(0.5)
    
    set_led(0, 255, 0)
    time.sleep(2)
    set_led(0, 0, 0)
    return wlan

# Hardware setup
i2c = machine.I2C(0, sda=machine.Pin(8), scl=machine.Pin(9))
bme = bme280.BME280(i2c=i2c)
adc = machine.ADC(machine.Pin(1))
adc.atten(machine.ADC.ATTN_11DB)
relay = machine.Pin(2, machine.Pin.OUT)

DRY = 2650
WET = 950
PLANT_ID = "basil-1"
FIREBASE_URL = "https://plant-health-monitor-esp32-default-rtdb.europe-west1.firebasedatabase.app"

# Connect
wlan = connect_wifi()

last_send = 0

# Main loop
while True:
    try:
        if not wlan.isconnected():
            set_led(255, 0, 0)
            wlan = connect_wifi()

        # Check pump trigger
        pump_response = urequests.get(FIREBASE_URL + "/pump.json")
        pump_data = json.loads(pump_response.text)
        pump_response.close()

        if pump_data and pump_data.get("trigger") == True:
            duration = pump_data.get("duration", 3)
            relay.value(1)
            time.sleep(duration)
            relay.value(0)
            urequests.put(FIREBASE_URL + "/pump/trigger.json", data="false").close()

        # Check light trigger
        light_response = urequests.get(FIREBASE_URL + "/light/on.json")
        light_on = light_response.text == "true"
        light_response.close()

        # Send sensor data every 30 seconds
        if time.time() - last_send >= 30:
            # BH1750
            i2c.writeto(35, bytes([0x10]))
            time.sleep(0.2)
            light_data = i2c.readfrom(35, 2)
            lux = (light_data[0] << 8 | light_data[1]) / 1.2

            # Soil moisture
            raw = adc.read()
            moisture = (DRY - raw) / (DRY - WET) * 100
            moisture = max(0, min(100, moisture))

            data = {
                "temperature": float(bme.values[0].replace("C", "")),
                "humidity": float(bme.values[2].replace("%", "")),
                "pressure": float(bme.values[1].replace("hPa", "")),
                "light": round(lux, 1),
                "soil_moisture": round(moisture, 1),
                "timestamp": time.time()
            }

            # Update live sensors
            set_led(0, 0, 255)
            urequests.put(FIREBASE_URL + "/sensors.json", data=json.dumps(data)).close()

            # Push to history
            urequests.post(
                FIREBASE_URL + "/history/{}.json".format(PLANT_ID),
                data=json.dumps(data)
            ).close()

            set_led(0, 0, 0)
            print("Sent:", data)
            last_send = time.time()

    except Exception as e:
        set_led(255, 80, 0)
        time.sleep(2)
        set_led(0, 0, 0)
        print("Error:", e)

    time.sleep(2)