const bcrypt = require('bcryptjs');
const db = require('./db');
const password = bcrypt.hashSync('ChangeMe12345!', 10);
const insertUser = db.prepare(`INSERT OR IGNORE INTO users(name,email,password_hash,role,fpo_name) VALUES(?,?,?,?,?)`);
insertUser.run('FPO Demo Administrator','fpo@climatecoins.local',password,'fpo','GreenHarvest Farmer Producer Organisation');
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
console.log('Seed complete. Demo login: fpo@climatecoins.local / ChangeMe12345!');
db.close();
