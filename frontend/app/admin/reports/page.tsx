'use client';
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  getReportFinancial, getReportCommissions, getReportBookings, getReportVehicles,
} from '@/lib/api';
import toast from 'react-hot-toast';

type Tab = 'financial' | 'commissions' | 'bookings' | 'vehicles';

const fmtMoney = (n: number) => `LKR ${(n || 0).toLocaleString()}`;
const fmtDate = (ts: string | null) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtMonth = (m: string) => {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '0.7rem 1rem', fontSize: '0.82rem', minWidth: 180 }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 24, color: p.color }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 600 }}>{fmtMoney(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('financial');
  const [loading, setLoading] = useState(false);

  const [financial, setFinancial] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = async (t: Tab) => {
    setLoading(true);
    try {
      if (t === 'financial' && !financial.length) {
        const r = await getReportFinancial();
        setFinancial(r.data);
      } else if (t === 'commissions' && !commissions.length) {
        const r = await getReportCommissions();
        setCommissions(r.data);
      } else if (t === 'bookings') {
        const r = await getReportBookings(dateFrom || dateTo ? { from: dateFrom || undefined, to: dateTo || undefined } : undefined);
        setBookings(r.data);
      } else if (t === 'vehicles' && !vehicles.length) {
        const r = await getReportVehicles();
        setVehicles(r.data);
      }
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(tab); }, [tab]);

  const handleBookingFilter = async () => {
    setLoading(true);
    try {
      const r = await getReportBookings({ from: dateFrom || undefined, to: dateTo || undefined });
      setBookings(r.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  // ── Financial summaries ──────────────────────────────────────────────────
  const totalOwned = financial.reduce((s, m) => s + m.ownedRevenue, 0);
  const totalCommission = financial.reduce((s, m) => s + m.commissionIncome, 0);
  const totalIncome = totalOwned + totalCommission;
  const totalBookings = financial.reduce((s, m) => s + m.totalBookings, 0);

  // Chart data — last 6 months ascending
  const chartData = [...financial].reverse().slice(-6).map(m => ({
    month: fmtMonth(m.month),
    'Owned Revenue': m.ownedRevenue,
    'Commission Income': m.commissionIncome,
  }));

  // ── Commission summaries ─────────────────────────────────────────────────
  const totalCommissionEarned = commissions.reduce((s, c) => s + (c.commissionAmount || 0), 0);
  const totalTripValue = commissions.reduce((s, c) => s + (c.tripPrice || 0), 0);
  const totalNetToOwner = commissions.reduce((s, c) => s + (c.netToOwner || 0), 0);

  // ── Booking summaries ────────────────────────────────────────────────────
  const totalAdminIncome = bookings.reduce((s, b) => s + (b.adminIncome || 0), 0);

  // ── Vehicle summaries ────────────────────────────────────────────────────
  const vehiclesSorted = [...vehicles].sort((a, b) => b.adminIncome - a.adminIncome);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'financial',   label: 'Financial Summary' },
    { key: 'commissions', label: 'Commission Report' },
    { key: 'bookings',    label: 'Booking History' },
    { key: 'vehicles',    label: 'Vehicle Utilization' },
  ];

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Header */}
      <div>
        <div className="gold-line" />
        <h1 className="page-title">Reports</h1>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      )}

      {/* ── Financial Summary ─────────────────────────────────────────────── */}
      {tab === 'financial' && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Total Admin Income', value: fmtMoney(totalIncome), sub: 'all time' },
              { label: 'Owned Vehicle Revenue', value: fmtMoney(totalOwned), sub: 'all time' },
              { label: 'Commission Income', value: fmtMoney(totalCommission), sub: '3rd party vehicles' },
              { label: 'Total Bookings', value: String(totalBookings), sub: 'completed' },
            ].map(k => (
              <div key={k.label} className="card kpi">
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</div>
                <div className="kpi-value">{k.value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '1rem' }}>Monthly Breakdown (last 6 months)</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barCategoryGap="30%" barGap={4}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.78rem' }} />
                  <Bar dataKey="Owned Revenue" fill="var(--gold)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Commission Income" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Month</th>
                  <th style={{ textAlign: 'right' }}>Owned Revenue</th>
                  <th style={{ textAlign: 'right' }}>Commission Income</th>
                  <th style={{ textAlign: 'right' }}>Total Admin Income</th>
                  <th style={{ textAlign: 'right' }}>Bookings</th>
                </tr>
              </thead>
              <tbody>
                {financial.map(m => (
                  <tr key={m.month}>
                    <td style={{ fontWeight: 600 }}>{fmtMonth(m.month)}</td>
                    <td style={{ textAlign: 'right' }}>{m.ownedRevenue > 0 ? fmtMoney(m.ownedRevenue) : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ textAlign: 'right', color: '#3b82f6' }}>{m.commissionIncome > 0 ? fmtMoney(m.commissionIncome) : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--gold)' }}>{fmtMoney(m.totalAdminIncome)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{m.totalBookings}</td>
                  </tr>
                ))}
                {financial.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No completed bookings yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Commission Report ──────────────────────────────────────────────── */}
      {tab === 'commissions' && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Commission Earned', value: fmtMoney(totalCommissionEarned), color: 'var(--gold)' },
              { label: 'Total Trip Value', value: fmtMoney(totalTripValue), color: 'var(--text-primary)' },
              { label: 'Paid to 3rd Party Owners', value: fmtMoney(totalNetToOwner), color: '#ef4444' },
              { label: 'Outsourced Bookings', value: String(commissions.length), color: 'var(--text-primary)' },
            ].map(k => (
              <div key={k.label} className="card kpi">
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</div>
                <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ overflow: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th style={{ textAlign: 'right' }}>KM</th>
                  <th style={{ textAlign: 'right' }}>Trip Price</th>
                  <th style={{ textAlign: 'right' }}>Commission</th>
                  <th style={{ textAlign: 'right' }}>Net to Owner</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map(c => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(c.endDate)}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{c.customerName}</div>
                      {c.customerPhone && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.customerPhone}</div>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{c.vehicleName}</div>
                      {c.vehiclePlate && <span className="plate-tag" style={{ fontSize: '0.72rem' }}>{c.vehiclePlate}</span>}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{(c.totalKm || 0).toLocaleString()} km</td>
                    <td style={{ textAlign: 'right' }}>{fmtMoney(c.tripPrice)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--gold)' }}>{fmtMoney(c.commissionAmount)}</td>
                    <td style={{ textAlign: 'right', color: '#ef4444' }}>{fmtMoney(c.netToOwner)}</td>
                  </tr>
                ))}
                {commissions.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No outsourced bookings completed yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Booking History ────────────────────────────────────────────────── */}
      {tab === 'bookings' && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Date filter */}
          <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">From</label>
              <input type="date" className="form-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 160 }} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">To</label>
              <input type="date" className="form-input" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 160 }} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleBookingFilter}>Apply</button>
            {(dateFrom || dateTo) && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setDateFrom(''); setDateTo(''); setTimeout(handleBookingFilter, 0); }}>Clear</button>
            )}
          </div>

          {/* Summary row */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="card" style={{ padding: '0.85rem 1.1rem', flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Bookings</div>
              <div className="kpi-value" style={{ fontSize: '1.5rem', marginTop: 4 }}>{bookings.length}</div>
            </div>
            <div className="card" style={{ padding: '0.85rem 1.1rem', flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Admin Income</div>
              <div className="kpi-value" style={{ fontSize: '1.5rem', marginTop: 4 }}>{fmtMoney(totalAdminIncome)}</div>
            </div>
            <div className="card" style={{ padding: '0.85rem 1.1rem', flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Outsourced</div>
              <div className="kpi-value" style={{ fontSize: '1.5rem', marginTop: 4 }}>{bookings.filter(b => b.isOutsourced).length}</div>
            </div>
          </div>

          <div className="card" style={{ overflow: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 750 }}>
              <thead>
                <tr>
                  <th>End Date</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>KM</th>
                  <th style={{ textAlign: 'right' }}>Trip Total</th>
                  <th style={{ textAlign: 'right' }}>Admin Income</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id}>
                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(b.endDate)}</td>
                    <td style={{ fontWeight: 600, fontSize: '0.88rem' }}>{b.customerName}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{b.vehicleName}</div>
                      {b.vehiclePlate && <span className="plate-tag" style={{ fontSize: '0.72rem' }}>{b.vehiclePlate}</span>}
                    </td>
                    <td>
                      <span className={`badge ${b.isOutsourced ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '0.7rem' }}>
                        {b.isOutsourced ? '3rd Party' : 'Own'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{(b.totalKm || 0).toLocaleString()} km</td>
                    <td style={{ textAlign: 'right' }}>{fmtMoney(b.finalAmount)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: b.isOutsourced ? '#3b82f6' : 'var(--gold)' }}>
                      {fmtMoney(b.adminIncome)}
                      {b.isOutsourced && <div style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>commission</div>}
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No bookings found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Vehicle Utilization ────────────────────────────────────────────── */}
      {tab === 'vehicles' && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ overflow: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Bookings</th>
                  <th style={{ textAlign: 'right' }}>Days Rented</th>
                  <th style={{ textAlign: 'right' }}>Total KM</th>
                  <th style={{ textAlign: 'right' }}>Admin Income</th>
                </tr>
              </thead>
              <tbody>
                {vehiclesSorted.map(v => (
                  <tr key={v.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{v.name}</div>
                      {v.plate && <span className="plate-tag" style={{ fontSize: '0.72rem' }}>{v.plate}</span>}
                    </td>
                    <td>
                      <span className={`badge ${v.isOutsourced ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '0.7rem' }}>
                        {v.isOutsourced ? '3rd Party' : 'Own'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{v.totalBookings}</td>
                    <td style={{ textAlign: 'right' }}>{v.daysRented} days</td>
                    <td style={{ textAlign: 'right' }}>{(v.totalKm || 0).toLocaleString()} km</td>
                    <td style={{ textAlign: 'right' }}>
                      {v.totalBookings > 0 ? (
                        <span style={{ fontWeight: 700, color: v.isOutsourced ? '#3b82f6' : 'var(--gold)' }}>
                          {fmtMoney(v.adminIncome)}
                          {v.isOutsourced && <div style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>commission only</div>}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {vehiclesSorted.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No vehicles found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
