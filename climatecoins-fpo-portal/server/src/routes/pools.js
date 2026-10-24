
const express = require("express");
const { z } = require("zod");
const { clusterFarmers } = require("../services/farmerClustering");
const { optimizePools } = require("../services/poolOptimizer");

module.exports = function createPoolsRouter(db, auth, activity) {
  const router = express.Router();

  const interventions = [
    "agroforestry",
    "water_management",
    "improved_land_management",
    "other",
    "unspecified"
  ];

  router.get("/overview", auth, (req, res) => {
    const fpoId = req.user.id;

    const farmers = db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(
          CASE WHEN latitude IS NOT NULL
            AND longitude IS NOT NULL THEN 1 ELSE 0 END
        ) AS geolocated,
        COALESCE(SUM(acres), 0) AS acres
      FROM farmers WHERE fpo_id = ?
    `).get(fpoId);

    const pools = db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(
          CASE WHEN status = 'ready_for_verification'
            THEN 1 ELSE 0 END
        ) AS ready
      FROM farmer_pools WHERE fpo_id = ?
    `).get(fpoId);

    res.json({
      farmers: {
        total: farmers.total || 0,
        geolocated: farmers.geolocated || 0,
        acres: farmers.acres || 0
      },
      pools: {
        total: pools.total || 0,
        ready: pools.ready || 0
      },
      interventions
    });
  });

  router.get("/farmers", auth, (req, res) => {
    const farmers = db.prepare(`
      SELECT
        id, farmer_code, full_name, village, district, state,
        acres, plot_area_acres, crops, soil_type, irrigation,
        practices, consent, eligibility_status, latitude, longitude,
        intervention_type, location_source, synthetic_demo
      FROM farmers
      WHERE fpo_id = ?
      ORDER BY id DESC
    `).all(req.user.id);

    res.json({ farmers });
  });

  router.patch("/farmers/:id/location", auth, (req, res) => {
    const schema = z.object({
      latitude: z.number().finite().min(-90).max(90).nullable(),
      longitude: z.number().finite().min(-180).max(180).nullable(),
      interventionType: z.enum(interventions),
      locationSource: z.enum([
        "gps", "survey", "map_pin", "demo", "unknown"
      ]).default("map_pin"),
      plotAreaAcres: z.number().finite().min(0).max(100000)
        .nullable().optional()
    }).refine(
      v => (v.latitude === null) === (v.longitude === null),
      { message: "Latitude and longitude must both be set or both be empty." }
    );

    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0].message
      });
    }

    const farmer = db.prepare(`
      SELECT id FROM farmers WHERE id = ? AND fpo_id = ?
    `).get(Number(req.params.id), req.user.id);

    if (!farmer) {
      return res.status(404).json({ error: "Farmer not found." });
    }

    const v = parsed.data;

    db.prepare(`
      UPDATE farmers
      SET latitude = ?, longitude = ?, intervention_type = ?,
          location_source = ?, plot_area_acres = ?, synthetic_demo = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND fpo_id = ?
    `).run(
      v.latitude,
      v.longitude,
      v.interventionType,
      v.locationSource,
      v.plotAreaAcres ?? null,
      v.locationSource === "demo" ? 1 : 0,
      farmer.id,
      req.user.id
    );

    activity(
      req.user.id,
      "updated farmer geolocation",
      "farmer",
      farmer.id,
      v.interventionType
    );

    res.json({ success: true });
  });

  router.post("/cluster", auth, (req, res) => {
    const schema = z.object({
      interventionType: z.enum(["all", ...interventions])
        .default("all"),
      radiusKm: z.coerce.number().min(0.1).max(100).default(5),
      minPoints: z.coerce.number().int().min(2).max(100).default(3),
      minFarmers: z.coerce.number().int().min(2).max(500).default(5),
      minTotalAcres: z.coerce.number().min(0).max(1000000).default(0)
    });

    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0].message
      });
    }

    const p = parsed.data;

    const farmers = db.prepare(`
      SELECT * FROM farmers WHERE fpo_id = ?
    `).all(req.user.id);

    const clustered = clusterFarmers(farmers, {
      radiusKm: p.radiusKm,
      minPoints: p.minPoints,
      interventionType: p.interventionType
    });

    const candidates = optimizePools(clustered.candidates, p)
      .map((candidate, index) => ({
        ...candidate,
        candidateKey: `C-${String(index + 1).padStart(3, "0")}`
      }));

    const result = {
      summary: {
        farmersConsidered: clustered.farmersConsidered,
        geolocatedFarmers: clustered.geolocatedCount,
        clustersFound: candidates.length,
        unassignedFarmers: clustered.unassigned.length,
        totalCandidateAcres: candidates.reduce(
          (sum, c) => sum + c.totalAcres, 0
        )
      },
      candidates,
      unassigned: clustered.unassigned
    };

    const run = db.prepare(`
      INSERT INTO pool_runs (
        fpo_id, intervention_type, radius_km, min_points,
        min_farmers, min_total_acres, parameters_json,
        result_json, farmers_considered, clusters_found,
        unassigned_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      p.interventionType,
      p.radiusKm,
      p.minPoints,
      p.minFarmers,
      p.minTotalAcres,
      JSON.stringify(p),
      JSON.stringify(result),
      result.summary.farmersConsidered,
      candidates.length,
      clustered.unassigned.length
    );

    activity(
      req.user.id,
      "ran farmer clustering",
      "pool_run",
      run.lastInsertRowid,
      `${candidates.length} candidate pools`
    );

    res.json({
      runId: Number(run.lastInsertRowid),
      parameters: p,
      ...result
    });
  });

  router.get("/runs/:id", auth, (req, res) => {
    const run = db.prepare(`
      SELECT * FROM pool_runs WHERE id = ? AND fpo_id = ?
    `).get(Number(req.params.id), req.user.id);

    if (!run) {
      return res.status(404).json({
        error: "Clustering run not found."
      });
    }

    res.json({
      run: {
        ...run,
        parameters: JSON.parse(run.parameters_json),
        result: JSON.parse(run.result_json)
      }
    });
  });

  router.get("/", auth, (req, res) => {
    const pools = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM farmer_pool_members m
         WHERE m.pool_id = p.id) AS member_count
      FROM farmer_pools p
      WHERE p.fpo_id = ?
      ORDER BY p.updated_at DESC, p.id DESC
    `).all(req.user.id);

    res.json({ pools });
  });

  router.post("/", auth, (req, res) => {
    const schema = z.object({
      runId: z.number().int().positive(),
      candidateKey: z.string().min(1).max(80),
      name: z.string().trim().min(2).max(120).optional()
    });

    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0].message
      });
    }

    const { runId, candidateKey } = parsed.data;

    const run = db.prepare(`
      SELECT * FROM pool_runs WHERE id = ? AND fpo_id = ?
    `).get(runId, req.user.id);

    if (!run) {
      return res.status(404).json({
        error: "Clustering run not found."
      });
    }

    const result = JSON.parse(run.result_json);
    const candidate = result.candidates.find(
      c => c.candidateKey === candidateKey
    );

    if (!candidate) {
      return res.status(404).json({
        error: "Candidate pool not found."
      });
    }

    const poolCode = `POOL-${Date.now().toString().slice(-8)}`;
    const name = parsed.data.name ||
      `${candidate.interventionType} · ${candidateKey}`;

    const status = candidate.hardConstraints.length
      ? "needs_review"
      : "draft";

    const insertPool = db.prepare(`
      INSERT INTO farmer_pools (
        pool_code, fpo_id, source_run_id, candidate_key, name,
        intervention_type, status, farmer_count, total_acres,
        centroid_latitude, centroid_longitude, max_radius_km,
        compactness_score, mrv_efficiency_score,
        optimization_score, review_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMember = db.prepare(`
      INSERT INTO farmer_pool_members (
        pool_id, farmer_id, cluster_run_id
      ) VALUES (?, ?, ?)
    `);

    const savePool = db.transaction(() => {
      const saved = insertPool.run(
        poolCode, req.user.id, runId, candidateKey, name,
        candidate.interventionType, status, candidate.farmerCount,
        candidate.totalAcres, candidate.centroid.latitude,
        candidate.centroid.longitude, candidate.maxRadiusKm,
        candidate.compactnessScore, candidate.mrvEfficiencyScore,
        candidate.optimizationScore,
        [...candidate.hardConstraints, ...candidate.reviewReasons].join("; ")
      );

      for (const farmerId of candidate.farmerIds) {
        const owned = db.prepare(`
          SELECT id FROM farmers WHERE id = ? AND fpo_id = ?
        `).get(farmerId, req.user.id);

        if (!owned) {
          throw new Error("Candidate contains a farmer outside this FPO.");
        }

        insertMember.run(saved.lastInsertRowid, farmerId, runId);
      }

      return Number(saved.lastInsertRowid);
    });

    try {
      const id = savePool();

      activity(req.user.id, "saved farmer pool", "farmer_pool", id, name);

      res.status(201).json({
        pool: db.prepare(`
          SELECT * FROM farmer_pools WHERE id = ? AND fpo_id = ?
        `).get(id, req.user.id)
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/:id", auth, (req, res) => {
    const pool = db.prepare(`
      SELECT * FROM farmer_pools WHERE id = ? AND fpo_id = ?
    `).get(Number(req.params.id), req.user.id);

    if (!pool) {
      return res.status(404).json({ error: "Pool not found." });
    }

    const farmers = db.prepare(`
      SELECT f.id, f.farmer_code, f.full_name, f.village,
        f.district, f.state, f.acres, f.latitude, f.longitude,
        f.intervention_type, f.location_source, f.consent,
        f.eligibility_status
      FROM farmer_pool_members m
      JOIN farmers f ON f.id = m.farmer_id
      WHERE m.pool_id = ? AND f.fpo_id = ?
      ORDER BY f.full_name
    `).all(pool.id, req.user.id);

    res.json({ pool, farmers });
  });

  router.patch("/:id", auth, (req, res) => {
    const schema = z.object({
      name: z.string().trim().min(2).max(120).optional(),
      status: z.enum([
        "draft", "needs_review",
        "ready_for_verification", "archived"
      ]).optional(),
      reviewNotes: z.string().max(2000).optional()
    }).refine(v => Object.keys(v).length > 0);

    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Provide a valid pool name, status or review notes."
      });
    }

    const existing = db.prepare(`
      SELECT id FROM farmer_pools WHERE id = ? AND fpo_id = ?
    `).get(Number(req.params.id), req.user.id);

    if (!existing) {
      return res.status(404).json({ error: "Pool not found." });
    }

    const p = parsed.data;

    db.prepare(`
      UPDATE farmer_pools
      SET name = COALESCE(?, name),
          status = COALESCE(?, status),
          review_notes = COALESCE(?, review_notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND fpo_id = ?
    `).run(
      p.name ?? null, p.status ?? null, p.reviewNotes ?? null,
      existing.id, req.user.id
    );

    res.json({
      pool: db.prepare(`
        SELECT * FROM farmer_pools WHERE id = ? AND fpo_id = ?
      `).get(existing.id, req.user.id)
    });
  });

  return router;
};
