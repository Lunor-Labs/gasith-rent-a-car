'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import {
  LayoutGrid, Car, Users, CalendarDays, Receipt,
  BarChart2, Settings, Bell, Search, Globe, LogOut, Menu, Car as CarIcon,
} from 'lucide-react';

const MAIN_NAV = [
  { label: 'Dashboard', href: '/admin',           Icon: LayoutGrid,   exact: true,  badge: null },
  { label: 'Vehicles',  href: '/admin/vehicles',  Icon: Car,          exact: false, badge: 24   },
  { label: 'Customers', href: '/admin/customers', Icon: Users,        exact: false, badge: 142  },
  { label: 'Bookings',  href: '/admin/bookings',  Icon: CalendarDays, exact: false, badge: 18   },
  { label: 'Invoices',  href: '/admin/invoices',  Icon: Receipt,      exact: false, badge: null },
];

const WORKSPACE_NAV = [
  { label: 'Reports',  href: '/admin/reports',  Icon: BarChart2, exact: false },
  { label: 'Settings', href: '/admin/settings', Icon: Settings,  exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const isActive = (item: { href: string; exact: boolean }) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const currentPage = [...MAIN_NAV, ...WORKSPACE_NAV].find(n => isActive(n))?.label ?? 'Dashboard';

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 1);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
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

  const initials = user.email?.slice(0, 2).toUpperCase() ?? 'AD';

  // Current month label for topbar chip
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="admin-layout">
      <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-logo">
          <CarIcon size={16} strokeWidth={1.5} style={{ color: 'var(--gold)', display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} />
          <span>Gasith</span> Rent a Car
          <div className="sidebar-logo-sub">Admin Portal</div>
        </div>
        <div className="sidebar-separator" />

        {/* Nav */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main</div>
          {MAIN_NAV.map(({ label, href, Icon, exact, badge }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${isActive({ href, exact }) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-item-icon"><Icon size={15} strokeWidth={1.5} /></span>
              {label}
              {badge != null && <span className="nav-badge">{badge}</span>}
            </Link>
          ))}

          <div className="sidebar-section-label" style={{ marginTop: '1.25rem' }}>Workspace</div>
          {WORKSPACE_NAV.map(({ label, href, Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${isActive({ href, exact }) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-item-icon"><Icon size={15} strokeWidth={1.5} /></span>
              {label}
            </Link>
          ))}
        </nav>

        {/* User row — no upgrade card */}
        <div className="sidebar-user-row">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-email">{user.email}</div>
          <button onClick={handleLogout} className="topbar-action-btn" title="Logout" style={{ flexShrink: 0 }}>
            <LogOut size={14} strokeWidth={1.5} />
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="admin-main" ref={mainRef}>
        {/* Mobile topbar */}
        <div className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={18} strokeWidth={1.5} />
          </button>
          <div className="topbar-title">{currentPage}</div>
          <a href="/" target="_blank" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>View Site</a>
        </div>

        {/* Floating glass topbar */}
        <div className={`admin-topbar-float ${scrolled ? 'scrolled' : ''}`}>
          <div className="topbar-breadcrumb">
            <div className="topbar-breadcrumb-trail">
              <a href="/admin">Pages</a>
              <span>/</span>
              <span style={{ color: 'var(--text-secondary)' }}>{currentPage}</span>
            </div>
            <div className="topbar-page-title">{currentPage}</div>
          </div>

          <div className="topbar-right">
            <div className="topbar-date-chip">
              <CalendarDays size={13} strokeWidth={1.5} />
              {monthLabel}
            </div>
            <div className="topbar-actions">
              <button className="topbar-action-btn" title="Search"><Search size={14} strokeWidth={1.5} /></button>
              <button className="topbar-action-btn" title="Notifications"><Bell size={14} strokeWidth={1.5} /></button>
              <a href="/" target="_blank" className="topbar-action-btn" title="View Site"><Globe size={14} strokeWidth={1.5} /></a>
              <div className="topbar-avatar" onClick={handleLogout} title="Logout">{initials}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}
