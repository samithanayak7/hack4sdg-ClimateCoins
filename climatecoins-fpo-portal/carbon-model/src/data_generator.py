"""
src/data_generator.py
Generates a representative dataset seeded by real coordinate clusters.
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import os
import numpy as np
import pandas as pd
from src.api_connectors import fetch_nasa_power_climate, fetch_soilgrids_data, simulate_satellite_indices

# Real representative agricultural locations across Indian agro-climatic zones
AGRO_REGIONS = [
    {"name": "Deccan Semi-Arid (Telangana)", "lat": 17.3850, "lon": 78.4867},
    {"name": "Western Dry (Rajasthan)", "lat": 26.9124, "lon": 75.7873},
    {"name": "Gangetic Alluvial (Punjab/Haryana)", "lat": 30.7333, "lon": 76.7794},
    {"name": "Central Black Soil (Maharashtra)", "lat": 21.1458, "lon": 79.0882},
    {"name": "Southern Humid/Laterite (Karnataka)", "lat": 12.9716, "lon": 77.5946},
    {"name": "Eastern Plateau (Madhya Pradesh)", "lat": 23.2599, "lon": 77.4126}
]

def generate_synthetic_dataset(n_samples: int = 2500, random_seed: int = 42) -> pd.DataFrame:
    np.random.seed(random_seed)

    # 1. Fetch reference baseline environmental profiles for real agro-climatic clusters
    region_baselines = []
    print("Fetching real API baselines for Indian agro-climatic zones...")
    for reg in AGRO_REGIONS:
        climate = fetch_nasa_power_climate(reg["lat"], reg["lon"])
        soil = fetch_soilgrids_data(reg["lat"], reg["lon"])
        region_baselines.append({**reg, **climate, **soil})

    records = []
    for i in range(1, n_samples + 1):
        # Pick a geographic anchor
        anchor = region_baselines[np.random.choice(len(region_baselines))]
        
        # Spatial jitter around the real cluster
        lat = round(anchor["lat"] + np.random.normal(0, 0.25), 4)
        lon = round(anchor["lon"] + np.random.normal(0, 0.25), 4)
        
        # Manual farm attributes
        farm_area_acres = round(float(np.random.uniform(0.5, 10.0)), 2)
        project_type = np.random.choice(["Agroforestry", "Silvopasture", "Regenerative Cropping", "Reforestation"], p=[0.45, 0.20, 0.25, 0.10])
        crop_type = np.random.choice(["Millet", "Paddy", "Cotton", "Pulses", "None/Pasture"])
        tree_species = np.random.choice(["Neem + Teak", "Subabul + Eucalyptus", "Mango + Cashew", "Bamboo", "Acacia"])
        tree_age_years = int(np.random.randint(1, 15))
        tree_density_per_acre = int(np.random.choice([0, 50, 100, 200, 300, 400], p=[0.05, 0.2, 0.35, 0.25, 0.1, 0.05]))
        irrigation_type = np.random.choice(["Rainfed", "Drip", "Flood", "Sprinkler"], p=[0.55, 0.25, 0.15, 0.05])
        farming_practice = np.random.choice(["Zero Tillage + Cover Crop", "Organic/Natural Farming", "Conventional Tillage", "Minimum Tillage"], p=[0.3, 0.3, 0.25, 0.15])

        # Climatology & Soil derived from real anchor with minor local variance
        annual_rainfall_mm = max(300.0, round(anchor["annual_rainfall_mm"] + np.random.normal(0, 40.0), 1))
        average_temperature_c = round(anchor["average_temperature_c"] + np.random.normal(0, 0.5), 1)
        humidity = round(anchor["humidity"] + np.random.normal(0, 2.0), 1)
        solar_radiation = round(anchor["solar_radiation"] + np.random.normal(0, 0.3), 2)
        drought_frequency = anchor["drought_frequency"]

        soil_organic_carbon = max(0.2, round(anchor["soil_organic_carbon"] + np.random.normal(0, 0.05), 2))
        soil_ph = round(anchor["soil_ph"] + np.random.normal(0, 0.1), 1)
        soil_nitrogen = max(50.0, round(anchor["soil_nitrogen"] + np.random.normal(0, 15.0), 1))
        soil_phosphorus = round(anchor["soil_phosphorus"] + np.random.normal(0, 3.0), 1)
        soil_potassium = round(anchor["soil_potassium"] + np.random.normal(0, 15.0), 1)
        soil_type = anchor["soil_type"]

        # Satellite indices calculation
        sat_indices = simulate_satellite_indices(tree_density_per_acre, tree_age_years, annual_rainfall_mm)

        # Target generation: Non-linear IPCC Tier-1 Biophysical Modeling
        tree_growth_factor = 1.0 / (1.0 + np.exp(-0.4 * (tree_age_years - 4)))
        practice_mult = {
            "Zero Tillage + Cover Crop": 1.35,
            "Organic/Natural Farming": 1.20,
            "Minimum Tillage": 1.05,
            "Conventional Tillage": 0.75
        }[farming_practice]

        project_mult = {
            "Agroforestry": 1.25,
            "Reforestation": 1.60,
            "Silvopasture": 1.10,
            "Regenerative Cropping": 0.85
        }[project_type]

        tree_biomass_rate = (tree_density_per_acre / 100.0) * tree_growth_factor * 1.8 * (annual_rainfall_mm / 1000.0)
        soil_seq_rate = (soil_organic_carbon * 0.6 + (soil_nitrogen / 500.0) * 0.3) * practice_mult
        climate_stress = np.clip(1.0 - (drought_frequency * 0.10) - max(0.0, (average_temperature_c - 30.0) * 0.05), 0.5, 1.1)

        annual_rate_per_acre = (tree_biomass_rate + soil_seq_rate) * project_mult * climate_stress * (sat_indices["ndvi_mean"] / 0.5)
        noise = np.random.normal(1.0, 0.06)
        annual_tco2e = max(0.1, round(float(annual_rate_per_acre * farm_area_acres * noise), 3))

        records.append({
            "farm_id": f"FARM_{i:04d}",
            "farm_area_acres": farm_area_acres,
            "location_latitude": lat,
            "location_longitude": lon,
            "project_type": project_type,
            "crop_type": crop_type,
            "tree_species": tree_species,
            "tree_age_years": tree_age_years,
            "tree_density_per_acre": tree_density_per_acre,
            "irrigation_type": irrigation_type,
            "farming_practice": farming_practice,
            "soil_organic_carbon": soil_organic_carbon,
            "soil_ph": soil_ph,
            "soil_nitrogen": soil_nitrogen,
            "soil_phosphorus": soil_phosphorus,
            "soil_potassium": soil_potassium,
            "soil_type": soil_type,
            "annual_rainfall_mm": annual_rainfall_mm,
            "average_temperature_c": average_temperature_c,
            "humidity": humidity,
            "solar_radiation": solar_radiation,
            "drought_frequency": drought_frequency,
            **sat_indices,
            "annual_carbon_sequestration_tco2e": annual_tco2e
        })

    return pd.DataFrame(records)

if __name__ == "__main__":
    out_dir = PROJECT_ROOT / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "synthetic_farms.csv"

    dataset = generate_synthetic_dataset(n_samples=2500)
    dataset.to_csv(out_path, index=False)
    print(f"Dataset successfully created with {len(dataset)} records at {out_path}")