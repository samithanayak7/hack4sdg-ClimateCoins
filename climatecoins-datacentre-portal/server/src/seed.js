const fs = require('node:fs');
const path = require('node:path');
const file = path.resolve(process.env.DATA_FILE || './server/data/store.json');
fs.mkdirSync(path.dirname(file), { recursive: true });
const data = {
  users: [{ id: 1, name: 'Nimbus Data Centres', email: 'buyer@datacentre.local', password: 'Buyer@12345', role: 'buyer', organisation: 'Nimbus Data Centres' }],
  projects: [
    { id: 'PRJ-001', name: 'Sahyadri Agroforestry', fpo: 'Sahyadri Agro Producers', location: 'Nashik, Maharashtra', methodology: 'Agroforestry & soil carbon', category: 'Nature-based removal', available: 610, price: 1680, vintage: '2026', status: 'Verified', description: 'Tree-based farming practices and soil stewardship across smallholder farms.', evidence: ['FPO registration and farmer consent', 'Satellite monitoring summary', 'Independent verification summary'] },
    { id: 'PRJ-002', name: 'Mysuru Regenerative Paddy', fpo: 'Green Valley FPO', location: 'Mysuru, Karnataka', methodology: 'Improved rice cultivation', category: 'Agriculture', available: 420, price: 1450, vintage: '2026', status: 'Pending verification', description: 'Water and soil management practices designed to reduce methane emissions.', evidence: ['Farmer enrolment records', 'Seasonal activity log'] },
    { id: 'PRJ-003', name: 'Mandya Soil Carbon Pilot', fpo: 'Raitha Mitra Collective', location: 'Mandya, Karnataka', methodology: 'Regenerative agriculture', category: 'Soil carbon', available: 275, price: 1390, vintage: '2025', status: 'Verified', description: 'Soil-first farming practices and crop-residue management across a community of farms.', evidence: ['Baseline and monitoring summary', 'FPO records', 'Sampling report'] },
    { id: 'PRJ-004', name: 'Deccan Farm Resilience', fpo: 'Deccan Roots FPO', location: 'Warangal, Telangana', methodology: 'Agroforestry & soil carbon', category: 'Nature-based removal', available: 190, price: 1325, vintage: '2026', status: 'In review', description: 'A developing project focused on diversified cropping and tree cover.', evidence: ['FPO onboarding record'] }
  ],
  orders: [
    { id: 'ORD-7001', projectId: 'PRJ-001', project: 'Sahyadri Agroforestry', quantity: 120, unitPrice: 1680, amount: 201600, date: '2026-10-19', status: 'Completed', note: 'First tranche purchase' },
    { id: 'ORD-7002', projectId: 'PRJ-001', project: 'Sahyadri Agroforestry', quantity: 80, unitPrice: 1680, amount: 134400, date: '2026-10-22', status: 'Processing', note: 'Awaiting settlement confirmation' }
  ],
  watchlist: ['PRJ-003'],
  requests: [
    { id: 'REQ-3001', projectId: 'PRJ-003', project: 'Mandya Soil Carbon Pilot', quantity: 100, note: 'Request project documentation and retirement options', date: '2026-10-23', status: 'Open' }
  ],
  activities: [
    { id: 1, action: 'Purchase completed', detail: '120 credits · Sahyadri Agroforestry', time: '19 Oct 2026', kind: 'purchase' },
    { id: 2, action: 'Project added to watchlist', detail: 'Mandya Soil Carbon Pilot', time: '22 Oct 2026', kind: 'watchlist' },
    { id: 3, action: 'Purchase initiated', detail: '80 credits · Sahyadri Agroforestry', time: '22 Oct 2026', kind: 'purchase' }
  ]
};
fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log(`Seeded data-centre portal at ${file}`);
console.log('Demo login: buyer@datacentre.local / Buyer@12345');