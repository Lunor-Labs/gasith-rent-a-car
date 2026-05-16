'use client';
import { useEffect, useState } from 'react';
import { getBookings, getCustomers, getVehicles, createBooking, deleteBooking } from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';

type Booking = { id: string; customerId: string; vehicleId: string; status: string; startDate: any; endDate: any; finalAmount: number; totalKm: number; isOutsourced: boolean; billingMode: string; };
type Customer = { id: string; name: string; phone: string; };
type Vehicle = { id: string; name: string; plate: string; isAvailable: boolean; pricePerKm: number; pricePerDay: number; lastMeterReading: number; isOutsourced: boolean; commissionRate: number; };

const STATUS_COLORS: Record<string, string> = { active: 'badge-info', completed: 'badge-success', pending: 'badge-warning', cancelled: 'badge-danger' };

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ customerId: '', vehicleId: '', startDate: '', notes: '', billingMode: 'per_km' as 'per_km' | 'per_day' });

  const load = () => {
    setLoading(true);
    Promise.all([getBookings(), getCustomers(), getVehicles()])
      .then(([b, c, v]) => { setBookings(b.data); setCustomers(c.data); setVehicles(v.data); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const selectedVehicle = vehicles.find(v => v.id === form.vehicleId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await createBooking({
        ...form,
        startMeterReading: selectedVehicle?.lastMeterReading || 0,
        pricePerKm: selectedVehicle?.pricePerKm || 0,
        pricePerDay: selectedVehicle?.pricePerDay || 0,
        isOutsourced: selectedVehicle?.isOutsourced || false,
        commissionRate: selectedVehicle?.isOutsourced ? (selectedVehicle?.commissionRate || 10) : 0,
        billingMode: form.billingMode,
      });
      toast.success('Booking created'); setModalOpen(false); setForm({ customerId: '', vehicleId: '', startDate: '', notes: '', billingMode: 'per_km' }); load();
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to create booking'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Cancel and delete this booking?')) return;
    try { await deleteBooking(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
  };

  const cusName = (id: string) => customers.find(c => c.id === id)?.name || id.slice(0, 8);
  const vehName = (id: string) => { const v = vehicles.find(v => v.id === id); return v ? `${v.name} (${v.plate})` : id.slice(0, 8); };

  const filtered = bookings.filter(b => {
    const matchStatus = filter === 'all' || b.status === filter;
    const matchSearch = !search || cusName(b.customerId).toLowerCase().includes(search.toLowerCase()) || vehName(b.vehicleId).toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const availableVehicles = vehicles.filter(v => v.isAvailable);

  const fmtDate = (d: any) => {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d?._seconds ? new Date(d._seconds * 1000) : null;
    return date ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div><div className="gold-line" /><h1 className="page-title">Bookings</h1><p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{bookings.length} total • {bookings.filter(b => b.status === 'active').length} active</p></div>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary">+ New Booking</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {['all', 'active', 'completed', 'pending', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`} style={{ textTransform: 'capitalize' }}>{s}</button>
        ))}
        <input className="form-input" placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 220, marginLeft: 'auto' }} />
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ width: 36, height: 36, margin: '0 auto' }} /></div>
        : filtered.length === 0 ? <div className="empty-state"><div className="empty-state-icon">📋</div><p>No bookings found</p></div>
        : (
          <>
            {/* Desktop Table */}
            <div className="table-wrap responsive-hide-mobile">
              <table>
                <thead><tr><th>ID</th><th>Customer</th><th>Vehicle</th><th>Status</th><th>Start</th><th>Mode</th><th>Amount</th><th>Type</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map(b => (
                    <tr key={b.id}>
                      <td><code style={{ fontSize: '0.78rem', color: 'var(--gold)' }}>{b.id.slice(0, 8).toUpperCase()}</code></td>
                      <td style={{ fontWeight: 500 }}>{cusName(b.customerId)}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{vehName(b.vehicleId)}</td>
                      <td><span className={`badge ${STATUS_COLORS[b.status] || 'badge-muted'}`}>{b.status}</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{fmtDate(b.startDate)}</td>
                      <td><span className={`badge ${b.billingMode === 'per_day' ? 'badge-gold' : 'badge-muted'}`}>{b.billingMode === 'per_day' ? 'Per Day' : 'Per KM'}</span></td>
                      <td style={{ fontWeight: 600 }}>{b.finalAmount > 0 ? `LKR ${b.finalAmount.toLocaleString()}` : '—'}</td>
                      <td><span className={`badge ${b.isOutsourced ? 'badge-warning' : 'badge-muted'}`}>{b.isOutsourced ? 'Outsourced' : 'Direct'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <Link href={`/admin/bookings/${b.id}`} className="btn btn-primary btn-sm">Manage</Link>
                          {b.status !== 'completed' && <button onClick={() => handleDelete(b.id)} className="btn btn-danger btn-sm">🗑</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="responsive-show-mobile" style={{ display: 'none', flexDirection: 'column', gap: '0.75rem' }}>
              {filtered.map(b => (
                <div key={b.id} className="card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{cusName(b.customerId)}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{vehName(b.vehicleId)}</div>
                    </div>
                    <span className={`badge ${STATUS_COLORS[b.status] || 'badge-muted'}`}>{b.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.6rem', fontSize: '0.8rem' }}>
                    <code style={{ color: 'var(--gold)', fontSize: '0.72rem' }}>{b.id.slice(0, 8).toUpperCase()}</code>
                    <span style={{ color: 'var(--text-muted)' }}>{fmtDate(b.startDate)}</span>
                    <span className={`badge ${b.billingMode === 'per_day' ? 'badge-gold' : 'badge-muted'}`} style={{ fontSize: '0.65rem' }}>{b.billingMode === 'per_day' ? 'Per Day' : 'Per KM'}</span>
                    {b.isOutsourced && <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Outsourced</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{b.finalAmount > 0 ? `LKR ${b.finalAmount.toLocaleString()}` : '—'}</span>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <Link href={`/admin/bookings/${b.id}`} className="btn btn-primary btn-sm">Manage</Link>
                      {b.status !== 'completed' && <button onClick={() => handleDelete(b.id)} className="btn btn-danger btn-sm">🗑</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      {/* New Booking Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">New Booking</h2>
              <button onClick={() => setModalOpen(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Customer *</label>
                <select className="form-select" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} required>
                  <option value="">Select customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Vehicle * {availableVehicles.length === 0 && <span style={{ color: 'var(--danger)' }}>(none available)</span>}</label>
                <select className="form-select" value={form.vehicleId} onChange={e => setForm({ ...form, vehicleId: e.target.value })} required>
                  <option value="">Select vehicle...</option>
                  {availableVehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.plate}){v.isOutsourced ? ' — Outsourced' : ''}</option>)}
                </select>
              </div>
              {selectedVehicle && (
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '0.75rem', fontSize: '0.82rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Start Reading</span>
                    <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{selectedVehicle.lastMeterReading?.toLocaleString()} km</span>
                    <span style={{ color: 'var(--text-muted)' }}>Rate/km</span><span style={{ fontWeight: 600 }}>LKR {selectedVehicle.pricePerKm}</span>
                    <span style={{ color: 'var(--text-muted)' }}>Rate/day</span><span style={{ fontWeight: 600 }}>LKR {selectedVehicle.pricePerDay}</span>
                    {selectedVehicle.isOutsourced && <><span style={{ color: 'var(--text-muted)' }}>Commission</span><span style={{ fontWeight: 600 }}>{selectedVehicle.commissionRate}%</span></>}
                  </div>
                </div>
              )}
              {/* Billing Mode Toggle */}
              <div className="form-group">
                <label className="form-label">Billing Mode *</label>
                <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 8, padding: '0.2rem', border: '1px solid var(--border-subtle)' }}>
                  {[
                    { value: 'per_km' as const, label: '📏 Per KM', desc: 'Charge by distance' },
                    { value: 'per_day' as const, label: '📅 Per Day', desc: 'Charge by duration' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, billingMode: opt.value })}
                      style={{
                        flex: 1, padding: '0.6rem 0.75rem', fontSize: '0.82rem', fontWeight: 600,
                        border: 'none', cursor: 'pointer', borderRadius: 6,
                        background: form.billingMode === opt.value ? 'linear-gradient(135deg, var(--gold), var(--gold-dark))' : 'transparent',
                        color: form.billingMode === opt.value ? '#000' : 'var(--text-muted)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div>{opt.label}</div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 400, marginTop: 2, opacity: 0.8 }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input type="date" className="form-input" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." style={{ minHeight: 60 }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? <span className="spinner" /> : 'Create Booking'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
