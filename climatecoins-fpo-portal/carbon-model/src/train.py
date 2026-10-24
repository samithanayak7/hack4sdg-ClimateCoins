"""
src/train.py
Trains and serializes the XGBoost Pipeline.
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor

from src.preprocessing import get_preprocessor, NUMERICAL_FEATURES, CATEGORICAL_FEATURES, TARGET_COL
from src.data_generator import generate_synthetic_dataset

DATA_PATH = PROJECT_ROOT / "data" / "synthetic_farms.csv"
MODEL_PATH = PROJECT_ROOT / "models/carbon_model.pkl"

def train_and_save_model():
    if not DATA_PATH.exists() or DATA_PATH.stat().st_size == 0:
        DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
        print("Generating training dataset from agro-climatic API baselines...")
        df = generate_synthetic_dataset(2500)
        df.to_csv(DATA_PATH, index=False)
    else:
        df = pd.read_csv(DATA_PATH)

    X = df[NUMERICAL_FEATURES + CATEGORICAL_FEATURES]
    y = df[TARGET_COL]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    preprocessor = get_preprocessor()
    model = XGBRegressor(
        n_estimators=180,
        learning_rate=0.08,
        max_depth=5,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42
    )

    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("regressor", model)
    ])

    print("Fitting model...")
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)

    print("\n--- Model Training Evaluation ---")
    print(f"Mean Absolute Error (MAE): {mae:.4f} tCO2e")
    print(f"Root Mean Squared Error (RMSE): {rmse:.4f} tCO2e")
    print(f"R-squared (R2 Score): {r2:.4f}")
    print("---------------------------------")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")
    return pipeline, {"mae": mae, "rmse": rmse, "r2": r2}

if __name__ == "__main__":
    train_and_save_model()