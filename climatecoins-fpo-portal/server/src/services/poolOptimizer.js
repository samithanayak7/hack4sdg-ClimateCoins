
const { haversineDistanceKm } = require("./farmerClustering");

const clamp = value => Math.max(0, Math.min(100, value));
const round = value => Math.round(value * 100) / 100;

function optimizeCandidate(candidate, constraints = {}) {
  const farmers = candidate.farmers;

  const totalAcres = farmers.reduce(
    (sum, farmer) =>
      sum + Math.max(
        0,
        Number(farmer.plot_area_acres ?? farmer.acres ?? 0)
      ),
    0
  );

  const centroid = {
    latitude: farmers.reduce(
      (sum, farmer) => sum + Number(farmer.latitude), 0
    ) / farmers.length,
    longitude: farmers.reduce(
      (sum, farmer) => sum + Number(farmer.longitude), 0
    ) / farmers.length
  };

  const distances = farmers.map(farmer =>
    haversineDistanceKm(
      [centroid.latitude, centroid.longitude],
      [Number(farmer.latitude), Number(farmer.longitude)]
    )
  );

  const maxRadiusKm = Math.max(0, ...distances);
  const radiusKm = Number(constraints.radiusKm || 5);
  const minFarmers = Number(constraints.minFarmers || 5);
  const minTotalAcres = Number(constraints.minTotalAcres || 0);

  const farmerScore = clamp(
    farmers.length / Math.max(minFarmers * 2, 10) * 100
  );

  const compactnessScore = clamp(
    100 * (1 - maxRadiusKm / Math.max(radiusKm * 2, 0.1))
  );

  const areaScore = minTotalAcres > 0
    ? clamp(totalAcres / minTotalAcres * 70)
    : clamp(totalAcres * 4);

  const compatibilityScore =
    candidate.interventionType &&
    candidate.interventionType !== "unspecified"
      ? 100
      : 40;

  const mrvEfficiencyScore = clamp(
    farmers.length / Math.max(totalAcres, 0.1) * 18 +
    compactnessScore * 0.45
  );

  const optimizationScore = round(
    0.30 * farmerScore +
    0.25 * compactnessScore +
    0.20 * areaScore +
    0.15 * compatibilityScore +
    0.10 * mrvEfficiencyScore
  );

  const hardConstraints = [];

  if (farmers.length < minFarmers) {
    hardConstraints.push(
      `Requires at least ${minFarmers} farmers`
    );
  }

  if (totalAcres < minTotalAcres) {
    hardConstraints.push(
      `Requires at least ${minTotalAcres} acres`
    );
  }

  if (
    !candidate.interventionType ||
    candidate.interventionType === "unspecified"
  ) {
    hardConstraints.push("Intervention needs confirmation");
  }

  const reviewReasons = [];

  if (maxRadiusKm > radiusKm) {
    reviewReasons.push(
      "Cluster spread exceeds the configured radius from its centroid"
    );
  }

  if (farmers.some(f => f.location_source === "demo" || f.synthetic_demo)) {
    reviewReasons.push("Contains simulated demo coordinates");
  }

  return {
    candidateKey: candidate.candidateKey,
    interventionType: candidate.interventionType,
    farmerIds: farmers.map(f => f.id),
    farmers,
    farmerCount: farmers.length,
    totalAcres: round(totalAcres),
    centroid: {
      latitude: round(centroid.latitude),
      longitude: round(centroid.longitude)
    },
    maxRadiusKm: round(maxRadiusKm),
    compactnessScore: round(compactnessScore),
    mrvEfficiencyScore: round(mrvEfficiencyScore),
    optimizationScore,
    hardConstraints,
    reviewReasons,
    status: hardConstraints.length
      ? "needs_review"
      : "candidate"
  };
}

function optimizePools(candidates, constraints = {}) {
  return candidates
    .map((candidate, index) =>
      optimizeCandidate({
        ...candidate,
        candidateKey: candidate.candidateKey || `C-${index + 1}`
      }, constraints)
    )
    .sort((a, b) => b.optimizationScore - a.optimizationScore);
}

module.exports = { optimizeCandidate, optimizePools };
