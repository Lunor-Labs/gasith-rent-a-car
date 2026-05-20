'use client';
import { useState, useRef } from 'react';
import { createCustomer, updateCustomer } from '@/lib/api';
import toast from 'react-hot-toast';
import { Users, Phone, Mail, CreditCard, MapPin, FileText, ScanLine, Upload, UserPlus } from 'lucide-react';

type Customer = {
  id: string; name: string; phone: string; email: string;
  address: string; nicNumber: string;
  nicFrontUrl: string; nicBackUrl: string; drivingLicenseUrl: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (id: string) => void;
  editing?: Customer | null;
};

const EMPTY = { name: '', phone: '', email: '', address: '', nicNumber: '' };

export default function CustomerFormModal({ open, onClose, onSaved, editing = null }: Props) {
  const [form, setForm] = useState<any>({ ...EMPTY });
  const [files, setFiles] = useState<{ nicFront?: File; nicBack?: File; drivingLicense?: File }>({});
  const [submitting, setSubmitting] = useState(false);

  const nicFrontRef = useRef<HTMLInputElement>(null);
  const nicBackRef = useRef<HTMLInputElement>(null);
  const dlRef = useRef<HTMLInputElement>(null);

  const handleOpen = () => {
    if (editing) {
      setForm({ name: editing.name, phone: editing.phone, email: editing.email, address: editing.address, nicNumber: editing.nicNumber });
    } else {
      setForm({ ...EMPTY });
    }
    setFiles({});
  };

  if (!open) return null;

  const close = () => { onClose(); setForm({ ...EMPTY }); setFiles({}); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      if (files.nicFront) fd.append('nicFront', files.nicFront);
      if (files.nicBack) fd.append('nicBack', files.nicBack);
      if (files.drivingLicense) fd.append('drivingLicense', files.drivingLicense);

      let id: string;
      if (editing) {
        await updateCustomer(editing.id, fd);
        id = editing.id;
      } else {
        const res = await createCustomer(fd);
        id = res.data.id;
      }
      toast.success(editing ? 'Customer updated' : 'Customer added');
      onSaved(id);
      close();
    } catch { toast.error('Failed to save customer'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(168,85,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserPlus size={16} strokeWidth={1.5} style={{ color: '#a855f7' }} />
            </div>
            <div>
              <h2 className="modal-title" style={{ marginBottom: 0 }}>{editing ? 'Edit Customer' : 'Add Customer'}</h2>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>
                {editing ? `Editing ${editing.name}` : "Fill in the customer's details below"}
              </div>
            </div>
          </div>
          <button onClick={close} className="btn btn-ghost btn-sm">✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* ── Personal Information ── */}
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

          {/* ── Identity Documents ── */}
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
                { label: 'NIC Back', key: 'nicBack', ref: nicBackRef, Icon: ScanLine },
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
                    <div onClick={() => ref.current?.click()} style={{
                      border: '2px dashed ' + (newFile ? 'var(--gold)' : 'var(--border)'),
                      borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                      background: 'var(--bg-elevated)', minHeight: 115,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative', transition: 'border-color 0.2s',
                    }}>
                      {showPreview ? (
                        <>
                          <img src={previewSrc} alt={label} style={{ width: '100%', height: 115, objectFit: 'cover', display: 'block' }} />
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '1rem 0.6rem 0.45rem', fontSize: '0.65rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Upload size={10} strokeWidth={2} />{newFile ? 'Tap to change' : 'Tap to replace'}
                          </div>
                        </>
                      ) : newFile ? (
                        <div style={{ textAlign: 'center', padding: '1rem 0.75rem' }}>
                          <FileText size={22} strokeWidth={1} style={{ color: 'var(--gold)', marginBottom: '0.4rem' }} />
                          <div style={{ fontSize: '0.68rem', color: 'var(--gold)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{newFile.name}</div>
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
            <button type="button" onClick={close} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ minWidth: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              {submitting ? <span className="spinner" /> : <><UserPlus size={14} strokeWidth={2} />{editing ? 'Save Changes' : 'Add Customer'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
