'use client';
import { useEffect, useState } from 'react';
import { getAdminReviews, syncGoogleReviews, toggleReview } from '@/lib/api';
import toast from 'react-hot-toast';
import { RefreshCw, Eye, EyeOff, Star } from 'lucide-react';

interface Review {
  id: string;
  author_name: string;
  author_url: string | null;
  profile_photo_url: string | null;
  rating: number;
  text: string;
  time: number;
  relative_time_description: string | null;
  show_on_homepage: boolean;
  synced_at: string;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getAdminReviews()
      .then(r => setReviews(r.data))
      .catch(() => toast.error('Failed to load reviews'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await syncGoogleReviews();
      toast.success(`Synced ${r.data.synced} review${r.data.synced !== 1 ? 's' : ''} from Google`);
      load();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Sync failed';
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  };

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    try {
      const r = await toggleReview(id);
      setReviews(prev =>
        prev.map(rv => rv.id === id ? { ...rv, show_on_homepage: r.data.show_on_homepage } : rv)
      );
    } catch {
      toast.error('Failed to update review');
    } finally {
      setTogglingId(null);
    }
  };

  const visibleCount = reviews.filter(r => r.show_on_homepage).length;

  return (
    <div className="animate-fade">
      <div className="page-header" style={{ marginBottom: '1.75rem' }}>
        <div>
          <h1 className="page-title">Google Reviews</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Sync reviews from Google and choose which ones appear on the homepage.
            {reviews.length > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--gold)', fontWeight: 600 }}>
                {visibleCount} of {reviews.length} showing
              </span>
            )}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSync}
          disabled={syncing}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <RefreshCw size={14} strokeWidth={2} className={syncing ? 'spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync from Google'}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : reviews.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Star size={32} strokeWidth={1.5} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
          <div style={{ fontWeight: 600, marginBottom: 8 }}>No reviews yet</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 380, margin: '0 auto' }}>
            Click "Sync from Google" to fetch your latest Google reviews. Make sure
            <code style={{ background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 4, fontSize: '0.78rem' }}>GOOGLE_PLACES_API_KEY</code> and
            <code style={{ background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 4, fontSize: '0.78rem' }}>GOOGLE_PLACE_ID</code> are set in the backend environment.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {reviews.map(review => (
            <div
              key={review.id}
              className="card"
              style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                borderLeft: review.show_on_homepage ? '3px solid var(--gold)' : '3px solid transparent',
                opacity: review.show_on_homepage ? 1 : 0.6,
                transition: 'opacity 0.2s, border-color 0.2s',
              }}
            >
              {/* Avatar */}
              {review.profile_photo_url ? (
                <img
                  src={review.profile_photo_url}
                  alt={review.author_name}
                  style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)',
                }}>
                  {review.author_name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{review.author_name}</span>
                  <span style={{ color: 'var(--gold)', fontSize: '0.82rem', letterSpacing: 1 }}>
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </span>
                  {review.relative_time_description && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {review.relative_time_description}
                    </span>
                  )}
                  {review.show_on_homepage && (
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                      color: 'var(--gold)', background: 'rgba(245,197,24,0.12)', padding: '2px 7px', borderRadius: 99,
                    }}>
                      Showing
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                  {review.text}
                </p>
              </div>

              {/* Toggle */}
              <button
                onClick={() => handleToggle(review.id)}
                disabled={togglingId === review.id}
                title={review.show_on_homepage ? 'Hide from homepage' : 'Show on homepage'}
                style={{
                  flexShrink: 0, background: 'none', border: '1px solid var(--border-subtle)',
                  borderRadius: 8, padding: '0.4rem 0.75rem', cursor: 'pointer',
                  color: review.show_on_homepage ? 'var(--gold)' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600,
                  transition: 'color 0.2s, border-color 0.2s',
                }}
              >
                {togglingId === review.id ? (
                  <span className="spinner" style={{ width: 12, height: 12 }} />
                ) : review.show_on_homepage ? (
                  <><Eye size={13} strokeWidth={2} /> Showing</>
                ) : (
                  <><EyeOff size={13} strokeWidth={2} /> Hidden</>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
