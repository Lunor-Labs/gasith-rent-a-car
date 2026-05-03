'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

const NAV = [
  { label: 'Dashboard', href: '/admin', icon: '📊', exact: true },
  { label: 'Vehicles',  href: '/admin/vehicles',  icon: '🚗', exact: false },
  { label: 'Customers', href: '/admin/customers', icon: '👥', exact: false },
  { label: 'Bookings',  href: '/admin/bookings',  icon: '📋', exact: false },
  { label: 'Invoices',  href: '/admin/invoices',  icon: '🧾', exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // Active route detection
  const isActive = (item: typeof NAV[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const currentPage = NAV.find(n => isActive(n))?.label || 'Dashboard';

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading]);

  // Scroll-aware floating topbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 1);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    router.push('/login');
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  );

  if (!user) return null;

  // Avatar initials from email
  const initials = user.email?.slice(0, 2).toUpperCase() ?? 'AD';

  return (
    <div className="admin-layout">
      {/* Sidebar overlay (mobile) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-logo">
          <span>GASITH</span> RENT A CAR
          <div className="sidebar-logo-sub">Admin Panel</div>
        </div>
        <div className="sidebar-separator" />

        {/* Nav */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main Menu</div>
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive(item) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-item-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Upgrade card (Horizon-style) */}
        <div className="sidebar-footer">
          <div className="sidebar-upgrade-card">
            <div className="sidebar-upgrade-icon">🚀</div>
            <div className="sidebar-upgrade-title">Need Help?</div>
            <div className="sidebar-upgrade-desc">
              Access documentation and support for your rental management system.
            </div>
            <a href="/" target="_blank" className="btn btn-primary btn-sm btn-full">
              View Site
            </a>
          </div>
        </div>

        {/* User row */}
        <div className="sidebar-user-row">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-email">{user.email}</div>
          <button
            onClick={handleLogout}
            className="topbar-action-btn"
            title="Logout"
            style={{ flexShrink: 0 }}
          >
            🚪
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="admin-main" ref={mainRef}>
        {/* Mobile Topbar */}
        <div className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
          <div className="topbar-title">{currentPage}</div>
          <a href="/" target="_blank" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            View Site
          </a>
        </div>

        {/* Floating glass topbar (desktop – Horizon UI style) */}
        <div className={`admin-topbar-float ${scrolled ? 'scrolled' : ''}`}>
          <div className="topbar-breadcrumb">
            <div className="topbar-breadcrumb-trail">
              <a href="/admin">Pages</a>
              <span>/</span>
              <span style={{ color: 'var(--text-secondary)' }}>{currentPage}</span>
            </div>
            <div className="topbar-page-title">{currentPage}</div>
          </div>

          <div className="topbar-actions">
            {/* Search button */}
            <button className="topbar-action-btn" title="Search">🔍</button>
            {/* Notifications */}
            <button className="topbar-action-btn" title="Notifications">🔔</button>
            {/* View site */}
            <a href="/" target="_blank" className="topbar-action-btn" title="View Site">🌐</a>
            {/* Avatar with logout dropdown */}
            <div className="topbar-avatar" onClick={handleLogout} title="Logout">
              {initials}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  );
}
