'use client';
import { useEffect, useState } from 'react';
import { getCreditAccount, addCreditPayment, deleteCreditPayment } from '@/lib/api';
import toast from 'react-hot-toast';
import { Wallet, Plus, Trash2, Receipt, ArrowDownCircle } from 'lucide-react';

type Booking = {
  id: string;
  creditAmount: number;
  cashAmount: number;
  finalAmount: number;
  paymentMethod: string;
  date: string;
  status: string;
  vehicleName: string;
  vehiclePlate: string;
};

type Payment = {
  id: string;
  amount: number;
  paidAt: string;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
};

type Detail = {
  customer: { id: string; name: string; phone: string; email: string };
  totalCredit: number;
  totalPaid: number;
  balance: number;
  bookings: Booking[];
  payments: Payment[];
};

type Props = {
  open: boolean;
  customerId: string | null;
  onClose: () => void;
  onChanged?: () => void;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const fmtMoney = (n: number) => `LKR ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const fmtDate = (ts: string | null | undefined) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function CreditAccountModal({ open, customerId, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(todayISO());
  const [note, setNote] = useState('');

  const load = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const r = await getCreditAccount(customerId);
      setDetail(r.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load credit account');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && customerId) {
      setShowForm(false);
      setAmount('');
      setPaidAt(todayISO());
      setNote('');
      load();
    } else {
      setDetail(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customerId]);

  if (!open || !customerId) return null;

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSubmitting(true);
    try {
      await addCreditPayment(customerId, { amount: numericAmount, paidAt, note: note || undefined });
      toast.success('Payment recorded');
      setAmount('');
      setNote('');
      setShowForm(false);
      await load();
      onChanged?.();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm('Delete this payment record?')) return;
    try {
      await deleteCreditPayment(id);
      toast.success('Payment deleted');
      await load();
      onChanged?.();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete payment');
    }
  };

  const balanceColor = detail && detail.balance > 0
    ? 'var(--danger, #d97706)'
    : 'var(--success, #16a34a)';

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Wallet size={18} strokeWidth={1.6} style={{ color: 'var(--gold)' }} />
            <h2 className="modal-title">Credit Account{detail ? ` — ${detail.customer.name}` : ''}</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm">✕</button>
        </div>

        {loading || !detail ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Summary cards */}
            <div className="grid-3" style={{ gap: '0.75rem' }}>
              <SummaryCard label="Total Credit Taken" value={fmtMoney(detail.totalCredit)} />
              <SummaryCard label="Total Paid" value={fmtMoney(detail.totalPaid)} />
              <SummaryCard label="Outstanding" value={fmtMoney(detail.balance)} accent={balanceColor} />
            </div>

            {/* Add payment */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              {!showForm ? (
                <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Plus size={14} strokeWidth={2} /> Record Payment
                </button>
              ) : (
                <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">Cancel</button>
              )}
            </div>

            {showForm && (
              <form onSubmit={handleAddPayment} style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 10, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="grid-3" style={{ gap: '0.75rem' }}>
                  <Field label="Amount (LKR)">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      required
                      className="form-input"
                      placeholder="0.00"
                    />
                  </Field>
                  <Field label="Paid On">
                    <input
                      type="date"
                      value={paidAt}
                      onChange={e => setPaidAt(e.target.value)}
                      required
                      className="form-input"
                    />
                  </Field>
                  <Field label="Note (optional)">
                    <input
                      type="text"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      className="form-input"
                      placeholder="e.g. cash settlement"
                    />
                  </Field>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
                    {submitting ? 'Saving…' : 'Save Payment'}
                  </button>
                </div>
              </form>
            )}

            {/* Bookings on credit */}
            <Section title="Bookings on Credit" icon={<Receipt size={14} strokeWidth={1.5} />}>
              {detail.bookings.length === 0 ? (
                <EmptyRow text="No bookings have used credit yet." />
              ) : (
                <TxList>
                  {detail.bookings.map(b => (
                    <li key={b.id} style={txRowStyle}>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <code style={{ color: 'var(--gold)' }}>{b.id.slice(0, 8).toUpperCase()}</code>
                          <span className={`badge ${b.status === 'completed' ? 'badge-success' : b.status === 'active' ? 'badge-info' : 'badge-muted'}`} style={{ fontSize: '0.62rem' }}>{b.status}</span>
                          <span className="badge badge-muted" style={{ fontSize: '0.62rem' }}>{b.paymentMethod}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {b.vehicleName} {b.vehiclePlate && `(${b.vehiclePlate})`} · {fmtDate(b.date)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: 'var(--danger, #d97706)' }}>+{fmtMoney(b.creditAmount)}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>of {fmtMoney(b.finalAmount)} total</div>
                      </div>
                    </li>
                  ))}
                </TxList>
              )}
            </Section>

            {/* Settlements */}
            <Section title="Settlements / Payments" icon={<ArrowDownCircle size={14} strokeWidth={1.5} />}>
              {detail.payments.length === 0 ? (
                <EmptyRow text="No payments recorded yet." />
              ) : (
                <TxList>
                  {detail.payments.map(p => (
                    <li key={p.id} style={txRowStyle}>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{fmtDate(p.paidAt)}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {p.note || 'Payment received'}{p.createdBy ? ` · by ${p.createdBy}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--success, #16a34a)' }}>−{fmtMoney(p.amount)}</div>
                        <button onClick={() => handleDeletePayment(p.id)} className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.45rem' }} title="Delete">
                          <Trash2 size={12} strokeWidth={1.5} />
                        </button>
                      </div>
                    </li>
                  ))}
                </TxList>
              )}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

const txRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.6rem 0.75rem',
  background: 'var(--bg-elevated)',
  borderRadius: 8,
  fontSize: '0.85rem',
  gap: '0.75rem',
};

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)', padding: '0.85rem 1rem' }}>
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ marginTop: 4, fontWeight: 700, fontSize: '1.05rem', color: accent || 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function TxList({ children }: { children: React.ReactNode }) {
  return <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>{children}</ul>;
}

function EmptyRow({ text }: { text: string }) {
  return <div style={{ padding: '0.85rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', background: 'var(--bg-elevated)', borderRadius: 8 }}>{text}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</span>
      {children}
    </label>
  );
}
