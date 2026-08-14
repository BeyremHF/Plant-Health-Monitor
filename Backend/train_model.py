import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder


MODEL_PATH = "Model/plant_health_rf_model.pkl"
ENCODER_PATH = "Model/label_encoder.pkl"

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

dataset_path = "Backend/plant_health_data.csv"
train_and_save_optimized_model(dataset_path)