import React, { useState } from "react";
import { api } from "./api";
import "./CarbonImpact.css";

const numericFields = [
  ["farm_area_acres", "Farm area (acres)"],
  ["location_latitude", "Latitude"],
  ["location_longitude", "Longitude"],
  ["tree_age_years", "Tree age (years)"],
  ["tree_density_per_acre", "Trees per acre"],
  ["soil_organic_carbon", "Soil organic carbon"],
  ["soil_ph", "Soil pH"],
  ["soil_nitrogen", "Soil nitrogen"],
  ["soil_phosphorus", "Soil phosphorus"],
  ["soil_potassium", "Soil potassium"],
  ["annual_rainfall_mm", "Annual rainfall (mm)"],
  ["average_temperature_c", "Average temperature (°C)"],
  ["humidity", "Humidity"],
  ["solar_radiation", "Solar radiation"],
  ["drought_frequency", "Drought frequency"],
  ["ndvi_mean", "NDVI mean"],
  ["ndvi_min", "NDVI minimum"],
  ["ndvi_max", "NDVI maximum"],
  ["ndvi_growth_rate", "NDVI growth rate"],
  ["evi_mean", "EVI mean"],
  ["ndmi_mean", "NDMI mean"],
];

const categoricalFields = [
  ["project_type", "Project type", [
    "agroforestry", "afforestation", "reforestation",
    "soil_restoration", "other"
  ]],
  ["crop_type", "Crop type", [
    "mixed", "rice", "wheat", "maize", "millets",
    "sugarcane", "cotton", "other"
  ]],
  ["tree_species", "Tree species", [
    "neem", "mango", "bamboo", "teak",
    "eucalyptus", "mixed", "none", "other"
  ]],
  ["irrigation_type", "Irrigation", [
    "drip", "sprinkler", "flood", "rainfed", "other"
  ]],
  ["farming_practice", "Farming practice", [
    "organic", "conventional", "agroforestry",
    "conservation", "mixed", "other"
  ]],
  ["soil_type", "Soil type", [
    "loamy", "clay", "sandy", "silt",
    "black", "red", "laterite", "other"
  ]],
];

const initialFeatures = Object.fromEntries([
  ...numericFields.map(([key]) => [key, ""]),
  ...categoricalFields.map(([key]) => [key, ""]),
]);

const format = value =>
  Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

export default function CarbonImpact() {
  const [features, setFeatures] = useState(initialFeatures);
  const [farmerName, setFarmerName] = useState("");
  const [farmerCode, setFarmerCode] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key, value) {
    setFeatures(old => ({ ...old, [key]: value }));
  }

  async function predict(event) {
    event.preventDefault();
    setError("");
    setResult(null);

    const missing = Object.entries(features)
      .filter(([, value]) => value === "")
      .map(([key]) => key);

    if (missing.length) {
      setError(
        `Please complete all model inputs. Missing: ${missing.join(", ")}`
      );
      return;
    }

    const payload = { ...features };

    for (const [key] of numericFields) {
      payload[key] = Number(payload[key]);

      if (!Number.isFinite(payload[key])) {
        setError(`Invalid numeric value for ${key}`);
        return;
      }
    }

    setLoading(true);

    try {
      const data = await api("/carbon/predict", {
        method: "POST",
        body: JSON.stringify({ features: payload }),
      });

      setResult(data);
    } catch (err) {
      setError(
        err.message ||
        "Prediction failed. Check that both APIs are running."
      );
    } finally {
      setLoading(false);
    }
  }

  const forecast = result?.forecast_5_years;
  const yearly = forecast?.expected_yearly || [];
  const maxValue = Math.max(1, ...yearly.map(Number));

  return (
    <div className="carbon-page">

      <header className="carbon-header">
        <div>
          <span className="carbon-eyebrow">
            CLIMATECOINS / MODEL INSIGHTS
          </span>
          <h1>Carbon Impact</h1>
          <p>
            Understand farm-level carbon sequestration estimates
            and future projections.
          </p>
        </div>

        <span className="carbon-live">
          <span /> Python ML Model
        </span>
      </header>

      <div className="carbon-warning">
        <strong>Preliminary model estimate</strong>
        <span>
          This model was trained on synthetic data. Predictions are
          for demonstration and are not verified carbon credits.
        </span>
      </div>

      <div className="carbon-layout">

        {/* INPUT FORM */}

        <form className="carbon-card carbon-form" onSubmit={predict}>
          <h2>Farm information</h2>
          <p className="carbon-muted">
            Enter the farm and environmental information required
            by the model.
          </p>

          <div className="carbon-input-grid">
            <label>
              Farmer name
              <input
                value={farmerName}
                onChange={e => setFarmerName(e.target.value)}
                placeholder="Farmer name"
              />
            </label>

            <label>
              Farmer ID
              <input
                value={farmerCode}
                onChange={e => setFarmerCode(e.target.value)}
                placeholder="FPO-001"
              />
            </label>
          </div>

          <h3>Project information</h3>

          <div className="carbon-input-grid">
            {categoricalFields.map(([key, label, options]) => (
              <label key={key}>
                {label}
                <select
                  required
                  value={features[key]}
                  onChange={e => update(key, e.target.value)}
                >
                  <option value="">Select {label.toLowerCase()}</option>

                  {options.map(option => (
                    <option key={option} value={option}>
                      {option.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {[
            ["Farm and location", numericFields.slice(0, 3)],
            ["Trees", numericFields.slice(3, 5)],
            ["Soil measurements", numericFields.slice(5, 10)],
            ["Climate", numericFields.slice(10, 15)],
            ["Vegetation indices", numericFields.slice(15)],
          ].map(([title, fields]) => (
            <section className="carbon-section" key={title}>
              <h3>{title}</h3>

              <div className="carbon-input-grid">
                {fields.map(([key, label]) => (
                  <label key={key}>
                    {label}

                    <input
                      type="number"
                      step="any"
                      required
                      value={features[key]}
                      onChange={e => update(key, e.target.value)}
                      placeholder="Enter value"
                    />
                  </label>
                ))}
              </div>
            </section>
          ))}

          {error && (
            <div className="carbon-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="carbon-predict-button"
            disabled={loading}
          >
            {loading
              ? "Predicting..."
              : "Predict Carbon Sequestration"}
          </button>
        </form>

        {/* PREDICTION RESULTS */}

        <aside className="carbon-results">

          {!result ? (
            <div className="carbon-card carbon-empty">
              <div className="carbon-icon">🌱</div>
              <h2>Carbon impact results</h2>
              <p>
                Complete the farm information and run the model.
                Your annual estimate and five-year forecast will
                appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="carbon-result-hero">
                <span>ESTIMATED ANNUAL SEQUESTRATION</span>

                <h2>
                  {format(
                    result.annual_carbon_sequestration_tco2e
                  )}
                </h2>

                <p>tonnes of CO₂ equivalent per year</p>

                <div className="carbon-farmer">
                  {farmerName || "Farm"}
                  {farmerCode ? ` · ${farmerCode}` : ""}
                </div>

                <small>Preliminary model estimate</small>
              </div>

              <div className="carbon-card">
                <h2>Five-year forecast</h2>

                <p className="carbon-muted">
                  Expected annual carbon sequestration
                </p>

                {yearly.map((value, index) => (
                  <div className="carbon-chart-row" key={index}>
                    <span>
                      {forecast.years?.[index] || `Year ${index + 1}`}
                    </span>

                    <div className="carbon-chart-track">
                      <div
                        className="carbon-chart-bar"
                        style={{
                          width: `${Math.max(
                            2,
                            Number(value) / maxValue * 100
                          )}%`,
                        }}
                      />
                    </div>

                    <strong>{format(value)}</strong>
                  </div>
                ))}

                <small className="carbon-muted">
                  Units: tCO₂e/year
                </small>
              </div>

              <div className="carbon-scenarios">
                {[
                  ["Conservative", forecast?.conservative_yearly],
                  ["Expected", forecast?.expected_yearly],
                  ["Optimistic", forecast?.optimistic_yearly],
                ].map(([name, values]) => (
                  <div className="carbon-card" key={name}>
                    <span>{name}</span>

                    <h3>
                      {values?.length
                        ? format(values[values.length - 1])
                        : "—"}
                    </h3>

                    <small>Year 5 · tCO₂e</small>
                  </div>
                ))}
              </div>

              <div className="carbon-card">
                <h2>Prediction details</h2>

                <p>
                  <span>Project type</span>
                  <strong>{features.project_type}</strong>
                </p>

                <p>
                  <span>Farm area</span>
                  <strong>{format(features.farm_area_acres)} acres</strong>
                </p>

                <p>
                  <span>Model status</span>
                  <strong>{result.status || "Success"}</strong>
                </p>

                <button
                  className="carbon-print-button"
                  onClick={() => window.print()}
                >
                  Print results
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}