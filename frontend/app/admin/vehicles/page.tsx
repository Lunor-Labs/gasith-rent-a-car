'use client';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Star, Eye, EyeOff, Car, Camera } from 'lucide-react';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, flexShrink: 0,
        background: checked ? 'linear-gradient(135deg, var(--gold), var(--gold-dark, #b8862a))' : 'var(--bg-elevated)',
        border: '1px solid ' + (checked ? 'transparent' : 'var(--border)'),
        cursor: 'pointer', padding: 2, transition: 'background 0.2s, border 0.2s',
        display: 'flex', alignItems: 'center',
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        background: checked ? '#1a1a1a' : 'var(--text-muted)',
        transform: checked ? 'translateX(20px)' : 'translateX(0)',
        transition: 'transform 0.2s',
        flexShrink: 0,
      }} />
    </button>
  );
}

type Vehicle = {
  id: string; name: string; type: string; plate: string; imageUrl: string;
  pricePerKm: number; pricePerDay: number; isOutsourced: boolean;
  commissionRate: number; lastMeterReading: number; isAvailable: boolean; showOnLanding: boolean;
};

const EMPTY = { name: '', type: 'Sedan', plate: '', pricePerKm: 0, pricePerDay: 0, isOutsourced: false, commissionRate: 10, initialMeterReading: 0, isAvailable: true, showOnLanding: false };
const TYPES = ['Sedan', 'Hatchback', 'SUV', 'Van', 'Bus', 'Truck', 'Motorbike', 'Other'];


export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<any>({ ...EMPTY });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const searchParams = useSearchParams();
  const q = searchParams.get('q')?.toLowerCase() || '';

  const load = () => { setLoading(true); getVehicles().then(r => setVehicles(r.data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setImageFile(null); setModalOpen(true); };
  const openEdit = (v: Vehicle) => { setEditing(v); setForm({ ...v, initialMeterReading: v.lastMeterReading ?? 0 }); setImageFile(null); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      if (imageFile) fd.append('image', imageFile);
      editing ? await updateVehicle(editing.id, fd) : await createVehicle(fd);
      toast.success(editing ? 'Vehicle updated' : 'Vehicle added');
      closeModal(); load();
    } catch { toast.error('Failed to save'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vehicle?')) return;
    try { await deleteVehicle(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
  };

  const handleToggle = async (v: Vehicle, key: 'showOnLanding' | 'isAvailable') => {
    const fd = new FormData(); fd.append(key, String(!v[key]));
    try { await updateVehicle(v.id, fd); load(); } catch { toast.error('Update failed'); }
  };

  const filtered = q
    ? vehicles.filter(v => v.name.toLowerCase().includes(q) || v.plate.toLowerCase().includes(q) || v.type.toLowerCase().includes(q))
    : vehicles;

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Vehicles</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>{vehicles.length} in fleet</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Plus size={14} strokeWidth={2} /> Add Vehicle
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Car size={40} strokeWidth={1} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.25 }} />
          <p>{q ? `No vehicles matching "${q}"` : 'No vehicles yet'}</p>
        </div>
      ) : (
        <div className="grid-3" style={{ gap: '1rem' }}>
          {filtered.map(v => {
            const stats = [
              { label: 'per km',   value: `LKR ${v.pricePerKm?.toLocaleString()}` },
              { label: 'per day',  value: `LKR ${v.pricePerDay?.toLocaleString()}` },
              { label: 'odometer', value: `${v.lastMeterReading?.toLocaleString()} km`, gold: true },
              ...(v.isOutsourced ? [{ label: 'commission', value: `${v.commissionRate}%`, gold: false }] : []),
            ];
            return (
              <div key={v.id} className="vehicle-card">

                {/* ── Image / placeholder with overlay ── */}
                <div style={{ position: 'relative' }}>
                  {v.imageUrl
                    ? <img src={v.imageUrl} alt={v.name} className="vehicle-card-img" />
                    : <div className="vehicle-card-placeholder">
                        <Car size={56} strokeWidth={0.75} style={{ color: 'var(--gold)', opacity: 0.12 }} />
                      </div>
                  }
                  {/* gradient */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)', pointerEvents: 'none' }} />

                  {/* top-left: type + outsourced badges */}
                  <div style={{ position: 'absolute', top: '0.65rem', left: '0.65rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.18rem 0.5rem', borderRadius: 99, background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {v.type}
                    </span>
                    {v.isOutsourced && (
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.18rem 0.5rem', borderRadius: 99, background: 'rgba(245,158,11,0.75)', color: '#000', backdropFilter: 'blur(6px)' }}>
                        Outsourced
                      </span>
                    )}
                  </div>

                  {/* top-right: availability */}
                  <div style={{ position: 'absolute', top: '0.65rem', right: '0.65rem' }}>
                    <span className={`badge ${v.isAvailable ? 'badge-success' : 'badge-danger'}`}>
                      {v.isAvailable ? 'Available' : 'Rented'}
                    </span>
                  </div>

                  {/* bottom: name + plate */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.7rem 0.85rem 0.75rem', pointerEvents: 'none' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', lineHeight: 1.2, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{v.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(212,168,83,0.92)', marginTop: '0.2rem', fontWeight: 600, letterSpacing: '0.04em' }}>{v.plate}</div>
                  </div>
                </div>

                {/* ── Stats strip ── */}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, borderBottom: '1px solid var(--border-subtle)' }}>
                  {stats.map(({ label, value, gold }, i) => (
                    <div key={label} style={{ padding: '0.6rem 0.5rem', textAlign: 'center', borderRight: i < stats.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: gold ? 'var(--gold)' : 'var(--text-primary)', marginBottom: '0.15rem', whiteSpace: 'nowrap' }}>{value}</div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* ── Action bar ── */}
                <div style={{ padding: '0.55rem 0.65rem', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                  <button
                    onClick={() => handleToggle(v, 'showOnLanding')}
                    title={v.showOnLanding ? 'Hide from landing page' : 'Show on landing page'}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.55rem', borderRadius: 99, fontSize: '0.63rem', fontWeight: 700, border: 'none', cursor: 'pointer', background: v.showOnLanding ? 'rgba(212,168,83,0.15)' : 'var(--bg-elevated)', color: v.showOnLanding ? 'var(--gold)' : 'var(--text-muted)', transition: 'all 0.15s' }}
                  >
                    <Star size={10} strokeWidth={2} fill={v.showOnLanding ? 'currentColor' : 'none'} />
                    {v.showOnLanding ? 'Featured' : 'Hidden'}
                  </button>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => handleToggle(v, 'isAvailable')} className="btn btn-ghost btn-sm" title={v.isAvailable ? 'Mark as rented' : 'Mark as available'} style={{ padding: '0.32rem 0.55rem' }}>
                    {v.isAvailable ? <EyeOff size={13} strokeWidth={1.5} /> : <Eye size={13} strokeWidth={1.5} />}
                  </button>
                  <button onClick={() => openEdit(v)} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.28rem', padding: '0.32rem 0.65rem' }}>
                    <Pencil size={12} strokeWidth={1.5} /> Edit
                  </button>
                  <button onClick={() => handleDelete(v.id)} className="btn btn-danger btn-sm" style={{ padding: '0.32rem 0.55rem' }}>
                    <Trash2 size={13} strokeWidth={1.5} />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(212,168,83,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Car size={16} strokeWidth={1.5} style={{ color: 'var(--gold)' }} />
                </div>
                <div>
                  <h2 className="modal-title" style={{ marginBottom: 0 }}>{editing ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>
                    {editing ? `Editing ${editing.name}` : 'Fill in the details below'}
                  </div>
                </div>
              </div>
              <button onClick={closeModal} className="btn btn-ghost btn-sm">✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

              {/* ── Section: Vehicle Details ── */}
              <div style={{ padding: '1.25rem 0 1rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.85rem' }}>
                  Vehicle Details
                </div>
                <div className="grid-2" style={{ gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label">Name *</label>
                    <input className="form-input" placeholder="Toyota Aqua" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Plate Number *</label>
                    <input className="form-input" placeholder="WP-CAB-1234" value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Vehicle Type</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
                    {TYPES.map(t => (
                      <button
                        key={t} type="button"
                        onClick={() => setForm({ ...form, type: t })}
                        style={{
                          padding: '0.32rem 0.85rem', borderRadius: 99, fontSize: '0.79rem', fontWeight: 600,
                          border: '1px solid ' + (form.type === t ? 'var(--gold)' : 'var(--border-subtle)'),
                          background: form.type === t ? 'rgba(212,168,83,0.14)' : 'var(--bg-elevated)',
                          color: form.type === t ? 'var(--gold)' : 'var(--text-muted)',
                          cursor: 'pointer', transition: 'all 0.14s',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="divider" style={{ margin: 0 }} />

              {/* ── Section: Pricing & Odometer ── */}
              <div style={{ padding: '1rem 0' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.85rem' }}>
                  Pricing & Odometer
                </div>
                <div className="grid-3" style={{ gap: '0.75rem' }}>
                  {[
                    { label: 'Rate per km', key: 'pricePerKm', prefix: 'LKR', placeholder: '0' },
                    { label: 'Rate per day', key: 'pricePerDay', prefix: 'LKR', placeholder: '0' },
                    { label: 'Odometer', key: 'initialMeterReading', prefix: 'km', placeholder: '0' },
                  ].map(({ label, key, prefix, placeholder }) => (
                    <div key={key} className="form-group">
                      <label className="form-label">{label}</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{
                          position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                          fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', pointerEvents: 'none',
                        }}>
                          {prefix}
                        </span>
                        <input
                          type="number" className="form-input" placeholder={placeholder}
                          style={{ paddingLeft: key === 'initialMeterReading' ? '2.25rem' : '2.6rem' }}
                          value={form[key]}
                          onChange={e => setForm({ ...form, [key]: e.target.value })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="divider" style={{ margin: 0 }} />

              {/* ── Section: Settings ── */}
              <div style={{ padding: '1rem 0' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                  Settings
                </div>
                {([
                  { key: 'isAvailable',   label: 'Available for Booking', desc: 'Vehicle can be assigned to new bookings' },
                  { key: 'showOnLanding', label: 'Show on Website',        desc: 'Displayed to customers on the landing page' },
                  { key: 'isOutsourced',  label: 'Outsourced Vehicle',     desc: 'Third-party owned — commission rate applies' },
                ] as { key: string; label: string; desc: string }[]).map(({ key, label, desc }, i, arr) => (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.65rem 0',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{label}</div>
                      <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
                    </div>
                    <Toggle checked={Boolean(form[key])} onChange={v => setForm({ ...form, [key]: v })} />
                  </div>
                ))}
                {form.isOutsourced && (
                  <div className="form-group" style={{ marginTop: '0.85rem', maxWidth: 160 }}>
                    <label className="form-label">Commission Rate</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number" className="form-input"
                        value={form.commissionRate} min={0} max={100}
                        style={{ paddingRight: '2rem' }}
                        onChange={e => setForm({ ...form, commissionRate: e.target.value })}
                      />
                      <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', pointerEvents: 'none' }}>%</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="divider" style={{ margin: 0 }} />

              {/* ── Section: Photo ── */}
              <div style={{ padding: '1rem 0 1.25rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                  Vehicle Photo
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setImageFile(e.target.files?.[0] || null)} />
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: '2px dashed ' + (imageFile ? 'var(--gold)' : 'var(--border)'),
                    borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                    background: 'var(--bg-elevated)', minHeight: 150,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', transition: 'border-color 0.2s',
                  }}
                >
                  {imageFile ? (
                    <>
                      <img src={URL.createObjectURL(imageFile)} alt="Preview" style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.65))', padding: '1.5rem 0.85rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#fff' }}>
                        <Camera size={12} strokeWidth={1.5} />
                        {imageFile.name}
                      </div>
                    </>
                  ) : editing?.imageUrl ? (
                    <>
                      <img src={editing.imageUrl} alt={editing.name} style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.65))', padding: '1.5rem 0.85rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#fff' }}>
                        <Camera size={12} strokeWidth={1.5} />
                        Click to change photo
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                        <Camera size={22} strokeWidth={1} style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Upload vehicle photo</div>
                      <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>JPG, PNG or WEBP · click to browse</div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Footer ── */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.25rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button type="button" onClick={closeModal} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  {submitting ? <span className="spinner" /> : <><Car size={14} strokeWidth={2} />{editing ? 'Save Changes' : 'Add Vehicle'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
