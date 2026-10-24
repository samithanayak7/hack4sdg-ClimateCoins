const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const db = require('./db');
const { recommendPlants } = require('./plantRecommendations');

require('dotenv').config({
  path: path.resolve(process.cwd(), '.env')
});

const app = express();
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET =
  process.env.JWT_SECRET || 'development-only-change-this-secret';

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173'
  })
);

app.use(express.json({ limit: '1mb' }));

// ============================================================
// File uploads
// ============================================================

const uploadDir = path.resolve(process.cwd(), 'server/uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    cb(
      null,
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}${path.extname(file.originalname).toLowerCase()}`
    );
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(pdf|png|jpe?g)$/i.test(file.originalname);

    cb(
      allowed ? null : new Error('Only PDF, PNG and JPG files are allowed.'),
      allowed
    );
  }
});

// ============================================================
// Authentication and activity logging
// ============================================================

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(
    /^Bearer\s+/i,
    ''
  );

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      error: 'Session expired. Please sign in again.'
    });
  }
}

function activity(userId, action, entityType, entityId, details = '') {
  db.prepare(`
    INSERT INTO activities(
      user_id,
      action,
      entity_type,
      entity_id,
      details
    )
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, action, entityType, entityId, details);
}

// ============================================================
// Farmer validation
// ============================================================

const farmerSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20),
  village: z.string().trim().min(2).max(100),
  district: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100).default('Karnataka'),
  acres: z.coerce.number().min(0).max(100000),
  crops: z.string().max(500).optional().default(''),
  soil_type: z.string().max(100).optional().default(''),
  irrigation: z.string().max(100).optional().default(''),
  practices: z.string().max(1000).optional().default(''),
  land_ownership: z
    .enum(['owned', 'leased', 'shared', 'unknown'])
    .default('unknown'),
  consent: z.coerce.boolean().default(false),
  eligibility_status: z
    .enum(['pending', 'eligible', 'review', 'rejected'])
    .optional()
    .default('pending'),
  eligibility_notes: z.string().max(1000).optional().default('')
});

// ============================================================
// Health check
// ============================================================

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ClimateCoins FPO API'
  });
});

// ============================================================
// Authentication routes
// ============================================================

app.post('/api/auth/login', (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
  });

  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Enter a valid email and password.'
    });
  }

  const user = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(parsed.data.email.toLowerCase());

  if (
    !user ||
    !bcrypt.compareSync(parsed.data.password, user.password_hash)
  ) {
    return res.status(401).json({
      error: 'Incorrect email or password.'
    });
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      fpo_name: user.fpo_name
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  activity(user.id, 'signed in', 'user', user.id);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      fpo_name: user.fpo_name
    }
  });
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json({
    user: req.user
  });
});

// ============================================================
// Dashboard
// ============================================================

app.get('/api/dashboard', auth, (req, res) => {
  const total = db
    .prepare('SELECT COUNT(*) n FROM farmers WHERE fpo_id = ?')
    .get(req.user.id).n;

  const status = db
    .prepare(`
      SELECT eligibility_status, COUNT(*) n
      FROM farmers
      WHERE fpo_id = ?
      GROUP BY eligibility_status
    `)
    .all(req.user.id);

  const docs = db
    .prepare(`
      SELECT COUNT(*) n
      FROM documents d
      JOIN farmers f ON f.id = d.farmer_id
      WHERE f.fpo_id = ?
    `)
    .get(req.user.id).n;

  const acres = db
    .prepare(`
      SELECT COALESCE(SUM(acres), 0) n
      FROM farmers
      WHERE fpo_id = ?
    `)
    .get(req.user.id).n;

  const recent = db
    .prepare(`
      SELECT
        id,
        farmer_code,
        full_name,
        village,
        district,
        acres,
        eligibility_status,
        created_at
      FROM farmers
      WHERE fpo_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 6
    `)
    .all(req.user.id);

  const activities = db
    .prepare(`
      SELECT action, entity_type, entity_id, details, created_at
      FROM activities
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 8
    `)
    .all(req.user.id);

  res.json({
    stats: {
      totalFarmers: total,
      eligible:
        (status.find(x => x.eligibility_status === 'eligible') || {}).n || 0,
      needsReview:
        (status.find(x => x.eligibility_status === 'review') || {}).n || 0,
      pending:
        (status.find(x => x.eligibility_status === 'pending') || {}).n || 0,
      documents: docs,
      totalAcres: Math.round(acres * 100) / 100
    },
    recent,
    activities
  });
});

// ============================================================
// Farmer routes
// ============================================================

app.get('/api/farmers', auth, (req, res) => {
  const q = String(req.query.q || '').trim();
  const status = String(req.query.status || '');

  const rows = db
    .prepare(`
      SELECT
        f.*,
        (
          SELECT COUNT(*)
          FROM documents d
          WHERE d.farmer_id = f.id
        ) document_count
      FROM farmers f
      WHERE f.fpo_id = ?
        AND (
          ? = ''
          OR f.full_name LIKE '%' || ? || '%'
          OR f.farmer_code LIKE '%' || ? || '%'
          OR f.village LIKE '%' || ? || '%'
          OR f.phone LIKE '%' || ? || '%'
        )
        AND (? = '' OR f.eligibility_status = ?)
      ORDER BY f.id DESC
    `)
    .all(
      req.user.id,
      q,
      q,
      q,
      q,
      q,
      status,
      status
    );

  res.json({
    farmers: rows
  });
});

app.get('/api/farmers/:id', auth, (req, res) => {
  const farmer = db
    .prepare(`
      SELECT *
      FROM farmers
      WHERE id = ? AND fpo_id = ?
    `)
    .get(Number(req.params.id), req.user.id);

  if (!farmer) {
    return res.status(404).json({
      error: 'Farmer not found'
    });
  }

  const documents = db
    .prepare(`
      SELECT id, document_type, file_name, status, notes, created_at
      FROM documents
      WHERE farmer_id = ?
      ORDER BY id DESC
    `)
    .all(farmer.id);

  res.json({
    farmer,
    documents
  });
});

app.post('/api/farmers', auth, (req, res) => {
  const parsed = farmerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0].message,
      issues: parsed.error.issues
    });
  }

  const f = parsed.data;
  const code = `CC-${String(Date.now()).slice(-6)}`;

  try {
    const info = db
      .prepare(`
        INSERT INTO farmers(
          farmer_code,
          full_name,
          phone,
          village,
          district,
          state,
          acres,
          crops,
          soil_type,
          irrigation,
          practices,
          land_ownership,
          consent,
          eligibility_status,
          eligibility_notes,
          fpo_id
        )
        VALUES (
          @farmer_code,
          @full_name,
          @phone,
          @village,
          @district,
          @state,
          @acres,
          @crops,
          @soil_type,
          @irrigation,
          @practices,
          @land_ownership,
          @consent,
          @eligibility_status,
          @eligibility_notes,
          @fpo_id
        )
      `)
      .run({
        ...f,
        farmer_code: code,
        consent: f.consent ? 1 : 0,
        fpo_id: req.user.id
      });

    activity(
      req.user.id,
      'registered farmer',
      'farmer',
      info.lastInsertRowid,
      f.full_name
    );

    res.status(201).json({
      farmer: db
        .prepare('SELECT * FROM farmers WHERE id = ?')
        .get(info.lastInsertRowid)
    });
  } catch (error) {
    console.error('Could not save farmer:', error.message);

    res.status(500).json({
      error: 'Could not save farmer. Please check the details and try again.'
    });
  }
});

app.put('/api/farmers/:id', auth, (req, res) => {
  const parsed = farmerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0].message
    });
  }

  const existing = db
    .prepare(`
      SELECT id
      FROM farmers
      WHERE id = ? AND fpo_id = ?
    `)
    .get(Number(req.params.id), req.user.id);

  if (!existing) {
    return res.status(404).json({
      error: 'Farmer not found'
    });
  }

  const f = parsed.data;

  db.prepare(`
    UPDATE farmers
    SET
      full_name = @full_name,
      phone = @phone,
      village = @village,
      district = @district,
      state = @state,
      acres = @acres,
      crops = @crops,
      soil_type = @soil_type,
      irrigation = @irrigation,
      practices = @practices,
      land_ownership = @land_ownership,
      consent = @consent,
      eligibility_status = @eligibility_status,
      eligibility_notes = @eligibility_notes,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `).run({
    ...f,
    consent: f.consent ? 1 : 0,
    id: existing.id
  });

  activity(
    req.user.id,
    'updated farmer',
    'farmer',
    existing.id,
    f.full_name
  );

  res.json({
    farmer: db
      .prepare('SELECT * FROM farmers WHERE id = ?')
      .get(existing.id)
  });
});

app.patch('/api/farmers/:id/eligibility', auth, (req, res) => {
  const schema = z.object({
    eligibility_status: z.enum([
      'pending',
      'eligible',
      'review',
      'rejected'
    ]),
    eligibility_notes: z.string().max(1000).optional().default('')
  });

  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid eligibility status'
    });
  }

  const farmer = db
    .prepare(`
      SELECT id, full_name
      FROM farmers
      WHERE id = ? AND fpo_id = ?
    `)
    .get(Number(req.params.id), req.user.id);

  if (!farmer) {
    return res.status(404).json({
      error: 'Farmer not found'
    });
  }

  db.prepare(`
    UPDATE farmers
    SET
      eligibility_status = ?,
      eligibility_notes = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    parsed.data.eligibility_status,
    parsed.data.eligibility_notes,
    farmer.id
  );

  activity(
    req.user.id,
    'changed eligibility',
    'farmer',
    farmer.id,
    parsed.data.eligibility_status
  );

  res.json({
    farmer: db
      .prepare('SELECT * FROM farmers WHERE id = ?')
      .get(farmer.id)
  });
});

// ============================================================
// Document routes
// ============================================================

app.post(
  '/api/farmers/:id/documents',
  auth,
  upload.single('file'),
  (req, res) => {
    const farmer = db
      .prepare(`
        SELECT id
        FROM farmers
        WHERE id = ? AND fpo_id = ?
      `)
      .get(Number(req.params.id), req.user.id);

    if (!farmer) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(404).json({
        error: 'Farmer not found'
      });
    }

    const type = String(req.body.document_type || 'Other').slice(0, 100);

    if (!req.file) {
      return res.status(400).json({
        error: 'Choose a document file'
      });
    }

    const info = db
      .prepare(`
        INSERT INTO documents(
          farmer_id,
          document_type,
          file_name,
          storage_name,
          uploaded_by
        )
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(
        farmer.id,
        type,
        req.file.originalname,
        req.file.filename,
        req.user.id
      );

    activity(
      req.user.id,
      'uploaded document',
      'document',
      info.lastInsertRowid,
      type
    );

    res.status(201).json({
      document: {
        id: info.lastInsertRowid,
        document_type: type,
        file_name: req.file.originalname,
        status: 'submitted'
      }
    });
  }
);

app.get('/api/documents/:id/download', auth, (req, res) => {
  const doc = db
    .prepare(`
      SELECT d.*
      FROM documents d
      JOIN farmers f ON f.id = d.farmer_id
      WHERE d.id = ? AND f.fpo_id = ?
    `)
    .get(Number(req.params.id), req.user.id);

  if (!doc) {
    return res.status(404).json({
      error: 'Document not found'
    });
  }

  const file = path.join(uploadDir, doc.storage_name);

  if (!fs.existsSync(file)) {
    return res.status(404).json({
      error: 'Stored file not found'
    });
  }

  res.download(file, doc.file_name);
});

app.patch('/api/documents/:id/status', auth, (req, res) => {
  const parsed = z.object({
    status: z.enum([
      'submitted',
      'approved',
      'needs_changes',
      'rejected'
    ]),
    notes: z.string().max(1000).optional().default('')
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid document status'
    });
  }

  const doc = db
    .prepare(`
      SELECT d.id, d.document_type
      FROM documents d
      JOIN farmers f ON f.id = d.farmer_id
      WHERE d.id = ? AND f.fpo_id = ?
    `)
    .get(Number(req.params.id), req.user.id);

  if (!doc) {
    return res.status(404).json({
      error: 'Document not found'
    });
  }

  db.prepare(`
    UPDATE documents
    SET status = ?, notes = ?
    WHERE id = ?
  `).run(parsed.data.status, parsed.data.notes, doc.id);

  activity(
    req.user.id,
    'updated document status',
    'document',
    doc.id,
    parsed.data.status
  );

  res.json({
    success: true
  });
});

// ============================================================
// Activity route
// ============================================================

app.get('/api/activities', auth, (req, res) => {
  res.json({
    activities: db
      .prepare(`
        SELECT action, entity_type, entity_id, details, created_at
        FROM activities
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 50
      `)
      .all(req.user.id)
  });
});

// ============================================================
// Carbon model API
// ============================================================

const CARBON_MODEL_URL =
  process.env.CARBON_MODEL_URL || 'http://127.0.0.1:8000';

app.post('/api/carbon/predict', auth, async (req, res) => {
  const parsed = z.object({
    features: z.record(z.unknown())
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request. Provide model inputs inside a features object.'
    });
  }

  try {
    const response = await fetch(`${CARBON_MODEL_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        features: parsed.data.features
      }),
      signal: AbortSignal.timeout(15000)
    });

    const data = await response.json();

    if (!response.ok) {
      const detail = data.detail;

      return res.status(response.status).json({
        error:
          typeof detail === 'string'
            ? detail
            : detail?.error || 'Carbon prediction failed.',
        ...(detail && typeof detail === 'object'
          ? { details: detail }
          : {})
      });
    }

    return res.json(data);
  } catch (error) {
    console.error('Carbon model request failed:', error.message);

    return res.status(503).json({
      error:
        error.name === 'TimeoutError' || error.name === 'AbortError'
          ? 'The carbon model took too long to respond. Please try again.'
          : 'The carbon model is unavailable. Make sure the Python API is running on port 8000.'
    });
  }
});

// ============================================================
// Plant recommendation API
// ============================================================

const NASA_POWER_URL =
  'https://power.larc.nasa.gov/api/temporal/climatology/point';

app.post('/api/farmers/:id/plant-recommendations', auth, async (req, res) => {
  const parsed = z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    waterAvailability: z.enum(['low', 'moderate', 'high'])
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error:
        'Provide valid latitude, longitude, and waterAvailability (low, moderate, or high).'
    });
  }

  // Ensure this farmer belongs to the signed-in FPO.
  const farmer = db
    .prepare(`
      SELECT *
      FROM farmers
      WHERE id = ? AND fpo_id = ?
    `)
    .get(Number(req.params.id), req.user.id);

  if (!farmer) {
    return res.status(404).json({
      error: 'Farmer not found.'
    });
  }

  try {
    // Retrieve NASA POWER climatology for the submitted coordinates.
    const params = new URLSearchParams({
      parameters: 'T2M,PRECTOTCORR',
      community: 'AG',
      longitude: String(parsed.data.longitude),
      latitude: String(parsed.data.latitude),
      format: 'JSON'
    });

    const response = await fetch(
      `${NASA_POWER_URL}?${params.toString()}`,
      {
        signal: AbortSignal.timeout(20000)
      }
    );

    if (!response.ok) {
      throw new Error(`NASA POWER returned HTTP ${response.status}`);
    }

    const climate = await response.json();

    // NASA POWER climatology data is under properties.parameter.
    const parameters = climate.properties?.parameter;
    const temperatureValues = parameters?.T2M;
    const rainfallValues = parameters?.PRECTOTCORR;

    if (
      !temperatureValues ||
      !rainfallValues ||
      typeof temperatureValues !== 'object' ||
      typeof rainfallValues !== 'object'
    ) {
      throw new Error(
        'Climate parameters were missing from the NASA POWER response.'
      );
    }

    // Prefer NASA's annual mean temperature when it is valid.
    const annualMeanTemperature = Number(temperatureValues.ANN);

    let averageTemperatureC;

    if (
      Number.isFinite(annualMeanTemperature) &&
      annualMeanTemperature !== -999
    ) {
      averageTemperatureC = annualMeanTemperature;
    } else {
      // Fallback: average the available monthly temperatures.
      const monthNames = [
        'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
        'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
      ];

      const validTemperatures = monthNames
        .map(month => Number(temperatureValues[month]))
        .filter(
          value => Number.isFinite(value) && value !== -999
        );

      if (validTemperatures.length === 0) {
        throw new Error(
          'NASA POWER did not provide valid temperature data.'
        );
      }

      averageTemperatureC =
        validTemperatures.reduce((sum, value) => sum + value, 0) /
        validTemperatures.length;
    }

    // PRECTOTCORR monthly climatology values are daily averages in mm/day.
    // Convert each monthly daily average into an approximate monthly total.
    // The keys are month names (JAN, FEB, ...), not numeric month indices.
    const monthDays = {
      JAN: 31,
      FEB: 28,
      MAR: 31,
      APR: 30,
      MAY: 31,
      JUN: 30,
      JUL: 31,
      AUG: 31,
      SEP: 30,
      OCT: 31,
      NOV: 30,
      DEC: 31
    };

    let annualRainfallMm = 0;
    let monthsWithRainfall = 0;

    for (const [month, days] of Object.entries(monthDays)) {
      const dailyAverage = Number(rainfallValues[month]);

      if (
        !Number.isFinite(dailyAverage) ||
        dailyAverage === -999 ||
        dailyAverage < 0
      ) {
        continue;
      }

      annualRainfallMm += dailyAverage * days;
      monthsWithRainfall += 1;
    }

    if (monthsWithRainfall === 0) {
      throw new Error(
        'NASA POWER did not provide valid monthly precipitation data.'
      );
    }

    // Avoid passing a partial annual estimate as if all months were available.
    if (monthsWithRainfall < 12) {
      throw new Error(
        `NASA POWER returned precipitation data for only ${monthsWithRainfall} months; 12 are required for this estimate.`
      );
    }

    // Build the recommendation input from saved farmer details and NASA data.
    const farm = {
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      state: farmer.state,
      district: farmer.district,
      farmAreaAcres: farmer.acres,
      soilType: farmer.soil_type || '',
      existingCrops: String(farmer.crops || '')
        .split(',')
        .map(crop => crop.trim())
        .filter(Boolean),
      waterAvailability: parsed.data.waterAvailability,
      annualRainfallMm: Math.round(annualRainfallMm),
      averageTemperatureC,
      environmentalDataSource: 'NASA POWER climatology API'
    };

    const result = recommendPlants(farm);

    return res.json({
      farmer: {
        id: farmer.id,
        farmerCode: farmer.farmer_code,
        name: farmer.full_name,
        farmAreaAcres: farmer.acres
      },
      climate: {
        source: 'NASA POWER climatology API',
        averageTemperatureC:
          Math.round(averageTemperatureC * 100) / 100,
        estimatedAnnualRainfallMm: Math.round(annualRainfallMm),
        rainfallMethod:
          'Sum of monthly climatological daily precipitation averages multiplied by days per month',
        coordinates: {
          latitude: parsed.data.latitude,
          longitude: parsed.data.longitude
        }
      },
      ...result
    });
  } catch (error) {
    console.error(
      'Plant recommendation request failed:',
      error.message
    );

    return res.status(503).json({
      error:
        'Could not retrieve climate data or generate recommendations. Please try again.',
      details: error.message
    });
  }
});

// ============================================================
// Error handling
// ============================================================

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error:
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File must be 8 MB or smaller.'
          : err.message
    });
  }

  return res.status(400).json({
    error: err.message || 'Request failed'
  });
});

// ============================================================
// Start server
// ============================================================

app.listen(PORT, () => {
  console.log(`ClimateCoins API running at http://localhost:${PORT}`);
});