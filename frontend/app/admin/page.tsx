'use client';
import { useEffect, useState } from 'react';
import { getDashboardStats, getRevenueStats, getBookings, getVehicles } from '@/lib/api';
import {
  ComposedChart, BarChart, Bar, Line, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import {
  TrendingUp, Car, Users, Gauge, Plus, ExternalLink,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Stats    = { activeBookings: number; totalBookings: number; totalCustomers: number; totalVehicles: number; monthRevenue: number; };
type Revenue  = { month: string; totalRevenue: number; totalBookings: number; };
type Booking  = { id: string; customerId: string; vehicleId: string; status: string; finalAmount: number; createdAt: any; };
type Vehicle  = { id: string; name: string; status: string; dailyRate: number; plate: string; };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  active: '#3b82f6', available: '#22c55e', completed: '#22c55e',
  pending: '#f59e0b', maintenance: '#ef4444', cancelled: '#ef4444', confirmed: '#22c55e',
};

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

// ─── Mini sparkline SVG ────────────────────────────────────────────────────────
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

// ─── Status pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLOR[status] || '#9a9078';
  return (
    <span style={{ display: 'inline-block', padding: '0.18rem 0.55rem', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700, textTransform: 'capitalize', background: `${c}20`, color: c }}>
      {status}
    </span>
  );
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats,    setStats]    = useState<Stats | null>(null);
  const [revenue,  setRevenue]  = useState<Revenue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [range,    setRange]    = useState<'7d' | '30d' | '12m'>('12m');

  useEffect(() => {
    Promise.allSettled([
      getDashboardStats(), getRevenueStats(), getBookings({ limit: 5 }), getVehicles({ limit: 6 }),
    ]).then(([s, r, b, v]) => {
      setStats(s.status === 'fulfilled' ? s.value.data : { activeBookings: 0, totalBookings: 0, totalCustomers: 0, totalVehicles: 0, monthRevenue: 0 });
      setRevenue(r.status === 'fulfilled' ? [...r.value.data].reverse() : []);
      setBookings(b.status === 'fulfilled' ? b.value.data : []);
      setVehicles(v.status === 'fulfilled' ? v.value.data : []);
    }).finally(() => setLoading(false));
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const chartData = (range === '7d' ? revenue.slice(-3) : range === '30d' ? revenue.slice(-6) : revenue)
    .map(r => ({ ...r, target: Math.round(r.totalRevenue * 1.05) }));

  const total12m      = revenue.reduce((s, r) => s + r.totalRevenue, 0);
  const revSparkData  = revenue.slice(-7).map(r => r.totalRevenue);
  const bkSparkData   = revenue.slice(-7).map(r => r.totalBookings);
  const utilPct       = Math.min(100, Math.round(((stats?.activeBookings ?? 0) / Math.max(1, stats?.totalVehicles ?? 1)) * 100));

  // Monthly bookings bar chart (real revenue data)
  const monthlyBarData = revenue.slice(-7).map(r => ({
    month: r.month?.slice(5) || '',
    bookings: r.totalBookings || 0,
  }));
  const monthlyTotal = monthlyBarData.reduce((s, d) => s + d.bookings, 0);

  // Revenue trend (compare last 2 months if available)
  const revTrend = revenue.length >= 2 ? (() => {
    const curr = revenue[revenue.length - 1]?.totalRevenue || 0;
    const prev = revenue[revenue.length - 2]?.totalRevenue || 0;
    if (prev === 0) return null;
    const pct = ((curr - prev) / prev * 100).toFixed(1);
    return { pct, positive: curr >= prev };
  })() : null;

  const STAT_CARDS = [
    {
      label: 'Revenue (MTD)', Icon: TrendingUp, iconColor: '#3b82f6',
      value: fmtM(stats?.monthRevenue ?? 0), prefix: 'LKR',
      sub: `${stats?.totalBookings ?? 0} total bookings`,
      spark: revSparkData, sparkColor: '#3b82f6',
    },
    {
      label: 'Active Rentals', Icon: Car, iconColor: '#22c55e',
      value: String(stats?.activeBookings ?? 0), prefix: null,
      sub: `of ${stats?.totalVehicles ?? 0} vehicles`,
      spark: bkSparkData, sparkColor: '#22c55e',
    },
    {
      label: 'Total Customers', Icon: Users, iconColor: '#a855f7',
      value: String(stats?.totalCustomers ?? 0), prefix: null,
      sub: 'registered customers',
      spark: revSparkData, sparkColor: '#a855f7',
    },
    {
      label: 'Fleet Utilisation', Icon: Gauge, iconColor: '#ef4444',
      value: `${utilPct}%`, prefix: null,
      sub: `${stats?.activeBookings ?? 0} of ${stats?.totalVehicles ?? 0} vehicles`,
      spark: bkSparkData, sparkColor: '#ef4444',
    },
  ];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  );

  return (
    <div className="animate-fade">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: '1.75rem' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Here&apos;s your fleet at a glance.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <a href="/" target="_blank" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ExternalLink size={13} strokeWidth={1.5} /> View Site
          </a>
          <a href="/admin/bookings" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Plus size={14} strokeWidth={2} /> New Booking
          </a>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        {STAT_CARDS.map(({ label, Icon, iconColor, value, prefix, sub, spark, sparkColor }, i) => (
          <div key={i} className="stat-card" style={{ flexDirection: 'column', gap: 0, padding: '1.2rem 1.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${iconColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={15} strokeWidth={1.5} color={iconColor} />
                </div>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
              </div>
              <Sparkline data={spark} color={sparkColor} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.15rem', marginBottom: '0.3rem' }}>
              {prefix && <span className="currency-prefix">{prefix}</span>}
              <span className="num" style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</span>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{sub}</span>
          </div>
        ))}
      </div>

      {/* ── Row 2: Revenue Trend + Monthly Bookings ──────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', marginBottom: '1.25rem' }} className="dashboard-row-2">

        {/* Revenue Trend */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Revenue Trend</div>
              <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {revenue.length > 0 ? `Last ${revenue.length} months` : 'No data yet'}
              </div>
            </div>
            <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 8, padding: '0.18rem' }}>
              {(['7d', '30d', '12m'] as const).map(r => (
                <button key={r} onClick={() => setRange(r)} style={{
                  padding: '0.2rem 0.58rem', fontSize: '0.7rem', fontWeight: 600,
                  border: 'none', cursor: 'pointer', borderRadius: 6,
                  background: range === r ? 'var(--gold)' : 'transparent',
                  color: range === r ? '#000' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}>{r}</button>
              ))}
            </div>
          </div>

          {/* Hero number */}
          <div style={{ marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.15rem' }}>
              <span className="currency-prefix" style={{ fontSize: '0.9rem' }}>LKR</span>
              <span className="num" style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, color: 'var(--text-primary)' }}>
                {fmtM(total12m)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
              {revTrend && (
                <span style={{
                  fontSize: '0.71rem', fontWeight: 700,
                  color: revTrend.positive ? '#22c55e' : '#ef4444',
                  background: revTrend.positive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                  padding: '0.16rem 0.5rem', borderRadius: 99,
                }}>
                  {revTrend.positive ? '↑' : '↓'} {revTrend.positive ? '+' : ''}{revTrend.pct}%
                </span>
              )}
              {revTrend && <span style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>vs prior month</span>}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', fontSize: '0.68rem', color: 'var(--text-muted)', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 14, height: 2, background: 'var(--gold)', display: 'inline-block', borderRadius: 1 }} /> Revenue
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 14, height: 0, borderTop: '2px dashed rgba(212,168,83,0.4)', display: 'inline-block' }} /> Target
                </span>
              </div>
            </div>
          </div>

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
            <div className="empty-state"><div className="empty-state-icon" style={{ fontSize: '2rem', opacity: 0.3 }}>↗</div><p>No revenue data yet</p></div>
          )}
        </div>

        {/* Monthly Bookings */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Monthly Bookings</div>
          </div>
          <div style={{ marginBottom: '0.85rem' }}>
            <span className="num" style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, color: 'var(--text-primary)', display: 'block' }}>{monthlyTotal}</span>
            <span style={{ fontSize: '0.71rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>bookings in recent months</span>
          </div>
          {monthlyBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyBarData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v: any) => [v, 'Bookings']} contentStyle={{ background: '#1c1b1b', border: '1px solid #4e4633', borderRadius: 10, fontSize: '0.76rem' }} />
                <Bar dataKey="bookings" radius={[5, 5, 0, 0]} maxBarSize={30}>
                  {monthlyBarData.map((_, idx) => (
                    <Cell key={idx} fill={idx === monthlyBarData.length - 1 ? 'var(--gold)' : 'var(--bg-elevated)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><div style={{ fontSize: '2rem', opacity: 0.3 }}>▦</div><p>No data</p></div>
          )}
        </div>
      </div>

      {/* ── Row 3: Fleet Activity + Recent Bookings ────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }} className="dashboard-row-3">

        {/* Fleet Activity */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Fleet Activity</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Latest status across your vehicles</div>
            </div>
            <a href="/admin/vehicles" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none' }}>View all →</a>
          </div>
          <div className="fleet-grid-header" style={{ display: 'grid', gridTemplateColumns: '1fr 80px 88px 72px', gap: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>
            <span>Vehicle</span><span>Status</span><span className="fleet-col-rate">Rate / day</span><span className="fleet-col-plate">Plate</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {vehicles.length > 0 ? vehicles.map(v => (
              <div key={v.id} className="fleet-grid-row" style={{ display: 'grid', gridTemplateColumns: '1fr 80px 88px 72px', gap: '0.5rem', alignItems: 'center', padding: '0.5rem 0.5rem', background: 'var(--bg-elevated)', borderRadius: 9 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: `${STATUS_COLOR[v.status] || '#9a9078'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Car size={13} strokeWidth={1.5} color={STATUS_COLOR[v.status] || '#9a9078'} />
                  </div>
                  <span style={{ fontSize: '0.81rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</span>
                </div>
                <StatusPill status={v.status || 'available'} />
                <span className="num fleet-col-rate" style={{ fontSize: '0.77rem', fontWeight: 700, color: 'var(--gold)' }}>
                  LKR {(v.dailyRate || 0).toLocaleString()}
                </span>
                <span className="fleet-col-plate" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace', letterSpacing: 0 }}>{v.plate}</span>
              </div>
            )) : (
              <div className="empty-state" style={{ padding: '2rem' }}><p>No vehicles yet</p></div>
            )}
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Recent Bookings</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Latest customer requests</div>
            </div>
            <a href="/admin/bookings" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none' }}>View all →</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {bookings.length > 0 ? bookings.slice(0, 5).map(b => {
              const c = STATUS_COLOR[b.status] || '#9a9078';
              const initials = (b.customerId || 'CU').slice(0, 2).toUpperCase();
              const ago = b.createdAt?._seconds ? timeAgo(b.createdAt._seconds) : (b.createdAt ? timeAgo(new Date(b.createdAt).getTime() / 1000) : '—');
              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.6rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: `${c}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: c, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.customerId || 'Customer'}
                    </div>
                    <div style={{ fontSize: '0.69rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {b.vehicleId || 'Vehicle'} · <StatusPill status={b.status} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="num" style={{ fontSize: '0.81rem', fontWeight: 700, color: 'var(--gold)' }}>
                      LKR {(b.finalAmount || 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: 2 }}>{ago}</div>
                  </div>
                </div>
              );
            }) : (
              <div className="empty-state" style={{ padding: '2rem' }}><p>No bookings yet</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
