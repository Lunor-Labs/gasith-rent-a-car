'use client';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getCustomerBookings } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Users, Eye, UserPlus, Phone, Mail, CreditCard, MapPin, FileText, ScanLine, Upload } from 'lucide-react';

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
  const [custBookings, setCustBookings] = useState<any[]>([]);
  const nicFrontRef = useRef<HTMLInputElement>(null);
  const nicBackRef = useRef<HTMLInputElement>(null);
  const dlRef = useRef<HTMLInputElement>(null);

  const searchParams = useSearchParams();
  const q = searchParams.get('q')?.toLowerCase() || '';

  const load = () => { setLoading(true); getCustomers().then(r => setCustomers(r.data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setFiles({}); setModalOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm({ name: c.name, phone: c.phone, email: c.email, address: c.address, nicNumber: c.nicNumber }); setFiles({}); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

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
      closeModal(); load();
    } catch { toast.error('Failed to save'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer?')) return;
    try { await deleteCustomer(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
  };

  const filtered = q
    ? customers.filter(c => c.name.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.nicNumber?.toLowerCase().includes(q))
    : customers;

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
    <div style={{ height: 90, background: 'var(--bg-elevated)', borderRadius: 8, border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4 }}>{label}<br />Not uploaded</div>
  );

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>{q ? `${filtered.length} of ${customers.length}` : `${customers.length} total`}</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Plus size={14} strokeWidth={2} /> Add Customer
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Users size={40} strokeWidth={1} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.25 }} />
          <p>{q ? `No customers matching "${q}"` : 'No customers yet'}</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="table-wrap responsive-hide-mobile">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Phone</th><th>NIC</th><th>Documents</th><th>Joined</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.email}</div>
                    </td>
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
                        <button onClick={() => openDetail(c)} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Eye size={12} strokeWidth={1.5} /> View
                        </button>
                        <button onClick={() => openEdit(c)} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Pencil size={12} strokeWidth={1.5} /> Edit
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="btn btn-danger btn-sm" style={{ padding: '0.35rem 0.6rem' }}>
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
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
                  <button onClick={() => openDetail(c)} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Eye size={12} strokeWidth={1.5} /> View
                  </button>
                  <button onClick={() => openEdit(c)} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Pencil size={12} strokeWidth={1.5} /> Edit
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="btn btn-danger btn-sm" style={{ padding: '0.35rem 0.6rem' }}>
                    <Trash2 size={13} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(168,85,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserPlus size={16} strokeWidth={1.5} style={{ color: '#a855f7' }} />
                </div>
                <div>
                  <h2 className="modal-title" style={{ marginBottom: 0 }}>{editing ? 'Edit Customer' : 'Add Customer'}</h2>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>
                    {editing ? `Editing ${editing.name}` : 'Fill in the customer\'s details below'}
                  </div>
                </div>
              </div>
              <button onClick={closeModal} className="btn btn-ghost btn-sm">✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

              {/* ── Section: Personal Information ── */}
              <div style={{ padding: '1.25rem 0 1rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.85rem' }}>
                  Personal Information
                </div>
                <div className="grid-2" style={{ gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <div style={{ position: 'relative' }}>
                      <Users size={13} strokeWidth={1.5} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input className="form-input" placeholder="John Perera" style={{ paddingLeft: '2.25rem' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone *</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={13} strokeWidth={1.5} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input className="form-input" placeholder="077 123 4567" style={{ paddingLeft: '2.25rem' }} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={13} strokeWidth={1.5} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input type="email" className="form-input" placeholder="john@email.com" style={{ paddingLeft: '2.25rem' }} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">NIC Number</label>
                    <div style={{ position: 'relative' }}>
                      <CreditCard size={13} strokeWidth={1.5} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input className="form-input" placeholder="199512345678" style={{ paddingLeft: '2.25rem' }} value={form.nicNumber} onChange={e => setForm({ ...form, nicNumber: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <div style={{ position: 'relative' }}>
                    <MapPin size={13} strokeWidth={1.5} style={{ position: 'absolute', left: '0.75rem', top: '0.85rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input className="form-input" placeholder="No. 12, Main Street, Colombo" style={{ paddingLeft: '2.25rem' }} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="divider" style={{ margin: 0 }} />

              {/* ── Section: Identity Documents ── */}
              <div style={{ padding: '1rem 0 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Identity Documents
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>JPG, PNG or PDF</div>
                </div>
                <div className="grid-3" style={{ gap: '0.75rem' }}>
                  {([
                    { label: 'NIC Front', key: 'nicFront', ref: nicFrontRef, Icon: ScanLine },
                    { label: 'NIC Back',  key: 'nicBack',  ref: nicBackRef,  Icon: ScanLine },
                    { label: 'Driving License', key: 'drivingLicense', ref: dlRef, Icon: FileText },
                  ] as { label: string; key: string; ref: React.RefObject<HTMLInputElement>; Icon: any }[]).map(({ label, key, ref, Icon }) => {
                    const newFile: File | undefined = (files as any)[key];
                    const existingUrl: string | undefined = editing ? (editing as any)[`${key}Url`] : undefined;
                    const isImage = newFile?.type.startsWith('image/');
                    const showPreview = newFile ? isImage : !!existingUrl;
                    const previewSrc = newFile && isImage ? URL.createObjectURL(newFile) : existingUrl;
                    return (
                      <div key={key}>
                        <input ref={ref} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                          onChange={e => setFiles(f => ({ ...f, [key]: e.target.files?.[0] }))} />
                        <div
                          onClick={() => ref.current?.click()}
                          style={{
                            border: '2px dashed ' + (newFile ? 'var(--gold)' : 'var(--border)'),
                            borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                            background: 'var(--bg-elevated)', minHeight: 115,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            position: 'relative', transition: 'border-color 0.2s',
                          }}
                        >
                          {showPreview ? (
                            <>
                              <img src={previewSrc} alt={label} style={{ width: '100%', height: 115, objectFit: 'cover', display: 'block' }} />
                              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '1rem 0.6rem 0.45rem', fontSize: '0.65rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Upload size={10} strokeWidth={2} />
                                {newFile ? 'Tap to change' : 'Tap to replace'}
                              </div>
                            </>
                          ) : newFile ? (
                            <div style={{ textAlign: 'center', padding: '1rem 0.75rem' }}>
                              <FileText size={22} strokeWidth={1} style={{ color: 'var(--gold)', marginBottom: '0.4rem' }} />
                              <div style={{ fontSize: '0.68rem', color: 'var(--gold)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                                {newFile.name}
                              </div>
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '1rem 0.75rem' }}>
                              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem' }}>
                                <Icon size={18} strokeWidth={1} style={{ color: 'var(--text-muted)' }} />
                              </div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</div>
                              <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>Click to upload</div>
                            </div>
                          )}
                        </div>
                        {existingUrl && !newFile && (
                          <a href={existingUrl} target="_blank" style={{ display: 'block', textAlign: 'center', fontSize: '0.66rem', color: 'var(--gold)', marginTop: '0.3rem', textDecoration: 'none' }}>
                            View full size ↗
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Footer ── */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.25rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button type="button" onClick={closeModal} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ minWidth: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  {submitting ? <span className="spinner" /> : <><UserPlus size={14} strokeWidth={2} />{editing ? 'Save Changes' : 'Add Customer'}</>}
                </button>
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
                  <div key={l}>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 2 }}>{l}</span>
                    <span style={{ fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="divider" />
              <div style={{ fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Documents</div>
              <div className="grid-3">
                <DocThumb url={detailOpen.nicFrontUrl} label="NIC Front" />
                <DocThumb url={detailOpen.nicBackUrl} label="NIC Back" />
                <DocThumb url={detailOpen.drivingLicenseUrl} label="Driving License" />
              </div>
              {custBookings.length > 0 && (
                <>
                  <div className="divider" />
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    Booking History ({custBookings.length})
                  </div>
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
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
