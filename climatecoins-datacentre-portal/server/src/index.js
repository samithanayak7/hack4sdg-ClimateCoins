const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('node:fs');
const path = require('node:path');

const app = express();
const PORT = Number(process.env.PORT || 4002);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-this-secret';
const DATA_FILE = path.resolve(process.env.DATA_FILE || './server/data/store.json');
app.use(cors({ origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5175').split(',').map(s => s.trim()), credentials: true }));
app.use(express.json({ limit: '1mb' }));

function readData() {
  if (!fs.existsSync(DATA_FILE)) throw new Error('Data store not initialized. Run npm run seed first.');
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeData(d) { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  try {
    const user = jwt.verify(token, JWT_SECRET);
    if (user.role !== 'buyer') return res.status(403).json({ error: 'Data-centre buyer access required.' });
    req.user = user; next();
  } catch { return res.status(401).json({ error: 'Please sign in again.' }); }
}
function activity(d, action, detail, kind = 'activity') {
  d.activities.unshift({ id: Date.now(), action, detail, time: new Date().toLocaleString(), kind });
  d.activities = d.activities.slice(0, 80);
}
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'climatecoins-datacentre-api' }));
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  const d = readData();
  const user = d.users.find(x => x.email.toLowerCase() === String(email).trim().toLowerCase() && x.password === password);
  if (!user) return res.status(401).json({ error: 'Incorrect email or password.' });
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role, organisation: user.organisation }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, organisation: user.organisation } });
});
app.get('/api/auth/me', auth, reqRes);
function reqRes(req, res) { res.json({ user: req.user }); }
app.get('/api/dashboard', auth, (_req, res) => {
  const d = readData();
  const completed = d.orders.filter(o => o.status === 'Completed');
  const spent = completed.reduce((n, o) => n + o.amount, 0);
  const purchased = d.orders.reduce((n, o) => n + o.quantity, 0);
  const available = d.projects.filter(p => p.status === 'Verified').reduce((n, p) => n + p.available, 0);
  res.json({
    stats: { orders: d.orders.length, credits: purchased, spent, watchlist: d.watchlist.length, available, projects: d.projects.filter(p => p.status === 'Verified').length },
    orders: d.orders.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5),
    activities: d.activities.slice(0,5),
    featured: d.projects.filter(p=>p.status==='Verified').slice(0,3)
  });
});
app.get('/api/projects', auth, (req, res) => {
  const d = readData(); const q = String(req.query.q || '').toLowerCase().trim();
  const category = String(req.query.category || '');
  const verifiedOnly = req.query.verified === 'true';
  let projects = d.projects.filter(p => (!q || [p.name,p.fpo,p.location,p.methodology,p.category].some(x=>x.toLowerCase().includes(q))) && (!category || p.category===category) && (!verifiedOnly || p.status==='Verified'));
  res.json({ projects: projects.map(p => ({ ...p, watchlisted: d.watchlist.includes(p.id) })) });
});
app.get('/api/projects/:id', auth, (req, res) => {
  const d = readData(); const p = d.projects.find(x=>x.id===req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found.' });
  res.json({ project: { ...p, watchlisted: d.watchlist.includes(p.id) } });
});
app.post('/api/projects/:id/watchlist', auth, (req, res) => {
  const d = readData(); const p = d.projects.find(x=>x.id===req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found.' });
  const i = d.watchlist.indexOf(p.id);
  if (i >= 0) { d.watchlist.splice(i,1); activity(d,'Removed from watchlist',p.name,'watchlist'); }
  else { d.watchlist.push(p.id); activity(d,'Project added to watchlist',p.name,'watchlist'); }
  writeData(d); res.json({ watchlisted: d.watchlist.includes(p.id) });
});
app.get('/api/watchlist', auth, (_req, res) => {
  const d = readData(); res.json({ projects: d.projects.filter(p=>d.watchlist.includes(p.id)).map(p=>({...p,watchlisted:true})) });
});
app.get('/api/orders', auth, (_req, res) => { const d=readData(); res.json({ orders:d.orders.slice().sort((a,b)=>b.date.localeCompare(a.date)) }); });
app.post('/api/orders', auth, (req, res) => {
  const d=readData(); const project=d.projects.find(p=>p.id===req.body.projectId);
  const quantity=Number(req.body.quantity);
  if(!project) return res.status(404).json({error:'Project not found.'});
  if(project.status!=='Verified') return res.status(400).json({error:'Only verified projects can be purchased.'});
  if(!Number.isInteger(quantity)||quantity<1||quantity>project.available) return res.status(400).json({error:`Enter a whole number between 1 and ${project.available}.`});
  const order={id:`ORD-${String(Date.now()).slice(-6)}`,projectId:project.id,project:project.name,quantity,unitPrice:project.price,amount:quantity*project.price,date:new Date().toISOString().slice(0,10),status:'Processing',note:String(req.body.note||'').slice(0,300)};
  project.available-=quantity; d.orders.unshift(order); activity(d,'Purchase request created',`${quantity} credits · ${project.name}`,'purchase'); writeData(d);
  res.status(201).json({order});
});
app.get('/api/requests', auth, (_req, res) => { const d=readData(); res.json({requests:d.requests}); });
app.post('/api/requests', auth, (req, res) => {
  const d=readData(); const project=d.projects.find(p=>p.id===req.body.projectId);
  if(!project) return res.status(404).json({error:'Project not found.'});
  const note=String(req.body.note||'').trim();
  if(note.length<5) return res.status(400).json({error:'Please describe what information you need.'});
  const item={id:`REQ-${String(Date.now()).slice(-6)}`,projectId:project.id,project:project.name,quantity:Math.max(0,Number(req.body.quantity)||0),note,date:new Date().toISOString().slice(0,10),status:'Open'};
  d.requests.unshift(item); activity(d,'Information request submitted',`${project.name} · ${item.id}`); writeData(d); res.status(201).json({request:item});
});
app.get('/api/activities', auth, (_req,res)=>res.json({activities:readData().activities}));
app.use((err,_req,res,_next)=>{console.error(err);res.status(500).json({error:'Internal server error.'});});
app.listen(PORT,()=>console.log(`ClimateCoins Data Centre API listening on ${PORT}`));