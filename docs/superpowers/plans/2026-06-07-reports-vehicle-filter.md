# Reports Vehicle Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a vehicle search/type-ahead filter (shared, resets on tab change) to the Reports page alongside the existing date range filter.

**Architecture:** Three-layer change — backend accepts a new `vehicleId` query param on all 4 report routes; the API layer extends its params type; the frontend adds a `VehicleSearch` dropdown component fetching from the existing vehicles API and resets state on tab switch.

**Tech Stack:** Next.js 16 / React 19 (frontend), Express 5 / Supabase (backend), TypeScript throughout.

---

## File Map

| File | Change |
|---|---|
| `backend/src/routes/reports.routes.ts` | Add `vehicleId` filter to all 4 GET routes |
| `frontend/lib/api.ts` | Rename `DateRange` → `ReportParams`, add `vehicleId?: string` |
| `frontend/app/admin/reports/page.tsx` | Add vehicle state, `VehicleSearch` component, update load/clear/filter bar |

---

## Task 1: Backend — add `vehicleId` param to all 4 report routes

**Files:**
- Modify: `backend/src/routes/reports.routes.ts`

- [ ] **Step 1: Update `/financial` route**

In `reports.routes.ts`, find the `/financial` handler (line 8). Change it to extract and apply `vehicleId`:

```ts
router.get('/financial', authMiddleware, async (req, res) => {
  try {
    const { from, to, vehicleId } = req.query;

    let query = supabase
      .from('bookings')
      .select('end_date, start_date, final_amount, commission_amount, is_outsourced')
      .eq('status', 'completed')
      .order('end_date', { ascending: false });

    if (from)      query = query.gte('end_date', from as string);
    if (to)        query = query.lte('end_date', `${to}T23:59:59`);
    if (vehicleId) query = query.eq('vehicle_id', vehicleId as string);

    const { data: bookings, error } = await query;
    if (error) throw error;
    // ... rest unchanged
```

- [ ] **Step 2: Update `/commissions` route**

In the same file, find the `/commissions` handler (line 62). Change:

```ts
router.get('/commissions', authMiddleware, async (req, res) => {
  try {
    const { from, to, vehicleId } = req.query;

    let query = supabase
      .from('bookings')
      .select('*, customers(name, phone), vehicles(name, plate)')
      .eq('status', 'completed')
      .eq('is_outsourced', true)
      .order('end_date', { ascending: false });

    if (from)      query = query.gte('end_date', from as string);
    if (to)        query = query.lte('end_date', `${to}T23:59:59`);
    if (vehicleId) query = query.eq('vehicle_id', vehicleId as string);

    const { data, error } = await query;
    // ... rest unchanged
```

- [ ] **Step 3: Update `/bookings` route**

Find the `/bookings` handler (line 123). Change:

```ts
router.get('/bookings', authMiddleware, async (req, res) => {
  try {
    const { from, to, vehicleId } = req.query;

    let query = supabase
      .from('bookings')
      .select('*, customers(name, phone), vehicles(name, plate)')
      .eq('status', 'completed')
      .order('end_date', { ascending: false });

    if (from)      query = query.gte('end_date', from as string);
    if (to)        query = query.lte('end_date', `${to}T23:59:59`);
    if (vehicleId) query = query.eq('vehicle_id', vehicleId as string);

    const { data, error } = await query;
    // ... rest unchanged
```

- [ ] **Step 4: Update `/vehicles` route**

Find the `/vehicles` handler (line 160). Change the vehicles query to accept `vehicleId`:

```ts
router.get('/vehicles', authMiddleware, async (req, res) => {
  try {
    const { from, to, vehicleId } = req.query;

    let vQuery = supabase
      .from('vehicles')
      .select('id, name, plate, is_outsourced')
      .order('name');

    if (vehicleId) vQuery = vQuery.eq('id', vehicleId as string);

    const { data: vehicles, error: vErr } = await vQuery;
    if (vErr) throw vErr;

    let bQuery = supabase
      .from('bookings')
      .select('vehicle_id, final_amount, commission_amount, total_km, is_outsourced, start_date, end_date')
      .eq('status', 'completed');

    if (from)      bQuery = bQuery.gte('end_date', from as string);
    if (to)        bQuery = bQuery.lte('end_date', `${to}T23:59:59`);
    if (vehicleId) bQuery = bQuery.eq('vehicle_id', vehicleId as string);

    const { data: bookings, error: bErr } = await bQuery;
    // ... rest unchanged
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/reports.routes.ts
git commit -m "feat(reports): add vehicleId filter param to all report routes"
```

---

## Task 2: API layer — extend params type

**Files:**
- Modify: `frontend/lib/api.ts` lines 58–62

- [ ] **Step 1: Replace `DateRange` with `ReportParams`**

Change lines 58–62 from:

```ts
type DateRange = { from?: string; to?: string };
export const getReportFinancial    = (params?: DateRange) => API.get('/reports/financial',    { params });
export const getReportCommissions  = (params?: DateRange) => API.get('/reports/commissions',  { params });
export const getReportBookings     = (params?: DateRange) => API.get('/reports/bookings',     { params });
export const getReportVehicles     = (params?: DateRange) => API.get('/reports/vehicles',     { params });
```

To:

```ts
type ReportParams = { from?: string; to?: string; vehicleId?: string };
export const getReportFinancial    = (params?: ReportParams) => API.get('/reports/financial',    { params });
export const getReportCommissions  = (params?: ReportParams) => API.get('/reports/commissions',  { params });
export const getReportBookings     = (params?: ReportParams) => API.get('/reports/bookings',     { params });
export const getReportVehicles     = (params?: ReportParams) => API.get('/reports/vehicles',     { params });
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat(reports): extend ReportParams type with vehicleId"
```

---

## Task 3: Frontend — vehicle state, VehicleSearch, filter bar, load/clear updates

**Files:**
- Modify: `frontend/app/admin/reports/page.tsx`

This is a single file change. Apply all steps in order, then commit once.

- [ ] **Step 1: Add vehicle state variables**

After line 54 (`const [vehicles, setVehicles] = useState<any[]>([])`), add:

```ts
// Vehicle filter
const [vehicleList,   setVehicleList]   = useState<{ id: string; name: string; plate: string }[]>([]);
const [vehicleSearch, setVehicleSearch] = useState('');
const [vehicleId,     setVehicleId]     = useState('');
const [vehicleOpen,   setVehicleOpen]   = useState(false);
```

- [ ] **Step 2: Fetch vehicle list on mount**

After the existing `useEffect(() => { load(tab); }, [tab]);` (line 77), add:

```ts
useEffect(() => {
  import('@/lib/api').then(({ getVehicles }) =>
    getVehicles().then(r =>
      setVehicleList((r.data || []).map((v: any) => ({ id: v.id, name: v.name, plate: v.plate || '' })))
    )
  );
}, []);
```

> Note: `getVehicles` is already exported from `@/lib/api`. You can also add it to the top-level import on line 7 instead of using a dynamic import — whichever you prefer. The dynamic import avoids changing the existing import line.

Actually, simpler: add `getVehicles` to the existing import on line 7:

Change line 7 from:
```ts
import {
  getReportFinancial, getReportCommissions, getReportBookings, getReportVehicles,
  toggleCommissionPaid,
} from '@/lib/api';
```

To:
```ts
import {
  getReportFinancial, getReportCommissions, getReportBookings, getReportVehicles,
  toggleCommissionPaid, getVehicles,
} from '@/lib/api';
```

Then add the fetch effect (after the existing `useEffect`) using the regular import:

```ts
useEffect(() => {
  getVehicles().then(r =>
    setVehicleList((r.data || []).map((v: any) => ({ id: v.id, name: v.name, plate: v.plate || '' })))
  );
}, []);
```

- [ ] **Step 3: Replace `dateParams()` with `reportParams()`**

Change the `dateParams` function (line 60) from:

```ts
const dateParams = () => ({
  from: dateFrom || undefined,
  to:   dateTo   || undefined,
});
```

To:

```ts
const reportParams = () => ({
  from:      dateFrom  || undefined,
  to:        dateTo    || undefined,
  vehicleId: vehicleId || undefined,
});
```

- [ ] **Step 4: Update `load()` to use `reportParams()`**

Change line 68 inside `load`:

```ts
const p = dateParams();
```

To:

```ts
const p = reportParams();
```

- [ ] **Step 5: Update `handleTabChange` to reset vehicle filter**

Change the tab-change handler. Currently `setTab` is called directly in the JSX (line 163). Replace the inline `onClick` with a named handler. Add this function after `handleClear`:

```ts
const handleTabChange = (t: Tab) => {
  setVehicleSearch('');
  setVehicleId('');
  setTab(t);
};
```

Then in the JSX at line 163, change:
```tsx
onClick={() => setTab(t.key)}
```
To:
```tsx
onClick={() => handleTabChange(t.key)}
```

- [ ] **Step 6: Update `handleClear` to preserve `vehicleId`**

`handleClear` manually builds params with hardcoded `from: undefined, to: undefined` (line 84). Update it to keep the current `vehicleId`:

```ts
const handleClear = () => {
  setDateFrom(''); setDateTo('');
  setLoading(true);
  const p = { from: undefined as undefined, to: undefined as undefined, vehicleId: vehicleId || undefined };
  const loaders: Record<Tab, () => Promise<any>> = {
    financial:   () => getReportFinancial(p).then(r => setFinancial(r.data)),
    commissions: () => getReportCommissions(p).then(r => setCommissions(r.data)),
    bookings:    () => getReportBookings(p).then(r => setBookings(r.data)),
    vehicles:    () => getReportVehicles(p).then(r => setVehicles(r.data)),
  };
  loaders[tab]().catch(() => toast.error('Failed')).finally(() => setLoading(false));
};
```

- [ ] **Step 7: Add `VehicleSearch` inline component**

Add this component after the `DateFilter` component definition (after line 148, before `return`):

```tsx
const VehicleSearch = () => {
  const filtered = vehicleList.filter(v => {
    if (!vehicleSearch) return true;
    const q = vehicleSearch.toLowerCase();
    return v.name.toLowerCase().includes(q) || v.plate.toLowerCase().includes(q);
  }).slice(0, 8);

  return (
    <div style={{ position: 'relative' }}>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label" style={{ fontSize: '0.68rem' }}>Vehicle</label>
        <input
          type="text"
          className="form-input"
          placeholder="Search vehicle…"
          value={vehicleSearch}
          onChange={e => {
            setVehicleSearch(e.target.value);
            if (!e.target.value) setVehicleId('');
            setVehicleOpen(true);
          }}
          onFocus={() => setVehicleOpen(true)}
          onBlur={() => setTimeout(() => setVehicleOpen(false), 150)}
          style={{ padding: '0.32rem 0.6rem', fontSize: '0.8rem', width: 180 }}
        />
      </div>
      {vehicleOpen && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 100,
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: 8, marginTop: 4, minWidth: 200, maxHeight: 200, overflowY: 'auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {filtered.map(v => (
            <button
              key={v.id}
              onMouseDown={() => {
                setVehicleId(v.id);
                setVehicleSearch(v.name);
                setVehicleOpen(false);
              }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '0.5rem 0.75rem', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-primary)',
              }}
            >
              <span style={{ fontWeight: 600 }}>{v.name}</span>
              {v.plate && (
                <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: '0.75rem' }}>
                  {v.plate}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 8: Place `VehicleSearch` in the filter bar**

In the filter bar JSX (line 169, where `<DateFilter />` is rendered), add `<VehicleSearch />` next to it:

Change:
```tsx
<DateFilter />
```

To:
```tsx
<div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
  <DateFilter />
  <VehicleSearch />
  {vehicleId && (
    <button
      className="btn btn-secondary btn-sm"
      onClick={() => { setVehicleSearch(''); setVehicleId(''); load(tab); }}
      style={{ alignSelf: 'flex-end' }}
    >
      Clear vehicle
    </button>
  )}
</div>
```

- [ ] **Step 9: Add vehicle filter indicator**

After the existing date indicator block (lines 173–178), add a vehicle indicator:

```tsx
{vehicleId && (
  <div style={{ fontSize: '0.75rem', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 6 }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block' }} />
    Vehicle: {vehicleSearch}
  </div>
)}
```

- [ ] **Step 10: Commit**

```bash
git add frontend/app/admin/reports/page.tsx frontend/lib/api.ts
git commit -m "feat(reports): add vehicle search/type-ahead filter to all report tabs"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| Vehicle search/type-ahead | Task 3 Step 7 |
| Fetch vehicle list from `getVehicles` | Task 3 Step 2 |
| Filter by name or plate | Task 3 Step 7 |
| Apply to all 4 tabs (backend) | Task 1 Steps 1–4 |
| Reset on tab change | Task 3 Step 5 |
| Persist date filter across tab (unchanged) | No change needed |
| Vehicle filter indicator | Task 3 Step 9 |
| `vehicleId` in API calls | Task 3 Steps 3–4 |
| `ReportParams` type | Task 2 |
| `handleClear` preserves vehicle filter | Task 3 Step 6 |
