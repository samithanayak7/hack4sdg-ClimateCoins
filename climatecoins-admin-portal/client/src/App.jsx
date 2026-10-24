import React, { useEffect, useMemo, useState } from 'react';
import {
  Sprout, LayoutDashboard, UsersRound, Tractor, ClipboardCheck, Building2,
  Coins, ArrowLeftRight, ScrollText, Settings, Search, Bell, ChevronDown,
  ChevronRight, Leaf, LogOut, Menu, X, ArrowUpRight, ArrowDownRight,
  ShieldCheck, CircleHelp, MoreHorizontal, Filter, Download, Check, Clock3,
  AlertCircle, Plus, ExternalLink, MapPin, CalendarDays, Activity, Database,
  CheckCircle2, CircleDollarSign, FileCheck2, Globe2, RefreshCw
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';
const nav = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'fpos', label: 'FPO management', icon: Tractor },
  { id: 'farmers', label: 'Farmer registry', icon: UsersRound },
  { id: 'verifications', label: 'Verifications', icon: ClipboardCheck, badge: '3' },
  { id: 'buyers', label: 'Buyers & data centres', icon: Building2 },
  { id: 'credits', label: 'Credit inventory', icon: Coins },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'activities', label: 'Audit trail', icon: ScrollText }
];
const titles = {
  overview: ['Good morning, Admin', 'Here is what is happening across the ClimateCoins network.'],
  fpos: ['FPO management', 'Review partner organisations and manage onboarding status.'],
  farmers: ['Farmer registry', 'Monitor farmer records and eligibility across all FPOs.'],
  verifications: ['Verification queue', 'Track project evidence and independent review progress.'],
  buyers: ['Buyers & data centres', 'Manage buyer onboarding and carbon-credit demand.'],
  credits: ['Credit inventory', 'Review available batches and their verification status.'],
  transactions: ['Transactions', 'Track credit purchases and settlement activity.'],
  activities: ['Audit trail', 'A transparent record of recent platform actions.']
};
function money(n) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0); }
function num(n) { return new Intl.NumberFormat('en-IN').format(n || 0); }
async function request(path, token, options = {}) {
  const res = await fetch(`${API}/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}
function Badge({ children, tone }) {
  const t = tone || (['Active','Eligible','Verified','Approved','Settled'].includes(children) ? 'green' : ['Pending','Review','In review','Processing','Awaiting documents','Pending verification'].includes(children) ? 'amber' : ['Rejected','Suspended','Retired'].includes(children) ? 'red' : 'neutral');
  return <span className={`badge ${t}`}>{children}</span>;
}
function Button({ children, onClick, variant = 'secondary', disabled = false }) { return <button className={`button ${variant}`} onClick={onClick} disabled={disabled}>{children}</button>; }
function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@climatecoins.local');
  const [password, setPassword] = useState('Admin@12345');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) { e.preventDefault(); setError(''); setBusy(true); try { await onLogin(email, password); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <main className="login-shell">
    <section className="login-art">
      <div className="brand"><span className="brand-mark"><Sprout size={24}/></span><span>climatecoins<span className="brand-dot">.</span></span></div>
      <div className="art-copy"><p className="eyebrow light">PLATFORM ADMINISTRATION</p><h1>Steward the system.<br/>Scale the <em>impact.</em></h1><p>One clear view of the people, projects and carbon outcomes moving climate action forward.</p></div>
      <div className="art-footer"><span><b>01</b> Accountability</span><span><b>02</b> Evidence led</span><span><b>03</b> Climate positive</span></div>
    </section>
    <section className="login-form-wrap"><form className="login-form" onSubmit={submit}>
      <p className="eyebrow">ADMIN CONSOLE</p><h2>Welcome back</h2><p className="muted">Sign in to manage the ClimateCoins network.</p>
      {error && <div className="alert error"><AlertCircle size={18}/>{error}</div>}
      <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="username"/></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></label>
      <button className="sign-in" disabled={busy}>{busy?'Signing in…':'Sign in to admin console'}<ChevronRight size={18}/></button>
      <div className="demo-note"><ShieldCheck size={18}/><div><b>Demo administrator access</b><span>admin@climatecoins.local · Admin@12345</span></div></div>
      <p className="login-caption">ClimateCoins prototype · Administrative access is logged</p>
    </form></section>
  </main>;
}
function StatCard({ icon: Icon, label, value, detail, trend, tone = 'sage' }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19}/></div><div className="stat-top"><span>{label}</span><MoreHorizontal size={18}/></div><div className="stat-value">{value}</div><div className="stat-detail">{trend && <span className="trend"><ArrowUpRight size={14}/>{trend}</span>}{detail}</div></article>;
}
function Empty({ text }) { return <div className="empty"><Database size={25}/><p>{text}</p></div>; }
function Table({ columns, rows, empty = 'No records found.' }) {
  if (!rows?.length) return <Empty text={empty}/>;
  return <div className="table-wrap"><table><thead><tr>{columns.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r.id ?? r.code ?? r.project ?? i}>{columns.map(c=><td key={c.key}>{c.render ? c.render(r[c.key],r) : (r[c.key] ?? '—')}</td>)}</tr>)}</tbody></table></div>;
}
function SearchTools({ value, onChange, placeholder = 'Search records…', filter, onFilter, filters = [] }) {
  return <div className="search-tools"><div className="search-box"><Search size={17}/><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></div>{filters.length>0&&<div className="filter-box"><Filter size={16}/><select value={filter} onChange={e=>onFilter(e.target.value)}><option value="">All statuses</option>{filters.map(x=><option key={x} value={x}>{x}</option>)}</select></div>}</div>;
}
function Overview({ data, onNavigate }) {
  const s=data?.stats||{};
  const statusData=[['Eligible farmers',s.eligible||0,'#'],['Pending reviews',s.pendingReviews||0,'#'],['Available credits',num(s.availableCredits),'tCO₂e']];
  return <div className="page-content">
    <div className="welcome-banner"><div><span className="eyebrow light">NETWORK SNAPSHOT · 24 OCTOBER 2026</span><h2>Good systems grow good outcomes.</h2><p>Review progress across farmer communities, verified projects and buyer demand.</p><button className="banner-button" onClick={()=>onNavigate('verifications')}>Review verification queue <ChevronRight size={16}/></button></div><div className="banner-illustration"><div className="ring ring-one"></div><div className="ring ring-two"></div><Sprout size={84}/><span>FARM TO FUTURE</span></div></div>
    <div className="section-heading"><div><h3>Network overview</h3><p>Key indicators across the ClimateCoins ecosystem.</p></div><span className="last-updated"><RefreshCw size={13}/> Live demo data</span></div>
    <div className="stats-grid">
      <StatCard icon={Tractor} label="Registered FPOs" value={num(s.fpos)} detail="Partner organisations" trend="+2 this month"/>
      <StatCard icon={UsersRound} label="Farmers enrolled" value={num(s.farmers)} detail="Across partner FPOs" trend="+18 this month" tone="mint"/>
      <StatCard icon={ClipboardCheck} label="Pending reviews" value={num(s.pendingReviews)} detail="Projects need attention" tone="sand"/>
      <StatCard icon={Coins} label="Credits in inventory" value={num(s.availableCredits)} detail="Available tCO₂e" tone="lavender"/>
    </div>
    <div className="two-column">
      <section className="panel"><div className="panel-heading"><div><h3>Verification queue</h3><p>Projects that need an administrator's attention.</p></div><button className="text-link" onClick={()=>onNavigate('verifications')}>View queue <ChevronRight size={15}/></button></div>
        <Table columns={[{key:'project',label:'Project'}, {key:'fpo',label:'FPO'}, {key:'credits',label:'Credits',render:v=>num(v)+' t'}, {key:'status',label:'Status',render:v=><Badge>{v}</Badge>}]} rows={data?.verifications||[]}/>
      </section>
      <section className="panel"><div className="panel-heading"><div><h3>Platform activity</h3><p>Latest updates from across the network.</p></div><button className="icon-button" aria-label="Activity"><Activity size={17}/></button></div>
        <div className="activity-list">{(data?.activities||[]).slice(0,5).map((a,i)=><div className="activity-item" key={a.id||i}><div className="activity-dot"><Check size={14}/></div><div className="activity-copy"><b>{a.action}</b><span>{a.detail}</span><small>{a.time} · {a.actor}</small></div></div>)}</div>
      </section>
    </div>
    <div className="section-heading"><div><h3>Platform health at a glance</h3><p>Selected indicators to help focus the next action.</p></div></div>
    <div className="mini-grid">{statusData.map(([label,value,unit])=><div className="mini-card" key={label}><span>{label}</span><b>{value} <small>{unit}</small></b><div className="mini-bar"><span style={{width:`${Math.min(100,Number(value)||14)}%`}}/></div></div>)}</div>
  </div>;
}
function Fpos({ rows, mutate, loading }) {
  return <Table columns={[
    {key:'name',label:'Organisation',render:(v,r)=><div className="entity-cell"><span className="entity-avatar"><Tractor size={17}/></span><div><b>{v}</b><small>{r.code}</small></div></div>},
    {key:'district',label:'District',render:(v,r)=><>{v}, {r.state}</>},
    {key:'contact',label:'Contact'},
    {key:'farmers',label:'Farmers',render:v=>num(v)},
    {key:'status',label:'Status',render:v=><Badge>{v}</Badge>},
    {key:'id',label:'Actions',render:(id,r)=><select className="inline-select" aria-label={`Update ${r.name} status`} value={r.status} onChange={e=>mutate(`/fpos/${id}/status`,{status:e.target.value})}><option>Active</option><option>Review</option><option>Pending</option><option>Suspended</option></select>}
  ]} rows={rows} empty={loading?'Loading FPOs…':'No FPOs match your search.'}/>;
}
function Farmers({ rows, mutate, loading }) {
  return <Table columns={[
    {key:'name',label:'Farmer',render:(v,r)=><div className="entity-cell"><span className="person-avatar">{v.split(' ').map(x=>x[0]).slice(0,2).join('')}</span><div><b>{v}</b><small>{r.code}</small></div></div>},
    {key:'fpo',label:'Partner FPO'},
    {key:'village',label:'Village / district',render:(v,r)=><>{v}<small className="subline">{r.district}</small></>},
    {key:'acres',label:'Land',render:v=>`${v} acres`},
    {key:'crop',label:'Main crop'},
    {key:'status',label:'Eligibility',render:v=><Badge>{v}</Badge>},
    {key:'id',label:'Actions',render:(id,r)=><select className="inline-select" aria-label={`Update ${r.name} eligibility`} value={r.status} onChange={e=>mutate(`/farmers/${id}/status`,{status:e.target.value})}><option>Eligible</option><option>Review</option><option>Pending</option><option>Rejected</option></select>}
  ]} rows={rows} empty={loading?'Loading farmers…':'No farmers match your search.'}/>;
}
function Verifications({ rows, mutate, loading }) {
  return <Table columns={[
    {key:'id',label:'Reference',render:v=><b className="mono">{v}</b>},
    {key:'project',label:'Project / FPO',render:(v,r)=><div><b>{v}</b><small className="subline">{r.fpo}</small></div>},
    {key:'submitted',label:'Submitted'},
    {key:'credits',label:'Estimated credits',render:v=>`${num(v)} tCO₂e`},
    {key:'reviewer',label:'Reviewer'},
    {key:'status',label:'Status',render:v=><Badge>{v}</Badge>},
    {key:'id',label:'Review action',render:(id,r)=><select className="inline-select" value={r.status} onChange={e=>mutate(`/verifications/${id}/status`,{status:e.target.value})}><option>In review</option><option>Awaiting documents</option><option>Approved</option><option>Rejected</option></select>}
  ]} rows={rows} empty={loading?'Loading verifications…':'No verification records found.'}/>;
}
function Buyers({ rows, mutate, loading }) {
  return <Table columns={[
    {key:'name',label:'Buyer',render:(v,r)=><div className="entity-cell"><span className="entity-avatar"><Building2 size={17}/></span><div><b>{v}</b><small>{r.type}</small></div></div>},
    {key:'location',label:'Location'},
    {key:'email',label:'Contact email'},
    {key:'demand',label:'Annual demand',render:v=>`${num(v)} tCO₂e`},
    {key:'status',label:'Status',render:v=><Badge>{v}</Badge>},
    {key:'id',label:'Actions',render:(id,r)=><select className="inline-select" value={r.status} onChange={e=>mutate(`/buyers/${id}/status`,{status:e.target.value})}><option>Verified</option><option>Pending</option><option>Suspended</option></select>}
  ]} rows={rows} empty={loading?'Loading buyers…':'No buyers found.'}/>;
}
function Credits({ rows, mutate, loading }) {
  return <Table columns={[
    {key:'id',label:'Batch ID',render:v=><b className="mono">{v}</b>},
    {key:'project',label:'Project'},
    {key:'fpo',label:'Origin FPO'},
    {key:'quantity',label:'Issued / estimated',render:v=>`${num(v)} t`},
    {key:'available',label:'Available',render:v=>`${num(v)} t`},
    {key:'price',label:'Indicative price',render:v=>money(v)},
    {key:'status',label:'Status',render:v=><Badge>{v}</Badge>},
    {key:'id',label:'Actions',render:(id,r)=><select className="inline-select" value={r.status} onChange={e=>mutate(`/credits/${id}/status`,{status:e.target.value})}><option>Verified</option><option>Pending verification</option><option>Reserved</option><option>Retired</option></select>}
  ]} rows={rows} empty={loading?'Loading credit inventory…':'No credit batches found.'}/>;
}
function Transactions({ rows, loading }) {
  return <Table columns={[
    {key:'id',label:'Transaction',render:v=><b className="mono">{v}</b>},
    {key:'buyer',label:'Buyer'},
    {key:'project',label:'Project'},
    {key:'credits',label:'Credits',render:v=>`${num(v)} tCO₂e`},
    {key:'amount',label:'Gross amount',render:v=>money(v)},
    {key:'date',label:'Date'},
    {key:'status',label:'Status',render:v=><Badge>{v}</Badge>}
  ]} rows={rows} empty={loading?'Loading transactions…':'No transactions found.'}/>;
}
function Activities({ rows, loading }) {
  return <Table columns={[
    {key:'time',label:'Time'},
    {key:'action',label:'Action'},
    {key:'detail',label:'Details'},
    {key:'actor',label:'Actor'}
  ]} rows={rows} empty={loading?'Loading audit trail…':'No activity has been recorded yet.'}/>;
}
export default function App() {
  const [token, setToken] = useState(localStorage.getItem('cc_admin_token') || '');
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  useEffect(() => { if (token) request('/auth/me', token).then(x=>setUser(x.user)).catch(()=>{localStorage.removeItem('cc_admin_token');setToken('');}); }, []);
  async function login(email, password) {
    const data = await request('/auth/login', '', { method:'POST', body: JSON.stringify({email,password}) });
    localStorage.setItem('cc_admin_token', data.token); setToken(data.token); setUser(data.user);
  }
  function logout() { localStorage.removeItem('cc_admin_token'); setToken(''); setUser(null); setDashboard(null); }
  async function loadDashboard() { try { setDashboard(await request('/dashboard',token)); } catch(e) { setError(e.message); } }
  async function loadRows() {
    if (page === 'overview') return;
    setLoading(true); setError('');
    try {
      const data = await request(`/${page}${search ? `?q=${encodeURIComponent(search)}${statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : ''}` : statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ''}`,token);
      setRows(data[page] || []);
    } catch(e) { setError(e.message); setRows([]); } finally { setLoading(false); }
  }
  useEffect(() => { if (token && user) loadDashboard(); }, [token,user]);
  useEffect(() => { if (token && user && page !== 'overview') { const timer = setTimeout(loadRows, 180); return ()=>clearTimeout(timer); } }, [token,user,page,search,statusFilter]);
  async function mutate(path, body) {
    try { await request(path, token, { method:'PATCH', body:JSON.stringify(body) }); setToast('Changes saved'); setTimeout(()=>setToast(''),2500); await loadDashboard(); if(page!=='overview') await loadRows(); }
    catch(e) { setError(e.message); }
  }
  if (!token || !user) return <Login onLogin={login}/>;
  const current = titles[page] || titles.overview;
  const pageRows = rows;
  const content = page === 'overview' ? <Overview data={dashboard} onNavigate={setPage}/> :
    page === 'fpos' ? <Fpos rows={pageRows} mutate={mutate} loading={loading}/> :
    page === 'farmers' ? <Farmers rows={pageRows} mutate={mutate} loading={loading}/> :
    page === 'verifications' ? <Verifications rows={pageRows} mutate={mutate} loading={loading}/> :
    page === 'buyers' ? <Buyers rows={pageRows} mutate={mutate} loading={loading}/> :
    page === 'credits' ? <Credits rows={pageRows} mutate={mutate} loading={loading}/> :
    page === 'transactions' ? <Transactions rows={pageRows} loading={loading}/> : <Activities rows={pageRows} loading={loading}/>;
  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen?'open':''}`}>
      <div className="brand sidebar-brand"><span className="brand-mark"><Sprout size={23}/></span><span>climatecoins<span className="brand-dot">.</span></span><button className="mobile-close" onClick={()=>setSidebarOpen(false)}><X size={18}/></button></div>
      <div className="workspace-tag"><span className="workspace-dot"></span><div><small>WORKSPACE</small><b>Platform admin</b></div><ChevronDown size={15}/></div>
      <nav className="nav-list"><p className="nav-caption">WORKSPACE</p>{nav.slice(0,4).map(item=><button key={item.id} className={`nav-item ${page===item.id?'active':''}`} onClick={()=>{setPage(item.id);setSearch('');setStatusFilter('');setSidebarOpen(false);}}><item.icon size={18}/><span>{item.label}</span>{item.badge&&<span className="nav-badge">{dashboard?.stats?.pendingReviews ?? item.badge}</span>}</button>)}<p className="nav-caption gap-top">CARBON MARKETPLACE</p>{nav.slice(4,7).map(item=><button key={item.id} className={`nav-item ${page===item.id?'active':''}`} onClick={()=>{setPage(item.id);setSearch('');setStatusFilter('');setSidebarOpen(false);}}><item.icon size={18}/><span>{item.label}</span></button>)}<p className="nav-caption gap-top">GOVERNANCE</p>{nav.slice(7).map(item=><button key={item.id} className={`nav-item ${page===item.id?'active':''}`} onClick={()=>{setPage(item.id);setSearch('');setStatusFilter('');setSidebarOpen(false);}}><item.icon size={18}/><span>{item.label}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="support-card"><span className="support-icon"><CircleHelp size={17}/></span><div><b>Need a hand?</b><small>Admin workspace guide</small></div><ChevronRight size={15}/></div><div className="profile-mini"><div className="profile-avatar">A</div><div className="profile-info"><b>{user.name}</b><small>Platform administrator</small></div><button className="icon-button" onClick={logout} title="Sign out"><LogOut size={16}/></button></div></div>
    </aside>
    {sidebarOpen && <button className="mobile-overlay" onClick={()=>setSidebarOpen(false)} aria-label="Close navigation"/>}
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="menu-button" onClick={()=>setSidebarOpen(true)}><Menu size={20}/></button><div className="breadcrumb"><span>ClimateCoins</span><ChevronRight size={14}/><b>{nav.find(x=>x.id===page)?.label || 'Overview'}</b></div></div><div className="topbar-right"><div className="system-status"><span></span>All systems operational</div><button className="icon-button notification" title="Notifications"><Bell size={18}/><i></i></button><div className="top-user"><div className="profile-avatar">A</div><div><b>{user.name}</b><small>Administrator</small></div><ChevronDown size={14}/></div></div></header>
      <div className="page-header"><div><p className="eyebrow">CLIMATECOINS ADMINISTRATION</p><h1>{current[0]}</h1><p className="page-subtitle">{current[1]}</p></div><div className="header-actions"><span className="date-pill"><CalendarDays size={15}/> 24 Oct 2026</span><Button onClick={()=>page==='overview'?loadDashboard():loadRows()}><RefreshCw size={15}/> Refresh</Button></div></div>
      {error && <div className="alert error page-alert"><AlertCircle size={18}/>{error}<button onClick={()=>setError('')}><X size={15}/></button></div>}
      {toast && <div className="alert success page-alert"><CheckCircle2 size={18}/>{toast}</div>}
      {page !== 'overview' && <section className="panel list-panel"><div className="list-toolbar"><div><h3>{nav.find(x=>x.id===page)?.label}</h3><p>{rows.length} records shown · changes save to the prototype data store</p></div><div className="toolbar-actions"><SearchTools value={search} onChange={setSearch} placeholder={`Search ${nav.find(x=>x.id===page)?.label.toLowerCase()}…`} filter={statusFilter} onFilter={setStatusFilter} filters={page==='fpos'?['Active','Review','Pending','Suspended']:page==='farmers'?['Eligible','Review','Pending','Rejected']:page==='verifications'?['In review','Awaiting documents','Approved','Rejected']:page==='buyers'?['Verified','Pending','Suspended']:page==='credits'?['Verified','Pending verification','Reserved','Retired']:[]}/><Button onClick={()=>{const csv=[Object.keys(rows[0]||{}).join(','),...rows.map(r=>Object.values(r).map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(','))].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`climatecoins-${page}.csv`;a.click();URL.revokeObjectURL(a.href);}}><Download size={15}/> Export</Button></div></div>{content}</section>}
      {page === 'overview' && content}
      <footer className="app-footer"><span>© 2026 ClimateCoins</span><span><ShieldCheck size={13}/> Admin actions are recorded in the audit trail</span><span>Prototype environment</span></footer>
    </main>
  </div>;
}