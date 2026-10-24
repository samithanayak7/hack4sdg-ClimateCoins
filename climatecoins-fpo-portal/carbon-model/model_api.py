from pathlib import Path
import math

import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from src.predict import get_model
from src.preprocessing import (
    NUMERICAL_FEATURES,
    CATEGORICAL_FEATURES,
)
from src.forecasting import generate_5year_forecast


app = FastAPI(title="ClimateCoins Carbon Model API")

FEATURES = NUMERICAL_FEATURES + CATEGORICAL_FEATURES


class PredictionRequest(BaseModel):
    features: dict


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
def predict(request: PredictionRequest):
    missing = [
        name for name in FEATURES
        if name not in request.features
        or request.features[name] is None
    ]

    if missing:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "Missing required model inputs",
                "missing_features": missing,
            },
        )

    try:
        row = {
            name: request.features[name]
            for name in FEATURES
        }

        for name in NUMERICAL_FEATURES:
            value = float(row[name])

            if not math.isfinite(value):
                raise ValueError(f"Invalid numeric input: {name}")

            row[name] = value

        model = get_model()
        dataframe = pd.DataFrame([row], columns=FEATURES)

        prediction = float(model.predict(dataframe)[0])

        if not math.isfinite(prediction):
            raise ValueError("The model returned a non-finite value.")

        prediction = max(0.0, prediction)

        tree_age = int(row["tree_age_years"])
        project_type = row["project_type"]

        forecast = generate_5year_forecast(
            prediction,
            tree_age,
            project_type,
        )

        return {
            "annual_carbon_sequestration_tco2e": prediction,
            "unit": "tCO2e/year",
            "forecast_5_years": forecast,
            "status": "preliminary_model_estimate",
        }

    except HTTPException:
        raise

    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        )

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="The carbon prediction could not be completed.",
        )