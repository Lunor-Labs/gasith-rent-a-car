'use client';
import { useEffect, useState, useRef } from 'react';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from '@/lib/api';
import toast from 'react-hot-toast';

type Vehicle = {
  id: string; name: string; type: string; plate: string; imageUrl: string;
  pricePerKm: number; pricePerDay: number; isOutsourced: boolean;
  commissionRate: number; lastMeterReading: number; isAvailable: boolean; showOnLanding: boolean;
};

const EMPTY = { name: '', type: 'Sedan', plate: '', pricePerKm: 0, pricePerDay: 0, isOutsourced: false, commissionRate: 10, lastMeterReading: 0, isAvailable: true, showOnLanding: false };
const TYPES = ['Sedan', 'SUV', 'Van', 'Bus', 'Truck', 'Motorbike', 'Other'];

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<any>({ ...EMPTY });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => { setLoading(true); getVehicles().then(r => setVehicles(r.data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setImageFile(null); setModalOpen(true); };
  const openEdit = (v: Vehicle) => { setEditing(v); setForm({ ...v }); setImageFile(null); setModalOpen(true); };
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

  const filtered = vehicles.filter(v => v.name?.toLowerCase().includes(search.toLowerCase()) || v.plate?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div><div className="gold-line" /><h1 className="page-title">Vehicles</h1><p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{vehicles.length} in fleet</p></div>
        <button onClick={openCreate} className="btn btn-primary">+ Add Vehicle</button>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <input className="form-input" placeholder="🔍  Search name or plate..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 360 }} />
      </div>
      {loading ? <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ width: 36, height: 36, margin: '0 auto' }} /></div>
        : filtered.length === 0 ? <div className="empty-state"><div className="empty-state-icon">🚗</div><p>No vehicles found</p></div>
        : (
          <div className="grid-3" style={{ gap: '1rem' }}>
            {filtered.map(v => (
              <div key={v.id} className="vehicle-card">
                {v.imageUrl ? <img src={v.imageUrl} alt={v.name} className="vehicle-card-img" />
                  : <div className="vehicle-card-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', background: 'var(--bg-elevated)' }}>🚗</div>}
                <div className="vehicle-card-body">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div><div className="vehicle-card-name">{v.name}</div><div className="vehicle-card-plate">{v.plate}</div></div>
                    <span className={`badge ${v.isAvailable ? 'badge-success' : 'badge-danger'}`}>{v.isAvailable ? 'Available' : 'Rented'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                    {[['Rate/km', `LKR ${v.pricePerKm?.toLocaleString()}`], ['Rate/day', `LKR ${v.pricePerDay?.toLocaleString()}`], ['Meter', `${v.lastMeterReading?.toLocaleString()} km`]].map(([l, val]) => (
                      <><span key={l} style={{ color: 'var(--text-muted)' }}>{l}</span><span style={{ fontWeight: 600 }}>{val}</span></>
                    ))}
                    {v.isOutsourced && <><span style={{ color: 'var(--text-muted)' }}>Commission</span><span style={{ fontWeight: 600 }}>{v.commissionRate}%</span></>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    {v.isOutsourced && <span className="badge badge-warning">Outsourced</span>}
                    <button onClick={() => handleToggle(v, 'showOnLanding')} className={`badge ${v.showOnLanding ? 'badge-gold' : 'badge-muted'}`} style={{ cursor: 'pointer', border: 'none' }}>
                      {v.showOnLanding ? '⭐ On Landing' : '☆ Hidden'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => openEdit(v)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>Edit</button>
                    <button onClick={() => handleDelete(v.id)} className="btn btn-danger btn-sm">🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
              <button onClick={closeModal} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Name *</label><input className="form-input" placeholder="Toyota Aqua" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Type</label>
                  <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Plate *</label><input className="form-input" placeholder="WP-CAB-1234" value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Meter (km)</label><input type="number" className="form-input" value={form.lastMeterReading} onChange={e => setForm({ ...form, lastMeterReading: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">LKR / km</label><input type="number" className="form-input" value={form.pricePerKm} onChange={e => setForm({ ...form, pricePerKm: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">LKR / day</label><input type="number" className="form-input" value={form.pricePerDay} onChange={e => setForm({ ...form, pricePerDay: e.target.value })} /></div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {[['isOutsourced', 'Outsourced'], ['showOnLanding', 'Show on Landing'], ['isAvailable', 'Available']].map(([k, label]) => (
                  <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                    <input type="checkbox" checked={Boolean(form[k])} onChange={e => setForm({ ...form, [k]: e.target.checked })} />
                    {label}
                  </label>
                ))}
              </div>
              {form.isOutsourced && <div className="form-group" style={{ maxWidth: 180 }}><label className="form-label">Commission %</label><input type="number" className="form-input" value={form.commissionRate} min={0} max={100} onChange={e => setForm({ ...form, commissionRate: e.target.value })} /></div>}
              <div className="form-group">
                <label className="form-label">Image</label>
                <div className="file-upload" onClick={() => fileRef.current?.click()}>
                  <input ref={fileRef} type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                  {imageFile ? <div style={{ color: 'var(--gold)', fontSize: '0.88rem' }}>✓ {imageFile.name}</div>
                    : <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Click to upload{editing?.imageUrl ? ' (blank = keep existing)' : ''}</div>}
                </div>
                {editing?.imageUrl && !imageFile && <img src={editing.imageUrl} alt="" style={{ height: 55, borderRadius: 8, marginTop: 6, objectFit: 'cover' }} />}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={closeModal} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? <span className="spinner" /> : editing ? 'Save' : 'Add Vehicle'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
