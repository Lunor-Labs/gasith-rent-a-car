# Admin Portal Light Mode — Design Spec

**Date:** 2026-05-18  
**Status:** Approved

---

## Overview

Add a light/dark mode toggle to the admin portal. The current design is dark-only. Light mode uses a warm off-white palette that complements the existing gold accent. User preference is stored in `localStorage` and applied via a `[data-theme]` attribute on `<html>`.

---

## Architecture

### CSS Variables (`app/globals.css`)

Add a `[data-theme="light"]` block that overrides the dark defaults in `:root`. Gold accent colors (`--gold`, `--gold-light`, `--gold-dark`, `--primary-container`) remain unchanged in both themes. Status colors (`--success`, `--danger`, `--warning`, `--info`) also unchanged.

**Light palette:**

| Variable | Light value |
|---|---|
| `--bg-primary` | `#f5f4f0` |
| `--bg-secondary` | `#eeede8` |
| `--bg-card` | `#ffffff` |
| `--bg-elevated` | `#e8e6e0` |
| `--surface-lowest` | `#fafaf8` |
| `--text-primary` | `#1a1a1a` |
| `--text-secondary` | `#4a4030` |
| `--text-muted` | `#7a7060` |
| `--border` | `#c8c0a8` |
| `--border-subtle` | `#ddd8cc` |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)` |
| `--shadow-md` | `0 4px 20px rgba(0,0,0,0.10)` |
| `--shadow-lg` | `0 8px 40px rgba(0,0,0,0.12)` |

Additional light-mode overrides for elements that use hard-coded dark values (e.g. `.invoice-header-strip`, `.invoice-table th`, `.glass-card`, `.sidebar-upgrade-card`) are added inline in the same block.

### Theme Context (`context/ThemeContext.tsx`)

New file. Exports:
- `ThemeProvider` — wraps the app, reads `localStorage` on mount, sets `document.documentElement.dataset.theme`
- `useTheme()` — returns `{ theme: 'dark' | 'light', toggleTheme: () => void }`

Defaults to `'dark'` when no localStorage value exists.

### Root Layout (`app/layout.tsx`)

Wrap `{children}` with `<ThemeProvider>`. No other changes.

### Admin Layout (`app/admin/layout.tsx`)

Import `useTheme`. Add a `Sun`/`Moon` lucide icon button inside the floating topbar's `.topbar-actions` pill. Button uses the existing `.topbar-action-btn` class so it fits visually without new styles.

On mobile (`.topbar`), add the same toggle button next to the existing "View Site" link.

---

## Components Touched

| File | Change |
|---|---|
| `app/globals.css` | Add `[data-theme="light"]` block |
| `context/ThemeContext.tsx` | New file |
| `app/layout.tsx` | Wrap with `ThemeProvider` |
| `app/admin/layout.tsx` | Add toggle button to topbar |

---

## Out of Scope

- Customer-facing pages (homepage, booking flow) — light mode applies to admin portal only for now
- System `prefers-color-scheme` auto-detection — manual toggle only
- Per-page theme overrides
