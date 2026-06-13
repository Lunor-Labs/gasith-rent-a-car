'use client';
import { useRef, useState, useEffect } from 'react';
import { signAgreement } from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
  bookingId: string;
  customerName: string;
  onClose: () => void;
  onSigned: (pdfUrl: string) => void;
}

const TERMS = {
  en: [
    { title: '1. Vehicle Condition', body: 'The renter agrees to return the vehicle in the same condition as received. Any damage, scratches, dents, or mechanical faults caused during the rental period are the full financial responsibility of the renter.' },
    { title: '2. Damage Liability', body: 'In the event of any damage to the vehicle during the rental period (including accidents, vandalism, or negligence), the renter agrees to bear the full cost of repairs as assessed by Gasith Rent a Car. The renter shall not dispute the repair cost assessment.' },
    { title: '3. Fuel Policy', body: 'The vehicle must be returned with the same fuel level as at the time of collection. Any fuel deficit will be charged at market rate plus a service fee.' },
    { title: '4. Late Return', body: 'The vehicle must be returned on or before the agreed due date. Late returns will be charged at the daily rental rate for each additional day or part thereof.' },
    { title: '5. Traffic Fines & Violations', body: 'The renter is solely responsible for any traffic fines, parking violations, or legal penalties incurred during the rental period.' },
    { title: '6. Prohibited Use', body: 'The vehicle shall not be used for illegal purposes, racing, or driven outside of Sri Lanka without prior written consent from Gasith Rent a Car.' },
    { title: '7. Acceptance', body: 'By signing below, the renter confirms they have read, understood, and agreed to all of the above terms and conditions. This agreement is legally binding.' },
  ],
  si: [
    { title: '1. වාහන තත්ත්වය', body: 'කුලී ගන්නා තැනැත්තා, ලැබුණු ඒකම තත්ත්වයේ වාහනය ආපසු සළකා ගැනීමට එකඟ වෙයි. කුලී කාලය තුළ සිදු වූ ඕනෑම හානියක්, සීරීම්, රළු ගැටීම් හෝ යාන්ත්‍රික දෝෂ සඳහා කුලී ගන්නා තැනැත්තා සම්පූර්ණ මූල්‍ය වගකීම භාරගනී.' },
    { title: '2. හානි වගකීම', body: 'කුලී කාලය තුළ වාහනයට ඕනෑම හානියක් සිදු වූ විට (අනතුරු, කාරණා හෝ නොසැලකිලිමත්කම ඇතුළුව), Gasith Rent a Car ආයතනය විසින් තක්සේරු කළ සම්පූර්ණ අලුත්වැඩියා පිරිවැය දැරීමට කුලී ගන්නා තැනැත්තා එකඟ වෙයි.' },
    { title: '3. ඉන්ධන ප්‍රතිපත්තිය', body: 'වාහනය ලබාගත් විට තිබූ ඉන්ධන ප්‍රමාණයෙන්ම ආපසු ලබා දිය යුතුය. ඉන්ධන හිඟය වෙළඳපල මිලට අමතරව සේවා ගාස්තුවක් සහිතව අය කෙරෙනු ඇත.' },
    { title: '4. ප්‍රමාදය', body: 'වාහනය එකඟ වූ නියමිත දිනට හෝ ඊට පෙර ආපසු ලබා දිය යුතුය. ප්‍රමාද ආපසු ලබා දීම් සඳහා අමතර දිනකට හෝ එහි කොටසකට දෛනික කුලී අනුපාතය අය කෙරෙනු ඇත.' },
    { title: '5. රථ වාහන දඩ', body: 'කුලී කාලය තුළ ලැබෙන ඕනෑම රථ වාහන දඩ, නවතා තැබීමේ දඩ හෝ නීතිමය දඬුවම් සඳහා කුලී ගන්නා තැනැත්තා පමණක් වගකිව යුතුය.' },
    { title: '6. තහනම් භාවිතය', body: 'Gasith Rent a Car ආයතනයේ පූර්ව ලිඛිත අනුමැතියකින් තොරව නීති විරෝධී කටයුතු, රේස් කිරීම හෝ ශ්‍රී ලංකාවෙන් පිටත වාහනය ධාවනය කිරීම තහනම්ය.' },
    { title: '7. පිළිගැනීම', body: 'පහත අත්සන් කිරීමෙන්, කුලී ගන්නා තැනැත්තා ඉහත සියලු නියම සහ කොන්දේසි කියවා, තේරුම් ගෙන, එකඟ වී ඇති බව තහවුරු කරයි. මෙම ගිවිසුම නීතිමය වශයෙන් බැඳෙනසුළු වේ.' },
  ],
};

export default function AgreementSignModal({ bookingId, customerName, onClose, onSigned }: Props) {
  const [language, setLanguage] = useState<'en' | 'si'>('en');
  const [signed, setSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasStroke = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width  || canvas.offsetWidth;
      canvas.height = rect.height || canvas.offsetHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };
    resize();

    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      drawing.current = true;
      const ctx = canvas.getContext('2d')!;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      if (!drawing.current) return;
      const ctx = canvas.getContext('2d')!;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      if (!hasStroke.current) { hasStroke.current = true; setSigned(true); }
    };

    const onUp = () => { drawing.current = false; };

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

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    hasStroke.current = false;
    setSigned(false);
  };

  const handleSign = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signature = canvas.toDataURL('image/png');
    setSubmitting(true);
    try {
      const r = await signAgreement(bookingId, { signature, language });
      toast.success('Agreement signed!');
      onSigned(r.data.pdfUrl);
    } catch {
      toast.error('Failed to save agreement');
    } finally {
      setSubmitting(false);
    }
  };

  const terms = TERMS[language];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg-primary)',
      zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: '#161616', borderBottom: '2px solid var(--gold)',
        padding: '0.75rem 1rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gold)' }}>Rental Agreement</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{customerName}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {(['en', 'si'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                style={{
                  padding: '0.3rem 0.7rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
                  cursor: 'pointer', border: 'none',
                  background: language === lang ? 'var(--gold)' : 'rgba(255,255,255,0.08)',
                  color: language === lang ? '#161616' : 'var(--text-secondary)',
                }}
              >
                {lang === 'en' ? 'EN' : 'සිං'}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.3rem', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Terms — scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', paddingBottom: 0 }}>
        <div style={{ marginBottom: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Terms &amp; Conditions
        </div>
        {terms.map((clause, i) => (
          <div key={i} style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
              {clause.title}
            </div>
            <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {clause.body}
            </div>
          </div>
        ))}
      </div>

      {/* Signature area — fixed at bottom */}
      <div style={{
        flexShrink: 0, padding: '1rem',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-elevated)',
      }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
          Your Signature
        </div>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%', height: 130,
            background: '#fff', borderRadius: 10,
            border: '2px solid var(--border)',
            display: 'block', touchAction: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem' }}>
          <button
            onClick={handleClear}
            className="btn btn-secondary btn-sm"
            style={{ flex: 1 }}
          >
            Clear
          </button>
          <button
            onClick={handleSign}
            className="btn btn-primary"
            disabled={!signed || submitting}
            style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            {submitting ? <span className="spinner" /> : '✓ Sign & Agree'}
          </button>
        </div>
      </div>
    </div>
  );
}
