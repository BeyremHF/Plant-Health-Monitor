import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import os
import requests
import time
import json

FIREBASE_URL = "https://plant-health-monitor-esp32-default-rtdb.europe-west1.firebasedatabase.app"

MODEL_PATH = "model/plant_health_rf_model.pkl"
ENCODER_PATH = "model/label_encoder.pkl"
SOIL_MOISTURE_THRESHOLD = 40.0
UPDATE_INTERVAL_SECONDS = 30

def train_and_save_optimized_model(csv_path='plant_health_data.csv'):
    df = pd.read_csv(csv_path)
    X = df[['Soil_Moisture', 'Ambient_Temperature', 'Soil_Temperature', 'Humidity', 'Light_Intensity']]
    y = df['Plant_Health_Status']
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    model = RandomForestClassifier(n_estimators=100, max_depth=10, min_samples_split=5, criterion='entropy', random_state=42)
    model.fit(X, y_encoded)
    print("Model training complete.")
    joblib.dump(model, MODEL_PATH)
    joblib.dump(le, ENCODER_PATH)

def local_inference(sensor_data):
    loaded_model = joblib.load(MODEL_PATH)
    loaded_le = joblib.load(ENCODER_PATH)
    input_df = pd.DataFrame([sensor_data])
    prediction_idx = loaded_model.predict(input_df)[0]
    return loaded_le.inverse_transform([prediction_idx])[0]

def read_firebase():
    response = requests.get(f"{FIREBASE_URL}/.json")
    return response.json() if response.status_code == 200 else None

def set_pump_trigger_true():
    # This function is called when moisture is low to initiate the cycle
    requests.put(f"{FIREBASE_URL}/pump/trigger.json", data="true")

def firebase_to_model_input(firebase_data):
    sensors = firebase_data["sensors"]
    return {
        "Soil_Moisture": sensors["soil_moisture"],
        "Ambient_Temperature": sensors["temperature"],
        "Soil_Temperature": sensors["temperature"],
        "Humidity": sensors["humidity"],
        "Light_Intensity": sensors["light"]
    }

def artifacts_exist():
    return os.path.exists(MODEL_PATH) and os.path.exists(ENCODER_PATH)

dataset_path = "./plant_health_data.csv"

while True:
    if not artifacts_exist():
        train_and_save_optimized_model(dataset_path)

    firebase_data = read_firebase()
    if firebase_data:
        sensor_input = firebase_to_model_input(firebase_data)

        if sensor_input["Soil_Moisture"] < SOIL_MOISTURE_THRESHOLD:
            print(f"Moisture {sensor_input['Soil_Moisture']}% < {SOIL_MOISTURE_THRESHOLD}%. Setting trigger.")
            set_pump_trigger_true()

        result = local_inference(sensor_input)
        print("Sensor Input:", sensor_input)
        print("Status:", result)

    time.sleep(UPDATE_INTERVAL_SECONDS)