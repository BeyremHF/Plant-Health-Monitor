# Plant Health Monitor — Wiring Reference

## ESP32-S3 DevKitC-1 Pinout

### BME280 (Temperature, Humidity, Pressure)
| BME280 Pin | ESP32-S3 Pin |
|---|---|
| VCC | 3.3V |
| GND | GND |
| SDA | GPIO 8 |
| SCL | GPIO 9 |

### BH1750 (Light Sensor)
| BH1750 Pin | ESP32-S3 Pin |
|---|---|
| VCC | 3.3V |
| GND | GND |
| SDA | GPIO 8 |
| SCL | GPIO 9 |

> **Note:** BME280 and BH1750 share the same I2C bus (SDA + SCL). Both connect to the same GPIO 8 and GPIO 9 pins on the breadboard.

### Soil Moisture Sensor (AZDelivery V1.2)
| Sensor Pin | ESP32-S3 Pin |
|---|---|
| VCC | 3.3V |
| GND | GND |
| AOUT | GPIO 1 |

### Relay Module (Songle SRD-12VDC-SL-C)


### Water Pump (QR50E)


---

## I2C Addresses
| Sensor | Address |
|---|---|
| BH1750 | 0x23 (decimal: 35) |
| BME280 | 0x76 (decimal: 118) |

---

## Calibration Values (Soil Moisture)
| State | Raw ADC Value |
|---|---|
| Dry | ~2650 |
| Wet | ~950 |

> These values may vary slightly between sensors. Recalibrate by testing in completely dry soil and fully watered soil.

---

## Power Summary
| Component | Voltage | Source |
|---|---|---|
| ESP32-S3 | 5V | USB-C |
| BME280 | 3.3V | ESP32 3V3 pin |
| BH1750 | 3.3V | ESP32 3V3 pin |
| Soil Sensor | 3.3V | ESP32 3V3 pin |
| Relay module | 12V | External adapter |
| Water pump | 12V | External adapter |