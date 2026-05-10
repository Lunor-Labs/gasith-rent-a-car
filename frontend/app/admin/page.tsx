'use client';
import { useEffect, useState } from 'react';
import { getDashboardStats, getRevenueStats, getBookings, getVehicles } from '@/lib/api';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────
type Stats = { activeBookings: number; totalBookings: number; totalCustomers: number; totalVehicles: number; monthRevenue: number; };
type Revenue = { month: string; totalRevenue: number; totalBookings: number; };
type Booking = { id: string; customerId: string; vehicleId: string; status: string; finalAmount: number; createdAt: any; };
type Vehicle = { id: string; name: string; status: string; dailyRate: number; plate: string; };

// ─── Constants ────────────────────────────────────────────────────────────────
const STAT_CARDS = [
  { key: 'monthRevenue',   label: 'Revenue This Month', icon: '💰', color: '#F5C518', prefix: 'LKR ', fmt: (v: number) => v.toLocaleString(), trend: '+12%' },
  { key: 'activeBookings', label: 'Active Rentals',     icon: '🚗', color: '#3b82f6', prefix: '',     fmt: (v: number) => String(v),           trend: '+3'   },
  { key: 'totalCustomers', label: 'Total Customers',    icon: '👥', color: '#22c55e', prefix: '',     fmt: (v: number) => String(v),           trend: '+8%'  },
  { key: 'totalVehicles',  label: 'Fleet Size',         icon: '🏎️', color: '#a855f7', prefix: '',     fmt: (v: number) => String(v),           trend: 'Total' },
];

const STATUS_COLORS: Record<string, string> = {
  active: '#3b82f6', available: '#22c55e', completed: '#22c55e',
  pending: '#f59e0b', maintenance: '#ef4444', cancelled: '#ef4444',
};

const QUICK_TASKS = [
  { label: 'Review new booking requests',   done: false },
  { label: 'Update vehicle meter readings', done: true  },
  { label: 'Send pending invoices via WA',  done: false },
  { label: 'Check vehicle maintenance due', done: true  },
  { label: 'Verify customer documents',     done: false },
];

// ─── Tooltip ──────────────────────────────────────────────────────────────────
const RevenueTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.8rem' }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, color: 'var(--gold)' }}>LKR {payload[0]?.value?.toLocaleString()}</div>
      {payload[1] && <div style={{ color: 'var(--info)' }}>{payload[1]?.value} bookings</div>}
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
  const [tasks,    setTasks]    = useState(QUICK_TASKS);

  useEffect(() => {
    Promise.allSettled([
      getDashboardStats(), getRevenueStats(), getBookings({ limit: 8 }), getVehicles({ limit: 6 })
    ]).then(([s, r, b, v]) => {
      if (s.status === 'fulfilled') setStats(s.value.data);
      if (r.status === 'fulfilled') setRevenue([...r.value.data].reverse());
      if (b.status === 'fulfilled') setBookings(b.value.data);
      if (v.status === 'fulfilled') setVehicles(v.value.data);
    }).finally(() => setLoading(false));
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────
  const fleetPie = (() => {
    const groups: Record<string, number> = {};
    vehicles.forEach(v => { const s = v.status || 'available'; groups[s] = (groups[s] || 0) + 1; });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  })();

  const bookingPie = (() => {
    const groups: Record<string, number> = {};
    bookings.forEach(b => { groups[b.status] = (groups[b.status] || 0) + 1; });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  })();

  const weeklyData = revenue.slice(-7).map((r, i) => ({
    day: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i % 7],
    revenue: r.totalRevenue,
    bookings: r.totalBookings,
  }));

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { active: 'badge-info', completed: 'badge-success', pending: 'badge-warning', cancelled: 'badge-danger' };
    return <span className={`badge ${map[status] || 'badge-muted'}`}>{status}</span>;
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  );

  return (
    <div className="animate-fade">
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: '1.75rem' }}>
        <div>
          <div className="gold-line" />
          <h1 className="page-title">Dashboard</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Welcome back 👋 — here's your fleet at a glance
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a href="/admin/bookings/new" className="btn btn-primary btn-sm">+ New Booking</a>
          <a href="/" target="_blank" className="btn btn-secondary btn-sm">🌐 Site</a>
        </div>
      </div>

      {/* ── Row 1: Stat Cards ─────────────────────────────────────────── */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        {STAT_CARDS.map(card => {
          const val = stats ? (stats as any)[card.key] ?? 0 : 0;
          return (
            <div key={card.key} className="stat-card">
              <div className="stat-icon" style={{ background: `${card.color}18` }}>
                <span style={{ fontSize: '1.5rem' }}>{card.icon}</span>
              </div>
              <div className="stat-info">
                <div className="stat-label">{card.label}</div>
                <div className="stat-value" style={{ color: card.color }}>
                  {card.prefix}{card.fmt(val)}
                </div>
                <div className="stat-trend" style={{ color: 'var(--success)' }}>
                  <span>↗</span> {card.trend} this month
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Row 2: Area Revenue Chart + Weekly Bar Chart ──────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', marginBottom: '1.25rem' }} className="dashboard-row-2">
        {/* Total Revenue — area chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>This Month</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                LKR {(stats?.monthRevenue ?? 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--success)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                ✅ <span style={{ fontWeight: 600 }}>Total Revenue</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— last 12 months</span>
              </div>
            </div>
            <span className="badge badge-gold">📅 Monthly</span>
          </div>
          {revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenue} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#F5C518" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#F5C518" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<RevenueTooltip />} />
                <Area type="monotone" dataKey="totalRevenue" stroke="#F5C518" strokeWidth={2} fill="url(#goldGrad)" name="Revenue" />
                <Area type="monotone" dataKey="totalBookings" stroke="#3b82f6" strokeWidth={2} fill="url(#blueGrad)" name="Bookings" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><div className="empty-state-icon">📈</div><p>No revenue data yet</p></div>
          )}
        </div>

        {/* Weekly Revenue — bar chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Weekly Revenue</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Last 7 data points</div>
            </div>
            <span className="badge badge-info">📊 Bar</span>
          </div>
          {weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<RevenueTooltip />} />
                <Bar dataKey="revenue" fill="#F5C518" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Bar dataKey="bookings" fill="#3b82f630" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><div className="empty-state-icon">📊</div><p>No data</p></div>
          )}
        </div>
      </div>

      {/* ── Row 3: Fleet Status Pie + Booking Pie + Quick Tasks ───────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', marginBottom: '1.25rem' }} className="dashboard-row-3">

        {/* Fleet Status Pie */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Fleet Status</div>
            <span className="badge badge-muted">🏎️ {vehicles.length} vehicles</span>
          </div>
          {fleetPie.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={fleetPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {fleetPie.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] || '#9a9078'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                {fleetPie.map((entry, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[entry.name] || '#9a9078' }} />
                    <span style={{ textTransform: 'capitalize' }}>{entry.name}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state"><div className="empty-state-icon">🏎️</div><p>No vehicles</p></div>
          )}
        </div>

        {/* Booking Status Pie */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Booking Status</div>
            <span className="badge badge-muted">📋 {bookings.length} total</span>
          </div>
          {bookingPie.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={bookingPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {bookingPie.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] || '#9a9078'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                {bookingPie.map((entry, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[entry.name] || '#9a9078' }} />
                    <span style={{ textTransform: 'capitalize' }}>{entry.name}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state"><div className="empty-state-icon">📋</div><p>No bookings</p></div>
          )}
        </div>

        {/* Quick Tasks */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(245,197,24,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Quick Tasks</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
            {tasks.map((task, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => setTasks(t => t.map((x, j) => j === i ? { ...x, done: !x.done } : x))}
                  style={{ width: 16, height: 16, accentColor: 'var(--gold)', flexShrink: 0 }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: task.done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.done ? 'line-through' : 'none', transition: 'all 0.15s' }}>
                  {task.label}
                </span>
              </label>
            ))}
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            {tasks.filter(t => t.done).length}/{tasks.length} completed
          </div>
        </div>
      </div>

      {/* ── Row 4: Vehicle Cards + Recent Bookings ────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', marginBottom: '1.25rem' }} className="dashboard-row-4">

        {/* Available Vehicles */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Fleet Overview</div>
            <a href="/admin/vehicles" className="btn btn-ghost btn-sm">Manage →</a>
          </div>
          {vehicles.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🚗</div><p>No vehicles</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {vehicles.map(v => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.6rem 0.75rem', background: 'var(--bg-elevated)', borderRadius: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${STATUS_COLORS[v.status] || '#9a9078'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>🚗</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name || 'Vehicle'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gold)' }}>{v.plate}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>LKR {(v.dailyRate || 0).toLocaleString()}/d</div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: STATUS_COLORS[v.status] || 'var(--text-muted)', textTransform: 'capitalize' }}>{v.status || 'available'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Bookings Table */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Recent Bookings</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Showing last {bookings.length} entries</div>
            </div>
            <a href="/admin/bookings" className="btn btn-ghost btn-sm">View All →</a>
          </div>
          {bookings.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📋</div><p>No bookings yet</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id}>
                      <td><code style={{ fontSize: '0.78rem', color: 'var(--gold)', background: 'rgba(245,197,24,0.08)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>{b.id.slice(0, 8).toUpperCase()}</code></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{b.vehicleId?.slice(0, 8) || '—'}</td>
                      <td>{statusBadge(b.status)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>LKR {(b.finalAmount || 0).toLocaleString()}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {b.createdAt?._seconds ? new Date(b.createdAt._seconds * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                      </td>
                      <td><a href={`/admin/bookings/${b.id}`} className="btn btn-ghost btn-sm">View</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
