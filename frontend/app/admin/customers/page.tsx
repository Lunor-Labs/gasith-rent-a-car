'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCustomers, deleteCustomer, getCustomerBookings } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Users, Eye, Wallet } from 'lucide-react';
import CustomerFormModal from '@/components/CustomerFormModal';
import CreditAccountModal from '@/components/CreditAccountModal';

type Customer = { id: string; name: string; phone: string; email: string; address: string; nicNumber: string; nicFrontUrl: string; nicBackUrl: string; drivingLicenseUrl: string; isActive?: boolean; createdAt: any; };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState<Customer | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [custBookings, setCustBookings] = useState<any[]>([]);
  const [creditCustomerId, setCreditCustomerId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const q = searchParams.get('q')?.toLowerCase() || '';

  const load = () => { setLoading(true); getCustomers({ include_inactive: 'true' }).then(r => setCustomers(r.data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const openDetail = async (c: Customer) => {
    setDetailOpen(c); setCustBookings([]);
    try { const r = await getCustomerBookings(c.id); setCustBookings(r.data); } catch {}
  };

  const handleSaved = () => { load(); };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer?')) return;
    try {
      const res = await deleteCustomer(id);
      toast.success(res.data.deactivated ? 'Customer marked as inactive' : 'Customer deleted');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete customer');
    }
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                        {c.isActive === false && <span className="badge badge-muted" style={{ fontSize: '0.62rem' }}>Inactive</span>}
                      </div>
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
                        <button onClick={() => setCreditCustomerId(c.id)} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }} title="View credit account">
                          <Wallet size={12} strokeWidth={1.5} /> Credit
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{c.name}</span>
                      {c.isActive === false && <span className="badge badge-muted" style={{ fontSize: '0.62rem' }}>Inactive</span>}
                    </div>
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
                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button onClick={() => openDetail(c)} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Eye size={12} strokeWidth={1.5} /> View
                  </button>
                  <button onClick={() => setCreditCustomerId(c.id)} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Wallet size={12} strokeWidth={1.5} /> Credit
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

      <CustomerFormModal
        open={modalOpen}
        onClose={closeModal}
        onSaved={handleSaved}
        editing={editing}
      />

      <CreditAccountModal
        open={creditCustomerId != null}
        customerId={creditCustomerId}
        onClose={() => setCreditCustomerId(null)}
      />

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
