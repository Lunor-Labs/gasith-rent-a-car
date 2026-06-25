'use client';
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getCustomers, getCustomerBookings, toggleBlacklist } from '@/lib/api';
import toast from 'react-hot-toast';
import { Search, ShieldBan, ShieldCheck, CalendarDays, AlertTriangle, X } from 'lucide-react';

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  nicNumber: string;
  nicFrontUrl: string;
  nicBackUrl: string;
  drivingLicenseUrl: string;
  isActive: boolean;
  isBlacklisted: boolean;
  blacklistedAt: string | null;
  blacklistReason: string;
  createdAt: string;
};

type Booking = {
  id: string;
  status: string;
  startDate: string;
  endDate: string | null;
  finalAmount: number;
  totalKm: number;
  notes: string;
  createdAt: string;
};

export default function BlacklistPage() {
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [blacklistModalOpen, setBlacklistModalOpen] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (results.length > 0 && searchWrapRef.current) {
      setDropdownRect(searchWrapRef.current.getBoundingClientRect());
    } else {
      setDropdownRect(null);
    }
  }, [results]);

  useEffect(() => {
    getCustomers({ include_inactive: 'true' })
      .then(r => setAllCustomers(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    setResults(
      allCustomers.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.nicNumber?.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      ).slice(0, 10)
    );
  }, [query, allCustomers]);

  const selectCustomer = async (c: Customer) => {
    setSelected(c);
    setResults([]);
    setQuery('');
    setBookings([]);
    setLoadingBookings(true);
    try {
      const r = await getCustomerBookings(c.id);
      setBookings(r.data);
    } catch {}
    setLoadingBookings(false);
  };

  const refreshSelected = async () => {
    const r = await getCustomers({ include_inactive: 'true' });
    const updated = r.data as Customer[];
    setAllCustomers(updated);
    if (selected) {
      const refreshed = updated.find(c => c.id === selected.id);
      if (refreshed) setSelected(refreshed);
    }
  };

  const handleBlacklist = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await toggleBlacklist(selected.id, { blacklisted: true, reason });
      toast.success(`${selected.name} has been blacklisted`);
      setBlacklistModalOpen(false);
      setReason('');
      await refreshSelected();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to blacklist customer');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await toggleBlacklist(selected.id, { blacklisted: false, reason: '' });
      toast.success(`${selected.name} removed from blacklist`);
      setRemoveModalOpen(false);
      await refreshSelected();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove from blacklist');
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (ts: string | null) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const blacklistedCustomers = allCustomers.filter(c => c.isBlacklisted);

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Blacklist</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {blacklistedCustomers.length} blacklisted customer{blacklistedCustomers.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', overflow: 'visible' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
          Look up a customer
        </div>
        <div ref={searchWrapRef}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.65rem 1rem' }}>
            <Search size={15} strokeWidth={1.5} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, phone or NIC..."
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.9rem', width: '100%', fontFamily: 'inherit' }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                <X size={14} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Portal dropdown — renders at body level so no ancestor overflow clips it */}
      {results.length > 0 && dropdownRect && createPortal(
        <div style={{
          position: 'fixed',
          top: dropdownRect.bottom + 6,
          left: dropdownRect.left,
          width: dropdownRect.width,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          zIndex: 9999,
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden',
        }}>
          {results.map(c => (
            <button
              key={c.id}
              onClick={() => selectCustomer(c)}
              style={{ width: '100%', padding: '0.7rem 1rem', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{c.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.phone}{c.nicNumber ? ` · NIC: ${c.nicNumber}` : ''}</div>
              </div>
              {c.isBlacklisted && (
                <span className="badge badge-danger" style={{ fontSize: '0.65rem', flexShrink: 0 }}>Blacklisted</span>
              )}
            </button>
          ))}
        </div>,
        document.body
      )}

      {/* Selected customer profile */}
      {selected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Status banner */}
          {selected.isBlacklisted && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem 1.25rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-md)' }}>
              <AlertTriangle size={18} strokeWidth={1.5} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.88rem' }}>This customer is blacklisted</div>
                {selected.blacklistReason && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Reason: {selected.blacklistReason}</div>
                )}
                {selected.blacklistedAt && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Since {fmtDate(selected.blacklistedAt)}</div>
                )}
              </div>
            </div>
          )}

          {/* Customer card */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{selected.name}</span>
                  {selected.isBlacklisted && <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Blacklisted</span>}
                  {!selected.isActive && <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>Inactive</span>}
                </div>
                <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.6rem' }}>
                  {[
                    ['Phone', selected.phone],
                    ['Email', selected.email || '—'],
                    ['NIC', selected.nicNumber || '—'],
                    ['Address', selected.address || '—'],
                    ['Customer since', fmtDate(selected.createdAt)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                {selected.isBlacklisted ? (
                  <button
                    onClick={() => setRemoveModalOpen(true)}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <ShieldCheck size={14} strokeWidth={1.5} />
                    Remove from Blacklist
                  </button>
                ) : (
                  <button
                    onClick={() => { setReason(''); setBlacklistModalOpen(true); }}
                    className="btn btn-danger btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <ShieldBan size={14} strokeWidth={1.5} />
                    Add to Blacklist
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Booking history */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
              Trip History ({bookings.length})
            </div>
            {loadingBookings ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto' }} />
              </div>
            ) : bookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <CalendarDays size={28} strokeWidth={1} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.3 }} />
                No bookings found
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {bookings.map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', background: 'var(--bg-elevated)', borderRadius: 8, flexWrap: 'wrap' }}>
                    <code style={{ color: 'var(--gold)', fontSize: '0.8rem', flexShrink: 0 }}>{b.id.slice(0, 8).toUpperCase()}</code>
                    <span className={`badge ${b.status === 'completed' ? 'badge-success' : b.status === 'active' ? 'badge-info' : 'badge-muted'}`} style={{ fontSize: '0.7rem' }}>
                      {b.status}
                    </span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', flex: 1 }}>
                      {fmtDate(b.startDate)}{b.endDate ? ` → ${fmtDate(b.endDate)}` : ''}
                    </span>
                    {b.totalKm > 0 && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{b.totalKm.toLocaleString()} km</span>
                    )}
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>LKR {(b.finalAmount || 0).toLocaleString()}</span>
                    <a href={`/admin/bookings/${b.id}`} className="btn btn-ghost btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}>→</a>
                  </div>
                ))}
                {/* Summary row */}
                {bookings.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.5rem', padding: '0.5rem 0.85rem', fontSize: '0.82rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', marginTop: '0.25rem' }}>
                    <span>{bookings.length} trip{bookings.length !== 1 ? 's' : ''}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      Total: LKR {bookings.reduce((s, b) => s + (b.finalAmount || 0), 0).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Blacklisted customers quick list */}
      {!selected && blacklistedCustomers.length > 0 && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
            Currently Blacklisted ({blacklistedCustomers.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {blacklistedCustomers.map(c => (
              <button
                key={c.id}
                onClick={() => selectCustomer(c)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', background: 'var(--bg-elevated)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, textAlign: 'left', cursor: 'pointer', width: '100%' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)')}
              >
                <ShieldBan size={15} strokeWidth={1.5} style={{ color: '#ef4444', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{c.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {c.phone}{c.nicNumber ? ` · ${c.nicNumber}` : ''}
                    {c.blacklistReason ? ` · ${c.blacklistReason}` : ''}
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>{fmtDate(c.blacklistedAt)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no blacklisted customers and no search */}
      {!selected && blacklistedCustomers.length === 0 && !query && (
        <div className="empty-state">
          <ShieldCheck size={40} strokeWidth={1} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.25 }} />
          <p>No customers are blacklisted</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Search for a customer above to view their history and manage blacklist status</p>
        </div>
      )}

      {/* Blacklist confirm modal */}
      {blacklistModalOpen && selected && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setBlacklistModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldBan size={18} strokeWidth={1.5} style={{ color: '#ef4444' }} />
                Blacklist Customer
              </h2>
              <button onClick={() => setBlacklistModalOpen(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                You are about to blacklist <strong>{selected.name}</strong>. A warning will appear whenever this customer is selected for a new booking.
              </p>
              <div className="form-group">
                <label className="form-label">Reason (optional)</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Vehicle damage not paid, repeated no-shows..."
                  rows={3}
                  className="form-input"
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setBlacklistModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button onClick={handleBlacklist} disabled={saving} className="btn btn-danger btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ShieldBan size={13} strokeWidth={1.5} />
                  {saving ? 'Saving...' : 'Confirm Blacklist'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove from blacklist confirm modal */}
      {removeModalOpen && selected && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setRemoveModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} strokeWidth={1.5} style={{ color: 'var(--success)' }} />
                Remove from Blacklist
              </h2>
              <button onClick={() => setRemoveModalOpen(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Remove <strong>{selected.name}</strong> from the blacklist? They will no longer trigger a warning during booking.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setRemoveModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button onClick={handleRemove} disabled={saving} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ShieldCheck size={13} strokeWidth={1.5} />
                  {saving ? 'Saving...' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
