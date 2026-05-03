'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getBooking, getCustomer, getVehicle, getVehicleMeterReadings, completeBooking, generateInvoice, getWhatsAppLink } from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [vehicle, setVehicle] = useState<any>(null);
  const [meterHistory, setMeterHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [invoice, setInvoice] = useState<{ pdfUrl: string; whatsappUrl: string | null; invoiceId: string } | null>(null);

  const [endForm, setEndForm] = useState({
    endMeterReading: '',
    discountAmount: '0',
    endDate: new Date().toISOString().split('T')[0],
    outsourcedPayment: '',
    commissionRate: '10',
  });

  const load = async () => {
    setLoading(true);
    try {
      const b = await getBooking(id);
      setBooking(b.data);
      setEndForm(f => ({ ...f, commissionRate: String(b.data.commissionRate || 10) }));
      const [c, v, m] = await Promise.all([
        getCustomer(b.data.customerId),
        getVehicle(b.data.vehicleId),
        getVehicleMeterReadings(b.data.vehicleId),
      ]);
      setCustomer(c.data); setVehicle(v.data); setMeterHistory(m.data);
    } catch { toast.error('Failed to load booking'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (id) load(); }, [id]);

  const preview = () => {
    if (!booking || booking.isOutsourced) return null;
    const end = Number(endForm.endMeterReading);
    const start = booking.startMeterReading || 0;
    if (!end || end <= start) return null;
    const km = end - start;
    const base = km * (booking.pricePerKm || 0);
    const disc = Number(endForm.discountAmount) || 0;
    return { km, base, disc, final: base - disc };
  };

  const outsourcedPreview = () => {
    if (!booking?.isOutsourced) return null;
    const payment = Number(endForm.outsourcedPayment) || 0;
    const comm = Number(endForm.commissionRate) || 10;
    const commAmt = payment * comm / 100;
    return { payment, comm, commAmt, net: payment - commAmt };
  };

  const calc = preview();
  const outsourcedCalc = outsourcedPreview();

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault(); setCompleting(true);
    try {
      await completeBooking(id, {
        ...endForm,
        endMeterReading: Number(endForm.endMeterReading),
        discountAmount: Number(endForm.discountAmount),
        outsourcedPayment: Number(endForm.outsourcedPayment),
        commissionRate: Number(endForm.commissionRate),
      });
      toast.success('Booking completed!'); load();
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed'); }
    finally { setCompleting(false); }
  };

  const handleGenerateInvoice = async () => {
    setGenerating(true);
    try {
      const r = await generateInvoice(id);
      setInvoice(r.data);
      toast.success('Invoice generated!');
    } catch { toast.error('Failed to generate invoice'); }
    finally { setGenerating(false); }
  };

  const handleWhatsApp = async () => {
    if (invoice?.whatsappUrl) { window.open(invoice.whatsappUrl, '_blank'); return; }
    if (invoice?.invoiceId) {
      try {
        const r = await getWhatsAppLink(invoice.invoiceId);
        window.open(r.data.whatsappUrl, '_blank');
      } catch { toast.error('Failed'); }
    }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="spinner" style={{ width: 36, height: 36 }} /></div>;
  if (!booking) return <div className="empty-state"><p>Booking not found</p><Link href="/admin/bookings" className="btn btn-secondary btn-sm">← Back</Link></div>;

  const fmtDate = (ts: any) => ts?._seconds ? new Date(ts._seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="page-header">
        <div>
          <Link href="/admin/bookings" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'inline-block', marginBottom: '0.5rem' }}>← Back to Bookings</Link>
          <div className="gold-line" />
          <h1 className="page-title">Booking <span style={{ color: 'var(--gold)' }}>{id.slice(0, 8).toUpperCase()}</span></h1>
        </div>
        <span className={`badge ${booking.status === 'active' ? 'badge-info' : booking.status === 'completed' ? 'badge-success' : 'badge-muted'}`} style={{ fontSize: '0.88rem', padding: '0.4rem 0.8rem' }}>
          {booking.status}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>

        {/* Info Cards */}
        <div className="grid-2">
          {/* Customer */}
          <div className="card">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Customer</div>
            {customer ? <>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.25rem' }}>{customer.name}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{customer.phone}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{customer.email}</div>
              {customer.nicNumber && <div style={{ marginTop: '0.5rem' }}><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NIC: </span><code style={{ fontSize: '0.82rem' }}>{customer.nicNumber}</code></div>}
            </> : <div style={{ color: 'var(--text-muted)' }}>Loading...</div>}
          </div>

          {/* Vehicle */}
          <div className="card">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Vehicle</div>
            {vehicle ? <>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.25rem' }}>{vehicle.name}</div>
              <div className="vehicle-card-plate" style={{ display: 'inline-block' }}>{vehicle.plate}</div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Rate: </span><span style={{ fontWeight: 600 }}>LKR {vehicle.pricePerKm}/km</span>
              </div>
              {booking.isOutsourced && <span className="badge badge-warning" style={{ marginTop: '0.5rem' }}>Outsourced · {booking.commissionRate}% commission</span>}
            </> : <div style={{ color: 'var(--text-muted)' }}>Loading...</div>}
          </div>
        </div>

        {/* Booking Details */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: '1rem' }}>Booking Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.88rem' }}>
            {[
              ['Start Date', fmtDate(booking.startDate)],
              ['End Date', fmtDate(booking.endDate)],
              ['Start Meter', `${booking.startMeterReading?.toLocaleString()} km`],
              ['End Meter', booking.endMeterReading ? `${booking.endMeterReading?.toLocaleString()} km` : '—'],
              ['Total KM', booking.totalKm ? `${booking.totalKm?.toLocaleString()} km` : '—'],
              ['Notes', booking.notes || '—'],
            ].map(([l, v]) => (
              <div key={l}><div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 2 }}>{l}</div><div style={{ fontWeight: 500 }}>{v}</div></div>
            ))}
          </div>
        </div>

        {/* Meter History */}
        {meterHistory.length > 0 && (
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Meter Reading History</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {meterHistory.slice(0, 6).map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: '0.82rem' }}>
                  <span className={`badge ${m.type === 'start' ? 'badge-info' : 'badge-success'}`}>{m.type}</span>
                  <span style={{ fontWeight: 700 }}>{m.reading?.toLocaleString()} km</span>
                  <span style={{ color: 'var(--text-muted)' }}>{m.recordedAt?._seconds ? new Date(m.recordedAt._seconds * 1000).toLocaleDateString() : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Complete Booking Form */}
        {booking.status === 'active' && (
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: '1rem' }}>
              {booking.isOutsourced ? '💰 Complete — Outsourced Vehicle' : '🏁 Complete Booking & Calculate'}
            </div>
            <form onSubmit={handleComplete} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input type="date" className="form-input" value={endForm.endDate} onChange={e => setEndForm({ ...endForm, endDate: e.target.value })} />
                </div>
                {booking.isOutsourced ? <>
                  <div className="form-group">
                    <label className="form-label">Total Payment Received (LKR) *</label>
                    <input type="number" className="form-input" placeholder="0" value={endForm.outsourcedPayment} onChange={e => setEndForm({ ...endForm, outsourcedPayment: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Commission % (default {booking.commissionRate}%)</label>
                    <input type="number" className="form-input" value={endForm.commissionRate} min={0} max={100} onChange={e => setEndForm({ ...endForm, commissionRate: e.target.value })} />
                  </div>
                </> : <>
                  <div className="form-group">
                    <label className="form-label">End Meter Reading (km) *</label>
                    <input type="number" className="form-input" placeholder={`> ${booking.startMeterReading}`} value={endForm.endMeterReading} onChange={e => setEndForm({ ...endForm, endMeterReading: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Discount (LKR)</label>
                    <input type="number" className="form-input" placeholder="0" value={endForm.discountAmount} onChange={e => setEndForm({ ...endForm, discountAmount: e.target.value })} />
                  </div>
                </>}
              </div>

              {/* Live preview */}
              {(calc || outsourcedCalc) && (
                <div style={{ background: '#0f0f0f', border: '1px solid rgba(201,162,39,0.3)', borderRadius: 12, padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Price Preview</div>
                  {calc && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.88rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Distance</span><span>{calc.km.toLocaleString()} km</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Base ({calc.km} × LKR {booking.pricePerKm})</span><span>LKR {calc.base.toLocaleString()}</span></div>
                      {calc.disc > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e' }}><span>Discount</span><span>- LKR {calc.disc.toLocaleString()}</span></div>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', fontWeight: 700, fontSize: '1rem', color: 'var(--gold)' }}>
                        <span>Total</span><span>LKR {calc.final.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                  {outsourcedCalc && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.88rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Payment Received</span><span>LKR {outsourcedCalc.payment.toLocaleString()}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}><span>Commission ({outsourcedCalc.comm}%)</span><span>- LKR {outsourcedCalc.commAmt.toLocaleString()}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', fontWeight: 700, fontSize: '1rem', color: 'var(--gold)' }}>
                        <span>Net Profit</span><span>LKR {outsourcedCalc.net.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={completing}>{completing ? <span className="spinner" /> : '✓ Complete Booking'}</button>
            </form>
          </div>
        )}

        {/* Invoice Section */}
        {booking.status === 'completed' && (
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: '1rem' }}>🧾 Invoice</div>
            <div style={{ background: '#0f0f0f', border: '1px solid rgba(201,162,39,0.2)', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Base Amount</span><span>LKR {(booking.baseAmount || 0).toLocaleString()}</span>
                {booking.discountAmount > 0 && <><span style={{ color: '#22c55e' }}>Discount</span><span style={{ color: '#22c55e' }}>- LKR {booking.discountAmount.toLocaleString()}</span></>}
                <span style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>Total</span>
                <span style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>LKR {(booking.finalAmount || 0).toLocaleString()}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button onClick={handleGenerateInvoice} className="btn btn-primary" disabled={generating}>
                {generating ? <span className="spinner" /> : '📄 Generate PDF Invoice'}
              </button>
              {booking.invoiceUrl && <a href={booking.invoiceUrl} target="_blank" className="btn btn-secondary">⬇ Download PDF</a>}
              {(invoice || booking.invoiceUrl) && (
                <button onClick={handleWhatsApp} className="btn btn-sm" style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 10, padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  Send via WhatsApp
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
