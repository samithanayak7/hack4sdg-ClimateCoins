const bcrypt = require('bcryptjs');
const db = require('./db');
const password = bcrypt.hashSync('ChangeMe12345!', 10);
const insertUser = db.prepare(`
  INSERT INTO users (name, email, password_hash, role, fpo_name)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(email) DO UPDATE SET
    password_hash = excluded.password_hash
`);

insertUser.run(
  'FPO Demo Administrator',
  'fpo@climatecoins.local',
  password,
  'fpo',
  'GreenHarvest Farmer Producer Organisation'
);
const user = db.prepare('SELECT id FROM users WHERE email=?').get('fpo@climatecoins.local');
const count = db.prepare('SELECT COUNT(*) AS n FROM farmers').get().n;
if (!count) {
 const add = db.prepare(`INSERT INTO farmers(farmer_code,full_name,phone,village,district,state,acres,crops,soil_type,irrigation,practices,land_ownership,consent,eligibility_status,eligibility_notes,fpo_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
 const samples = [
 ['CC-0001','Lakshmi Narayan','9876543210','Hoskote','Bengaluru Rural','Karnataka',3.5,'Ragi, Maize','Red soil','Drip irrigation','Cover cropping, compost','owned',1,'eligible','Initial screening passed; field verification required.'],
 ['CC-0002','Ramesh Gowda','9876501234','Devanahalli','Bengaluru Rural','Karnataka',5,'Paddy','Clay loam','Flood irrigation','Crop rotation','owned',1,'review','Review water management and land records before enrollment.'],
 ['CC-0003','Savitha M','9988776655','Malur','Kolar','Karnataka',2.25,'Tomato, Ragi','Red loam','Drip irrigation','Compost','leased',0,'pending','Farmer consent and lease documents are pending.'],
 ['CC-0004','Manjunath K','9900112233','Chintamani','Chikkaballapur','Karnataka',4,'Millet, Groundnut','Sandy loam','Rain-fed','Cover cropping, reduced tillage','owned',1,'eligible','Initial screening passed; verify practice history.']
 ];
 for (const row of samples) add.run(...row,user.id);
}

/* Synthetic pooling test data.
   These coordinates are simulated, not verified farm locations. */

const poolingDemoFarmers = [
  ["CC-POOL-01", "Demo Farmer One",   3.0, 12.9950, 77.7600, "agroforestry"],
  ["CC-POOL-02", "Demo Farmer Two",   2.5, 12.9970, 77.7620, "agroforestry"],
  ["CC-POOL-03", "Demo Farmer Three", 4.0, 12.9910, 77.7570, "agroforestry"],
  ["CC-POOL-04", "Demo Farmer Four",  3.5, 12.9990, 77.7660, "agroforestry"],
  ["CC-POOL-05", "Demo Farmer Five",  2.0, 12.9880, 77.7650, "agroforestry"],
  ["CC-POOL-06", "Demo Water Farmer", 4.0, 12.9960, 77.7630, "water_management"],
  ["CC-POOL-07", "Demo Isolated Farmer", 3.0, 13.1500, 77.9500, "agroforestry"]
];

const addDemoFarmer = db.prepare(`
  INSERT OR IGNORE INTO farmers (
    farmer_code, full_name, phone, village, district, state,
    acres, crops, soil_type, irrigation, practices,
    land_ownership, consent, eligibility_status,
    eligibility_notes, fpo_id, latitude, longitude,
    intervention_type, plot_area_acres, location_source,
    synthetic_demo
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  )
`);

for (let i = 0; i < poolingDemoFarmers.length; i++) {
  const [code, name, acres, lat, lon, intervention] =
    poolingDemoFarmers[i];

  addDemoFarmer.run(
    code,
    name,
    `9000001${String(i).padStart(3, "0")}`,
    "Demo Village",
    "Bengaluru Rural",
    "Karnataka",
    acres,
    "Mixed crops",
    "Red soil",
    "Drip irrigation",
    intervention,
    "owned",
    1,
    "eligible",
    "Synthetic pooling test record",
    user.id,
    lat,
    lon,
    intervention,
    acres,
    "demo",
    1
  );
}
console.log('Seed complete. Demo login: fpo@climatecoins.local / ChangeMe12345!');
db.close();
