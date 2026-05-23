'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getBooking, getCustomer, getVehicle, completeBooking, generateInvoice, getWhatsAppLink, getPricingConfig } from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [vehicle, setVehicle] = useState<any>(null);
  const [pricingConfig, setPricingConfig] = useState<{ firstDayFreeKm: number; subsequentDayFreeKm: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [invoice, setInvoice] = useState<{ pdfUrl: string; whatsappUrl: string | null; invoiceId: string } | null>(null);

  const [endForm, setEndForm] = useState({
    endMeterReading: '',
    endDate: new Date().toISOString().split('T')[0],
    commissionAmount: '',      // blank = use auto-calc
    freeKm: '',
    additionalDiscount: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [b, p] = await Promise.all([getBooking(id), getPricingConfig()]);
      setBooking(b.data);
      setPricingConfig(p.data);
      setEndForm(f => ({
        ...f,
        // pre-fill only if a custom commission was previously saved
        commissionAmount: b.data.commissionAmount != null ? String(b.data.commissionAmount) : '',
      }));
      const [c, v] = await Promise.all([
        getCustomer(b.data.customerId),
        getVehicle(b.data.vehicleId),
      ]);
      setCustomer(c.data);
      setVehicle(v.data);
    } catch { toast.error('Failed to load booking'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (id) load(); }, [id]);

  const fmtDate = (ts: any) => {
    if (!ts) return '—';
    if (typeof ts === 'string') return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return ts?._seconds ? new Date(ts._seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  };

  // ── Preview calculations ──────────────────────────────────────────────────
  // Computed from end date alone — updates immediately when end date changes, no meter reading needed
  const autoFreeKm = (() => {
    if (!booking || !endForm.endDate || !booking.startDate) return null;
    const start = new Date(typeof booking.startDate === 'string'
      ? booking.startDate
      : new Date(booking.startDate._seconds * 1000));
    const end = new Date(endForm.endDate);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const d1 = booking.bookingFirstDayFreeKm ?? pricingConfig?.firstDayFreeKm ?? 150;
    const sub = booking.bookingSubsequentDayFreeKm ?? pricingConfig?.subsequentDayFreeKm ?? 100;
    return d1 + (days - 1) * sub;
  })();

  const previewPerDay = () => {
    if (!booking) return null;
    if (!endForm.endDate || !booking.startDate) return null;
    // owned vehicles require meter reading; outsourced can proceed without it (0 KM)
    if (!booking.isOutsourced && !endForm.endMeterReading) return null;

    const start = new Date(typeof booking.startDate === 'string'
      ? booking.startDate
      : new Date(booking.startDate._seconds * 1000));
    const end = new Date(endForm.endDate);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const totalKm = endForm.endMeterReading
      ? Number(endForm.endMeterReading) - (booking.startMeterReading || 0)
      : 0;
    if (totalKm < 0) return null;

    const autoDefaultFreeKm = autoFreeKm ?? 150;

    const freeKm = endForm.freeKm
      ? Number(endForm.freeKm)
      : autoDefaultFreeKm;

    const pricePerKm = booking.pricePerKm || 0;
    const pricePerDay = booking.pricePerDay || 0;
    const defaultPricePerDay = booking.defaultPricePerDay || pricePerDay;

    const extraKm = Math.max(0, totalKm - freeKm);
    const extraKmCharge = extraKm * pricePerKm;

    const defaultExtraKm = Math.max(0, totalKm - autoDefaultFreeKm);
    const defaultExtraKmCharge = defaultExtraKm * pricePerKm;

    const rateDiscount = Math.max(0, (defaultPricePerDay - pricePerDay) * days);
    const kmDiscount = Math.max(0, defaultExtraKmCharge - extraKmCharge);
    const additionalDiscount = Number(endForm.additionalDiscount) || 0;
    const totalDiscount = rateDiscount + kmDiscount + additionalDiscount;

    const base = days * defaultPricePerDay + defaultExtraKmCharge;
    const final = Math.max(0, base - totalDiscount);

    return {
      days, totalKm, freeKm, autoDefaultFreeKm, extraKm, extraKmCharge,
      pricePerDay, defaultPricePerDay, rateDiscount, kmDiscount, additionalDiscount, totalDiscount,
      base, final,
    };
  };

  const calcDay = previewPerDay();

  const commissionPreview = () => {
    if (!booking?.isOutsourced || !calcDay) return null;
    const tripPrice = calcDay.final;
    const defaultCommission = tripPrice < 5000 ? 500 : Math.round(tripPrice * 0.10);
    const isCustom = endForm.commissionAmount !== '';
    const commission = isCustom ? Number(endForm.commissionAmount) : defaultCommission;
    return { tripPrice, commission, defaultCommission, isCustom, netToOwner: Math.max(0, tripPrice - commission) };
  };

  const commissionCalc = commissionPreview();

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault(); setCompleting(true);
    try {
      await completeBooking(id, {
        endDate: endForm.endDate,
        endMeterReading: endForm.endMeterReading ? Number(endForm.endMeterReading) : undefined,
        // send commissionAmount only if admin entered a custom override; else backend auto-calcs
        commissionAmount: endForm.commissionAmount !== '' ? Number(endForm.commissionAmount) : undefined,
        freeKm: endForm.freeKm ? Number(endForm.freeKm) : undefined,
        additionalDiscount: endForm.additionalDiscount ? Number(endForm.additionalDiscount) : 0,
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

  // ── Loading / Not Found ───────────────────────────────────────────────────
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="spinner" style={{ width: 36, height: 36 }} /></div>;
  if (!booking) return <div className="empty-state"><p>Booking not found</p><Link href="/admin/bookings" className="btn btn-secondary btn-sm">← Back</Link></div>;


  return (
    <div className="animate-fade">
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link href="/admin/bookings" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'inline-block', marginBottom: '0.5rem' }}>← Back to Bookings</Link>
        <div className="gold-line" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1 className="page-title" style={{ margin: 0 }}>Booking <span style={{ color: 'var(--gold)' }}>{id.slice(0, 8).toUpperCase()}</span></h1>
          <span className={`badge ${booking.status === 'active' ? 'badge-info' : booking.status === 'completed' ? 'badge-success' : 'badge-muted'}`}>{booking.status}</span>
        </div>
      </div>

      {/* ── Booking Summary ──────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
          {/* Customer */}
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Customer</div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{customer?.name || '...'}</div>
            {customer?.phone && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>{customer.phone}</div>}
          </div>

          {/* Vehicle */}
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Vehicle</div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{vehicle?.name || '...'}</div>
            {vehicle?.plate && <div className="vehicle-card-plate" style={{ display: 'inline-block', marginTop: 4, fontSize: '0.72rem' }}>{vehicle.plate}</div>}
          </div>

          {/* Date Booked */}
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Date Booked</div>
            <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{fmtDate(booking.startDate)}</div>
          </div>

          {/* Rate / Day */}
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Rate / Day</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gold)' }}>
              LKR {(booking.pricePerDay || 0).toLocaleString()}
            </div>
          </div>

          {/* Free KM */}
          {booking.freeKm != null && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Free KM</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gold)' }}>{booking.freeKm} km</div>
            </div>
          )}
        </div>

        {booking.notes && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Notes</div>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{booking.notes}</div>
          </div>
        )}

        {booking.isOutsourced && (
          <div style={{ marginTop: '0.75rem' }}>
            <span className="badge badge-warning">
              Outsourced
              {booking.commissionAmount != null
                ? ` · Commission: LKR ${Number(booking.commissionAmount).toLocaleString()}`
                : ' · Commission pending'}
            </span>
          </div>
        )}
      </div>

      {/* ── Complete Booking Form (active only) ──────────────────────────── */}
      {booking.status === 'active' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {booking.isOutsourced ? '💰' : '📅'} Complete Booking
          </div>
          <form onSubmit={handleComplete} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">End Date *</label>
                <input type="date" className="form-input" value={endForm.endDate} onChange={e => setEndForm({ ...endForm, endDate: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">
                  End Meter Reading (km)
                  {booking.isOutsourced
                    ? <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.4rem', fontSize: '0.72rem' }}>(optional)</span>
                    : ' *'}
                </label>
                <input
                  type="number" className="form-input"
                  placeholder={booking.startMeterReading ? `> ${booking.startMeterReading}` : '0'}
                  value={endForm.endMeterReading}
                  onChange={e => setEndForm({ ...endForm, endMeterReading: e.target.value })}
                  required={!booking.isOutsourced}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Free KM
                  {autoFreeKm != null && (
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.4rem', fontSize: '0.72rem' }}>
                      (auto: {autoFreeKm} km)
                    </span>
                  )}
                </label>
                <input
                  type="number" className="form-input" min={0}
                  placeholder={autoFreeKm != null ? String(autoFreeKm) : 'Set end date first'}
                  value={endForm.freeKm}
                  onChange={e => setEndForm({ ...endForm, freeKm: e.target.value })}
                />
              </div>
            </div>

            {/* Additional Discount */}
            <div className="form-group">
              <label className="form-label">Additional Discount (LKR)</label>
              <input
                type="number" className="form-input" min={0}
                placeholder="0"
                value={endForm.additionalDiscount}
                onChange={e => setEndForm({ ...endForm, additionalDiscount: e.target.value })}
              />
            </div>

            {/* Commission override (outsourced only) */}
            {booking.isOutsourced && (
              <div className="form-group">
                <label className="form-label">
                  Commission (LKR)
                  {commissionCalc && (
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.4rem', fontSize: '0.72rem' }}>
                      auto: LKR {commissionCalc.defaultCommission.toLocaleString()}
                      {commissionCalc.tripPrice >= 5000 ? ' (10%)' : ' (flat < 5,000)'}
                    </span>
                  )}
                  {!commissionCalc && (
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.4rem', fontSize: '0.72rem' }}>
                      (auto-calculated from trip price)
                    </span>
                  )}
                </label>
                <input
                  type="number" className="form-input" min={0}
                  placeholder={commissionCalc ? String(commissionCalc.defaultCommission) : 'auto'}
                  value={endForm.commissionAmount}
                  onChange={e => setEndForm({ ...endForm, commissionAmount: e.target.value })}
                />
                {endForm.commissionAmount !== '' && (
                  <button type="button" onClick={() => setEndForm(f => ({ ...f, commissionAmount: '' }))}
                    style={{ fontSize: '0.72rem', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', textAlign: 'left' }}>
                    ↺ Reset to auto-calculated
                  </button>
                )}
              </div>
            )}

            {/* Live preview */}
            {calcDay && (
              <div style={{ background: '#0f0f0f', border: '1px solid rgba(201,162,39,0.3)', borderRadius: 12, padding: '1rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>Price Preview</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Duration</span>
                    <span>{calcDay.days} day{calcDay.days > 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Daily Rate</span>
                    <span>
                      LKR {calcDay.pricePerDay.toLocaleString()}
                      {calcDay.defaultPricePerDay !== calcDay.pricePerDay && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginLeft: 6 }}>
                          (default: LKR {calcDay.defaultPricePerDay.toLocaleString()})
                        </span>
                      )}
                    </span>
                  </div>
                  {calcDay.totalKm > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>KM Driven</span>
                        <span>{calcDay.totalKm.toLocaleString()} km</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Free KM</span>
                        <span style={{ color: calcDay.freeKm > calcDay.autoDefaultFreeKm ? 'var(--gold)' : 'inherit' }}>
                          {calcDay.freeKm.toLocaleString()} km
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Extra KM</span>
                        <span>{calcDay.extraKm.toLocaleString()} km</span>
                      </div>
                      {calcDay.extraKmCharge > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Extra KM Charge</span>
                          <span>LKR {calcDay.extraKmCharge.toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  )}
                  {calcDay.rateDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e' }}>
                      <span>Rate Discount</span>
                      <span>− LKR {calcDay.rateDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  {calcDay.kmDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e' }}>
                      <span>Free KM Bonus</span>
                      <span>− LKR {calcDay.kmDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  {calcDay.additionalDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e' }}>
                      <span>Additional Discount</span>
                      <span>− LKR {calcDay.additionalDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.45rem', marginTop: '0.2rem', fontWeight: 700, fontSize: '1rem', color: 'var(--gold)' }}>
                    <span>Trip Total</span>
                    <span>LKR {calcDay.final.toLocaleString()}</span>
                  </div>
                  {commissionCalc && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444', marginTop: '0.35rem' }}>
                        <span>
                          Commission
                          {commissionCalc.isCustom
                            ? ' (custom)'
                            : commissionCalc.tripPrice >= 5000 ? ' (10%)' : ' (flat < 5k)'}
                        </span>
                        <span>− LKR {commissionCalc.commission.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', color: '#22c55e' }}>
                        <span>Net to Owner</span>
                        <span>LKR {commissionCalc.netToOwner.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={completing} style={{ alignSelf: 'stretch' }}>
              {completing ? <span className="spinner" /> : '✓ Complete Booking'}
            </button>
          </form>
        </div>
      )}

      {/* ── Completed — Invoice Section ──────────────────────────────────── */}
      {booking.status === 'completed' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '1rem' }}>🧾 Invoice</div>

          {/* Amount summary */}
          <div style={{ background: '#0f0f0f', border: '1px solid rgba(201,162,39,0.2)', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.88rem' }}>
              {booking.extraKm > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Extra KM Charge ({booking.extraKm} km)</span>
                  <span>LKR {(booking.extraKmCharge || 0).toLocaleString()}</span>
                </div>
              )}
              {booking.freeKm != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Free KM Used</span>
                  <span>{booking.freeKm} km</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Base Amount</span><span>LKR {(booking.baseAmount || 0).toLocaleString()}</span></div>
              {(booking.discountAmount - (booking.additionalDiscount || 0)) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e' }}><span>Rate / KM Discount</span><span>- LKR {(booking.discountAmount - (booking.additionalDiscount || 0)).toLocaleString()}</span></div>
              )}
              {booking.additionalDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e' }}><span>Additional Discount</span><span>- LKR {booking.additionalDiscount.toLocaleString()}</span></div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.45rem', marginTop: '0.2rem', fontWeight: 700, fontSize: '1.05rem', color: 'var(--gold)' }}>
                <span>Trip Total</span><span>LKR {(booking.finalAmount || 0).toLocaleString()}</span>
              </div>
              {booking.isOutsourced && booking.commissionAmount != null && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444', marginTop: '0.35rem' }}>
                    <span>Commission</span>
                    <span>− LKR {Number(booking.commissionAmount).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', color: '#22c55e' }}>
                    <span>Net to Owner</span>
                    <span>LKR {Math.max(0, (booking.finalAmount || 0) - Number(booking.commissionAmount)).toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button onClick={handleGenerateInvoice} className="btn btn-primary" disabled={generating}>
              {generating ? <span className="spinner" /> : '📄 Generate PDF'}
            </button>
            {booking.invoiceUrl && <a href={booking.invoiceUrl} target="_blank" className="btn btn-secondary">⬇ Download</a>}
            {(invoice || booking.invoiceUrl) && (
              <button onClick={handleWhatsApp} className="btn btn-sm" style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 10, padding: '0.55rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15 }}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                WhatsApp
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
