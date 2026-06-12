# Handoff: Gasith Rent-a-Car · Admin Dashboard

## Overview
A complete redesign of the Gasith admin dashboard for a Sri Lankan rent-a-car operator. Replaces a cluttered, multi-accent first draft with a coherent, professional dark/light theme system and three fully-designed routes: **Dashboard**, **Vehicles**, and **Reports**.

## About the Design Files
The files in this bundle are **design references created in HTML/React (Babel-transpiled JSX)** — prototypes showing the intended look and behaviour, not production code to ship directly. Your task is to **recreate these designs in the target codebase's existing environment** (Next.js, Vue, plain React, etc.), using its established component library and conventions. If no codebase exists yet, choose a stack appropriate for an admin/CRM (React + Vite or Next.js + Tailwind is a safe default) and implement the designs there.

The HTML uses inline CSS variables + plain stylesheets; in a real codebase you'd map these to your design-token system (Tailwind config, CSS modules, styled-components, etc.).

## Fidelity
**High-fidelity (hifi).** All colors, spacing, typography, iconography, and interactions are final. Recreate pixel-perfect. Real data populates every screen so layout decisions reflect actual content lengths.

---

## Design System

### Typography
- **UI / body:** `Geist`, weights 400 / 500 / 600 / 700, with feature settings `"ss01", "cv11"` for tighter alternate forms
- **Numerics, data, plates, prices:** `Geist Mono`, weights 400 / 500 / 600, with `"tnum"` (tabular numerals)
- Sans-serif fallback chain: `ui-sans-serif, system-ui, sans-serif`

Type scale (px):
| Token         | Size | Weight | Usage                          |
|---------------|------|--------|--------------------------------|
| display       | 30   | 500    | Hero chart numbers             |
| h1            | 24   | 600    | Page titles                    |
| h2            | 16   | 600    | Card titles, vehicle names     |
| h3            | 14   | 600    | Section titles                 |
| body          | 13.5 | 400    | Default body                   |
| body-sm       | 13   | 400    | Table cells, list items        |
| label         | 12.5 | 500    | Card subs, meta                |
| caption       | 11.5 | 500    | Footer meta, deltas, badges    |
| overline      | 10.5–11 | 500 | Uppercase eyebrows (0.08em tracking) |

Letter-spacing for big numerics: `-0.02em`. For uppercase eyebrows: `0.08em`.

### Color Tokens

All colors are declared in `oklch()` for perceptual uniformity. Tokens live on `:root` (dark) and `[data-theme="light"]` blocks in `styles.css`.

#### Dark theme
```
--bg-0:       oklch(0.155 0.004 80)   /* app background */
--bg-1:       oklch(0.185 0.005 80)   /* cards, sidebar */
--bg-2:       oklch(0.215 0.006 80)   /* inset, hover */
--bg-3:       oklch(0.255 0.007 80)   /* nudged elevation */
--border:        oklch(0.30 0.008 80 / 0.55)
--border-strong: oklch(0.35 0.008 80 / 0.85)
--border-soft:   oklch(0.28 0.008 80 / 0.35)
--fg:   oklch(0.97 0.004 80)   /* primary text */
--fg-2: oklch(0.78 0.006 80)   /* secondary */
--fg-3: oklch(0.60 0.008 80)   /* tertiary, dim */
--fg-4: oklch(0.45 0.008 80)   /* metadata, placeholder */
--gold:    oklch(0.82 0.095 88)  /* accent */
--gold-2:  oklch(0.72 0.10 85)
--gold-3:  oklch(0.55 0.085 85)
--gold-ink: oklch(0.18 0.01 80)  /* text on gold */
--pos:  oklch(0.78 0.13 155)   /* success / positive delta */
--neg:  oklch(0.70 0.17 25)    /* error / negative delta */
--warn: oklch(0.80 0.13 75)    /* warning */
--info: oklch(0.75 0.10 235)   /* informational */
```

#### Light theme
```
--bg-0: oklch(0.985 0.003 85)  /* warm off-white paper */
--bg-1: oklch(1 0 0)           /* cards */
--bg-2: oklch(0.965 0.004 85)
--bg-3: oklch(0.94 0.005 85)
--border:        oklch(0.86 0.006 85)
--border-strong: oklch(0.78 0.008 85)
--border-soft:   oklch(0.91 0.005 85)
--fg:   oklch(0.20 0.008 80)
--fg-2: oklch(0.36 0.008 80)
--fg-3: oklch(0.52 0.008 80)
--fg-4: oklch(0.66 0.008 80)
--gold:    oklch(0.66 0.105 75)   /* deeper bronze for white-bg legibility */
--gold-2:  oklch(0.58 0.115 72)
--gold-3:  oklch(0.46 0.10 70)
--gold-ink: oklch(1 0 0)
--pos:  oklch(0.55 0.14 155)
--neg:  oklch(0.58 0.20 25)
--warn: oklch(0.62 0.14 70)
--info: oklch(0.55 0.14 240)
```

#### Accent variants (tweak-able)
Beyond gold, three alternate accents are available — wire them up however your app handles theming:
- **Emerald**: dark `0.80 0.13 160`, light `0.58 0.13 158`
- **Azure**:   dark `0.78 0.10 235`, light `0.55 0.14 240`
- **Violet**:  dark `0.78 0.11 295`, light `0.55 0.18 295`

The `--gold-ink` (text-on-accent) flips between near-black and white based on the accent's lightness.

### Spacing & Radius
- Page horizontal padding: `32px`
- Page vertical padding: `28px` top, `40px` bottom
- Section gap: `22px`
- Card-to-card gap: `14px`
- Card body padding: `16–20px`
- Inner element gap: `10–12px`

Radius:
- `--radius-sm`: 6px (small chips, swatches)
- `--radius`: 10px (buttons, inputs)
- `--radius-lg`: 14px (cards)

### Shadows
Dark:  `0 1px 0 0 oklch(1 0 0 / 0.03) inset, 0 1px 2px oklch(0 0 0 / 0.4)`
Light: `0 1px 2px oklch(0 0 0 / 0.04), 0 1px 0 0 oklch(1 0 0 / 0.8) inset`
Card hover: `0 12px 28px -14px oklch(0 0 0 / 0.5)`

### Iconography
**Lucide-style line icons**, 1.5px stroke, rounded line-cap and line-join. All icons are inlined SVG components in `icons.jsx`. If recreating in a real codebase, use the official [`lucide-react`](https://lucide.dev/) package — every icon used here has a 1-to-1 equivalent (Search, Bell, Globe, Car, Users, Calendar, etc.).

**No emoji.** This is a firm rule — the original design used emoji as KPI icons; the redesign replaces every one with a stroked icon.

---

## Screens / Views

### 1. App Shell

**Layout:** 2-column grid, `248px` fixed sidebar + flexible main column.

#### Sidebar (`248px` wide, `100vh`, sticky)
- Brand block (top): 32×32 rounded-corner brand mark (linear gradient `--gold` → `--gold-3`, gold-ink "G" centered) + name "Gasith" + uppercase subtitle "RENT A CAR"
- "MAIN" section: Dashboard, Vehicles (badge 24), Customers (142), Bookings (18), Invoices, Reports
- "WORKSPACE" section: Settings, View public site
- Footer: 32×32 avatar (gradient), user name + email, sign-out icon button

**Nav item states:**
- Default: `--fg-2` text, transparent background
- Hover: `--bg-hover` background, `--fg` text
- Active: `--bg-2` background, `--fg` text, `--border` 1px border, icon in `--gold`, badge inverted to `--gold-dim` bg + `--gold` text

#### Top bar (sticky, 14px y-padding, 32px x-padding)
- Left: breadcrumb (`Pages / <ActivePage>` in `--fg-4` → `--fg-2`)
- Right: 280×34 search input (`⌘K` kbd chip), theme toggle icon button (Sun/Moon), notifications icon button (with gold dot), locale globe icon button
- Border-bottom: `1px solid --border-soft`

#### Page container
- `padding: 28px 32px 40px`
- `max-width: 1480px`
- Children stack with `gap: 22px`

### 2. Dashboard Page

Layout (top to bottom):
1. **Page head** — H1 "Dashboard", sub "Welcome back, Imdinesh — here's your fleet at a glance.", actions: ghost "May 2026" button, ghost "View Site" button, primary "+ New Booking" button
2. **KPI grid** — 4 columns, equal width
3. **Row 2:1** — Revenue chart (2fr) + Weekly Bookings card (1fr)
4. **Row 3-col** — Fleet Activity table + Recent Bookings list + Quick Tasks
5. **Row 1:2** — Fleet Donut + Activity timeline

**KPI cards** (4× equal):
- 18×20px padding
- Icon box (30×30 with `--bg-2` and `--border-soft`) + 12.5px label
- Big number: `Geist Mono`, 26px, weight 500, `-0.02em`, with `LKR` prefix as 13px `--fg-4`
- Delta pill (`--pos-bg` / `--neg-bg`) + context line (11.5px `--fg-4`)
- 120×36 sparkline absolutely positioned bottom-right, opacity 0.55

**Revenue chart:**
- 880×220 viewBox SVG
- Bars-and-line area: gold area gradient (opacity 0.35 → 0) under the gold revenue line
- Dashed gray target line (`--fg-4`)
- Dot at every data point, 4px on the last point
- Tabs: `7d / 30d / 12m / All`
- Header stat: total (`LKR 32.81M`) + green delta pill + dim "vs prior 12m"

**Weekly Bookings:**
- Vertical bars, 7 days, today highlighted in gold gradient (others muted gray)
- 11.5px Mono labels under each
- Header: total bookings + delta pill

**Fleet Activity table:**
- Plate as mono chip in the left column, vehicle name and year stacked
- Status pill (`on-rent` info, `available` pos, `service` warn, `overdue` neg)
- Right-aligned daily rate

**Recent Bookings:**
- Avatar circle (32×32 with initials) + name/vehicle/status row + amount (mono)

**Quick Tasks:**
- Interactive checkbox: 16×16, `--bg-2` bg, 1.5px `--border-strong` border, fills with `--gold` + `--gold-ink` check when toggled
- Tag chip: small uppercase pill — `urgent` uses `--neg-bg`, `today` uses `--warn-bg`

**Fleet Donut:**
- 120×120 SVG donut (stroke-width 14), 4 segments using info / pos / warn / neg
- Center label: `75%` + uppercase "UTILISED"
- Legend right-side with mono counts

**Activity feed:**
- 24×24 icon square + bold title + dim time
- Connecting timeline line drawn with `::after` pseudo-element between rows

### 3. Vehicles Page

**Header:** H1 "Vehicles", sub "8 in fleet · 4 available · 3 on rent", actions: ghost "More filters", primary "+ Add Vehicle"

**Toolbar (single row, flex-wrap):**
- Filter chips group: `All / Available / On rent / In service / Overdue / Featured` each with a count badge
- 240px search input
- Sort select (Featured first / Rate high→low / Rate low→high / Newest)
- View toggle: Grid / List icon buttons

**Filter chip:**
- Container: `--bg-1` bg, soft border, 9px radius, 3px padding
- Inactive chip: transparent bg, `--fg-3` text
- Active chip: `--bg-2` bg, `--fg` text, count badge flips to `--gold-dim` bg + `--gold` text

#### Vehicle Card (Grid view)

Grid: `repeat(auto-fill, minmax(310px, 1fr))`, `gap: 16px`.

Card structure (top to bottom):

1. **Image area** — `aspect-ratio: 16/9`, hue-tinted gradient backdrop driven by `--veh-hue` (0–360, set per vehicle)
   - Backdrop layers: bottom radial glow + top radial highlight + linear gradient
   - Subtle elliptical ground shadow under the car (blurred radial)
   - Car silhouette SVG centered, 78% width, drop-shadow filter, scales `1.02` on card hover
   - **Top-left overlay**: glass "category" chip — `oklch(0 0 0 / 0.45)` bg, `blur(10px)` backdrop-filter, 1px white-alpha border, 24px tall
   - **Top-right overlay**: either status pill (glass style) OR gold "Featured" ribbon (gold bg, gold-ink, uppercase)
   - **Bottom-left overlay** (only if featured, since the ribbon stole the top-right): status pill in glass style

2. **Body** (`padding: 16px 18px`, `gap: 14px`):
   - **Head row:** title block (`Make Model` at 16px/600, trim line at 12px `--fg-4`) + mono plate chip on the right
   - **Specs row** — 4-column grid with vertical dividers; each cell: 16px icon (Calendar/Cog/Fuel/Seat) above 12px value
     - Top + bottom border: `1px solid --border-soft`
   - **Price strip** — primary `LKR 6,500 / day` (22px Mono primary, 12px ccy/per dim) on the left, secondary `LKR 25 / KM` (11.5px mono) on the right
   - **Action bar** — primary "Manage" button (36px tall, gold) + 3 ghost icon buttons (36×36, `--bg-2`): Preview (Eye), Hide (EyeOff), More (3-dot)
   - **Footer meta line** — `84.5K km · Last serviced 6 weeks ago` (11.5px `--fg-4`)

**Hover:** card lifts 1px, border darkens to `--border`, large soft shadow appears, photo scales 1.02.

#### Vehicle Row (List view)

Single horizontally-scrollable table, `min-width: 900px`. Columns:
- 80px thumbnail (72×48 mini hue-gradient)
- Vehicle name + meta line (with optional gold star)
- Plate chip
- Status pill
- Rate (mono with "per day" eyebrow underneath)
- Odometer (mono with "km" eyebrow)
- Row actions (3 icon buttons)

### 4. Reports Page

**Header:** H1 "Reports", sub "Performance, revenue, and operations · May 2026", actions: ghost "Filters", ghost "Export PDF", primary "+ New Report"

**Toolbar:**
- Period picker (label "PERIOD" + prev nav button + current period + next nav button) in a `--bg-1` pill
- Granularity tabs: `Day / Week / Month / Quarter / Year`
- Right-aligned "Updated 2 min ago" caption

**Summary cards** — 4 cards, same dimensions as KPI cards, large mono number + delta + context. Numbers include `LKR` prefix where relevant and `%` suffix where relevant.

**Main analytic grid (1.55fr : 1fr):**

*Left — Trend chart:*
- 720×240 SVG combining bars (revenue in LKR thousands, gold gradient) and a secondary line (booking count, info color)
- Left Y axis: revenue in thousands (`0K / 250K / 500K / 750K / 1000K`)
- Right Y axis: booking count (`0 / 10 / 20 / 30 / 40`, info color)
- Legend in card header: gold dot "Revenue" + info-color short line "Bookings"

*Right — Revenue by Category:*
- 28px tall horizontal stacked bar, 6px radius. Each segment shows its `%` if ≥ 8%.
- Below: structured legend rows (10px swatch + label + right-aligned `%` + right-aligned `LKR` amount). Border-bottom between rows except last.

**Row (1.4fr : 1fr):**

*Left — Top Performing Vehicles table:*
- Header row: 10.5px overline cells, `--th-bg` background
- Rank pill: 22×22 circle, top 3 use medal colors (gold / silver / bronze), 4+ use `--bg-2` with mono number
- Vehicle cell: 32×22 mini gradient thumb + name + category·plate caption
- Bookings, days out (mono right-aligned)
- Utilisation: 64×4 bar (warn color if <75%, else pos color) + mono percentage
- Revenue: mono amount + 130×6 gold-fill `rev-bar` indicating relative dominance
- Trailing icon button for "view details"

*Right — Sources donut:*
- 120×120 donut, 4 segments (gold/info/pos/warn), center shows total count + uppercase "BOOKINGS" label
- Legend stack on the right

**Customer Mix card:**
- Split header: "New 11 +26%" | "Returning 31 22% rate"
- Below: "TOP SPENDERS THIS MONTH" overline + list of 4 customers (avatar circle + name + bookings count + LKR amount)

**Saved Reports:**
- Section header: "Saved Reports" h2 + sub "Scheduled and on-demand reports" + right-aligned "+ New report" ghost button
- Card grid: `repeat(auto-fill, minmax(260px, 1fr))`, `gap: 12px`
- Each card: 32×32 gold-colored icon square + report name + meta (clock icon + schedule) + last-run line (mono date) + actions row (Download button + run-now icon button)

---

## Interactions & Behavior

### Theme toggle
- Sun/Moon icon button in the top bar toggles between `data-theme="dark"` and `data-theme="light"` on `<html>`
- Persisted to the same place as other tweaks (we used `localStorage` via a tweaks helper; in your app, store in user preferences)

### Accent switcher
- Four options: champagne (default gold), emerald, azure, violet
- Implementation in our prototype: JS updates `--gold`, `--gold-2`, `--gold-3`, `--gold-dim`, `--gold-ink` CSS variables on `:root`. The ink color flips based on the L value of the chosen accent.

### Sidebar nav
- Single-page routing model (no actual URL changes in the prototype). In production, hook to your router. Use the page's `data-screen-label` (e.g. "Dashboard", "Vehicles", "Reports") for analytics.

### Vehicles filters
- All filtering / sorting / search happens client-side in `vehicles.jsx`'s `useMemo`. Move this to the API or use a state manager (React Query, etc.) for the real app.
- Empty state: when filtered list is empty, render a dashed-border card with "No vehicles match your filters."

### Tasks
- Checkbox click toggles `task.done`. Done tasks: title gets `line-through` + dimmed to `--fg-4`. State should sync to backend.

### Transitions
- Card hover: `transform 0.15s ease`, `border-color 0.15s`, `box-shadow 0.15s`
- Bar/dot hover: `filter 0.15s` for brightness
- Photo zoom on card hover: `transform 0.4s ease` to `translateY(-2px) scale(1.02)`
- Theme switch: instant (no transition — avoids flashing)

### Responsive
The prototype is designed for `1440px` viewport. For real responsiveness:
- Below ~1100px: sidebar should collapse to icon-only or hide behind a drawer
- KPI grid: `repeat(4, 1fr)` → `repeat(2, 1fr)` below 1024px → single column below 640px
- Vehicle grid auto-fills with `minmax(310px, 1fr)` already responsive
- List view has its own horizontal scroll above 900px min-width

---

## State Management

Minimal — the prototype uses local React `useState`. For production, you'll want:

- **Theme + accent**: app-level context or store, persisted to user prefs
- **Active route**: router
- **Vehicles filter/sort/search**: URL search params (good for shareable filtered views)
- **Tasks completion**: backend-synced; optimistic local toggle
- **All data** (vehicles, bookings, kpis, reports): from API; the shapes are defined in `data.jsx`

### Data shapes
See `data.jsx` for the exact data shapes used. Notable ones:

```
Vehicle = {
  plate: "CAR-8421",
  make: "Toyota",
  model: "Aqua",
  trim: "S Hybrid · 1.5L",
  year: 2019,
  category: "Hybrid" | "Sedan" | "SUV" | "Compact" | "Van",
  transmission: "Auto" | "Manual",
  fuel: "Petrol" | "Hybrid" | "Diesel",
  seats: number,
  status: "on-rent" | "available" | "service" | "overdue",
  featured: boolean,
  perDay: number,     // LKR
  perKm: number,      // LKR
  odometer: number,   // km
  hue: number,        // 0-360, drives the card backdrop tint
  image?: string,     // optional photo URL; falls back to silhouette
}
```

---

## Assets

- **Fonts**: Geist + Geist Mono (both from Google Fonts). Self-host in production for performance.
- **Icons**: 25 inline SVGs in `icons.jsx`. Direct replacement with `lucide-react`:
  Dashboard → LayoutDashboard, Car → Car, Users → Users, Booking → CalendarCheck, Invoice → FileText, Reports → BarChart3, Settings → Settings, Search → Search, Bell → Bell, Globe → Globe, Plus → Plus, ExternalLink → ExternalLink, ArrowUp → ArrowUp, ArrowDown → ArrowDown, ArrowRight → ArrowRight, Money → CreditCard, KeyRound → KeyRound, Wrench → Wrench, Check → Check, Clock → Clock, More → MoreHorizontal, Gauge → Gauge, MapPin → MapPin, Fuel → Fuel, ChevronRight → ChevronRight, Filter → Filter, Calendar → Calendar, Sun → Sun, Moon → Moon, Star → Star, Eye → Eye, EyeOff → EyeOff, Trash → Trash2, Pencil → Pencil, Grid → LayoutGrid, List → List, Sort → ArrowUpDown, Seat → ArmchairIcon (or custom), Cog → Cog.
- **Photos**: prototype uses a stylized car silhouette as a placeholder. Replace with real product photography; cards already handle real `<img>` via the `image` field with `object-fit: contain`.

---

## Files in this bundle

| File              | Purpose                                                |
|-------------------|--------------------------------------------------------|
| `Dashboard.html`  | Entry point — loads fonts, stylesheets, and JSX files  |
| `styles.css`      | Global tokens (light + dark), app shell, common UI     |
| `vehicles.css`    | Vehicles page + card styles                            |
| `reports.css`     | Reports page styles                                    |
| `icons.jsx`       | Inline SVG icon set (Lucide-style, 1.5px stroke)       |
| `data.jsx`        | All mock data + `window.AppData` shape                 |
| `components.jsx`  | Shared dashboard components (KpiCard, RevenueChart)    |
| `panels.jsx`      | Dashboard widgets (WeeklyBookings, FleetTable, etc.)   |
| `vehicles.jsx`    | Vehicles page + VehicleCard / VehicleRow               |
| `reports.jsx`     | Reports page + all analytic sub-components             |
| `app.jsx`         | Top-level App, Sidebar, TopBar, route switch           |
| `tweaks-panel.jsx`| Dev-only tweaks panel (theme + accent switcher)        |

To preview locally: open `Dashboard.html` in a browser. No build step — everything is Babel-transpiled in the browser.

---

## Notes for the implementer

- **Don't keep the in-browser Babel setup** — that's prototype-only. Use your project's build pipeline.
- **Numbers everywhere are in `Geist Mono` with `tnum`** — critical for column alignment in tables and chart axes. Don't skip this.
- **The accent is restrained on purpose.** Use it for the primary CTA, the active sidebar indicator, revenue lines, and featured ribbons. Everywhere else should be neutral — resist the urge to "add some color".
- **Status colors are semantic**, not decorative: `on-rent` is always info (blue), `available` is always pos (green), `service` is always warn (yellow), `overdue` is always neg (red). Same meaning on dashboard, vehicles, and reports.
- **No emoji.** Anywhere.
- **Plate numbers** are always in `Geist Mono` with the `.plate-tag` chip styling — small `--bg-2` capsule with a 1px soft border. Treat them as identifiers, not labels.
- **`LKR` prefix** is always rendered smaller and dimmer than the number, never inline at the same weight. Same goes for `/ day`, `/ km`, `K km` units.
