import network
import time

wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect("Wifi Name", "Wifi Password")

for i in range(15):
    if wlan.isconnected():
        break
    time.sleep(1)
    print("connecting...")

print(wlan.isconnected())