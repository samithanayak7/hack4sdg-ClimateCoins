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
module.exports = db;