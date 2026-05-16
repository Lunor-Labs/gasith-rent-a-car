'use client';
import { useEffect, useState, useRef } from 'react';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getCustomerBookings } from '@/lib/api';
import toast from 'react-hot-toast';

type Customer = { id: string; name: string; phone: string; email: string; address: string; nicNumber: string; nicFrontUrl: string; nicBackUrl: string; drivingLicenseUrl: string; createdAt: any; };
const EMPTY = { name: '', phone: '', email: '', address: '', nicNumber: '' };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState<Customer | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<any>({ ...EMPTY });
  const [files, setFiles] = useState<{ nicFront?: File; nicBack?: File; drivingLicense?: File }>({});
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [custBookings, setCustBookings] = useState<any[]>([]);
  const nicFrontRef = useRef<HTMLInputElement>(null);
  const nicBackRef = useRef<HTMLInputElement>(null);
  const dlRef = useRef<HTMLInputElement>(null);

  const load = () => { setLoading(true); getCustomers().then(r => setCustomers(r.data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setFiles({}); setModalOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm({ name: c.name, phone: c.phone, email: c.email, address: c.address, nicNumber: c.nicNumber }); setFiles({}); setModalOpen(true); };

  const openDetail = async (c: Customer) => {
    setDetailOpen(c); setCustBookings([]);
    try { const r = await getCustomerBookings(c.id); setCustBookings(r.data); } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      if (files.nicFront) fd.append('nicFront', files.nicFront);
      if (files.nicBack) fd.append('nicBack', files.nicBack);
      if (files.drivingLicense) fd.append('drivingLicense', files.drivingLicense);
      editing ? await updateCustomer(editing.id, fd) : await createCustomer(fd);
      toast.success(editing ? 'Customer updated' : 'Customer added');
      setModalOpen(false); setEditing(null); load();
    } catch { toast.error('Failed to save'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer?')) return;
    try { await deleteCustomer(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
  };

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.nicNumber?.includes(search)
  );

  const fmtDate = (ts: any) => {
    if (!ts) return '—';
    if (typeof ts === 'string') return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return ts?._seconds ? new Date(ts._seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  };

  const DocThumb = ({ url, label }: { url: string; label: string }) => url ? (
    <a href={url} target="_blank" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
      <img src={url} alt={label} style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 4 }} />
      <div style={{ fontSize: '0.72rem', color: 'var(--gold)' }}>{label} ↗</div>
    </a>
  ) : (
    <div style={{ height: 90, background: 'var(--bg-elevated)', borderRadius: 8, border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}<br />Not uploaded</div>
  );

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div><div className="gold-line" /><h1 className="page-title">Customers</h1><p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{customers.length} total</p></div>
        <button onClick={openCreate} className="btn btn-primary">+ Add Customer</button>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <input className="form-input" placeholder="🔍  Search name, phone, NIC..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 360 }} />
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ width: 36, height: 36, margin: '0 auto' }} /></div>
        : filtered.length === 0 ? <div className="empty-state"><div className="empty-state-icon">👥</div><p>No customers found</p></div>
        : (
          <>
            {/* Desktop Table */}
            <div className="table-wrap responsive-hide-mobile">
              <table>
                <thead><tr><th>Name</th><th>Phone</th><th>NIC</th><th>Documents</th><th>Joined</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id}>
                      <td><div style={{ fontWeight: 600 }}>{c.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.email}</div></td>
                      <td>{c.phone}</td>
                      <td><code style={{ fontSize: '0.78rem' }}>{c.nicNumber || '—'}</code></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          {c.nicFrontUrl && <a href={c.nicFrontUrl} target="_blank" className="badge badge-info" style={{ textDecoration: 'none' }}>NIC F</a>}
                          {c.nicBackUrl && <a href={c.nicBackUrl} target="_blank" className="badge badge-info" style={{ textDecoration: 'none' }}>NIC B</a>}
                          {c.drivingLicenseUrl && <a href={c.drivingLicenseUrl} target="_blank" className="badge badge-success" style={{ textDecoration: 'none' }}>DL</a>}
                          {!c.nicFrontUrl && !c.drivingLicenseUrl && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{fmtDate(c.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={() => openDetail(c)} className="btn btn-ghost btn-sm">View</button>
                          <button onClick={() => openEdit(c)} className="btn btn-secondary btn-sm">Edit</button>
                          <button onClick={() => handleDelete(c.id)} className="btn btn-danger btn-sm">🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="responsive-show-mobile" style={{ display: 'none', flexDirection: 'column', gap: '0.75rem' }}>
              {filtered.map(c => (
                <div key={c.id} className="card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{c.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{c.phone}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {c.nicFrontUrl && <span className="badge badge-info" style={{ fontSize: '0.62rem' }}>NIC</span>}
                      {c.drivingLicenseUrl && <span className="badge badge-success" style={{ fontSize: '0.62rem' }}>DL</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {c.email && <span>{c.email}</span>}
                    {c.nicNumber && <code style={{ fontSize: '0.72rem' }}>NIC: {c.nicNumber}</code>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                    <button onClick={() => openDetail(c)} className="btn btn-ghost btn-sm">View</button>
                    <button onClick={() => openEdit(c)} className="btn btn-secondary btn-sm">Edit</button>
                    <button onClick={() => handleDelete(c.id)} className="btn btn-danger btn-sm">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setModalOpen(false); setEditing(null); } }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Edit Customer' : 'Add Customer'}</h2>
              <button onClick={() => { setModalOpen(false); setEditing(null); }} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Phone *</label><input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">NIC Number</label><input className="form-input" value={form.nicNumber} onChange={e => setForm({ ...form, nicNumber: e.target.value })} /></div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Address</label><input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              </div>
              <div className="divider" />
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Documents</div>
              <div className="grid-3">
                {[
                  { label: 'NIC Front', key: 'nicFront', ref: nicFrontRef },
                  { label: 'NIC Back', key: 'nicBack', ref: nicBackRef },
                  { label: 'Driving License', key: 'drivingLicense', ref: dlRef },
                ].map(({ label, key, ref }) => (
                  <div key={key}>
                    <div className="file-upload" onClick={() => ref.current?.click()}>
                      <input ref={ref} type="file" accept="image/*,application/pdf" onChange={e => setFiles(f => ({ ...f, [key]: e.target.files?.[0] }))} />
                      {(files as any)[key]
                        ? <div style={{ fontSize: '0.78rem', color: 'var(--gold)' }}>✓ {(files as any)[key].name}</div>
                        : <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{label}</div>}
                    </div>
                    {editing && (editing as any)[`${key}Url`] && !(files as any)[key] && (
                      <a href={(editing as any)[`${key}Url`]} target="_blank" style={{ fontSize: '0.72rem', color: 'var(--gold)' }}>View existing ↗</a>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setModalOpen(false); setEditing(null); }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? <span className="spinner" /> : editing ? 'Save' : 'Add Customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setDetailOpen(null); }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2 className="modal-title">{detailOpen.name}</h2>
              <button onClick={() => setDetailOpen(null)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="grid-2" style={{ fontSize: '0.88rem' }}>
                {[['Phone', detailOpen.phone], ['Email', detailOpen.email || '—'], ['NIC', detailOpen.nicNumber || '—'], ['Address', detailOpen.address || '—']].map(([l, v]) => (
                  <div key={l}><span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 2 }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span></div>
                ))}
              </div>
              <div className="divider" />
              <div style={{ fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Documents</div>
              <div className="grid-3">
                <DocThumb url={detailOpen.nicFrontUrl} label="NIC Front" />
                <DocThumb url={detailOpen.nicBackUrl} label="NIC Back" />
                <DocThumb url={detailOpen.drivingLicenseUrl} label="Driving License" />
              </div>
              {custBookings.length > 0 && <>
                <div className="divider" />
                <div style={{ fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Booking History ({custBookings.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {custBookings.map(b => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: '0.82rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <code style={{ color: 'var(--gold)' }}>{b.id.slice(0, 8).toUpperCase()}</code>
                      <span className={`badge ${b.status === 'completed' ? 'badge-success' : b.status === 'active' ? 'badge-info' : 'badge-muted'}`}>{b.status}</span>
                      <span style={{ fontWeight: 600 }}>LKR {(b.finalAmount || 0).toLocaleString()}</span>
                      <a href={`/admin/bookings/${b.id}`} className="btn btn-ghost btn-sm">→</a>
                    </div>
                  ))}
                </div>
              </>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
