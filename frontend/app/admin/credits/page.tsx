'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCreditAccounts } from '@/lib/api';
import { Wallet, Eye } from 'lucide-react';
import CreditAccountModal from '@/components/CreditAccountModal';

type CreditRow = {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  totalCredit: number;
  totalPaid: number;
  balance: number;
  lastActivity: string | null;
};

const fmtMoney = (n: number) => `LKR ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const fmtDate = (ts: string | null) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function CreditsPage() {
  const [rows, setRows] = useState<CreditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const q = searchParams.get('q')?.toLowerCase() || '';

  const load = () => {
    setLoading(true);
    getCreditAccounts()
      .then(r => setRows(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = q
    ? rows.filter(r =>
        r.customerName.toLowerCase().includes(q) ||
        r.customerPhone?.toLowerCase().includes(q) ||
        r.customerEmail?.toLowerCase().includes(q))
    : rows;

  const totalOutstanding = rows.reduce((s, r) => s + r.balance, 0);

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Credit Accounts</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {q
              ? `${filtered.length} of ${rows.length} with outstanding balance`
              : `${rows.length} customer${rows.length === 1 ? '' : 's'} with outstanding balance · Total ${fmtMoney(totalOutstanding)}`}
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Wallet size={40} strokeWidth={1} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.25 }} />
          <p>{q ? `No credit accounts matching "${q}"` : 'No customers have outstanding credit'}</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="table-wrap responsive-hide-mobile">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th style={{ textAlign: 'right' }}>Total Credit</th>
                  <th style={{ textAlign: 'right' }}>Paid</th>
                  <th style={{ textAlign: 'right' }}>Outstanding</th>
                  <th>Last Activity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.customerId}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.customerName}</div>
                      {r.customerEmail && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.customerEmail}</div>}
                    </td>
                    <td>{r.customerPhone || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{fmtMoney(r.totalCredit)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--success, #16a34a)' }}>{fmtMoney(r.totalPaid)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger, #d97706)' }}>{fmtMoney(r.balance)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{fmtDate(r.lastActivity)}</td>
                    <td>
                      <button onClick={() => setOpenCustomerId(r.customerId)} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Eye size={12} strokeWidth={1.5} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="responsive-show-mobile" style={{ display: 'none', flexDirection: 'column', gap: '0.75rem' }}>
            {filtered.map(r => (
              <div key={r.customerId} className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{r.customerName}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{r.customerPhone || '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Outstanding</div>
                    <div style={{ fontWeight: 700, color: 'var(--danger, #d97706)' }}>{fmtMoney(r.balance)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  <span>Taken: {fmtMoney(r.totalCredit)}</span>
                  <span>Paid: {fmtMoney(r.totalPaid)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setOpenCustomerId(r.customerId)} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Eye size={12} strokeWidth={1.5} /> View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <CreditAccountModal
        open={openCustomerId != null}
        customerId={openCustomerId}
        onClose={() => setOpenCustomerId(null)}
        onChanged={load}
      />
    </div>
  );
}
