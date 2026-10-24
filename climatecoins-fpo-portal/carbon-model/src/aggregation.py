"""
aggregation.py
Aggregates individual farm predictions into FPO portfolios and performs corporate demand checks.
"""

import pandas as pd
from src.predict import get_model
from src.forecasting import generate_5year_forecast

def generate_fpo_portfolio(fpo_df: pd.DataFrame) -> pd.DataFrame:
    model = get_model()
    preds = model.predict(fpo_df)
    fpo_df = fpo_df.copy()
    fpo_df["predicted_annual_tco2e"] = [max(0.0, float(p)) for p in preds]

    # Calculate 5-year totals for each farmer
    five_yr_totals = []
    cons_5yr_totals = []
    for _, row in fpo_df.iterrows():
        fc = generate_5year_forecast(row["predicted_annual_tco2e"], int(row["tree_age_years"]), row["project_type"])
        five_yr_totals.append(fc["cumulative_expected"])
        cons_5yr_totals.append(fc["cumulative_conservative"])
        
    fpo_df["five_year_expected_tco2e"] = five_yr_totals
    fpo_df["five_year_conservative_tco2e"] = cons_5yr_totals
    return fpo_df

def check_corporate_demand(
    fpo_conservative_total: float, 
    fpo_expected_total: float,
    required_credits: float, 
    already_contracted: float = 0.0
) -> dict:
    available_conservative = max(0.0, fpo_conservative_total - already_contracted)
    available_expected = max(0.0, fpo_expected_total - already_contracted)
    
    coverage_ratio = available_conservative / required_credits if required_credits > 0 else 0.0
    
    if coverage_ratio >= 1.0:
        status = "Fulfillable (Low Risk)"
        risk_color = "green"
    elif coverage_ratio >= 0.75:
        status = "Partially Fulfillable (Requires Buffer Expansion)"
        risk_color = "orange"
    else:
        status = "Insufficient Conservative Supply"
        risk_color = "red"

    return {
        "required_credits": required_credits,
        "already_contracted": already_contracted,
        "conservative_supply": fpo_conservative_total,
        "expected_supply": fpo_expected_total,
        "available_conservative": available_conservative,
        "available_expected": available_expected,
        "coverage_ratio": round(coverage_ratio, 2),
        "status": status,
        "risk_color": risk_color
    }