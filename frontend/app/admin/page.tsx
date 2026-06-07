'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDashboardStats, getRevenueStats, getBookings, getVehicles, getCustomers, getTasks, createTask, toggleTask } from '@/lib/api';
import {
  ComposedChart, Area, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  TrendingUp, Car, Users, Gauge, Plus, ExternalLink,
  CalendarDays, KeyRound, RotateCcw, Check, ChevronRight, XCircle,
  ArrowUp, ArrowDown,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
type Stats    = { activeBookings: number; totalBookings: number; totalCustomers: number; totalVehicles: number; monthRevenue: number; };
type Revenue      = { month: string; totalRevenue: number; totalBookings: number; };
type DailyRevenue = { period: string; totalRevenue: number; totalBookings: number; };
type Booking  = { id: string; customerId: string; vehicleId: string; status: string; startDate: any; endDate: any; finalAmount: number; createdAt: any; };
type Vehicle  = { id: string; name: string; plate: string; isAvailable: boolean; pricePerDay: number; };
type Customer = { id: string; name: string; phone?: string; };
type Task     = { id: string; title: string; tag: string; tagLabel: string; done: boolean };

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
function toSecs(val: any): number {
  if (!val) return 0;
  if (val._seconds) return val._seconds;
  const d = new Date(val);
  return isNaN(d.getTime()) ? 0 : d.getTime() / 1000;
}

// ─── Sparkline (absolute-positioned inside .kpi) ──────────────────────────────
function Sparkline({ data, color = 'var(--gold)' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const w = 120, h = 36;
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return [x, y] as [number, number];
  });
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = `${path} L${w},${h} L0,${h} Z`;
  const gid = `sg${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <svg className="kpi-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

// ─── Status pill with pip dot ─────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    'on-rent': 'On rent', available: 'Available', service: 'In service',
    overdue: 'Overdue', completed: 'Completed', pending: 'Pending', cancelled: 'Cancelled',
  };
  return (
    <span className={`status-pill ${status}`}>
      <span className="pip" />
      {map[status] ?? status}
    </span>
  );
}

// ─── Date/month formatters ────────────────────────────────────────────────────
function fmtMonthShort(m: string) {
  const [y, mo] = m.split('-');
  const d = new Date(Number(y), Number(mo) - 1);
  const short = d.toLocaleDateString('en-GB', { month: 'short' });
  return mo === '01' ? `${short} '${String(y).slice(2)}` : short;
}
function fmtMonthFull(m: string) {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
function fmtDayTick(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' });
}
function fmtDayFull(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

// ─── Revenue chart tooltip ────────────────────────────────────────────────────
const RevTooltip = ({ active, payload, label, isDaily }: any) => {
  if (!active || !payload?.length) return null;
  const title = isDaily ? fmtDayFull(label) : fmtMonthFull(label);
  const rev = payload.find((p: any) => p.dataKey === 'totalRevenue');
  const bk  = payload.find((p: any) => p.dataKey === 'totalBookings');
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '0.6rem 0.85rem', fontSize: '0.77rem' }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{title}</div>
      {rev && <div className="mono" style={{ fontWeight: 600, color: 'var(--gold)' }}>LKR {rev.value?.toLocaleString()}</div>}
      {bk  && <div className="mono" style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{bk.value} booking{bk.value !== 1 ? 's' : ''}</div>}
    </div>
  );
};

// ─── Fleet donut (pure SVG) ───────────────────────────────────────────────────
function FleetDonut({ vehicles, activeIds }: { vehicles: Vehicle[]; activeIds: Set<string> }) {
  const total     = vehicles.length || 1;
  const available = vehicles.filter(v => v.isAvailable).length;
  const onRent    = vehicles.filter(v => !v.isAvailable && activeIds.has(v.id)).length;
  const inService = vehicles.filter(v => !v.isAvailable && !activeIds.has(v.id)).length;
  const utilPct   = Math.round((onRent / total) * 100);

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
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="card-head">
        <div>
          <div className="card-title">Fleet Status</div>
          <div className="card-sub">{vehicles.length} vehicles total</div>
        </div>
        <Link href="/admin/vehicles" className="link">View all <ChevronRight size={12} /></Link>
      </div>
      <div className="donut-wrap">
        <div style={{ position: 'relative', width: 120, height: 120, flex: 'none' }}>
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const [stats,     setStats]     = useState<Stats | null>(null);
  const [revenue,   setRevenue]   = useState<Revenue[]>([]);
  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [vehicles,  setVehicles]  = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [range,     setRange]     = useState<'7D' | '3M' | '6M' | '12M'>('7D');
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [tasks,      setTasks]      = useState<Task[]>([]);
  const [addingTask, setAddingTask] = useState(false);
  const [newTitle,   setNewTitle]   = useState('');
  const [newTag,     setNewTag]     = useState<'urgent' | 'soon' | 'low'>('soon');

  const rawName   = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Admin';
  const firstName = (() => { const w = rawName.split(/[\s._]/)[0]; return w.charAt(0).toUpperCase() + w.slice(1); })();
  const dateLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    Promise.allSettled([
      getDashboardStats(), getRevenueStats(),
      getBookings({ limit: 50 }), getVehicles({ limit: 20 }), getCustomers(),
      getTasks(),
    ]).then(([s, r, b, v, c, tk]) => {
      setStats(s.status === 'fulfilled' ? s.value.data : { activeBookings: 0, totalBookings: 0, totalCustomers: 0, totalVehicles: 0, monthRevenue: 0 });
      setRevenue(r.status === 'fulfilled' ? [...r.value.data].reverse() : []);
      setBookings(b.status === 'fulfilled' ? b.value.data : []);
      setVehicles(v.status === 'fulfilled' ? v.value.data : []);
      setCustomers(c.status === 'fulfilled' ? c.value.data : []);
      setTasks(tk.status === 'fulfilled' ? tk.value.data : []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (range === '7D') {
      getRevenueStats({ range: '7d' }).then(r => setDailyRevenue(r.data || []));
    }
  }, [range]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const chartData    = (
    range === '7D' ? dailyRevenue :
    range === '3M' ? revenue.slice(-3) :
    range === '6M' ? revenue.slice(-6) : revenue
  )
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
  const weeklyMax   = Math.max(...weeklyBarData.map(d => d.count), 1);

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
    { label: 'Revenue (MTD)',    Icon: TrendingUp, value: fmtM(stats?.monthRevenue ?? 0),   prefix: 'LKR', context: `${stats?.totalBookings ?? 0} total bookings`,         spark: revSparkData, sparkPos: revTrend?.positive ?? true, delta: revTrend ? `${revTrend.positive ? '+' : ''}${revTrend.pct}%` : null, deltaPos: revTrend?.positive ?? true },
    { label: 'Active Rentals',   Icon: Car,        value: String(stats?.activeBookings ?? 0), prefix: null,  context: `of ${stats?.totalVehicles ?? 0} vehicles`,             spark: bkSparkData,  sparkPos: bkTrend?.positive ?? true,  delta: bkTrend ? `${bkTrend.positive ? '+' : ''}${bkTrend.delta}` : null, deltaPos: bkTrend?.positive ?? true },
    { label: 'Total Customers',  Icon: Users,      value: String(stats?.totalCustomers ?? 0), prefix: null,  context: 'registered customers',                                  spark: revSparkData, sparkPos: true,                       delta: null, deltaPos: true },
    { label: 'Fleet Utilisation',Icon: Gauge,      value: `${utilPct}`,                       prefix: null,  context: `${stats?.activeBookings ?? 0} of ${stats?.totalVehicles ?? 0} active`, spark: bkSparkData,  sparkPos: true, delta: null, deltaPos: true },
  ];

  // Activity feed — synthesised from recent bookings
  const activityItems = bookings.slice(0, 5).map(b => {
    const secs     = toSecs(b.createdAt);
    const custName = customerMap[b.customerId]?.name || 'Customer';
    const vehName  = vehicleMap[b.vehicleId]?.name  || 'Vehicle';
    const time     = secs ? timeAgo(secs) : '—';
    if (b.status === 'active' || b.status === 'confirmed')
      return { Icon: KeyRound,     title: `${vehName} handed over`,       sub: custName, time };
    if (b.status === 'completed')
      return { Icon: RotateCcw,    title: `${vehName} returned`,          sub: `${custName} · LKR ${(b.finalAmount || 0).toLocaleString()}`, time };
    if (b.status === 'cancelled')
      return { Icon: XCircle,      title: 'Booking cancelled',             sub: `${custName} · ${vehName}`, time };
    return   { Icon: CalendarDays, title: `New booking — ${vehName}`,     sub: custName, time };
  });

  const handleAddTask = async () => {
    if (!newTitle.trim()) return;
    const tagLabels: Record<string, string> = { urgent: 'Urgent', soon: 'Soon', low: 'Low' };
    try {
      const r = await createTask({ title: newTitle.trim(), tag: newTag, tagLabel: tagLabels[newTag] });
      setTasks(prev => [...prev, r.data]);
      setNewTitle('');
      setNewTag('soon');
      setAddingTask(false);
    } catch {
      toast.error('Failed to add task');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  );

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="page-head">
        <div>
          <h1 className="page-title">{greeting}, {firstName}</h1>
          <div className="page-sub">Here&apos;s your fleet at a glance.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost" style={{ fontSize: 13, height: 34, padding: '0 14px' }}>
            <CalendarDays size={13} strokeWidth={1.5} />{dateLabel}
          </button>
          <a href="/" target="_blank" className="btn btn-ghost" style={{ fontSize: 13, height: 34, padding: '0 14px' }}>
            <ExternalLink size={13} strokeWidth={1.5} /> View Site
          </a>
          <Link href="/admin/bookings" className="btn btn-primary" style={{ fontSize: 13, height: 34, padding: '0 14px' }}>
            <Plus size={14} strokeWidth={2} /> New Booking
          </Link>
        </div>
      </div>

      {/* ── KPI Grid ─────────────────────────────────────────────────────── */}
      <div className="kpi-grid">
        {STAT_CARDS.map(({ label, Icon, value, prefix, context, spark, sparkPos, delta, deltaPos }) => (
          <div key={label} className="kpi">
            <div className="kpi-head">
              <div className="kpi-ico"><Icon size={16} strokeWidth={1.5} /></div>
              <div className="kpi-label">{label}</div>
            </div>
            <div className="kpi-value mono">
              {prefix && <span className="unit">{prefix}</span>}
              {value}
              {label === 'Fleet Utilisation' && <span style={{ color: 'var(--text-muted)', fontSize: 18, marginLeft: 1 }}>%</span>}
            </div>
            <div className="kpi-foot">
              {delta ? (
                <span className={`delta ${deltaPos ? 'pos' : 'neg'}`}>
                  {deltaPos ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                  {delta}
                </span>
              ) : <span />}
              <span className="kpi-context">{context}</span>
            </div>
            <Sparkline data={spark} color={sparkPos ? '#22c55e' : '#ef4444'} />
          </div>
        ))}
      </div>

      {/* ── Row 2:1 — Revenue Trend + Weekly Bookings ────────────────────── */}
      <div className="row-2-1">

        {/* Revenue Trend */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-head">
            <div>
              <div className="card-title">Revenue Trend</div>
              <div className="card-sub">
                {revenue.length > 0 ? `Last ${revenue.length} month${revenue.length !== 1 ? 's' : ''} · vs target` : 'No data yet'}
              </div>
            </div>
            <div className="tabs">
              {(['7D', '3M', '6M', '12M'] as const).map(r => (
                <button key={r} className={`tab ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>{r}</button>
              ))}
            </div>
          </div>
          <div className="chart-stats">
            <div className="chart-stat-main mono"><span className="unit">LKR</span>{fmtM(total12m)}</div>
            {revTrend && (
              <span className={`delta ${revTrend.positive ? 'pos' : 'neg'}`}>
                {revTrend.positive ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                {revTrend.positive ? '+' : ''}{revTrend.pct}%
              </span>
            )}
            {revTrend && <span className="muted" style={{ fontSize: 12 }}>vs prior period</span>}
            <div className="chart-legend">
              <div className="legend-item"><span className="legend-dot" style={{ background: 'var(--gold)' }} /> Revenue</div>
              <div className="legend-item"><span className="legend-dot" style={{ background: 'var(--text-muted)', borderRadius: 0, height: 2, width: 12 }} /> Target</div>
            </div>
          </div>
          <div style={{ padding: '0 8px 16px' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={chartData} margin={{ top: 16, right: 16, bottom: 8, left: 44 }}>
                  <defs>
                    <linearGradient id="rvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="var(--gold)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--gold)" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 4" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey={range === '7D' ? 'period' : 'month'} tickFormatter={range === '7D' ? fmtDayTick : fmtMonthShort} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono)' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="rev" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono)' }} axisLine={false} tickLine={false} tickFormatter={(v) => v === 0 ? '0' : `${v / 1000}K`} />
                  <YAxis yAxisId="bk" orientation="right" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<RevTooltip isDaily={range === '7D'} />} />
                  <Area yAxisId="rev" type="natural" dataKey="totalRevenue" stroke="var(--gold)" strokeWidth={2} fill="url(#rvGrad)" dot={false} activeDot={{ r: 4, fill: 'var(--gold)' }} strokeLinecap="round" strokeLinejoin="round" />
                  <Line yAxisId="bk" type="natural" dataKey="totalBookings" stroke="#60a5fa" strokeWidth={1.75} dot={false} activeDot={{ r: 4, fill: '#60a5fa' }} strokeLinecap="round" strokeLinejoin="round" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><p>No revenue data yet</p></div>
            )}
          </div>
        </div>

        {/* Weekly Bookings */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-head">
            <div>
              <div className="card-title">Weekly Bookings</div>
              <div className="card-sub">Last 7 days</div>
            </div>
            <span className="delta pos"><ArrowUp size={11} />22%</span>
          </div>
          <div className="chart-stats" style={{ paddingBottom: 8 }}>
            <div className="chart-stat-main mono">{weeklyTotal}</div>
            <span className="muted" style={{ fontSize: 12 }}>bookings this week</span>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            <div className="bars">
              {weeklyBarData.map((d, idx) => {
                const isToday = idx === weeklyBarData.length - 1;
                return (
                  <div className="bar-col" key={d.day}>
                    <div
                      className={`bar ${isToday ? '' : 'muted'}`}
                      style={{ height: `${Math.max(4, (d.count / weeklyMax) * 150)}px` }}
                      title={`${d.day}: ${d.count}`}
                    />
                    <div className="bar-label">{d.day}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 1:1:1 — Fleet Table + Recent Bookings + Quick Tasks ─────── */}
      <div className="row-1-1-1">

        {/* Fleet Activity */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-head">
            <div>
              <div className="card-title">Fleet Activity</div>
              <div className="card-sub">Latest status across your vehicles</div>
            </div>
            <Link href="/admin/vehicles" className="link">View all <ChevronRight size={12} /></Link>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Status</th>
                <th>Customer</th>
                <th style={{ textAlign: 'right' }}>Daily rate</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.slice(0, 6).map(v => {
                const ab       = vehicleActiveBooking[v.id];
                const custName = ab ? (customerMap[ab.customerId]?.name || '—') : '—';
                const vStatus  = !v.isAvailable && ab ? 'on-rent' : v.isAvailable ? 'available' : 'service';
                return (
                  <tr key={v.id}>
                    <td>
                      <div className="vehicle-cell">
                        <div>
                          <div className="vehicle-name">{v.name}</div>
                        </div>
                        <span className="plate-tag mono">{v.plate}</span>
                      </div>
                    </td>
                    <td><StatusPill status={vStatus} /></td>
                    <td style={{ color: custName !== '—' ? 'var(--text-primary)' : 'var(--text-muted)' }}>{custName}</td>
                    <td style={{ textAlign: 'right' }} className="mono">
                      <span style={{ color: 'var(--text-muted)', fontSize: 11, marginRight: 3 }}>LKR</span>
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

        {/* Recent Bookings */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-head">
            <div>
              <div className="card-title">Recent Bookings</div>
              <div className="card-sub">Latest customer requests</div>
            </div>
            <Link href="/admin/bookings" className="link">View all <ChevronRight size={12} /></Link>
          </div>
          <div>
            {bookings.length > 0 ? bookings.slice(0, 5).map(b => {
              const custName = customerMap[b.customerId]?.name || 'Unknown';
              const vehName  = vehicleMap[b.vehicleId]?.name  || 'Vehicle';
              const initials = custName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || 'CU';
              const secs     = toSecs(b.createdAt);
              const statusColor =
                b.status === 'completed' || b.status === 'confirmed' ? 'var(--success)' :
                b.status === 'cancelled' ? 'var(--danger)' : 'var(--warning)';
              return (
                <div key={b.id} className="list-row">
                  <div className="cust-av">{initials}</div>
                  <div className="list-main">
                    <div className="list-title">{custName}</div>
                    <div className="list-sub">
                      <span>{vehName}</span>
                      <span style={{ color: 'var(--text-muted)' }}>·</span>
                      <span style={{ color: statusColor }}>
                        {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                      </span>
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
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-head">
            <div>
              <div className="card-title">Quick Tasks</div>
              <div className="card-sub">{tasks.filter(t => !t.done).length} pending</div>
            </div>
            <button className="link" onClick={() => setAddingTask(a => !a)}>
              Add task <Plus size={12} />
            </button>
          </div>
          <div>
            {tasks.map(t => (
              <div key={t.id} className={`task ${t.done ? 'done' : ''}`}>
                <div
                  className={`checkbox ${t.done ? 'checked' : ''}`}
                  onClick={async () => {
                    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, done: !x.done } : x));
                    try { await toggleTask(t.id); } catch { /* optimistic */ }
                  }}
                >
                  {t.done && <Check size={11} strokeWidth={2.5} />}
                </div>
                <div className="task-body">
                  <div className="task-title">{t.title}</div>
                  <div className="task-meta">
                    {t.tag && <span className={`tag ${t.tag}`}>{t.tagLabel}</span>}
                  </div>
                </div>
              </div>
            ))}
            {tasks.length === 0 && !addingTask && (
              <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No tasks yet
              </div>
            )}
          </div>
          {addingTask && (
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                autoFocus
                type="text"
                className="form-input"
                placeholder="Task title…"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') { setAddingTask(false); setNewTitle(''); setNewTag('soon'); } }}
                style={{ fontSize: '0.82rem', padding: '0.32rem 0.6rem' }}
              />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {(['urgent', 'soon', 'low'] as const).map(tg => (
                  <button
                    key={tg}
                    onClick={() => setNewTag(tg)}
                    style={{
                      padding: '0.2rem 0.6rem', borderRadius: 99, border: 'none', cursor: 'pointer',
                      fontSize: '0.7rem', fontWeight: 700,
                      background: newTag === tg ? 'var(--gold)' : 'var(--bg-hover)',
                      color: newTag === tg ? '#000' : 'var(--text-muted)',
                    }}
                  >
                    {tg.charAt(0).toUpperCase() + tg.slice(1)}
                  </button>
                ))}
                <div style={{ flex: 1 }} />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setAddingTask(false); setNewTitle(''); setNewTag('soon'); }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleAddTask}
                  disabled={!newTitle.trim()}
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 1:2 — Fleet Donut + Activity Feed ───────────────────────── */}
      <div className="row-1-2">

        <FleetDonut vehicles={vehicles} activeIds={activeIds} />

        {/* Activity Feed */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-head">
            <div>
              <div className="card-title">Activity</div>
              <div className="card-sub">Across your fleet operations</div>
            </div>
            <Link href="/admin/bookings" className="link">All activity <ChevronRight size={12} /></Link>
          </div>
          <div style={{ padding: '4px 0 12px' }}>
            {activityItems.length > 0 ? activityItems.map((a, i) => (
              <div key={i} className="activity-row">
                <div className="act-ico"><a.Icon size={13} strokeWidth={1.5} /></div>
                <div className="act-body">
                  <div><b>{a.title}</b></div>
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
