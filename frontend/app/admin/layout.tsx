'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getDashboardStats } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  LayoutGrid, Car, Users, CalendarDays, Receipt,
  Settings, LogOut, Menu, Sun, Moon, Bell, Search, BarChart2,
} from 'lucide-react';

const MAIN_NAV = [
  { label: 'Dashboard', href: '/admin',           Icon: LayoutGrid,   exact: true,  badgeKey: null      },
  { label: 'Vehicles',  href: '/admin/vehicles',  Icon: Car,          exact: false, badgeKey: 'totalVehicles'  },
  { label: 'Customers', href: '/admin/customers', Icon: Users,        exact: false, badgeKey: 'totalCustomers' },
  { label: 'Bookings',  href: '/admin/bookings',  Icon: CalendarDays, exact: false, badgeKey: 'activeBookings' },
  { label: 'Invoices',  href: '/admin/invoices',  Icon: Receipt,      exact: false, badgeKey: null      },
  { label: 'Reports',   href: '/admin/reports',   Icon: BarChart2,    exact: false, badgeKey: null      },
];

const WORKSPACE_NAV = [
  { label: 'Settings', href: '/admin/settings', Icon: Settings,  exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navCounts, setNavCounts] = useState<Record<string, number>>({});
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme, toggleTheme } = useTheme();

  useEffect(() => { setSearchQuery(''); }, [pathname]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const isActive = (item: { href: string; exact: boolean }) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const currentPage = [...MAIN_NAV, ...WORKSPACE_NAV].find(n => isActive(n))?.label ?? 'Dashboard';

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading]);

  // Fetch real counts for sidebar badges
  useEffect(() => {
    if (user) {
      getDashboardStats()
        .then(r => setNavCounts(r.data || {}))
        .catch(() => {});
    }
  }, [user]);



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
  const rawName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Admin';
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  return (
    <div className="admin-layout">
      <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-mark">G</div>
          <div>
            <div className="brand-name">Gasith</div>
            <div className="brand-sub">Rent a Car</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main</div>
          {MAIN_NAV.map(({ label, href, Icon, exact, badgeKey }) => {
            const badge = badgeKey ? navCounts[badgeKey] : undefined;
            return (
              <Link
                key={href}
                href={href}
                className={`nav-item ${isActive({ href, exact }) ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="nav-item-icon"><Icon size={17} strokeWidth={1.5} /></span>
                {label}
                {badge != null && <span className="nav-badge">{badge}</span>}
              </Link>
            );
          })}

          <div className="sidebar-section-label" style={{ marginTop: '1.25rem' }}>Workspace</div>
          {WORKSPACE_NAV.map(({ label, href, Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${isActive({ href, exact }) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-item-icon"><Icon size={17} strokeWidth={1.5} /></span>
              {label}
            </Link>
          ))}
        </nav>

        {/* User row */}
        <div className="sidebar-user-row">
          <div className="sidebar-user-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name">{displayName}</div>
            <div className="user-mail">{user.email}</div>
          </div>
          <button onClick={handleLogout} className="sidebar-logout-btn" title="Logout">
            <LogOut size={13} strokeWidth={1.5} />
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="admin-main">
        {/* Mobile topbar */}
        <div className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={18} strokeWidth={1.5} />
          </button>
          <div className="topbar-title">{currentPage}</div>
          <button className="topbar-action-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
          </button>
          <a href="/" target="_blank" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>View Site</a>
        </div>

        {/* Mobile search bar */}
        <div className="responsive-show-mobile" style={{ padding: '0.6rem 1rem 0.75rem', gap: 0 }}>
          <div className="topbar-search" style={{ width: '100%' }}>
            <Search size={13} strokeWidth={1.5} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
            <input
              value={searchQuery}
              onChange={e => {
                const v = e.target.value;
                setSearchQuery(v);
                router.replace(v ? `${pathname}?q=${encodeURIComponent(v)}` : pathname);
              }}
              placeholder={`Search ${{ Vehicles: 'by name or plate', Customers: 'by name or phone', Bookings: 'by customer or ID', Invoices: 'by invoice or booking ID' }[currentPage] ?? 'anything'}...`}
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.82rem', width: '100%', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        {/* Desktop floating topbar */}
        <div className={`admin-topbar-float${scrolled ? ' scrolled' : ''}`}>
          <div className="topbar-breadcrumb">
            <div className="topbar-breadcrumb-trail">
              <span>Pages</span>
              <span>/</span>
              <span style={{ color: 'var(--text-secondary)' }}>{currentPage}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="topbar-search">
              <Search size={13} strokeWidth={1.5} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
              <input
                value={searchQuery}
                onChange={e => {
                  const v = e.target.value;
                  setSearchQuery(v);
                  router.replace(v ? `${pathname}?q=${encodeURIComponent(v)}` : pathname);
                }}
                placeholder={`Search ${{ Vehicles: 'by name or plate', Customers: 'by name or phone', Bookings: 'by customer or ID', Invoices: 'by invoice or booking ID' }[currentPage] ?? 'anything'}...`}
                style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.76rem', width: 200, fontFamily: 'inherit' }}
              />
            </div>
            <div className="topbar-actions">
              <button className="topbar-action-btn" onClick={toggleTheme} title="Toggle theme">
                {theme === 'dark' ? <Sun size={15} strokeWidth={1.5} /> : <Moon size={15} strokeWidth={1.5} />}
              </button>
              <button className="topbar-action-btn" title="Notifications">
                <Bell size={15} strokeWidth={1.5} />
              </button>
              <div className="topbar-avatar" title={user.email ?? ''}>{initials}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}
