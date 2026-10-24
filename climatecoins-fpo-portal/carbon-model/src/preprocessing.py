"""
preprocessing.py
Prepares raw feature sets, builds the scikit-learn preprocessing pipeline,
and handles categorical encoding and scaling.
"""

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler

CATEGORICAL_FEATURES = [
    "project_type",
    "crop_type",
    "tree_species",
    "irrigation_type",
    "farming_practice",
    "soil_type"
]

NUMERICAL_FEATURES = [
    "farm_area_acres",
    "location_latitude",
    "location_longitude",
    "tree_age_years",
    "tree_density_per_acre",
    "soil_organic_carbon",
    "soil_ph",
    "soil_nitrogen",
    "soil_phosphorus",
    "soil_potassium",
    "annual_rainfall_mm",
    "average_temperature_c",
    "humidity",
    "solar_radiation",
    "drought_frequency",
    "ndvi_mean",
    "ndvi_min",
    "ndvi_max",
    "ndvi_growth_rate",
    "evi_mean",
    "ndmi_mean"
]

TARGET_COL = "annual_carbon_sequestration_tco2e"

def get_preprocessor() -> ColumnTransformer:
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERICAL_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES)
        ]
    )
    return preprocessor