# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `app/admin/page.tsx` and extend `app/globals.css` to match the design handoff — 5-row layout with KPI cards, charts, fleet table, recent bookings, quick tasks, fleet donut, and activity feed — all using real API data.

**Architecture:** Single-page rewrite of `page.tsx` (no new files, no new API calls). All data already fetched in one `Promise.allSettled`. CSS classes added to `globals.css` and mapped to existing project variables (`--text-primary`, `--gold`, etc.). `.card` padding overridden inline (`padding: 0`) where the new `.card-head` pattern provides its own padding.

**Tech Stack:** Next.js 16, React 19, Recharts (charts), Lucide React (icons), existing Supabase API hooks.

---

## File Map

| File | Change |
|------|--------|
| `frontend/app/globals.css` | Add ~120 lines of new CSS classes |
| `frontend/app/admin/page.tsx` | Full rewrite (~520 lines) |

---

### Task 1: Add dashboard CSS classes to globals.css

**Files:**
- Modify: `frontend/app/globals.css` (append after the existing `.sidebar-user-email` block, before the `.admin-main` block)

- [ ] **Step 1: Append the new CSS block**

Open `frontend/app/globals.css` and add the following after the `.sidebar-logout-btn:hover` rule and before `/* ── Main content area ── */`:

```css
/* ─── Dashboard: Page header ──────────────────────────────────────────────── */
.page-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 1rem; margin-bottom: 1.75rem; flex-wrap: wrap;
}
.page-sub { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
.page-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

/* ─── Dashboard: KPI grid ─────────────────────────────────────────────────── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px; margin-bottom: 1.25rem;
}
.kpi {
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: 16px; padding: 1.1rem 1.25rem;
  min-width: 0;
}
.kpi-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem; }
.kpi-ico {
  width: 32px; height: 32px; border-radius: 8px;
  display: grid; place-items: center; flex-shrink: 0;
}
.kpi-label { font-size: 12px; color: var(--text-muted); font-weight: 500; flex: 1; padding-left: 0.5rem; }
.kpi-spark { flex-shrink: 0; }
.kpi-value {
  font-size: 1.75rem; font-weight: 800; color: var(--text-primary);
  line-height: 1; margin-bottom: 0.45rem;
  font-family: 'Geist Mono', ui-monospace, monospace;
}
.kpi-value .unit { font-size: 0.9rem; font-weight: 600; color: var(--text-muted); margin-right: 2px; }
.kpi-foot { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.kpi-context { font-size: 11.5px; color: var(--text-muted); }

/* ─── Dashboard: Delta badges ─────────────────────────────────────────────── */
.delta {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 11.5px; font-weight: 600;
  padding: 2px 7px; border-radius: 99px;
}
.delta.pos { color: #22c55e; background: rgba(34,197,94,0.12); }
.delta.neg { color: #ef4444; background: rgba(239,68,68,0.12); }

/* ─── Dashboard: Card header pattern ─────────────────────────────────────── */
.card-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 0.75rem; padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
}
.card-title { font-size: 0.92rem; font-weight: 700; color: var(--text-primary); }
.card-sub { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }

/* ─── Dashboard: Range tabs ───────────────────────────────────────────────── */
.tabs {
  display: flex; background: var(--bg-elevated);
  border-radius: 8px; padding: 3px; gap: 2px;
}
.tab {
  padding: 3px 9px; font-size: 11px; font-weight: 600;
  border: none; cursor: pointer; border-radius: 6px;
  background: transparent; color: var(--text-muted);
  transition: background 0.12s, color 0.12s; font-family: inherit;
}
.tab.active { background: var(--gold); color: #000; }

/* ─── Dashboard: Chart stats area ────────────────────────────────────────── */
.chart-stats { padding: 0.85rem 1.25rem 0.5rem; }
.chart-stat-main {
  font-size: 2rem; font-weight: 800; line-height: 1;
  color: var(--text-primary);
  font-family: 'Geist Mono', ui-monospace, monospace;
}
.chart-stat-main .unit { font-size: 1rem; color: var(--text-muted); margin-right: 2px; }

/* ─── Dashboard: Row grid layouts ────────────────────────────────────────── */
.row-2-1  { display: grid; grid-template-columns: 1fr; gap: 1.25rem; margin-bottom: 1.25rem; }
.row-1-1-1{ display: grid; grid-template-columns: 1fr; gap: 1.25rem; margin-bottom: 1.25rem; }
.row-1-2  { display: grid; grid-template-columns: 1fr; gap: 1.25rem; margin-bottom: 1.25rem; }

/* ─── Dashboard: Ghost text link ─────────────────────────────────────────── */
.link {
  background: none; border: none; cursor: pointer; font-family: inherit;
  font-size: 12.5px; color: var(--text-muted);
  display: inline-flex; align-items: center; gap: 4px;
  padding: 0; transition: color 0.12s; text-decoration: none;
}
.link:hover { color: var(--text-primary); }

/* ─── Dashboard: Status pill with pip dot ────────────────────────────────── */
.status-pill {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11.5px; font-weight: 500;
  padding: 3px 8px; border-radius: 99px; white-space: nowrap;
}
.status-pill .pip { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
.status-pill.available   { background: rgba(34,197,94,0.12);  color: #22c55e; }
.status-pill.available .pip   { background: #22c55e; }
.status-pill.active, .status-pill.on-rent  { background: rgba(59,130,246,0.12);  color: #3b82f6; }
.status-pill.active .pip, .status-pill.on-rent .pip   { background: #3b82f6; }
.status-pill.maintenance, .status-pill.service { background: rgba(245,158,11,0.12); color: #f59e0b; }
.status-pill.maintenance .pip, .status-pill.service .pip { background: #f59e0b; }
.status-pill.completed   { background: rgba(34,197,94,0.12);  color: #22c55e; }
.status-pill.completed .pip   { background: #22c55e; }
.status-pill.pending     { background: rgba(245,158,11,0.12); color: #f59e0b; }
.status-pill.pending .pip     { background: #f59e0b; }
.status-pill.cancelled   { background: rgba(239,68,68,0.12);  color: #ef4444; }
.status-pill.cancelled .pip   { background: #ef4444; }

/* ─── Dashboard: Fleet table cells ──────────────────────────────────────── */
.plate-tag {
  font-size: 10.5px; font-weight: 600; padding: 2px 7px; border-radius: 5px;
  background: rgba(212,168,83,0.12); color: var(--gold);
  border: 1px solid rgba(212,168,83,0.2); white-space: nowrap;
}
.vehicle-cell { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.vehicle-name { font-size: 0.82rem; font-weight: 600; color: var(--text-primary); }

/* ─── Dashboard: Recent bookings list ───────────────────────────────────── */
.list-row {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.65rem 1.25rem; border-bottom: 1px solid var(--border-subtle);
  transition: background 0.1s;
}
.list-row:last-child { border-bottom: none; }
.list-row:hover { background: var(--bg-elevated); }
.cust-av {
  width: 34px; height: 34px; border-radius: 9px;
  display: grid; place-items: center;
  font-size: 11px; font-weight: 700; flex-shrink: 0;
}
.list-main { flex: 1; min-width: 0; }
.list-title {
  font-size: 0.82rem; font-weight: 600; color: var(--text-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.list-sub {
  font-size: 11.5px; color: var(--text-muted); margin-top: 2px;
  display: flex; align-items: center; gap: 0.35rem;
}
.list-amount {
  font-size: 0.82rem; font-weight: 700; color: var(--gold);
  text-align: right; font-family: 'Geist Mono', ui-monospace, monospace;
  white-space: nowrap;
}
.list-amount-sub { font-size: 10.5px; color: var(--text-muted); text-align: right; margin-top: 2px; }
.ccy { font-size: 0.72rem; color: var(--text-muted); margin-right: 2px; }

/* ─── Dashboard: Quick tasks ─────────────────────────────────────────────── */
.task {
  display: flex; align-items: flex-start; gap: 0.75rem;
  padding: 0.65rem 1.25rem; border-bottom: 1px solid var(--border-subtle);
  transition: background 0.1s; cursor: default;
}
.task:last-child { border-bottom: none; }
.task:hover { background: var(--bg-elevated); }
.task.done .task-title { text-decoration: line-through; color: var(--text-muted); }
.checkbox {
  width: 17px; height: 17px; border-radius: 5px;
  border: 1.5px solid var(--border);
  display: grid; place-items: center; cursor: pointer;
  flex-shrink: 0; margin-top: 1px;
  transition: background 0.12s, border-color 0.12s;
}
.checkbox.checked { background: var(--gold); border-color: var(--gold); color: #000; }
.task-body { flex: 1; min-width: 0; }
.task-title { font-size: 0.82rem; font-weight: 500; color: var(--text-primary); }
.task-meta {
  font-size: 11px; color: var(--text-muted); margin-top: 2px;
  display: flex; align-items: center; gap: 0.4rem;
}
.tag { font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 99px; }
.tag.urgent { background: rgba(239,68,68,0.12);  color: #ef4444; }
.tag.soon   { background: rgba(245,158,11,0.12); color: #f59e0b; }
.tag.low    { background: rgba(34,197,94,0.12);  color: #22c55e; }

/* ─── Dashboard: Fleet donut ─────────────────────────────────────────────── */
.donut-wrap { display: flex; align-items: center; gap: 1.5rem; padding: 0.75rem 1.25rem 1.25rem; }
.donut-center { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; }
.donut-pct { font-size: 1.2rem; font-weight: 800; color: var(--text-primary); font-family: 'Geist Mono', ui-monospace, monospace; }
.donut-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }
.legend-stack { display: flex; flex-direction: column; gap: 0.55rem; }
.legend-stack .row { display: flex; align-items: center; gap: 0.5rem; font-size: 12.5px; color: var(--text-secondary); }
.legend-stack .swatch { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
.legend-stack b { margin-left: auto; font-weight: 700; color: var(--text-primary); padding-left: 1rem; }

/* ─── Dashboard: Activity feed ───────────────────────────────────────────── */
.activity-row {
  display: flex; align-items: flex-start; gap: 0.75rem;
  padding: 0.65rem 1.25rem; border-bottom: 1px solid var(--border-subtle);
}
.activity-row:last-child { border-bottom: none; }
.act-ico {
  width: 28px; height: 28px; border-radius: 8px;
  background: var(--bg-elevated); display: grid; place-items: center;
  color: var(--text-muted); flex-shrink: 0; margin-top: 1px;
}
.act-body { flex: 1; min-width: 0; font-size: 0.82rem; }
.act-time { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

/* ─── Dashboard: Desktop breakpoints ─────────────────────────────────────── */
@media (min-width: 768px) {
  .kpi-grid { grid-template-columns: repeat(4, 1fr); }
}
@media (min-width: 1024px) {
  .row-2-1   { grid-template-columns: 2fr 1fr; }
  .row-1-1-1 { grid-template-columns: 1fr 1fr 1fr; }
  .row-1-2   { grid-template-columns: 1fr 2fr; }
}
```

- [ ] **Step 2: Verify no syntax errors**

```bash
cd /home/dinesh-s/Documents/Dinesh/gasith-rent-a-car/frontend
npx next build 2>&1 | tail -20
```

Expected: build succeeds (CSS errors would appear as parse warnings, not build failures — confirm no `globals.css` errors in output).

- [ ] **Step 3: Commit**

```bash
git add frontend/app/globals.css
git commit -m "feat: add dashboard design CSS classes"
```

---

### Task 2: Rewrite frontend/app/admin/page.tsx

**Files:**
- Modify: `frontend/app/admin/page.tsx` (full replacement)

- [ ] **Step 1: Replace the entire file with the new content**

Write the following complete file to `frontend/app/admin/page.tsx`:

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDashboardStats, getRevenueStats, getBookings, getVehicles, getCustomers } from '@/lib/api';
import {
  ComposedChart, BarChart, Bar, Line, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import {
  TrendingUp, Car, Users, Gauge, Plus, ExternalLink,
  CalendarDays, KeyRound, RotateCcw, Check, ChevronRight, XCircle,
} from 'lucide-react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────
type Stats    = { activeBookings: number; totalBookings: number; totalCustomers: number; totalVehicles: number; monthRevenue: number; };
type Revenue  = { month: string; totalRevenue: number; totalBookings: number; };
type Booking  = { id: string; customerId: string; vehicleId: string; status: string; startDate: any; endDate: any; finalAmount: number; createdAt: any; };
type Vehicle  = { id: string; name: string; plate: string; isAvailable: boolean; pricePerDay: number; };
type Customer = { id: string; name: string; phone?: string; };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtM(v: number) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
  if (v >= 1_000)     return (v / 1_000).toFixed(1) + 'K';
  return v.toLocaleString();
}
function timeAgo(seconds: number) {
  const d = Date.now() / 1000 - seconds;
  if (d < 3600)  return `${Math.round(d / 60)} min ago`;
  if (d < 86400) return `${Math.round(d / 3600)} hr ago`;
  return `${Math.round(d / 86400)} days ago`;
}
function fmtDate(val: any) {
  if (!val) return '—';
  const d = val._seconds ? new Date(val._seconds * 1000) : new Date(val);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function toSecs(val: any): number {
  if (!val) return 0;
  if (val._seconds) return val._seconds;
  const d = new Date(val);
  return isNaN(d.getTime()) ? 0 : d.getTime() / 1000;
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color = '#D4A853' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const W = 80, H = 36;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    H - ((v - min) / range) * (H - 6) - 3,
  ] as [number, number]);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;
  const gid  = `sg${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0}    />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Status pill with pip dot ─────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const label =
    status === 'active'      ? 'On rent'    :
    status === 'available'   ? 'Available'  :
    status === 'maintenance' ? 'In service' :
    status === 'completed'   ? 'Completed'  :
    status === 'pending'     ? 'Pending'    :
    status === 'cancelled'   ? 'Cancelled'  : status;
  return (
    <span className={`status-pill ${status}`}>
      <span className="pip" />
      {label}
    </span>
  );
}

// ─── Revenue chart tooltip ────────────────────────────────────────────────────
const RevTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1c1b1b', border: '1px solid #4e4633', borderRadius: 10, padding: '0.6rem 0.85rem', fontSize: '0.77rem' }}>
      <div style={{ color: '#9a9078', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, color: 'var(--gold)', fontVariantNumeric: 'tabular-nums' }}>
        LKR {payload[0]?.value?.toLocaleString()}
      </div>
    </div>
  );
};

// ─── Fleet donut (pure SVG) ───────────────────────────────────────────────────
function FleetDonut({ vehicles, activeIds }: { vehicles: Vehicle[]; activeIds: Set<string> }) {
  const total      = vehicles.length || 1;
  const available  = vehicles.filter(v => v.isAvailable).length;
  const onRent     = vehicles.filter(v => !v.isAvailable && activeIds.has(v.id)).length;
  const inService  = vehicles.filter(v => !v.isAvailable && !activeIds.has(v.id)).length;
  const utilPct    = Math.round((onRent / total) * 100);

  const items = [
    { label: 'Available',  value: available, color: '#22c55e' },
    { label: 'On Rent',    value: onRent,    color: 'var(--gold)' },
    { label: 'In Service', value: inService, color: '#f59e0b' },
  ].filter(i => i.value > 0);

  const r = 52, cx = 60, cy = 60, circumference = 2 * Math.PI * r;
  let offset = 0;
  const segments = items.map(it => {
    const dash = circumference * (it.value / total);
    const seg  = { ...it, dash, offset, gap: circumference - dash };
    offset += dash;
    return seg;
  });

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="card-head">
        <div>
          <div className="card-title">Fleet Status</div>
          <div className="card-sub">{vehicles.length} vehicles total</div>
        </div>
        <Link href="/admin/vehicles" className="link">View all <ChevronRight size={12} /></Link>
      </div>
      <div className="donut-wrap">
        <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
          <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth="14" />
            {segments.map((s, i) => (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                stroke={s.color} strokeWidth="14"
                strokeDasharray={`${s.dash} ${s.gap}`}
                strokeDashoffset={-s.offset}
                strokeLinecap="butt" />
            ))}
          </svg>
          <div className="donut-center">
            <div>
              <div className="donut-pct">{utilPct}%</div>
              <div className="donut-label">Utilised</div>
            </div>
          </div>
        </div>
        <div className="legend-stack">
          {items.map(it => (
            <div className="row" key={it.label}>
              <span className="swatch" style={{ background: it.color }} />
              {it.label}
              <b>{it.value}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Static quick tasks ───────────────────────────────────────────────────────
const INITIAL_TASKS = [
  { title: 'Renew fleet insurance',         meta: 'Due end of month',      tag: 'urgent', tagLabel: 'Urgent', done: false },
  { title: 'Schedule 1,000 km service',     meta: 'Check vehicle log',     tag: 'soon',   tagLabel: 'Soon',   done: false },
  { title: 'Follow up overdue payment',     meta: 'Outstanding invoice',   tag: 'urgent', tagLabel: 'Urgent', done: false },
  { title: 'Update fleet photos',           meta: 'CMS update',            tag: 'low',    tagLabel: 'Low',    done: false },
  { title: 'Review monthly revenue report', meta: 'Finance summary',       tag: 'low',    tagLabel: 'Low',    done: false },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const [stats,     setStats]     = useState<Stats | null>(null);
  const [revenue,   setRevenue]   = useState<Revenue[]>([]);
  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [vehicles,  setVehicles]  = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [range,     setRange]     = useState<'7d' | '30d' | '12m'>('12m');
  const [tasks,     setTasks]     = useState(INITIAL_TASKS);

  const rawName   = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Admin';
  const firstName = (() => { const w = rawName.split(/[\s._]/)[0]; return w.charAt(0).toUpperCase() + w.slice(1); })();
  const dateLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    Promise.allSettled([
      getDashboardStats(), getRevenueStats(),
      getBookings({ limit: 50 }), getVehicles({ limit: 20 }), getCustomers(),
    ]).then(([s, r, b, v, c]) => {
      setStats(s.status === 'fulfilled' ? s.value.data : { activeBookings: 0, totalBookings: 0, totalCustomers: 0, totalVehicles: 0, monthRevenue: 0 });
      setRevenue(r.status === 'fulfilled' ? [...r.value.data].reverse() : []);
      setBookings(b.status === 'fulfilled' ? b.value.data : []);
      setVehicles(v.status === 'fulfilled' ? v.value.data : []);
      setCustomers(c.status === 'fulfilled' ? c.value.data : []);
    }).finally(() => setLoading(false));
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const chartData    = (range === '7d' ? revenue.slice(-3) : range === '30d' ? revenue.slice(-6) : revenue)
                         .map(r => ({ ...r, target: Math.round(r.totalRevenue * 1.05) }));
  const total12m     = revenue.reduce((s, r) => s + r.totalRevenue, 0);
  const revSparkData = revenue.slice(-7).map(r => r.totalRevenue);
  const bkSparkData  = revenue.slice(-7).map(r => r.totalBookings);
  const utilPct      = Math.min(100, Math.round(((stats?.activeBookings ?? 0) / Math.max(1, stats?.totalVehicles ?? 1)) * 100));

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyBarData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { day: DAYS[d.getDay()], count: 0, dateStr: d.toDateString() };
  });
  bookings.forEach(b => {
    const ts = b.createdAt?._seconds ? new Date(b.createdAt._seconds * 1000) : b.createdAt ? new Date(b.createdAt) : null;
    if (!ts || isNaN(ts.getTime())) return;
    weeklyBarData.forEach(e => { if (ts.toDateString() === e.dateStr) e.count++; });
  });
  const weeklyTotal = weeklyBarData.reduce((s, d) => s + d.count, 0);

  const revTrend = revenue.length >= 2 ? (() => {
    const curr = revenue[revenue.length - 1]?.totalRevenue || 0;
    const prev = revenue[revenue.length - 2]?.totalRevenue || 0;
    if (prev === 0) return null;
    return { pct: ((curr - prev) / prev * 100).toFixed(1), positive: curr >= prev };
  })() : null;

  const bkTrend = revenue.length >= 2 ? (() => {
    const curr = revenue[revenue.length - 1]?.totalBookings || 0;
    const prev = revenue[revenue.length - 2]?.totalBookings || 0;
    return { delta: curr - prev, positive: curr >= prev };
  })() : null;

  const customerMap = Object.fromEntries(customers.map(c => [c.id, c]));
  const vehicleMap  = Object.fromEntries(vehicles.map(v => [v.id, v]));

  const vehicleActiveBooking: Record<string, Booking> = {};
  bookings.forEach(b => {
    if ((b.status === 'active' || b.status === 'confirmed') && !vehicleActiveBooking[b.vehicleId])
      vehicleActiveBooking[b.vehicleId] = b;
  });
  const activeIds = new Set(Object.keys(vehicleActiveBooking));

  const STAT_CARDS = [
    { label: 'Revenue (MTD)', Icon: TrendingUp, iconColor: '#3b82f6', value: fmtM(stats?.monthRevenue ?? 0), prefix: 'LKR', context: `${stats?.totalBookings ?? 0} total bookings`, spark: revSparkData, sparkColor: '#3b82f6', delta: revTrend ? `${revTrend.positive ? '+' : ''}${revTrend.pct}%` : null, deltaPos: revTrend?.positive ?? true },
    { label: 'Active Rentals', Icon: Car,        iconColor: '#22c55e', value: String(stats?.activeBookings ?? 0), prefix: null, context: `of ${stats?.totalVehicles ?? 0} vehicles`, spark: bkSparkData,  sparkColor: '#22c55e', delta: bkTrend ? `${bkTrend.positive ? '+' : ''}${bkTrend.delta}` : null, deltaPos: bkTrend?.positive ?? true },
    { label: 'Total Customers', Icon: Users,     iconColor: '#a855f7', value: String(stats?.totalCustomers ?? 0), prefix: null, context: 'registered customers', spark: revSparkData, sparkColor: '#a855f7', delta: null, deltaPos: true },
    { label: 'Fleet Utilisation', Icon: Gauge,   iconColor: '#f59e0b', value: `${utilPct}%`, prefix: null, context: `${stats?.activeBookings ?? 0} of ${stats?.totalVehicles ?? 0} active`, spark: bkSparkData, sparkColor: '#f59e0b', delta: null, deltaPos: true },
  ];

  // Activity feed — synthesised from recent bookings
  const activityItems = bookings.slice(0, 5).map(b => {
    const secs     = toSecs(b.createdAt);
    const custName = customerMap[b.customerId]?.name || 'Customer';
    const vehName  = vehicleMap[b.vehicleId]?.name  || 'Vehicle';
    const time     = secs ? timeAgo(secs) : '—';
    if (b.status === 'active' || b.status === 'confirmed')
      return { Icon: KeyRound,    title: `${vehName} handed over`,  sub: custName, time };
    if (b.status === 'completed')
      return { Icon: RotateCcw,   title: `${vehName} returned`,     sub: `${custName} · LKR ${(b.finalAmount || 0).toLocaleString()}`, time };
    if (b.status === 'cancelled')
      return { Icon: XCircle,     title: 'Booking cancelled',        sub: `${custName} · ${vehName}`, time };
    return   { Icon: CalendarDays, title: `New booking — ${vehName}`, sub: custName, time };
  });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  );

  return (
    <div className="animate-fade">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="page-head">
        <div>
          <h1 className="page-title">{greeting}, {firstName}</h1>
          <p className="page-sub">Here&apos;s your fleet at a glance.</p>
        </div>
        <div className="page-actions">
          <div className="topbar-date-chip responsive-hide-mobile">
            <CalendarDays size={13} strokeWidth={1.5} />
            {dateLabel}
          </div>
          <a href="/" target="_blank" className="btn btn-secondary btn-sm responsive-hide-mobile"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ExternalLink size={13} strokeWidth={1.5} /> View Site
          </a>
          <Link href="/admin/bookings" className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Plus size={14} strokeWidth={2} /> New Booking
          </Link>
        </div>
      </div>

      {/* ── KPI Grid ─────────────────────────────────────────────────────── */}
      <div className="kpi-grid">
        {STAT_CARDS.map(({ label, Icon, iconColor, value, prefix, context, spark, sparkColor, delta, deltaPos }) => (
          <div key={label} className="kpi">
            <div className="kpi-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="kpi-ico" style={{ background: `${iconColor}18` }}>
                  <Icon size={15} strokeWidth={1.5} color={iconColor} />
                </div>
                <span className="kpi-label">{label}</span>
              </div>
              <span className="kpi-spark"><Sparkline data={spark} color={sparkColor} /></span>
            </div>
            <div className="kpi-value">
              {prefix && <span className="unit">{prefix} </span>}
              {value}
            </div>
            <div className="kpi-foot">
              {delta && <span className={`delta ${deltaPos ? 'pos' : 'neg'}`}>{deltaPos ? '▲' : '▼'} {delta}</span>}
              <span className="kpi-context">{context}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 2:1 — Revenue Trend + Weekly Bookings ────────────────────── */}
      <div className="row-2-1">

        {/* Revenue Trend */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-head">
            <div>
              <div className="card-title">Revenue Trend</div>
              <div className="card-sub">
                {revenue.length > 0 ? `Last ${revenue.length} month${revenue.length !== 1 ? 's' : ''} · vs target` : 'No data yet'}
              </div>
            </div>
            <div className="tabs">
              {(['7d', '30d', '12m'] as const).map(r => (
                <button key={r} className={`tab ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>{r}</button>
              ))}
            </div>
          </div>
          <div className="chart-stats">
            <div className="chart-stat-main"><span className="unit">LKR </span>{fmtM(total12m)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
              {revTrend && <span className={`delta ${revTrend.positive ? 'pos' : 'neg'}`}>{revTrend.positive ? '▲' : '▼'} {revTrend.positive ? '+' : ''}{revTrend.pct}%</span>}
              {revTrend && <span style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>vs prior period</span>}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', fontSize: '0.68rem', color: 'var(--text-muted)', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: 12, height: 2, background: 'var(--gold)', display: 'inline-block', borderRadius: 1 }} /> Revenue</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: 12, height: 0, borderTop: '2px dashed rgba(212,168,83,0.4)', display: 'inline-block' }} /> Target</span>
              </div>
            </div>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="rvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--gold)" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="var(--gold)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<RevTooltip />} />
                  <Area type="monotone" dataKey="totalRevenue" stroke="var(--gold)" strokeWidth={2} fill="url(#rvGrad)" dot={false} activeDot={{ r: 4, fill: 'var(--gold)' }} />
                  <Line type="monotone" dataKey="target" stroke="var(--gold)" strokeWidth={1.5} strokeDasharray="5 5" strokeOpacity={0.4} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><p>No revenue data yet</p></div>
            )}
          </div>
        </div>

        {/* Weekly Bookings */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-head">
            <div>
              <div className="card-title">Weekly Bookings</div>
              <div className="card-sub">Last 7 days</div>
            </div>
            {weeklyTotal > 0 && <span className="delta pos">▲ {weeklyTotal}</span>}
          </div>
          <div className="chart-stats">
            <div className="chart-stat-main">{weeklyTotal}</div>
            <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>bookings this week</div>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weeklyBarData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis hide allowDecimals={false} />
                <Tooltip formatter={(v: any) => [v, 'Bookings']} contentStyle={{ background: '#1c1b1b', border: '1px solid #4e4633', borderRadius: 10, fontSize: '0.76rem' }} />
                <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={30}>
                  {weeklyBarData.map((_, idx) => (
                    <Cell key={idx} fill={idx === weeklyBarData.length - 1 ? 'var(--gold)' : 'var(--bg-elevated)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Row 1:1:1 — Fleet Table + Recent Bookings + Quick Tasks ─────── */}
      <div className="row-1-1-1">

        {/* Fleet Activity */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-head">
            <div>
              <div className="card-title">Fleet Activity</div>
              <div className="card-sub">Latest status across your vehicles</div>
            </div>
            <Link href="/admin/vehicles" className="link">View all <ChevronRight size={12} /></Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 340 }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)' }}>
                  <th style={{ padding: '0.7rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vehicle</th>
                  <th style={{ padding: '0.7rem 0.75rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '0.7rem 0.75rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</th>
                  <th style={{ padding: '0.7rem 1.25rem', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rate/day</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.slice(0, 6).map(v => {
                  const ab       = vehicleActiveBooking[v.id];
                  const custName = ab ? (customerMap[ab.customerId]?.name || '—') : '—';
                  const vStatus  = !v.isAvailable && ab ? 'active' : v.isAvailable ? 'available' : 'maintenance';
                  return (
                    <tr key={v.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem 1.25rem' }}>
                        <div className="vehicle-cell">
                          <div className="vehicle-name">{v.name}</div>
                          <span className="plate-tag mono">{v.plate}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.75rem' }}><StatusPill status={vStatus} /></td>
                      <td style={{ padding: '0.75rem 0.75rem', fontSize: '0.8rem', color: custName !== '—' ? 'var(--text-primary)' : 'var(--text-muted)' }}>{custName}</td>
                      <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right', fontFamily: 'Geist Mono, monospace', fontSize: '0.8rem' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 3 }}>LKR</span>
                        {(v.pricePerDay || 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
                {vehicles.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No vehicles yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-head">
            <div>
              <div className="card-title">Recent Bookings</div>
              <div className="card-sub">Latest customer requests</div>
            </div>
            <Link href="/admin/bookings" className="link">View all <ChevronRight size={12} /></Link>
          </div>
          <div>
            {bookings.length > 0 ? bookings.slice(0, 5).map(b => {
              const colMap: Record<string, string> = { active: '#3b82f6', completed: '#22c55e', pending: '#f59e0b', cancelled: '#ef4444', confirmed: '#22c55e' };
              const c        = colMap[b.status] || '#9a9078';
              const custName = customerMap[b.customerId]?.name || 'Unknown';
              const vehName  = vehicleMap[b.vehicleId]?.name  || 'Vehicle';
              const initials = custName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || 'CU';
              const secs     = toSecs(b.createdAt);
              return (
                <div key={b.id} className="list-row">
                  <div className="cust-av" style={{ background: `${c}20`, color: c }}>{initials}</div>
                  <div className="list-main">
                    <div className="list-title">{custName}</div>
                    <div className="list-sub">
                      <span>{vehName}</span>
                      <span style={{ color: 'var(--text-muted)' }}>·</span>
                      <StatusPill status={b.status} />
                    </div>
                  </div>
                  <div>
                    <div className="list-amount"><span className="ccy">LKR</span>{(b.finalAmount || 0).toLocaleString()}</div>
                    <div className="list-amount-sub">{secs ? timeAgo(secs) : '—'}</div>
                  </div>
                </div>
              );
            }) : (
              <div className="empty-state" style={{ padding: '2rem' }}><p>No bookings yet</p></div>
            )}
          </div>
        </div>

        {/* Quick Tasks */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-head">
            <div>
              <div className="card-title">Quick Tasks</div>
              <div className="card-sub">{tasks.filter(t => !t.done).length} pending</div>
            </div>
          </div>
          <div>
            {tasks.map((t, i) => (
              <div key={i} className={`task ${t.done ? 'done' : ''}`}>
                <div
                  className={`checkbox ${t.done ? 'checked' : ''}`}
                  onClick={() => setTasks(prev => prev.map((x, j) => j === i ? { ...x, done: !x.done } : x))}
                >
                  {t.done && <Check size={11} strokeWidth={2.5} />}
                </div>
                <div className="task-body">
                  <div className="task-title">{t.title}</div>
                  <div className="task-meta">
                    <span>{t.meta}</span>
                    {t.tag && <span className={`tag ${t.tag}`}>{t.tagLabel}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 1:2 — Fleet Donut + Activity Feed ───────────────────────── */}
      <div className="row-1-2">

        <FleetDonut vehicles={vehicles} activeIds={activeIds} />

        {/* Activity Feed */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-head">
            <div>
              <div className="card-title">Activity</div>
              <div className="card-sub">Across your fleet operations</div>
            </div>
            <Link href="/admin/bookings" className="link">All activity <ChevronRight size={12} /></Link>
          </div>
          <div>
            {activityItems.length > 0 ? activityItems.map((a, i) => (
              <div key={i} className="activity-row">
                <div className="act-ico"><a.Icon size={13} strokeWidth={1.5} /></div>
                <div className="act-body">
                  <div style={{ fontWeight: 600 }}>{a.title}</div>
                  <div className="act-time">{a.sub} · {a.time}</div>
                </div>
              </div>
            )) : (
              <div className="empty-state" style={{ padding: '2rem' }}><p>No recent activity</p></div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/dinesh-s/Documents/Dinesh/gasith-rent-a-car/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. If `XCircle` or `RotateCcw` are flagged as missing, they are valid Lucide v0.x icons — confirm the installed version supports them:

```bash
grep '"lucide-react"' package.json
```

If using lucide-react < 0.263, replace `XCircle` with `X` and `RotateCcw` with `RefreshCcw`.

- [ ] **Step 3: Verify build passes**

```bash
npx next build 2>&1 | tail -30
```

Expected: `✓ Compiled successfully` with no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/admin/page.tsx
git commit -m "feat: redesign dashboard to match design handoff"
```

---

### Task 3: Smoke-test and push

- [ ] **Step 1: Start dev server**

```bash
cd /home/dinesh-s/Documents/Dinesh/gasith-rent-a-car/frontend
npm run dev
```

- [ ] **Step 2: Open dashboard and verify each section**

Navigate to `http://localhost:3000/admin`.

Check list:
- [ ] 4 KPI cards visible with sparklines, delta badges, and real values
- [ ] Revenue Trend chart renders with 7d / 30d / 12m tab switcher working
- [ ] Weekly Bookings bar chart shows last 7 days, last bar is gold
- [ ] Fleet Activity table shows vehicle name, plate tag, status pip-dot, customer, rate
- [ ] Recent Bookings list shows initials avatar, customer name, vehicle, status pill, amount
- [ ] Quick Tasks: 5 items, checkboxes toggle done state (strikethrough)
- [ ] Fleet Status Donut renders SVG with legend; utilisation % shown in centre
- [ ] Activity Feed shows up to 5 synthesised items from real bookings
- [ ] On mobile (< 768px): all rows collapse to single column, KPI grid is 2-col

- [ ] **Step 3: Push**

```bash
git push
```
