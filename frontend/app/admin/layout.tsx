'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getDashboardStats } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  LayoutGrid, Car, Users, CalendarDays, Receipt,
  Settings, LogOut, Menu, Sun, Moon,
} from 'lucide-react';

const MAIN_NAV = [
  { label: 'Dashboard', href: '/admin',           Icon: LayoutGrid,   exact: true,  badgeKey: null      },
  { label: 'Vehicles',  href: '/admin/vehicles',  Icon: Car,          exact: false, badgeKey: 'totalVehicles'  },
  { label: 'Customers', href: '/admin/customers', Icon: Users,        exact: false, badgeKey: 'totalCustomers' },
  { label: 'Bookings',  href: '/admin/bookings',  Icon: CalendarDays, exact: false, badgeKey: 'activeBookings' },
  { label: 'Invoices',  href: '/admin/invoices',  Icon: Receipt,      exact: false, badgeKey: null      },
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
  const { theme, toggleTheme } = useTheme();

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

  return (
    <div className="admin-layout">
      <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-logo">
          <Image src="/logo.webp" alt="Gasith" width={40} height={40} style={{ borderRadius: 8, marginRight: '0.5rem', verticalAlign: 'middle', display: 'inline-block' }} />
          <span>Gasith</span> Rent a Car
          <div className="sidebar-logo-sub">Admin Portal</div>
        </div>
        <div className="sidebar-separator" />

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
                <span className="nav-item-icon"><Icon size={15} strokeWidth={1.5} /></span>
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
              <span className="nav-item-icon"><Icon size={15} strokeWidth={1.5} /></span>
              {label}
            </Link>
          ))}
        </nav>

        {/* User row — no upgrade card */}
        <div className="sidebar-user-row">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-email">{user.email}</div>
          <button onClick={toggleTheme} className="topbar-action-btn" title="Toggle theme" style={{ flexShrink: 0 }}>
            {theme === 'dark' ? <Sun size={14} strokeWidth={1.5} /> : <Moon size={14} strokeWidth={1.5} />}
          </button>
          <button onClick={handleLogout} className="topbar-action-btn" title="Logout" style={{ flexShrink: 0 }}>
            <LogOut size={14} strokeWidth={1.5} />
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



        {/* Content */}
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}
