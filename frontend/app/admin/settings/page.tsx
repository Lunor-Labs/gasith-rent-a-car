'use client';
import { useEffect, useState, useRef } from 'react';
import { getPricingConfig, updatePricingConfig, getAppConfig, saveAppConfig } from '@/lib/api';
import toast from 'react-hot-toast';
import { Route, CalendarDays, Save } from 'lucide-react';

export default function SettingsPage() {
  const [config, setConfig] = useState({ firstDayFreeKm: 150, subsequentDayFreeKm: 100 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Company signatory state
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigDrawing = useRef(false);
  const [signatoryName, setSignatoryName]   = useState('');
  const [signatoryTitle, setSignatoryTitle] = useState('');
  const [sigHasStroke, setSigHasStroke]     = useState(false);
  const [savingSig, setSavingSig]           = useState(false);

  useEffect(() => {
    Promise.all([getPricingConfig(), getAppConfig()])
      .then(([pRes, aRes]) => {
        setConfig({ firstDayFreeKm: pRes.data.firstDayFreeKm, subsequentDayFreeKm: pRes.data.subsequentDayFreeKm });
        setSignatoryName(aRes.data.companySignatoryName || '');
        setSignatoryTitle(aRes.data.companySignatoryTitle || '');
        if (aRes.data.companySignature) {
          setSigHasStroke(true);
          setTimeout(() => {
            const canvas = sigCanvasRef.current;
            if (!canvas) return;
            canvas.width  = canvas.offsetWidth  || 400;
            canvas.height = canvas.offsetHeight || 120;
            const img = new Image();
            img.onload = () => canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
            img.src = aRes.data.companySignature;
          }, 150);
        }
      })
      .catch(() => toast.error('Failed to load config'))
      .finally(() => setLoading(false));
  }, []);

  // Canvas drawing setup
  useEffect(() => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;

    canvas.width  = canvas.offsetWidth  || 400;
    canvas.height = canvas.offsetHeight || 120;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      sigDrawing.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      if (!sigDrawing.current) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      setSigHasStroke(true);
    };

    const onUp = () => { sigDrawing.current = false; };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', onUp);

    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onUp);
    };
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

  const handleSaveSignatory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSig(true);
    try {
      const companySignature = sigCanvasRef.current?.toDataURL('image/png') || '';
      await saveAppConfig({ companySignatoryName: signatoryName, companySignatoryTitle: signatoryTitle, companySignature });
      toast.success('Company signatory saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSavingSig(false);
    }
  };

  const handleClearSig = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setSigHasStroke(false);
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

      {/* ── Free KM Config ── */}
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

      {/* ── Company Signatory ── */}
      <div className="card" style={{ padding: '1.5rem', maxWidth: 560, marginTop: '1.5rem' }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>
          Company Signatory
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          This signature appears on all rental agreements alongside the customer signature.
        </p>

        <form onSubmit={handleSaveSignatory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Authorized Person Name</label>
              <input
                type="text" className="form-input"
                placeholder="e.g. Gasith Rajapaksa"
                value={signatoryName}
                onChange={e => setSignatoryName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Designation / Title</label>
              <input
                type="text" className="form-input"
                placeholder="e.g. Manager"
                value={signatoryTitle}
                onChange={e => setSignatoryTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Authorized Signature
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.4rem', fontSize: '0.72rem' }}>
                (draw with mouse or finger)
              </span>
            </label>
            <canvas
              ref={sigCanvasRef}
              style={{
                width: '100%', height: 120,
                background: '#fff', borderRadius: 10,
                border: '2px solid var(--border)',
                display: 'block', touchAction: 'none',
              }}
            />
            {sigHasStroke && (
              <button
                type="button"
                onClick={handleClearSig}
                style={{ fontSize: '0.72rem', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}
              >
                ↺ Clear &amp; redraw
              </button>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={savingSig}
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            {savingSig ? <span className="spinner" /> : <><Save size={14} strokeWidth={2} /> Save Signatory</>}
          </button>
        </form>
      </div>
    </div>
  );
}
