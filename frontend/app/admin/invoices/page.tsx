'use client';
import { useEffect, useState } from 'react';
import { getInvoices, generateInvoice, getWhatsAppLink } from '@/lib/api';
import { getBookings } from '@/lib/api';
import toast from 'react-hot-toast';

type Invoice = { id: string; bookingId: string; customerId: string; vehicleId: string; amount: number; discountAmount: number; pdfUrl: string; whatsappSent: boolean; createdAt: any; };

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([getInvoices(), getBookings()])
      .then(([inv, bk]) => { setInvoices(inv.data); setBookings(bk.data); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Completed bookings without an invoice
  const uninvoiced = bookings.filter(b => b.status === 'completed' && !b.invoiceUrl);

  const handleGenerate = async (bookingId: string) => {
    setGenerating(bookingId);
    try {
      await generateInvoice(bookingId);
      toast.success('Invoice generated!'); load();
    } catch { toast.error('Failed to generate'); }
    finally { setGenerating(null); }
  };

  const handleWhatsApp = async (invoiceId: string, pdfUrl: string) => {
    try {
      const r = await getWhatsAppLink(invoiceId);
      window.open(r.data.whatsappUrl, '_blank');
    } catch { toast.error('Failed to get link'); }
  };

  const fmtDate = (ts: any) => ts?._seconds ? new Date(ts._seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const filtered = invoices.filter(inv =>
    inv.bookingId?.toLowerCase().includes(search.toLowerCase()) ||
    inv.id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <div className="gold-line" />
          <h1 className="page-title">Invoices</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{invoices.length} generated</p>
        </div>
      </div>

      {/* Uninvoiced completed bookings */}
      {uninvoiced.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem', borderColor: 'rgba(201,162,39,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--gold)', fontWeight: 700 }}>⚡ Pending Invoices</span>
            <span className="badge badge-warning">{uninvoiced.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {uninvoiced.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <code style={{ color: 'var(--gold)', fontSize: '0.78rem' }}>{b.id.slice(0, 8).toUpperCase()}</code>
                  <span style={{ marginLeft: '0.75rem', color: 'var(--text-secondary)' }}>LKR {(b.finalAmount || 0).toLocaleString()}</span>
                </div>
                <button onClick={() => handleGenerate(b.id)} className="btn btn-primary btn-sm" disabled={generating === b.id}>
                  {generating === b.id ? <span className="spinner" /> : '📄 Generate Invoice'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <input className="form-input" placeholder="🔍  Search by ID or booking..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 360 }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ width: 36, height: 36, margin: '0 auto' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">🧾</div><p>No invoices yet. Complete bookings to generate invoices.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Booking</th>
                <th>Amount</th>
                <th>Discount</th>
                <th>Date</th>
                <th>WA Sent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id}>
                  <td><code style={{ fontSize: '0.78rem', color: 'var(--gold)' }}>{inv.id.slice(0, 8).toUpperCase()}</code></td>
                  <td>
                    <a href={`/admin/bookings/${inv.bookingId}`} style={{ color: 'var(--text-primary)', fontSize: '0.82rem', textDecoration: 'underline', textDecorationColor: 'var(--border)' }}>
                      {inv.bookingId?.slice(0, 8).toUpperCase()}
                    </a>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--gold)' }}>LKR {(inv.amount || 0).toLocaleString()}</td>
                  <td style={{ color: '#22c55e' }}>{inv.discountAmount > 0 ? `- LKR ${inv.discountAmount.toLocaleString()}` : '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{fmtDate(inv.createdAt)}</td>
                  <td><span className={`badge ${inv.whatsappSent ? 'badge-success' : 'badge-muted'}`}>{inv.whatsappSent ? '✓ Sent' : 'Not sent'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {inv.pdfUrl && (
                        <a href={inv.pdfUrl} target="_blank" className="btn btn-secondary btn-sm">⬇ PDF</a>
                      )}
                      <button
                        onClick={() => handleWhatsApp(inv.id, inv.pdfUrl)}
                        className="btn btn-sm"
                        style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '0.35rem 0.75rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                        WhatsApp
                      </button>
                      <button onClick={() => handleGenerate(inv.bookingId)} className="btn btn-ghost btn-sm" disabled={generating === inv.bookingId}>
                        {generating === inv.bookingId ? <span className="spinner" /> : '↻'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
