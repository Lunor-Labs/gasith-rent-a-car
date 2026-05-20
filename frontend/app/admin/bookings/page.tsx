'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getBookings, getCustomers, getVehicles, createBooking, deleteBooking, getPricingConfig } from '@/lib/api';
import CustomerFormModal from '@/components/CustomerFormModal';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Plus, Trash2, CalendarDays, Route, CalendarCheck, CalendarPlus, Users, Car, Gauge, Banknote, NotebookPen } from 'lucide-react';

type Booking = { id: string; customerId: string; vehicleId: string; status: string; startDate: any; endDate: any; finalAmount: number; totalKm: number; isOutsourced: boolean; billingMode: string; notes: string; };
type Customer = { id: string; name: string; phone: string; };
type Vehicle = { id: string; name: string; plate: string; isAvailable: boolean; pricePerKm: number; pricePerDay: number; lastMeterReading: number; isOutsourced: boolean; commissionRate: number; };

const STATUS_COLORS: Record<string, string> = { active: 'badge-info', completed: 'badge-success', pending: 'badge-warning', cancelled: 'badge-danger' };
const FILTERS = ['all', 'active', 'pending', 'completed', 'cancelled'];

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [pricingConfig, setPricingConfig] = useState<{ firstDayFreeKm: number; subsequentDayFreeKm: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    vehicleId: '',
    startDate: '',
    endDate: '',
    startMeterReading: '',
    pricePerDay: '',
    pricePerKm: '',
    firstDayFreeKm: '',
    subsequentDayFreeKm: '',
    notes: '',
  });

  const load = () => {
    setLoading(true);
    Promise.all([getBookings(), getCustomers(), getVehicles(), getPricingConfig()])
      .then(([b, c, v, p]) => {
        setBookings(b.data);
        setCustomers(c.data);
        setVehicles(v.data);
        setPricingConfig(p.data);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const selectedVehicle = vehicles.find(v => v.id === form.vehicleId);

  const calcFreeKm = (start: string, end: string) => {
    if (!start || !end) return null;
    const days = Math.max(1, Math.ceil(
      (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1);
    const d1 = form.firstDayFreeKm ? Number(form.firstDayFreeKm) : (pricingConfig?.firstDayFreeKm ?? 150);
    const sub = form.subsequentDayFreeKm ? Number(form.subsequentDayFreeKm) : (pricingConfig?.subsequentDayFreeKm ?? 100);
    return d1 + (days - 1) * sub;
  };

  const previewFreeKm = calcFreeKm(form.startDate, form.endDate);

  const previewDays = (form.startDate && form.endDate)
    ? Math.max(1, Math.ceil(
        (new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1)
    : null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await createBooking({
        customerId: form.customerId,
        vehicleId: form.vehicleId,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        notes: form.notes,
        startMeterReading: form.startMeterReading !== '' ? Number(form.startMeterReading) : (selectedVehicle?.lastMeterReading || 0),
        pricePerKm: form.pricePerKm ? Number(form.pricePerKm) : selectedVehicle?.pricePerKm || 0,
        pricePerDay: form.pricePerDay ? Number(form.pricePerDay) : selectedVehicle?.pricePerDay || 0,
        firstDayFreeKm: form.firstDayFreeKm ? Number(form.firstDayFreeKm) : undefined,
        subsequentDayFreeKm: form.subsequentDayFreeKm ? Number(form.subsequentDayFreeKm) : undefined,
        freeKm: previewFreeKm ?? undefined,
        isOutsourced: selectedVehicle?.isOutsourced || false,
        commissionRate: selectedVehicle?.isOutsourced ? (selectedVehicle?.commissionRate || 10) : 0,
        billingMode: 'per_day',
      });
      toast.success('Booking created');
      setModalOpen(false);
      setCustomerModalOpen(false);
      setForm({ customerId: '', vehicleId: '', startDate: '', endDate: '', startMeterReading: '', pricePerDay: '', pricePerKm: '', firstDayFreeKm: '', subsequentDayFreeKm: '', notes: '' });
      load();
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to create booking'); }
    finally { setSubmitting(false); }
  };

  const handleCustomerSaved = async (id: string) => {
    const updated = await getCustomers();
    setCustomers(updated.data);
    setForm(f => ({ ...f, customerId: id }));
    setCustomerModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Cancel and delete this booking?')) return;
    try { await deleteBooking(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
  };

  const searchParams = useSearchParams();
  const q = searchParams.get('q')?.toLowerCase() || '';

  const cusName = (id: string) => customers.find(c => c.id === id)?.name || id.slice(0, 8);
  const vehName = (id: string) => { const v = vehicles.find(v => v.id === id); return v ? `${v.name} (${v.plate})` : id.slice(0, 8); };

  const filtered = bookings.filter(b => {
    const matchStatus = filter === 'all' || b.status === filter;
    const matchQ = !q || b.id.toLowerCase().includes(q) || cusName(b.customerId).toLowerCase().includes(q) || vehName(b.vehicleId).toLowerCase().includes(q);
    return matchStatus && matchQ;
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
        <div>
          <h1 className="page-title">Bookings</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {bookings.length} total · {bookings.filter(b => b.status === 'active').length} active
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Plus size={14} strokeWidth={2} /> New Booking
        </button>
      </div>

      {/* Status filters */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
            style={{ textTransform: 'capitalize' }}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <CalendarCheck size={40} strokeWidth={1} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.25 }} />
          <p>{q ? `No bookings matching "${q}"` : filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="table-wrap responsive-hide-mobile">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Customer</th><th>Vehicle</th><th>Status</th>
                  <th>Start</th><th>Amount</th><th>Type</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id}>
                    <td><code style={{ fontSize: '0.78rem', color: 'var(--gold)' }}>{b.id.slice(0, 8).toUpperCase()}</code></td>
                    <td style={{ fontWeight: 500 }}>
                      {cusName(b.customerId)}
                      {b.notes && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>{b.notes}</div>}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{vehName(b.vehicleId)}</td>
                    <td><span className={`badge ${STATUS_COLORS[b.status] || 'badge-muted'}`}>{b.status}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{fmtDate(b.startDate)}</td>
                    <td style={{ fontWeight: 600 }}>{b.finalAmount > 0 ? `LKR ${b.finalAmount.toLocaleString()}` : '—'}</td>
                    <td><span className={`badge ${b.isOutsourced ? 'badge-warning' : 'badge-muted'}`}>{b.isOutsourced ? 'Outsourced' : 'Direct'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <Link href={`/admin/bookings/${b.id}`} className="btn btn-primary btn-sm">Manage</Link>
                        {b.status !== 'completed' && (
                          <button onClick={() => handleDelete(b.id)} className="btn btn-danger btn-sm" style={{ padding: '0.35rem 0.6rem' }}>
                            <Trash2 size={13} strokeWidth={1.5} />
                          </button>
                        )}
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
                    {b.notes && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3, fontStyle: 'italic' }}>{b.notes}</div>}
                  </div>
                  <span className={`badge ${STATUS_COLORS[b.status] || 'badge-muted'}`}>{b.status}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.6rem', fontSize: '0.8rem' }}>
                  <code style={{ color: 'var(--gold)', fontSize: '0.72rem' }}>{b.id.slice(0, 8).toUpperCase()}</code>
                  <span style={{ color: 'var(--text-muted)' }}>{fmtDate(b.startDate)}</span>
                  {b.isOutsourced && <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Outsourced</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{b.finalAmount > 0 ? `LKR ${b.finalAmount.toLocaleString()}` : '—'}</span>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <Link href={`/admin/bookings/${b.id}`} className="btn btn-primary btn-sm">Manage</Link>
                    {b.status !== 'completed' && (
                      <button onClick={() => handleDelete(b.id)} className="btn btn-danger btn-sm" style={{ padding: '0.35rem 0.6rem' }}>
                        <Trash2 size={13} strokeWidth={1.5} />
                      </button>
                    )}
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
          <div className="modal modal-lg">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarPlus size={16} strokeWidth={1.5} style={{ color: '#3b82f6' }} />
                </div>
                <div>
                  <h2 className="modal-title" style={{ marginBottom: 0 }}>New Booking</h2>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>Set up a new rental booking</div>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

              {/* ── Section: Booking Details ── */}
              <div style={{ padding: '1.25rem 0 1rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.85rem' }}>
                  Booking Details
                </div>

                {/* Customer */}
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Users size={11} strokeWidth={2} style={{ color: 'var(--text-muted)' }} /> Customer *
                    </span>
                    <button type="button" onClick={() => setCustomerModalOpen(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <Plus size={11} strokeWidth={2.5} /> New
                    </button>
                  </label>
                  <select className="form-select" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} required>
                    <option value="">Select a customer...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
                  </select>
                </div>

                {/* Vehicle */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Car size={11} strokeWidth={2} style={{ color: 'var(--text-muted)' }} /> Vehicle *
                    {availableVehicles.length === 0 && (
                      <span style={{ marginLeft: '0.3rem', fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 400 }}>— none available</span>
                    )}
                  </label>
                  <select className="form-select" value={form.vehicleId} onChange={e => {
                    const v = vehicles.find(v => v.id === e.target.value);
                    setForm({ ...form, vehicleId: e.target.value, startMeterReading: String(v?.lastMeterReading ?? '') });
                  }} required>
                    <option value="">Select a vehicle...</option>
                    {availableVehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.plate}){v.isOutsourced ? ' — Outsourced' : ''}</option>
                    ))}
                  </select>
                </div>

                {/* Vehicle info preview */}
                {selectedVehicle && (
                  <div style={{ marginTop: '0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(212,168,83,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Car size={13} strokeWidth={1.5} style={{ color: 'var(--gold)' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedVehicle.name}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>{selectedVehicle.plate}</div>
                      </div>
                      {selectedVehicle.isOutsourced && (
                        <span className="badge badge-warning" style={{ fontSize: '0.62rem' }}>Outsourced</span>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${selectedVehicle.isOutsourced ? 4 : 3}, 1fr)`, fontSize: '0.78rem' }}>
                      {[
                        { Icon: Gauge,    label: 'Odometer',  value: `${selectedVehicle.lastMeterReading?.toLocaleString()} km`, highlight: true },
                        { Icon: Route,    label: 'Per km',    value: `LKR ${selectedVehicle.pricePerKm}`,   highlight: false },
                        { Icon: Banknote, label: 'Per day',   value: `LKR ${selectedVehicle.pricePerDay}`,  highlight: false },
                        ...(selectedVehicle.isOutsourced ? [{ Icon: Banknote, label: 'Commission', value: `${selectedVehicle.commissionRate}%`, highlight: false }] : []),
                      ].map(({ Icon, label, value, highlight }, i, arr) => (
                        <div key={label} style={{ padding: '0.6rem 0.85rem', borderRight: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '0.2rem' }}>
                            <Icon size={10} strokeWidth={2} /> {label}
                          </div>
                          <div style={{ fontWeight: 700, color: highlight ? 'var(--gold)' : 'var(--text-primary)', fontSize: '0.82rem' }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="divider" style={{ margin: 0 }} />

              {/* ── Section: Billing ── */}
              <div style={{ padding: '1rem 0 1.25rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.85rem' }}>
                  Billing
                </div>

                {/* Start + End date row */}
                <div className="grid-2" style={{ marginBottom: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CalendarDays size={11} strokeWidth={2} style={{ color: 'var(--text-muted)' }} /> Start Date *
                    </label>
                    <input type="date" className="form-input"
                      value={form.startDate}
                      onChange={e => setForm({ ...form, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CalendarDays size={11} strokeWidth={2} style={{ color: 'var(--text-muted)' }} /> End Date
                      <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.7rem' }}> (optional)</span>
                    </label>
                    <input type="date" className="form-input"
                      value={form.endDate}
                      min={form.startDate}
                      onChange={e => setForm({ ...form, endDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Start odometer */}
                {selectedVehicle && !selectedVehicle.isOutsourced && (
                  <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Gauge size={11} strokeWidth={2} style={{ color: 'var(--text-muted)' }} /> Start Odometer (km)
                    </label>
                    <input type="number" className="form-input" min={0}
                      value={form.startMeterReading}
                      onChange={e => setForm({ ...form, startMeterReading: e.target.value })}
                    />
                  </div>
                )}

                {/* Rate overrides */}
                <div className="grid-2" style={{ marginBottom: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Banknote size={11} strokeWidth={2} style={{ color: 'var(--text-muted)' }} /> Daily Rate (LKR)
                    </label>
                    <input type="number" className="form-input" min={0}
                      placeholder={`Default: ${selectedVehicle?.pricePerDay || 0}`}
                      value={form.pricePerDay}
                      onChange={e => setForm({ ...form, pricePerDay: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Route size={11} strokeWidth={2} style={{ color: 'var(--text-muted)' }} /> Rate per KM (LKR)
                    </label>
                    <input type="number" className="form-input" min={0}
                      placeholder={`Default: ${selectedVehicle?.pricePerKm || 0}`}
                      value={form.pricePerKm}
                      onChange={e => setForm({ ...form, pricePerKm: e.target.value })}
                    />
                  </div>
                </div>

                {/* Free KM rate overrides */}
                <div className="grid-2" style={{ marginBottom: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CalendarDays size={11} strokeWidth={2} style={{ color: 'var(--text-muted)' }} /> Day 1 Free KM
                    </label>
                    <input type="number" className="form-input" min={0}
                      placeholder={`Default: ${pricingConfig?.firstDayFreeKm ?? 150}`}
                      value={form.firstDayFreeKm}
                      onChange={e => setForm({ ...form, firstDayFreeKm: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CalendarDays size={11} strokeWidth={2} style={{ color: 'var(--text-muted)' }} /> Subsequent Days Free KM
                    </label>
                    <input type="number" className="form-input" min={0}
                      placeholder={`Default: ${pricingConfig?.subsequentDayFreeKm ?? 100}`}
                      value={form.subsequentDayFreeKm}
                      onChange={e => setForm({ ...form, subsequentDayFreeKm: e.target.value })}
                    />
                  </div>
                </div>

                {/* Preview pill */}
                {(previewDays != null || form.pricePerDay || form.firstDayFreeKm || form.subsequentDayFreeKm || form.pricePerKm) && (
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '0.65rem 0.85rem', marginBottom: '0.85rem', display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.78rem' }}>
                    {previewDays != null && (
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Duration: </span>
                        <span style={{ fontWeight: 700 }}>{previewDays} day{previewDays > 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {previewFreeKm != null && (
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Free KM: </span>
                        <span style={{ fontWeight: 700, color: (form.firstDayFreeKm || form.subsequentDayFreeKm) ? 'var(--gold)' : 'inherit' }}>
                          {previewFreeKm} km
                        </span>
                      </div>
                    )}
                    {form.pricePerKm && selectedVehicle && (
                      <div style={{ color: Number(form.pricePerKm) < selectedVehicle.pricePerKm ? '#22c55e' : 'var(--text-muted)' }}>
                        <span>KM rate: </span>
                        <span style={{ fontWeight: 700 }}>LKR {Number(form.pricePerKm)}/km</span>
                      </div>
                    )}
                    {form.pricePerDay && selectedVehicle && Number(form.pricePerDay) < selectedVehicle.pricePerDay && (
                      <div style={{ color: '#22c55e' }}>
                        <span>Rate saving: </span>
                        <span style={{ fontWeight: 700 }}>
                          LKR {((selectedVehicle.pricePerDay - Number(form.pricePerDay)) * (previewDays || 1)).toLocaleString()}
                          {previewDays ? '' : '/day'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <NotebookPen size={11} strokeWidth={2} style={{ color: 'var(--text-muted)' }} /> Notes
                  </label>
                  <textarea
                    className="form-textarea" rows={2}
                    value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="Any special instructions or notes..."
                    style={{ minHeight: 70, resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* ── Footer ── */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.25rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  {submitting ? <span className="spinner" /> : <><CalendarPlus size={14} strokeWidth={2} /> Create Booking</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CustomerFormModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSaved={handleCustomerSaved}
      />
    </div>
  );
}
