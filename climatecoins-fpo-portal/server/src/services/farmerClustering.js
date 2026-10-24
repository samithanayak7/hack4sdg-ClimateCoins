
const EARTH_RADIUS_KM = 6371.0088;

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

function haversineDistanceKm(a, b) {
  const lat1 = toRadians(a[0]);
  const lat2 = toRadians(b[0]);
  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(b[1] - a[1]);

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM *
    Math.asin(Math.min(1, Math.sqrt(h)));
}

function dbscan(points, epsilonKm, minPoints) {
  const labels = new Array(points.length).fill(-1);
  const visited = new Array(points.length).fill(false);
  const clusters = [];

  function neighbors(index) {
    const result = [];

    for (let j = 0; j < points.length; j++) {
      if (
        haversineDistanceKm(points[index], points[j]) <=
        epsilonKm
      ) {
        result.push(j);
      }
    }

    return result;
  }

  for (let i = 0; i < points.length; i++) {
    if (visited[i]) continue;

    visited[i] = true;
    const near = neighbors(i);

    if (near.length < minPoints) continue;

    const clusterId = clusters.length;
    const cluster = [];
    const queue = [...near];
    const queued = new Set(queue);

    labels[i] = clusterId;
    cluster.push(i);

    for (let cursor = 0; cursor < queue.length; cursor++) {
      const pointIndex = queue[cursor];

      if (!visited[pointIndex]) {
        visited[pointIndex] = true;

        const nearby = neighbors(pointIndex);

        if (nearby.length >= minPoints) {
          for (const neighborIndex of nearby) {
            if (!queued.has(neighborIndex)) {
              queue.push(neighborIndex);
              queued.add(neighborIndex);
            }
          }
        }
      }

      if (labels[pointIndex] === -1) {
        labels[pointIndex] = clusterId;
        cluster.push(pointIndex);
      }
    }

    clusters.push(cluster);
  }

  return {
    clusters,
    noise: labels
      .map((label, index) => label === -1 ? index : -1)
      .filter(index => index !== -1)
  };
}

function clusterFarmers(
  farmers,
  {
    radiusKm = 5,
    minPoints = 3,
    interventionType = "all"
  } = {}
) {
  const validCoordinates = farmer =>
    farmer.latitude != null &&
    farmer.longitude != null &&
    Number.isFinite(Number(farmer.latitude)) &&
    Number.isFinite(Number(farmer.longitude)) &&
    Number(farmer.latitude) >= -90 &&
    Number(farmer.latitude) <= 90 &&
    Number(farmer.longitude) >= -180 &&
    Number(farmer.longitude) <= 180;

  const eligibleForClustering = farmers.filter(farmer =>
    validCoordinates(farmer) &&
    farmer.consent === 1 &&
    farmer.eligibility_status !== "rejected"
  );

  const unassigned = farmers
    .filter(farmer => !eligibleForClustering.includes(farmer))
    .map(farmer => ({
      ...farmer,
      unassignedReason: !validCoordinates(farmer)
        ? "Missing or invalid farm coordinates"
        : farmer.consent !== 1
          ? "Farmer consent needs confirmation"
          : "Farmer is marked as rejected"
    }));

  const groups = new Map();

  for (const farmer of eligibleForClustering) {
    const type = String(
      farmer.intervention_type || "unspecified"
    ).toLowerCase();

    if (
      interventionType !== "all" &&
      type !== interventionType
    ) {
      unassigned.push({
        ...farmer,
        unassignedReason: `Different intervention: ${type}`
      });
      continue;
    }

    if (!groups.has(type)) groups.set(type, []);
    groups.get(type).push(farmer);
  }

  const candidates = [];

  for (const [intervention, members] of groups) {
    const points = members.map(farmer => [
      Number(farmer.latitude),
      Number(farmer.longitude)
    ]);

    const result = dbscan(points, radiusKm, minPoints);

    for (const indices of result.clusters) {
      candidates.push({
        interventionType: intervention,
        farmers: indices.map(index => members[index])
      });
    }

    for (const index of result.noise) {
      unassigned.push({
        ...members[index],
        unassignedReason:
          `Not density-connected within ${radiusKm} km`
      });
    }
  }

  return {
    candidates,
    unassigned,
    farmersConsidered: farmers.length,
    geolocatedCount: eligibleForClustering.length
  };
}

module.exports = {
  haversineDistanceKm,
  dbscan,
  clusterFarmers
};
