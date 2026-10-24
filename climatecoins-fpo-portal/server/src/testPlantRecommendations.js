const { recommendPlants } = require("./plantRecommendations");

const farm = {
  latitude: 10.53,
  longitude: 76.21,
  state: "Kerala",
  district: "Thrissur",
  farmAreaAcres: 5,

  // Illustrative test values, not live API observations.
  annualRainfallMm: 1800,
  averageTemperatureC: 27,
  soilType: "loamy",
  waterAvailability: "moderate",

  existingCrops: ["banana", "rice"]
};

const result = recommendPlants(farm);

console.log(JSON.stringify(result, null, 2));