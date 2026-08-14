from fastapi import FastAPI, HTTPException
import pandas as pd
import joblib
import requests
import os
import threading
import time


#
# Configuration
FIREBASE_URL = (
    "https://plant-health-monitor-esp32-default-rtdb"
    ".europe-west1.firebasedatabase.app"
)

MODEL_PATH = "Model/plant_health_rf_model.pkl"
ENCODER_PATH = "Model/label_encoder.pkl"

SOIL_MOISTURE_THRESHOLD = 40.0
PUMP_DURATION = 5
UPDATE_INTERVAL_SECONDS = 30


# FastAPI
app = FastAPI(
    title="Plant Health API",
    description="Backend API for the ESP32 plant health monitoring system",
    version="1.0.0",
)

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model not found: {MODEL_PATH}")
if not os.path.exists(ENCODER_PATH):
    raise FileNotFoundError(f"Encoder not found: {ENCODER_PATH}")
model = joblib.load(MODEL_PATH)
label_encoder = joblib.load(ENCODER_PATH)


def predict_plant_health(sensor_data):
    input_data = pd.DataFrame([sensor_data])
    prediction = model.predict(input_data)[0]
    return label_encoder.inverse_transform([prediction])[0]


# Firebase

def read_firebase():
    response = requests.get(
        f"{FIREBASE_URL}/.json",
        timeout=5
    )
    response.raise_for_status()
    return response.json()

def set_pump_trigger(duration):
    data = {
        "trigger": True,
        "duration": duration
    }
    response = requests.put(
        f"{FIREBASE_URL}/pump.json",
        json=data,
        timeout=5
    )

    response.raise_for_status()

# Firebase -> Model Data
def firebase_to_model_input(firebase_data):
    sensors = firebase_data["sensors"]

    return {
        "Soil_Moisture": sensors["soil_moisture"],
        "Ambient_Temperature": sensors["temperature"],
        "Soil_Temperature": sensors["temperature"],
        "Humidity": sensors["humidity"],
        "Light_Intensity": sensors["light"],
    }


# Plant Status
def get_plant_status():
    firebase_data = read_firebase()
    sensor_data = firebase_to_model_input(firebase_data)
    health_status = predict_plant_health(sensor_data)
    pump = firebase_data.get("pump", {})
    return {
        "sensors": sensor_data,
        "health": health_status,
        "pump": {
            "trigger": pump.get("trigger", False),
            "duration": pump.get("duration", 0),
        }
    }


# API Endpoints
@app.get("/")
def root():
    return {
        "message": "Plant Health API is running"
    }

@app.get("/plant")
def plant():
    try:
        return get_plant_status()
    except requests.RequestException as e:
        raise HTTPException(
            status_code=503,
            detail=f"Firebase unavailable: {e}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@app.post("/pump")
def activate_pump():
    try:
        set_pump_trigger(PUMP_DURATION)
        return {
            "success": True,
            "duration": PUMP_DURATION
        }
    except requests.RequestException as e:
        raise HTTPException(
            status_code=503,
            detail=f"Could not communicate with Firebase: {e}"
        )


# Automatic Watering
def automatic_watering_loop():
    while True:
        try:
            firebase_data = read_firebase()
            sensor_data = firebase_to_model_input(firebase_data)
            moisture = sensor_data["Soil_Moisture"]
            pump = firebase_data.get("pump", {})
            pump_trigger = pump.get("trigger", False)
            if moisture < SOIL_MOISTURE_THRESHOLD:
                if not pump_trigger:
                    print(
                        f"Moisture {moisture}% < "
                        f"{SOIL_MOISTURE_THRESHOLD}%"
                    )
                    set_pump_trigger(PUMP_DURATION)
                    print("Pump triggered.")
                else:
                    print("Pump already triggered.")
        except Exception as e:
            print(f"Automatic watering error: {e}")

        time.sleep(UPDATE_INTERVAL_SECONDS)

@app.on_event("startup")
def start_background_tasks():
    thread = threading.Thread(
        target=automatic_watering_loop,
        daemon=True
    )
    thread.start()
    print("Automatic watering started.")