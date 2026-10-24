/**
 * ClimateCoins — Crop & Agroforestry Recommendation Engine
 *
 * Version 1: Transparent rules-based recommendations.
 *
 * IMPORTANT:
 * - Environmental inputs should come from verified API responses
 *   or clearly identified user-provided information.
 * - Suitability scores are preliminary rule-based scores, not
 *   scientifically validated probabilities.
 * - Carbon-credit tiers must be mapped to the actual rules of
 *   the applicable carbon-credit programme.
 */

const PLANT_CATALOG = [
  {
    id: "coconut",
    name: "Coconut",
    category: "Tree crop",
    regions: ["tropical", "coastal", "humid"],
    minRainfall: 1000,
    maxRainfall: 3500,
    minTemperature: 22,
    maxTemperature: 35,
    soils: ["sandy", "loamy", "laterite"],
    waterNeed: "high",
    waterScore: { low: 0, moderate: 2, high: 3 },
    carbonPotential: "moderate",
    farmingPractices: [
      "Maintain suitable ground cover.",
      "Use organic mulch to reduce evaporation.",
      "Consider suitable intercrops where local guidance permits."
    ],
    warnings: [
      "Check local water availability, drainage, and salinity.",
      "Confirm suitability for the local rainfall and soil conditions."
    ],
    compatibleCrops: ["banana", "pineapple", "legumes"]
  },
  {
    id: "mango",
    name: "Mango",
    category: "Fruit tree",
    regions: ["tropical", "subtropical", "semiarid"],
    minRainfall: 500,
    maxRainfall: 2500,
    minTemperature: 20,
    maxTemperature: 38,
    soils: ["sandy", "loamy", "red", "laterite"],
    waterNeed: "moderate",
    waterScore: { low: 1, moderate: 3, high: 3 },
    carbonPotential: "moderate",
    farmingPractices: [
      "Use locally recommended varieties.",
      "Maintain a suitable mulch and ground-cover layer.",
      "Prune and manage trees according to local horticultural guidance."
    ],
    warnings: [
      "Waterlogging and unsuitable flowering conditions can reduce productivity.",
      "Check spacing and canopy competition before adding intercrops."
    ],
    compatibleCrops: ["pulses", "groundnut", "vegetables"]
  },
  {
    id: "neem",
    name: "Neem",
    category: "Multipurpose tree",
    regions: ["tropical", "subtropical", "semiarid"],
    minRainfall: 400,
    maxRainfall: 2000,
    minTemperature: 20,
    maxTemperature: 40,
    soils: ["sandy", "loamy", "red", "black"],
    waterNeed: "low",
    waterScore: { low: 3, moderate: 3, high: 2 },
    carbonPotential: "moderate",
    farmingPractices: [
      "Protect young saplings during establishment.",
      "Maintain suitable spacing from crops and infrastructure.",
      "Retain ground cover where practical."
    ],
    warnings: [
      "Neem is not a substitute for crop-specific soil and water management.",
      "Check whether mature tree shade will affect nearby crops."
    ],
    compatibleCrops: ["millets", "pulses", "groundnut"]
  },
  {
    id: "moringa",
    name: "Moringa",
    category: "Multipurpose tree",
    regions: ["tropical", "subtropical", "semiarid"],
    minRainfall: 300,
    maxRainfall: 1500,
    minTemperature: 20,
    maxTemperature: 38,
    soils: ["sandy", "loamy", "red"],
    waterNeed: "low",
    waterScore: { low: 3, moderate: 3, high: 2 },
    carbonPotential: "low_to_moderate",
    farmingPractices: [
      "Use locally suitable planting material.",
      "Use pruning and spacing practices appropriate to the production goal.",
      "Protect young plants during dry periods."
    ],
    warnings: [
      "Avoid poorly drained locations.",
      "Carbon benefits depend on biomass growth and long-term management."
    ],
    compatibleCrops: ["pulses", "millets", "groundnut"]
  },
  {
    id: "amla",
    name: "Amla",
    category: "Fruit tree",
    regions: ["tropical", "subtropical", "semiarid"],
    minRainfall: 500,
    maxRainfall: 2000,
    minTemperature: 18,
    maxTemperature: 40,
    soils: ["sandy", "loamy", "red", "black"],
    waterNeed: "low",
    waterScore: { low: 3, moderate: 3, high: 2 },
    carbonPotential: "moderate",
    farmingPractices: [
      "Select varieties suitable for the local climate.",
      "Maintain organic ground cover where practical.",
      "Use locally recommended orchard management practices."
    ],
    warnings: [
      "Check drainage and local variety suitability.",
      "Young plants may require watering during establishment."
    ],
    compatibleCrops: ["pulses", "millets", "groundnut"]
  },
  {
    id: "pongamia",
    name: "Pongamia (Karanja)",
    category: "Multipurpose tree",
    regions: ["tropical", "subtropical", "coastal", "semiarid"],
    minRainfall: 500,
    maxRainfall: 2500,
    minTemperature: 18,
    maxTemperature: 38,
    soils: ["sandy", "loamy", "red", "black", "laterite"],
    waterNeed: "low",
    waterScore: { low: 3, moderate: 3, high: 2 },
    carbonPotential: "moderate",
    farmingPractices: [
      "Confirm locally suitable planting material.",
      "Protect saplings while roots establish.",
      "Plan spacing to limit competition with existing crops."
    ],
    warnings: [
      "Local performance depends on rainfall, drainage, and soil conditions.",
      "Check local agricultural guidance before large-scale planting."
    ],
    compatibleCrops: ["pulses", "millets"]
  },
  {
    id: "bamboo",
    name: "Bamboo",
    category: "Perennial woody plant",
    regions: ["tropical", "subtropical", "humid"],
    minRainfall: 800,
    maxRainfall: 3500,
    minTemperature: 18,
    maxTemperature: 35,
    soils: ["loamy", "red", "laterite"],
    waterNeed: "moderate",
    waterScore: { low: 1, moderate: 3, high: 3 },
    carbonPotential: "moderate",
    farmingPractices: [
      "Select a species suited to the local climate and intended use.",
      "Plan spacing and harvesting before planting.",
      "Maintain soil cover and protect young plants."
    ],
    warnings: [
      "Bamboo species differ substantially in growth and water requirements.",
      "Confirm clumping behaviour, local suitability, and management requirements."
    ],
    compatibleCrops: ["selected shade-tolerant crops"]
  }
];

const VALID_WATER_LEVELS = ["low", "moderate", "high"];

function normalise(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normaliseSoil(value) {
  const soil = normalise(value);

  if (soil.includes("sandy")) return "sandy";
  if (soil.includes("loam")) return "loamy";
  if (soil.includes("laterite")) return "laterite";
  if (soil.includes("red")) return "red";
  if (soil.includes("black") || soil.includes("vertisol")) return "black";

  return null;
}

function classifyClimate(rainfall, temperature) {
  if (rainfall == null || temperature == null) {
    return null;
  }

  if (rainfall >= 1500 && temperature >= 22) {
    return "humid";
  }

  if (rainfall < 1000 && temperature >= 20) {
    return "semiarid";
  }

  if (temperature >= 22) {
    return "tropical";
  }

  return "subtropical";
}

function evaluatePlant(plant, farm) {
  let score = 0;
  const reasons = [];
  const warnings = [...plant.warnings];

  const rainfall = farm.annualRainfallMm;
  const temperature = farm.averageTemperatureC;
  const soil = normaliseSoil(farm.soilType);
  const water = normalise(farm.waterAvailability);

  // Rainfall suitability
  if (Number.isFinite(rainfall)) {
    if (
      rainfall >= plant.minRainfall &&
      rainfall <= plant.maxRainfall
    ) {
      score += 3;
      reasons.push("Reported rainfall is within the preliminary suitability range.");
    } else {
      score -= 2;
      warnings.push(
        "Reported rainfall is outside the preliminary range; obtain local agronomic advice."
      );
    }
  } else {
    warnings.push("Rainfall data is unavailable; rainfall suitability was not assessed.");
  }

  // Temperature suitability
  if (Number.isFinite(temperature)) {
    if (
      temperature >= plant.minTemperature &&
      temperature <= plant.maxTemperature
    ) {
      score += 3;
      reasons.push("Reported temperature is within the preliminary suitability range.");
    } else {
      score -= 2;
      warnings.push(
        "Reported temperature is outside the preliminary range; confirm local suitability."
      );
    }
  } else {
    warnings.push("Temperature data is unavailable; temperature suitability was not assessed.");
  }

  // Soil suitability
  if (soil) {
    if (plant.soils.includes(soil)) {
      score += 2;
      reasons.push(`The reported ${soil} soil type is included in the preliminary soil suitability rules.`);
    } else {
      score -= 1;
      warnings.push("Soil compatibility needs local verification.");
    }
  } else {
    warnings.push("Soil type is unknown or too broad to assess reliably.");
  }

  // Water availability
  if (VALID_WATER_LEVELS.includes(water)) {
    score += plant.waterScore[water] ?? 0;

    if (water === "low" && plant.waterNeed === "high") {
      warnings.push("Water availability may be insufficient for this option.");
    } else {
      reasons.push(`Water requirement: ${plant.waterNeed}.`);
    }
  } else {
    warnings.push("Water availability was not provided.");
  }

  // Broad regional classification, not exact geospatial validation.
  const climate = classifyClimate(rainfall, temperature);

  if (climate) {
    if (plant.regions.includes(climate)) {
      score += 1;
    } else {
      score -= 1;
    }
  }

  // Existing crops are a compatibility prompt, not a guaranteed
  // agronomic intercropping recommendation.
  const crops = Array.isArray(farm.existingCrops)
    ? farm.existingCrops.map(normalise)
    : [];

  if (crops.length && plant.compatibleCrops.length) {
    const matches = crops.some(crop =>
      plant.compatibleCrops.some(option =>
        normalise(option) === crop
      )
    );

    if (matches) {
      reasons.push("The existing crop list contains an option that may be compatible; verify spacing and local practices.");
    }
  }

  const suitability =
    score >= 8 ? "Higher preliminary suitability" :
    score >= 4 ? "Possible option — verify locally" :
    "Insufficient match — local assessment needed";

  return {
    id: plant.id,
    name: plant.name,
    category: plant.category,
    score,
    suitability,
    reasons,
    waterNeed: plant.waterNeed,
    farmingPractices: plant.farmingPractices,
    warnings: [...new Set(warnings)],
    carbonPotential: plant.carbonPotential,

    // Never invent an official tier. Map this field once the
    // project's actual tier definitions and rules are available.
    creditTier: {
      status: "not_assessed",
      label: "Credit tier not assessed",
      reason:
        "Requires the applicable programme's eligibility rules, methodology, and project-specific evidence."
    }
  };
}

function recommendPlants(farm) {
  if (!farm || typeof farm !== "object" || Array.isArray(farm)) {
    throw new Error("Farm details must be provided as an object.");
  }

  const rainfall = farm.annualRainfallMm;
  const temperature = farm.averageTemperatureC;

  if (
    rainfall != null &&
    (!Number.isFinite(rainfall) || rainfall < 0 || rainfall > 12000)
  ) {
    throw new Error("annualRainfallMm must be a valid number between 0 and 12000.");
  }

  if (
    temperature != null &&
    (!Number.isFinite(temperature) ||
      temperature < -10 ||
      temperature > 60)
  ) {
    throw new Error("averageTemperatureC must be a valid temperature.");
  }

  if (
    farm.farmAreaAcres != null &&
    (!Number.isFinite(farm.farmAreaAcres) || farm.farmAreaAcres <= 0)
  ) {
    throw new Error("farmAreaAcres must be a positive number.");
  }

  const recommendations = PLANT_CATALOG
    .map(plant => evaluatePlant(plant, farm))
    .sort((a, b) => b.score - a.score);

  return {
    engine: "climatecoins-rules-v1",
    status: "preliminary_recommendations",
    location: {
      latitude: farm.latitude ?? null,
      longitude: farm.longitude ?? null,
      state: farm.state ?? null,
      district: farm.district ?? null
    },
    farmAreaAcres: farm.farmAreaAcres ?? null,
    environmentalData: {
      source: farm.environmentalDataSource ?? "not specified",
      annualRainfallMm: rainfall ?? null,
      averageTemperatureC: temperature ?? null,
      soilType: farm.soilType ?? null,
      waterAvailability: farm.waterAvailability ?? null
    },
    dataLimitations: [
      "Recommendations are preliminary rules-based suggestions, not validated probabilities.",
      "Unprovided environmental data is not silently replaced with fabricated measurements.",
      "Confirm species suitability with local agricultural or forestry guidance.",
      "Credit eligibility and issued credits cannot be inferred from species choice alone."
    ],
    recommendations
  };
}

module.exports = {
  recommendPlants,
  PLANT_CATALOG
};
