from pathlib import Path
import joblib
import pandas as pd

from src.train import train_and_save_model

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = PROJECT_ROOT / "models" / "carbon_model.pkl"


def get_model():
    if not MODEL_PATH.exists():
        pipeline, _ = train_and_save_model()
        return pipeline

    return joblib.load(MODEL_PATH)


def predict_single_farm(farm_features: dict) -> float:
    model = get_model()
    df = pd.DataFrame([farm_features])

    prediction = float(model.predict(df)[0])

    if not pd.notna(prediction):
        raise ValueError("The model returned an invalid prediction.")

    return max(0.0, prediction)