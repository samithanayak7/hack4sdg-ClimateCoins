const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('node:fs');
const path = require('node:path');

const app = express();
const PORT = Number(process.env.PORT || 4001);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-this-secret';
const DATA_FILE = path.resolve(process.env.DATA_FILE || './server/data/store.json');
app.use(cors({ origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5174').split(',').map(s => s.trim()), credentials: true }));
app.use(express.json({ limit: '1mb' }));

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    const seed = path.resolve('./server/data/seed.json');
    if (fs.existsSync(seed)) fs.copyFileSync(seed, DATA_FILE);
    else throw new Error('Database not initialized. Run npm run seed first.');
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeData(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Administrator access required.' });
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Please sign in again.' });
  }
}
function log(data, action, detail) {
  data.activities.unshift({ id: Date.now(), action, detail, time: new Date().toLocaleString(), actor: 'Admin' });
  data.activities = data.activities.slice(0, 80);
}
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'climatecoins-admin-api' }));
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  const data = readData();
  const user = data.users.find(u => u.email.toLowerCase() === String(email).trim().toLowerCase() && u.password === password);
  if (!user) return res.status(401).json({ error: 'Incorrect email or password.' });
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
app.get('/api/auth/me', auth, (req, res) => res.json({ user: req.admin }));
app.get('/api/dashboard', auth, (_req, res) => {
  const d = readData();
  const totalFarmers = d.farmers.length;
  const eligible = d.farmers.filter(x => x.status === 'Eligible').length;
  const totalCredits = d.credits.reduce((n, x) => n + x.quantity, 0);
  const availableCredits = d.credits.reduce((n, x) => n + x.available, 0);
  const revenue = d.transactions.filter(x => x.status === 'Settled').reduce((n, x) => n + x.amount, 0);
  res.json({ stats: { fpos: d.fpos.length, farmers: totalFarmers, eligible, pendingReviews: d.verifications.filter(x => x.status !== 'Approved').length, buyers: d.buyers.length, credits: totalCredits, availableCredits, revenue }, activities: d.activities.slice(0, 6), verifications: d.verifications.slice(0, 4), transactions: d.transactions.slice(0, 4) });
});
const collections = ['fpos', 'farmers', 'verifications', 'buyers', 'credits', 'transactions', 'activities'];
app.get('/api/:collection', auth, (req, res) => {
  const { collection } = req.params;
  if (!collections.includes(collection)) return res.status(404).json({ error: 'Collection not found.' });
  const data = readData();
  const q = String(req.query.q || '').toLowerCase().trim();
  const status = String(req.query.status || '').toLowerCase().trim();
  let rows = data[collection] || [];
  if (q) rows = rows.filter(row => Object.values(row).some(v => String(v).toLowerCase().includes(q)));
  if (status) rows = rows.filter(row => String(row.status || '').toLowerCase() === status);
  res.json({ [collection]: rows });
});
app.patch('/api/fpos/:id/status', auth, (req, res) => {
  const d = readData(); const item = d.fpos.find(x => x.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'FPO not found.' });
  if (!['Active', 'Review', 'Pending', 'Suspended'].includes(req.body.status)) return res.status(400).json({ error: 'Invalid status.' });
  item.status = req.body.status; log(d, 'FPO status updated', `${item.name} · ${item.status}`); writeData(d); res.json({ fpo: item });
});
app.patch('/api/farmers/:id/status', auth, (req, res) => {
  const d = readData(); const item = d.farmers.find(x => x.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'Farmer not found.' });
  if (!['Eligible', 'Review', 'Pending', 'Rejected'].includes(req.body.status)) return res.status(400).json({ error: 'Invalid status.' });
  item.status = req.body.status; log(d, 'Farmer eligibility updated', `${item.name} · ${item.status}`); writeData(d); res.json({ farmer: item });
});
app.patch('/api/verifications/:id/status', auth, (req, res) => {
  const d = readData(); const item = d.verifications.find(x => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Verification not found.' });
  if (!['In review', 'Awaiting documents', 'Approved', 'Rejected'].includes(req.body.status)) return res.status(400).json({ error: 'Invalid status.' });
  item.status = req.body.status; item.reviewer = req.admin.name; log(d, 'Verification status updated', `${item.project} · ${item.status}`); writeData(d); res.json({ verification: item });
});
app.patch('/api/buyers/:id/status', auth, (req, res) => {
  const d = readData(); const item = d.buyers.find(x => x.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'Buyer not found.' });
  if (!['Verified', 'Pending', 'Suspended'].includes(req.body.status)) return res.status(400).json({ error: 'Invalid status.' });
  item.status = req.body.status; log(d, 'Buyer status updated', `${item.name} · ${item.status}`); writeData(d); res.json({ buyer: item });
});
app.patch('/api/credits/:id/status', auth, (req, res) => {
  const d = readData(); const item = d.credits.find(x => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Credit batch not found.' });
  if (!['Verified', 'Pending verification', 'Reserved', 'Retired'].includes(req.body.status)) return res.status(400).json({ error: 'Invalid status.' });
  item.status = req.body.status; log(d, 'Credit batch status updated', `${item.id} · ${item.status}`); writeData(d); res.json({ credit: item });
});
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Internal server error.' }); });
app.listen(PORT, () => console.log(`ClimateCoins Admin API listening on ${PORT}`));