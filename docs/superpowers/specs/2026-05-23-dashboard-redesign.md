# Dashboard Redesign — Design Spec

**Date:** 2026-05-23  
**Reference:** `cluade-design/design_handoff_admin_dashboard/`  
**Files changed:** `frontend/app/admin/page.tsx`, `frontend/app/globals.css`

---

## Goal

Rebuild the admin dashboard to match the design handoff visually while keeping all real API data. No mock data. No new backend tables except for Activity Feed which is synthesised from existing booking records.

---

## Layout (5 rows)

```
┌─────────────────────────────────────────────┐
│  Page Header (greeting + actions)           │
├──────┬──────┬──────┬──────────────────────┤
│ KPI  │ KPI  │ KPI  │ KPI                  │  ← 4-col grid
├───────────────────────┬─────────────────────┤
│ Revenue Trend (2/3)   │ Weekly Bookings(1/3)│  ← row-2-1
├────────────┬──────────┬─────────────────────┤
│ Fleet Table│ Recent   │ Quick Tasks         │  ← row-1-1-1
├────────────┴──┬───────┴─────────────────────┤
│ Fleet Donut   │ Activity Feed (2/3)         │  ← 1:2
└───────────────┴─────────────────────────────┘
```

---

## Components

### Page Header
- Title: dynamic greeting ("Good morning, Dinesh")
- Sub: "Here's your fleet at a glance."
- Actions: date chip (current month/year) + View Site link + New Booking button
- CSS: `.page-head`, `.page-sub`, `.page-actions`

### KPI Cards (4)
Metrics: Revenue MTD, Active Rentals, Total Customers, Fleet Utilisation

Each card:
- Top row: icon box (left) + label + sparkline (right)
- Middle: large mono value with optional currency prefix
- Bottom: delta pill (▲/▼ + %) + context text
- CSS: `.kpi-grid`, `.kpi`, `.kpi-head`, `.kpi-ico`, `.kpi-label`, `.kpi-value`, `.kpi-foot`, `.kpi-spark`, `.kpi-context`, `.delta.pos`, `.delta.neg`
- Sparkline: existing `<Sparkline>` SVG component (unchanged)

### Revenue Trend Card (2/3 width on desktop)
- Card header: `.card-head` / `.card-title` / `.card-sub`
- Total revenue large mono display + delta badge + legend
- Range tabs: 7d / 30d / 12m — CSS `.tabs` / `.tab` / `.tab.active` (gold active)
- Chart: Recharts `ComposedChart` with Area + dashed Line (unchanged logic)

### Weekly Bookings Card (1/3 width on desktop)
- Card header with weekly total count + delta badge
- Chart: Recharts `BarChart` — last bar gold, others muted (unchanged logic)

### Fleet Activity Table (1/3 width on desktop)
- Proper `<table>` with `.table` class
- Columns: Vehicle (name + plate tag) | Status (pip dot pill) | Customer | Out Since | Daily Rate
- Status pill: `.status-pill` with `.pip` dot + text
- Plate tag: `.plate-tag.mono`
- CSS: `.vehicle-cell`, `.vehicle-name`, `.vehicle-sub`, `.plate-tag`

### Recent Bookings List (1/3 width on desktop)
- CSS: `.list-row`, `.cust-av` (initials avatar), `.list-main`, `.list-title`, `.list-sub`, `.list-amount`, `.ccy`
- Shows: initials avatar | customer name + vehicle + status | amount + time-ago

### Quick Tasks (1/3 width on desktop)
- 5 static items with toggleable checkboxes (local React state, no persistence)
- Items: renew insurance, schedule Aqua service, follow up overdue payment, update fleet photos, review month report
- CSS: `.task`, `.task.done`, `.checkbox`, `.checkbox.checked`, `.task-body`, `.task-title`, `.task-meta`, `.tag`

### Fleet Status Donut (1/3 width on desktop)
- Pure SVG donut (no Recharts), r=52, strokeWidth=14
- Segments: Available (green) / On Rent (gold) / In Service/Maintenance (orange)
- Counts computed from fetched vehicles array
- Centre text: utilisation % + "Utilised" label
- Legend: colour swatch + label + count
- CSS: `.donut-wrap`, `.donut-center`, `.donut-pct`, `.donut-label`, `.legend-stack`

### Activity Feed (2/3 width on desktop)
- Synthesised from last 5 recent bookings — no new backend table
- Icon mapping: active booking → key icon, completed → car icon, new/pending → calendar icon
- Each row: icon chip | bold title (action + vehicle) | sub (customer · time-ago)
- CSS: `.activity-row`, `.act-ico`, `.act-body`, `.act-time`

---

## CSS Additions (globals.css)

New classes added, all using existing project CSS variables (`--text-primary`, `--text-muted`, `--gold`, `--bg-elevated`, `--border-subtle`, etc.):

- `.page-head`, `.page-sub`, `.page-actions`
- `.kpi-grid`, `.kpi`, `.kpi-head`, `.kpi-ico`, `.kpi-label`, `.kpi-value`, `.kpi-foot`, `.kpi-spark`, `.kpi-context`
- `.delta`, `.delta.pos`, `.delta.neg`
- `.card-head`, `.card-title`, `.card-sub`, `.card-body`
- `.tabs`, `.tab`, `.tab.active`
- `.chart-stats`, `.chart-stat-main`
- `.row-2-1`, `.row-1-1-1` (desktop grid layouts via media query)
- `.list-row`, `.cust-av`, `.list-main`, `.list-title`, `.list-sub`, `.list-amount`, `.list-amount-sub`, `.ccy`
- `.task`, `.task.done`, `.checkbox`, `.checkbox.checked`, `.task-body`, `.task-title`, `.task-meta`, `.tag`
- `.status-pill`, `.pip`
- `.vehicle-cell`, `.vehicle-name`, `.vehicle-sub`, `.plate-tag`
- `.donut-wrap`, `.donut-center`, `.donut-pct`, `.donut-label`, `.legend-stack`
- `.activity-row`, `.act-ico`, `.act-body`, `.act-time`
- `.link` (ghost text button)

---

## Data Sources

| Panel | Source | Notes |
|-------|--------|-------|
| KPI cards | `getDashboardStats()` + `getRevenueStats()` | Already fetched |
| Revenue Trend | `getRevenueStats()` | Already fetched |
| Weekly Bookings | `getBookings({ limit: 50 })` | Computed from createdAt |
| Fleet Table | `getVehicles({ limit: 6 })` + bookings | Already fetched |
| Recent Bookings | `getBookings({ limit: 50 })` + customers/vehicles | Already fetched |
| Quick Tasks | Static (local state) | No API |
| Fleet Donut | `getVehicles({ limit: 6 })` | Computed from status field |
| Activity Feed | `getBookings({ limit: 50 })` + customers/vehicles | Synthesised, no new endpoint |

All data already fetched in one `Promise.allSettled` call — no new API calls needed.

---

## Constraints

- Recharts stays for Revenue Trend and Weekly Bookings (inline SVG can't handle dynamic axis labels cleanly)
- Fleet Donut uses pure SVG (static enough, no axes needed)
- Quick Tasks: local state only, reset on page reload
- Activity Feed: derived from bookings, not a real activity log
- Mobile: rows collapse to single column; row-2-1 and row-1-1-1 stack vertically below 768px
