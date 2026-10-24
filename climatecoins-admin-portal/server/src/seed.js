const fs = require('node:fs');
const path = require('node:path');
const file = path.resolve(process.env.DATA_FILE || './server/data/store.json');
fs.mkdirSync(path.dirname(file), { recursive: true });
const data = {
  users: [{ id: 1, name: 'ClimateCoins Admin', email: 'admin@climatecoins.local', password: 'Admin@12345', role: 'admin' }],
  fpos: [
    { id: 1, name: 'Green Valley FPO', code: 'FPO-KA-001', state: 'Karnataka', district: 'Mysuru', contact: 'Lakshmi Rao', email: 'greenvalley@example.org', farmers: 128, status: 'Active', joined: '2026-08-12' },
    { id: 2, name: 'Raitha Mitra Collective', code: 'FPO-KA-002', state: 'Karnataka', district: 'Mandya', contact: 'Ramesh Gowda', email: 'raithamitra@example.org', farmers: 94, status: 'Review', joined: '2026-09-03' },
    { id: 3, name: 'Sahyadri Agro Producers', code: 'FPO-MH-014', state: 'Maharashtra', district: 'Nashik', contact: 'Meera Patil', email: 'sahyadri@example.org', farmers: 76, status: 'Active', joined: '2026-09-18' },
    { id: 4, name: 'Deccan Roots FPO', code: 'FPO-TS-006', state: 'Telangana', district: 'Warangal', contact: 'Srinivas Reddy', email: 'deccan@example.org', farmers: 0, status: 'Pending', joined: '2026-10-02' }
  ],
  farmers: [
    { id: 1, code: 'CC-410281', name: 'Ananya Gowda', fpo: 'Green Valley FPO', village: 'Hullahalli', district: 'Mysuru', acres: 3.5, crop: 'Paddy', status: 'Eligible', consent: true, docs: 4 },
    { id: 2, code: 'CC-410282', name: 'Basavaraj M', fpo: 'Green Valley FPO', village: 'Nanjangud', district: 'Mysuru', acres: 2.2, crop: 'Sugarcane', status: 'Review', consent: true, docs: 2 },
    { id: 3, code: 'CC-410283', name: 'Savitha K', fpo: 'Raitha Mitra Collective', village: 'Pandavapura', district: 'Mandya', acres: 4.8, crop: 'Millets', status: 'Eligible', consent: true, docs: 3 },
    { id: 4, code: 'CC-410284', name: 'Mahadevappa S', fpo: 'Sahyadri Agro Producers', village: 'Sinnar', district: 'Nashik', acres: 1.7, crop: 'Onion', status: 'Pending', consent: false, docs: 1 },
    { id: 5, code: 'CC-410285', name: 'Parvathi N', fpo: 'Green Valley FPO', village: 'H.D. Kote', district: 'Mysuru', acres: 5.1, crop: 'Paddy', status: 'Eligible', consent: true, docs: 4 },
    { id: 6, code: 'CC-410286', name: 'Shankar R', fpo: 'Raitha Mitra Collective', village: 'Srirangapatna', district: 'Mandya', acres: 2.9, crop: 'Sugarcane', status: 'Rejected', consent: true, docs: 2 }
  ],
  verifications: [
    { id: 'VR-1021', project: 'Mysuru Regenerative Paddy', fpo: 'Green Valley FPO', submitted: '2026-10-18', credits: 420, status: 'In review', reviewer: 'Unassigned' },
    { id: 'VR-1022', project: 'Mandya Soil Carbon Pilot', fpo: 'Raitha Mitra Collective', submitted: '2026-10-20', credits: 275, status: 'Awaiting documents', reviewer: 'Admin' },
    { id: 'VR-1023', project: 'Sahyadri Agroforestry', fpo: 'Sahyadri Agro Producers', submitted: '2026-10-21', credits: 610, status: 'Approved', reviewer: 'Admin' }
  ],
  buyers: [
    { id: 1, name: 'Nimbus Data Centres', type: 'Data centre', location: 'Bengaluru, Karnataka', email: 'sustainability@nimbus.example', demand: 1200, status: 'Verified' },
    { id: 2, name: 'CloudHarbor Infrastructure', type: 'Data centre', location: 'Chennai, Tamil Nadu', email: 'climate@cloudharbor.example', demand: 850, status: 'Pending' },
    { id: 3, name: 'Northstar Compute', type: 'Technology', location: 'Hyderabad, Telangana', email: 'procurement@northstar.example', demand: 500, status: 'Verified' }
  ],
  credits: [
    { id: 'CC-VC-001', project: 'Mysuru Regenerative Paddy', fpo: 'Green Valley FPO', quantity: 420, available: 420, price: 1450, status: 'Pending verification' },
    { id: 'CC-VC-002', project: 'Sahyadri Agroforestry', fpo: 'Sahyadri Agro Producers', quantity: 610, available: 610, price: 1680, status: 'Verified' },
    { id: 'CC-VC-003', project: 'Mandya Soil Carbon Pilot', fpo: 'Raitha Mitra Collective', quantity: 275, available: 0, price: 1390, status: 'Reserved' }
  ],
  transactions: [
    { id: 'TX-9001', buyer: 'Nimbus Data Centres', project: 'Sahyadri Agroforestry', credits: 120, amount: 201600, date: '2026-10-19', status: 'Settled' },
    { id: 'TX-9002', buyer: 'Northstar Compute', project: 'Sahyadri Agroforestry', credits: 80, amount: 134400, date: '2026-10-22', status: 'Processing' }
  ],
  activities: [
    { id: 1, action: 'Approved buyer profile', detail: 'Nimbus Data Centres', time: 'Today, 10:42 AM', actor: 'Admin' },
    { id: 2, action: 'Verification submitted', detail: 'Mysuru Regenerative Paddy · VR-1021', time: 'Today, 09:18 AM', actor: 'Green Valley FPO' },
    { id: 3, action: 'Farmer eligibility updated', detail: 'Ananya Gowda · CC-410281', time: 'Yesterday, 04:36 PM', actor: 'FPO operator' },
    { id: 4, action: 'Credit batch reserved', detail: '275 credits · Mandya Soil Carbon Pilot', time: 'Yesterday, 01:10 PM', actor: 'Admin' }
  ]
};
fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log(`Seeded ClimateCoins Admin data at ${file}`);
console.log('Demo login: admin@climatecoins.local / Admin@12345');