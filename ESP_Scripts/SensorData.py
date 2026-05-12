import machine
import time
import bme280_float as bme280

# I2C setup
i2c = machine.I2C(0, sda=machine.Pin(8), scl=machine.Pin(9))

# BME280
bme = bme280.BME280(i2c=i2c)

# Soil moisture
adc = machine.ADC(machine.Pin(1))
adc.atten(machine.ADC.ATTN_11DB)
DRY = 2650
WET = 950

while True:
    # BME280 readings
    temp = bme.values[0]
    humidity = bme.values[2]
    pressure = bme.values[1]

    # BH1750 reading
    i2c.writeto(35, bytes([0x10]))
    time.sleep(0.2)
    data = i2c.readfrom(35, 2)
    lux = (data[0] << 8 | data[1]) / 1.2

    # Soil moisture
    raw = adc.read()
    moisture = (DRY - raw) / (DRY - WET) * 100
    moisture = max(0, min(100, moisture))

    print("Temperature: {}".format(temp))
    print("Humidity: {}".format(humidity))
    print("Pressure: {}".format(pressure))
    print("Light: {:.1f} lux".format(lux))
    print("Soil Moisture: {:.1f}%".format(moisture))
    print("─────────────────")
    time.sleep(10)