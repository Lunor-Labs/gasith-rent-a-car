# Admin Portal Light Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent light/dark mode toggle to the admin portal, saved to `localStorage`.

**Architecture:** Add a `[data-theme="light"]` CSS variable block to `globals.css`. A `ThemeContext` client component reads/writes `localStorage` and sets `document.documentElement.dataset.theme`. A sun/moon toggle button is placed in the admin layout's topbar (mobile) and sidebar user row (desktop).

**Tech Stack:** Next.js 16, React 19, CSS custom properties, lucide-react, localStorage

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Modify | `frontend/app/globals.css` | Add `[data-theme="light"]` variable overrides |
| Create | `frontend/context/ThemeContext.tsx` | Theme state + `useTheme` hook |
| Modify | `frontend/app/layout.tsx` | Add FOUC-prevention script + `ThemeProvider` |
| Modify | `frontend/app/admin/layout.tsx` | Add toggle button to topbar and sidebar |

---

### Task 1: Add light mode CSS variables

**Files:**
- Modify: `frontend/app/globals.css`

- [ ] **Step 1: Open `globals.css` and append the light theme block**

Add this block at the very end of the file, after all existing rules:

```css
/* ─── Light Mode ──────────────────────────────────────────────────────────── */
[data-theme="light"] {
  --bg-primary: #f5f4f0;
  --bg-secondary: #eeede8;
  --bg-card: #ffffff;
  --bg-elevated: #e8e6e0;
  --surface-lowest: #fafaf8;
  --text-primary: #1a1a1a;
  --text-secondary: #4a4030;
  --text-muted: #7a7060;
  --border: #c8c0a8;
  --border-subtle: #ddd8cc;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 20px rgba(0,0,0,0.10);
  --shadow-lg: 0 8px 40px rgba(0,0,0,0.12);
  --shadow-gold: 0 0 30px rgba(245,197,24,0.15);
}

[data-theme="light"] body {
  background: var(--bg-primary);
  color: var(--text-primary);
}

[data-theme="light"] .glass-card {
  background: rgba(255,255,255,0.85);
}

[data-theme="light"] .sidebar {
  box-shadow: 4px 0 24px rgba(0,0,0,0.08);
}

[data-theme="light"] .admin-topbar-float {
  background: rgba(245,244,240,0.75);
  border-color: rgba(200,192,168,0.3);
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
}

[data-theme="light"] .admin-topbar-float.scrolled {
  background: rgba(238,237,232,0.92);
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
}

[data-theme="light"] .topbar-actions {
  box-shadow: 14px 17px 40px 4px rgba(0,0,0,0.08);
}

[data-theme="light"] .invoice-header-strip {
  background: #f0ede4;
}

[data-theme="light"] .invoice-table th {
  background: #f0ede4;
}

[data-theme="light"] .invoice-total-row {
  background: #f0ede4;
}

[data-theme="light"] .modal-overlay {
  background: rgba(0,0,0,0.4);
}

[data-theme="light"] ::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}
```

- [ ] **Step 2: Verify visually (dev server)**

Start the dev server if not running: `cd frontend && npm run dev`

Open `http://localhost:3000/admin` in a browser. The page should still look dark (no change yet — `data-theme` is not set). Confirm no CSS errors in the browser console.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/globals.css
git commit -m "feat: add light mode CSS variable overrides"
```

---

### Task 2: Create ThemeContext

**Files:**
- Create: `frontend/context/ThemeContext.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
      document.documentElement.dataset.theme = stored;
    }
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.dataset.theme = next;
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

- [ ] **Step 2: Verify the file saved correctly**

Run: `cat frontend/context/ThemeContext.tsx | head -5`
Expected: first line is `'use client';`

- [ ] **Step 3: Commit**

```bash
git add frontend/context/ThemeContext.tsx
git commit -m "feat: add ThemeContext with localStorage persistence"
```

---

### Task 3: Wire ThemeProvider into root layout + FOUC prevention

**Files:**
- Modify: `frontend/app/layout.tsx`

- [ ] **Step 1: Add FOUC-prevention inline script and ThemeProvider**

Replace the entire file content with:

```tsx
import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Toaster } from 'react-hot-toast';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'Gasith Rent a Car – Premium Vehicle Rental in Sri Lanka',
  description: 'Rent premium vehicles in Sri Lanka with ease. Affordable rates, reliable service, island-wide coverage.',
  keywords: 'rent a car, Sri Lanka, vehicle rental, Gasith, car hire',
  icons: {
    icon: '/logo.webp',
    apple: '/logo.webp',
    shortcut: '/logo.webp',
  },
  openGraph: {
    title: 'Gasith Rent a Car',
    description: 'Premium vehicle rental services in Sri Lanka',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Work+Sans:wght@600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          crossOrigin="anonymous"
        />
        {/* Prevent flash of wrong theme on load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;})();`,
          }}
        />
      </head>
      <body className={geist.variable}>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: { background: '#1a1a1a', color: '#fff', border: '1px solid #333' },
                success: { iconTheme: { primary: '#F5C518', secondary: '#000' } },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify the dev server still compiles**

Check the terminal running `npm run dev` for any TypeScript or import errors. Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/layout.tsx
git commit -m "feat: wire ThemeProvider and add FOUC-prevention script"
```

---

### Task 4: Add toggle button to admin layout

**Files:**
- Modify: `frontend/app/admin/layout.tsx`

- [ ] **Step 1: Add `Sun` and `Moon` imports and `useTheme`**

At the top of the file, change the lucide-react import line from:

```tsx
import {
  LayoutGrid, Car, Users, CalendarDays, Receipt,
  Settings, LogOut, Menu,
} from 'lucide-react';
```

to:

```tsx
import {
  LayoutGrid, Car, Users, CalendarDays, Receipt,
  Settings, LogOut, Menu, Sun, Moon,
} from 'lucide-react';
```

Also add the `useTheme` import after the existing context import:

```tsx
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
```

- [ ] **Step 2: Destructure `useTheme` inside the component**

Inside `AdminLayout`, after the existing `useState` calls, add:

```tsx
const { theme, toggleTheme } = useTheme();
```

- [ ] **Step 3: Add toggle to the mobile topbar**

Find the mobile topbar block:

```tsx
<div className="topbar">
  <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
    <Menu size={18} strokeWidth={1.5} />
  </button>
  <div className="topbar-title">{currentPage}</div>
  <a href="/" target="_blank" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>View Site</a>
</div>
```

Replace it with:

```tsx
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
```

- [ ] **Step 4: Add toggle to the sidebar user row (visible on desktop)**

Find the sidebar user row block:

```tsx
<div className="sidebar-user-row">
  <div className="sidebar-user-avatar">{initials}</div>
  <div className="sidebar-user-email">{user.email}</div>
  <button onClick={handleLogout} className="topbar-action-btn" title="Logout" style={{ flexShrink: 0 }}>
    <LogOut size={14} strokeWidth={1.5} />
  </button>
</div>
```

Replace it with:

```tsx
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
```

- [ ] **Step 5: Verify in the browser**

1. Open `http://localhost:3000/admin`
2. Click the sun/moon icon — the portal should switch between dark and light
3. Refresh the page — the selected theme should persist (no flash)
4. Check mobile view (DevTools device emulation) — toggle is visible in the mobile topbar

- [ ] **Step 6: Commit**

```bash
git add frontend/app/admin/layout.tsx
git commit -m "feat: add light/dark toggle button to admin topbar and sidebar"
```
