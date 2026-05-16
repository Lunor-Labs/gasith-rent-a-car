'use client';
import { BarChart2 } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="animate-fade">
      <div className="page-header" style={{ marginBottom: '1.75rem' }}>
        <div>
          <h1 className="page-title">Reports</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Revenue analytics and fleet performance reports
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'rgba(212,168,83,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem',
        }}>
          <BarChart2 size={28} strokeWidth={1.5} color="var(--gold)" />
        </div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Coming Soon
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' }}>
          Advanced revenue reports, fleet utilisation analytics, and exportable summaries
          are being built. Check back soon!
        </p>
      </div>
    </div>
  );
}
