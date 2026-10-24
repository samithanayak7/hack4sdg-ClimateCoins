"""
forecasting.py
Calculates 5-year sequestration trajectories and scenario bounds (Conservative, Expected, Optimistic).
Incorporates a biological sigmoidal growth curve to simulate tree maturity.
"""

import numpy as np

def generate_5year_forecast(base_annual_tco2e: float, tree_age_years: int, project_type: str = "Agroforestry") -> dict:
    years = [1, 2, 3, 4, 5]
    expected_yearly = []

    for idx, year_step in enumerate(years):
        future_age = tree_age_years + (year_step - 1)
        
        # Logistic growth curve multiplier to simulate canopy and root development
        growth_multiplier = 1.0 + 0.35 / (1.0 + np.exp(-0.5 * (future_age - 5)))
        
        # Project-specific annual maturation decay/growth
        if project_type in ["Agroforestry", "Reforestation"]:
            annual_val = base_annual_tco2e * growth_multiplier
        else: # Soil / Regenerative stabilizes faster
            annual_val = base_annual_tco2e * (1.0 + 0.03 * (year_step - 1))
            
        expected_yearly.append(round(float(annual_val), 2))

    # Scenario intervals (Conservative: -18% risk buffer for weather/pests, Optimistic: +16%)
    conservative_yearly = [round(v * 0.82, 2) for v in expected_yearly]
    optimistic_yearly = [round(v * 1.16, 2) for v in expected_yearly]

    cumulative_expected = round(sum(expected_yearly), 2)
    cumulative_conservative = round(sum(conservative_yearly), 2)
    cumulative_optimistic = round(sum(optimistic_yearly), 2)

    return {
        "years": [f"Year {y}" for y in years],
        "expected_yearly": expected_yearly,
        "conservative_yearly": conservative_yearly,
        "optimistic_yearly": optimistic_yearly,
        "cumulative_expected": cumulative_expected,
        "cumulative_conservative": cumulative_conservative,
        "cumulative_optimistic": cumulative_optimistic
    }