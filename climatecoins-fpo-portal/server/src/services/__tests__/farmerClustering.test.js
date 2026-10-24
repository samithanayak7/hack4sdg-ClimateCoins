
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  haversineDistanceKm,
  dbscan,
  clusterFarmers
} = require("../farmerClustering");

const { optimizePools } = require("../poolOptimizer");

test("Haversine distance is zero for identical coordinates", () => {
  assert.equal(
    haversineDistanceKm([12.9, 77.6], [12.9, 77.6]),
    0
  );
});

test("DBSCAN groups nearby points", () => {
  const points = [
    [12.995, 77.760],
    [12.997, 77.762],
    [12.991, 77.757],
    [12.999, 77.766],
    [13.150, 77.950]
  ];

  const result = dbscan(points, 5, 3);

  assert.equal(result.clusters.length, 1);
  assert.equal(result.clusters[0].length, 4);
  assert.ok(result.noise.includes(4));
});

test("Different interventions remain separate", () => {
  const farmers = [
    { id: 1, latitude: 12.995, longitude: 77.760, intervention_type: "agroforestry", consent: 1, eligibility_status: "eligible" },
    { id: 2, latitude: 12.997, longitude: 77.762, intervention_type: "agroforestry", consent: 1, eligibility_status: "eligible" },
    { id: 3, latitude: 12.991, longitude: 77.757, intervention_type: "agroforestry", consent: 1, eligibility_status: "eligible" },
    { id: 4, latitude: 12.996, longitude: 77.763, intervention_type: "water_management", consent: 1, eligibility_status: "eligible" }
  ];

  const result = clusterFarmers(farmers, {
    radiusKm: 5,
    minPoints: 3,
    interventionType: "all"
  });

  assert.equal(result.candidates.length, 1);
  assert.equal(
    result.candidates[0].interventionType,
    "agroforestry"
  );
  assert.ok(result.unassigned.some(f => f.id === 4));
});

test("Optimization returns a bounded score", () => {
  const candidates = [{
    interventionType: "agroforestry",
    farmers: [
      { id: 1, latitude: 12.995, longitude: 77.760, acres: 3, consent: 1, eligibility_status: "eligible" },
      { id: 2, latitude: 12.997, longitude: 77.762, acres: 3, consent: 1, eligibility_status: "eligible" },
      { id: 3, latitude: 12.991, longitude: 77.757, acres: 3, consent: 1, eligibility_status: "eligible" }
    ]
  }];

  const [pool] = optimizePools(candidates, {
    radiusKm: 5,
    minFarmers: 3,
    minTotalAcres: 5
  });

  assert.ok(pool.optimizationScore >= 0);
  assert.ok(pool.optimizationScore <= 100);
  assert.equal(pool.farmerCount, 3);
});
