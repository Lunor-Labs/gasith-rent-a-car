'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  console.log('[LoginPage] render — user:', user?.email ?? null, '| loading:', loading, '| submitting:', submitting);

  useEffect(() => {
    console.log('[LoginPage] effect — user:', user?.email ?? null, '| loading:', loading);
    if (!loading && user) {
      console.log('[LoginPage] already logged in, redirecting to /admin');
      router.replace('/admin');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill in all fields');
    setSubmitting(true);
    try {
      console.log('[LoginPage] calling login()...');
      await login(email, password);
      console.log('[LoginPage] login() resolved — navigating to /admin');
      toast.success('Welcome back!');
      // Hard navigation to avoid any router cache / state issues
      window.location.href = '/admin';
    } catch (err: any) {
      console.error('[LoginPage] login error:', err.code, err.message);
      toast.error(err.message?.includes('Invalid login') ? 'Invalid email or password' : (err.message || 'Login failed'));
      setSubmitting(false);
    }
  };
//this added for deployment check

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #0f0e09 0%, #0a0a0a 60%)',
      padding: '1rem',
    }}>
      {/* Background glow */}
      <div style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '300px', background: 'radial-gradient(ellipse, rgba(201,162,39,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '420px', animation: 'slideUp 0.3s ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <img src="/logo.webp" alt="Gasith Rent a Car" style={{ width: 72, height: 72, borderRadius: 14, marginBottom: '1rem', display: 'inline-block' }} />
          <div style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 900, fontSize: '1.6rem', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--gold)' }}>GASITH</span> RENT A CAR
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin Portal</div>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <h1 style={{ fontSize: '1.3rem', marginBottom: '0.3rem' }}>Sign In</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.75rem' }}>Access your admin dashboard</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="admin@gasith.lk"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  style={{ paddingRight: '3rem' }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button id="login-btn" type="submit" className="btn btn-primary btn-full" disabled={submitting} style={{ marginTop: '0.5rem', padding: '0.85rem' }}>
              {submitting ? <span className="spinner" /> : 'Sign In to Dashboard'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <a href="/" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>← Back to Website</a>
        </div>
      </div>
    </div>
  );
}
