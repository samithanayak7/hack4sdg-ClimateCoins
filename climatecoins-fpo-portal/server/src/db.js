const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
const configured = process.env.DATABASE_PATH || './server/data/climatecoins.sqlite';
const dbPath = path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'fpo', fpo_name TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS farmers (
 id INTEGER PRIMARY KEY AUTOINCREMENT, farmer_code TEXT UNIQUE, full_name TEXT NOT NULL, phone TEXT NOT NULL,
 village TEXT NOT NULL, district TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'Karnataka', acres REAL NOT NULL DEFAULT 0,
 crops TEXT NOT NULL DEFAULT '', soil_type TEXT DEFAULT '', irrigation TEXT DEFAULT '', practices TEXT DEFAULT '',
 land_ownership TEXT NOT NULL DEFAULT 'unknown', consent INTEGER NOT NULL DEFAULT 0,
 eligibility_status TEXT NOT NULL DEFAULT 'pending', eligibility_notes TEXT DEFAULT '', fpo_id INTEGER REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS documents (
 id INTEGER PRIMARY KEY AUTOINCREMENT, farmer_id INTEGER NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
 document_type TEXT NOT NULL, file_name TEXT NOT NULL, storage_name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'submitted',
 notes TEXT DEFAULT '', uploaded_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS activities (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id), action TEXT NOT NULL,
 entity_type TEXT, entity_id INTEGER, details TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

/* Farmer Pooling: safe, additive database migrations.
   Keep all existing farmer records intact. */

const existingFarmerColumns = new Set(
  db.prepare("PRAGMA table_info(farmers)")
    .all()
    .map(column => column.name)
);

function addFarmerColumn(name, type) {
  if (!existingFarmerColumns.has(name)) {
    db.exec(`ALTER TABLE farmers ADD COLUMN ${name} ${type}`);
  }
}

addFarmerColumn("latitude", "REAL");
addFarmerColumn("longitude", "REAL");
addFarmerColumn(
  "intervention_type",
  "TEXT NOT NULL DEFAULT 'unspecified'"
);
addFarmerColumn("plot_area_acres", "REAL");
addFarmerColumn(
  "location_source",
  "TEXT NOT NULL DEFAULT 'unknown'"
);
addFarmerColumn(
  "synthetic_demo",
  "INTEGER NOT NULL DEFAULT 0"
);

db.exec(`
  CREATE TABLE IF NOT EXISTS pool_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fpo_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    intervention_type TEXT NOT NULL,
    radius_km REAL NOT NULL,
    min_points INTEGER NOT NULL,
    min_farmers INTEGER NOT NULL,
    min_total_acres REAL NOT NULL DEFAULT 0,
    algorithm_version TEXT NOT NULL DEFAULT 'geodesic-dbscan-v1',
    parameters_json TEXT NOT NULL,
    result_json TEXT NOT NULL,
    farmers_considered INTEGER NOT NULL DEFAULT 0,
    clusters_found INTEGER NOT NULL DEFAULT 0,
    unassigned_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS farmer_pools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pool_code TEXT NOT NULL,
    fpo_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_run_id INTEGER REFERENCES pool_runs(id),
    candidate_key TEXT,
    name TEXT NOT NULL,
    intervention_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
      CHECK(status IN (
        'draft',
        'needs_review',
        'ready_for_verification',
        'archived'
      )),
    farmer_count INTEGER NOT NULL DEFAULT 0,
    total_acres REAL NOT NULL DEFAULT 0,
    centroid_latitude REAL,
    centroid_longitude REAL,
    max_radius_km REAL NOT NULL DEFAULT 0,
    compactness_score REAL NOT NULL DEFAULT 0,
    mrv_efficiency_score REAL NOT NULL DEFAULT 0,
    optimization_score REAL NOT NULL DEFAULT 0,
    review_notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fpo_id, pool_code)
  );

  CREATE TABLE IF NOT EXISTS farmer_pool_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pool_id INTEGER NOT NULL REFERENCES farmer_pools(id) ON DELETE CASCADE,
    farmer_id INTEGER NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    cluster_run_id INTEGER REFERENCES pool_runs(id),
    assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pool_id, farmer_id)
  );

  CREATE INDEX IF NOT EXISTS idx_farmers_fpo_geo
    ON farmers(fpo_id, latitude, longitude);

  CREATE INDEX IF NOT EXISTS idx_pools_fpo_status
    ON farmer_pools(fpo_id, status);

  CREATE INDEX IF NOT EXISTS idx_pool_members_farmer
    ON farmer_pool_members(farmer_id);
`);
module.exports = db;
