'use client';
import { useEffect, useState } from 'react';
import { getPricingConfig, updatePricingConfig } from '@/lib/api';
import toast from 'react-hot-toast';
import { Route, CalendarDays, Save } from 'lucide-react';

export default function SettingsPage() {
  const [config, setConfig] = useState({ firstDayFreeKm: 150, subsequentDayFreeKm: 100 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPricingConfig()
      .then(r => setConfig({ firstDayFreeKm: r.data.firstDayFreeKm, subsequentDayFreeKm: r.data.subsequentDayFreeKm }))
      .catch(() => toast.error('Failed to load config'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updatePricingConfig(config);
      toast.success('Pricing config updated');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const previewDays = [1, 2, 3, 5, 7];
  const calcFreeKm = (days: number) =>
    config.firstDayFreeKm + (days - 1) * config.subsequentDayFreeKm;

  return (
    <div className="animate-fade">
      <div className="page-header" style={{ marginBottom: '1.75rem' }}>
        <div>
          <h1 className="page-title">Settings</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            System configuration and preferences
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', maxWidth: 560 }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>
          Free KM Allocation Defaults
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          These defaults apply to all new per-day bookings. Individual bookings can override them.
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto' }} />
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CalendarDays size={11} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                  First Day Free KM
                </label>
                <input
                  type="number" className="form-input" min={1}
                  value={config.firstDayFreeKm}
                  onChange={e => setConfig(c => ({ ...c, firstDayFreeKm: Number(e.target.value) }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Route size={11} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                  Each Subsequent Day Free KM
                </label>
                <input
                  type="number" className="form-input" min={1}
                  value={config.subsequentDayFreeKm}
                  onChange={e => setConfig(c => ({ ...c, subsequentDayFreeKm: Number(e.target.value) }))}
                  required
                />
              </div>
            </div>

            {/* Live preview table */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '0.6rem 0.85rem', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Free KM Preview
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${previewDays.length}, 1fr)` }}>
                {previewDays.map((days, i) => (
                  <div key={days} style={{ padding: '0.6rem 0.5rem', textAlign: 'center', borderRight: i < previewDays.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                      {days} day{days > 1 ? 's' : ''}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--gold)' }}>
                      {calcFreeKm(days)} km
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {saving ? <span className="spinner" /> : <><Save size={14} strokeWidth={2} /> Save Changes</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
