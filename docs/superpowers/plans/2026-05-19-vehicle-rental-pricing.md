# Vehicle Rental Pricing Logic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat `per_day` billing mode with a free-KM allocation model where the daily rate is charged alongside configurable free kilometres, with extra-KM charges applied automatically and discounts auto-calculated from booking-level overrides.

**Architecture:** The backend owns all pricing calculations; the frontend mirrors the same formula locally for live previews only. A new `pricing_config` table holds system-wide free-KM defaults (first-day: 150 km, subsequent days: 100 km/day). Booking-level overrides for daily rate and free-KM allocation propagate automatically into the discount calculation.

**Tech Stack:** Express 5 + TypeScript (backend), Next.js + React 19 (frontend), Supabase (PostgreSQL + RLS), Axios (API client)

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `supabase/migrations/001_pricing_logic.sql` | DB migration — pricing_config table + bookings new columns |
| Modify | `supabase/schema.sql` | Update reference schema |
| Create | `backend/src/routes/pricing-config.routes.ts` | GET / PUT for pricing config |
| Modify | `backend/src/index.ts` | Register new pricing-config route |
| Modify | `backend/src/routes/bookings.routes.ts` | Update create + complete + response mapper |
| Modify | `frontend/lib/api.ts` | Add getPricingConfig / updatePricingConfig |
| Modify | `frontend/app/admin/settings/page.tsx` | Replace "Coming Soon" with real pricing config form |
| Modify | `frontend/app/admin/bookings/page.tsx` | Create booking modal — per_day additions |
| Modify | `frontend/app/admin/bookings/[id]/page.tsx` | Complete booking — free-KM fields + full price preview |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/001_pricing_logic.sql`
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/001_pricing_logic.sql` with this exact content:

```sql
-- ── Pricing Config ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pricing_config (
  id                     INTEGER PRIMARY KEY DEFAULT 1,
  first_day_free_km      NUMERIC(10,1) NOT NULL DEFAULT 150,
  subsequent_day_free_km NUMERIC(10,1) NOT NULL DEFAULT 100,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO pricing_config (id, first_day_free_km, subsequent_day_free_km)
VALUES (1, 150, 100)
ON CONFLICT (id) DO NOTHING;

-- Row Level Security
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view pricing config"
  ON pricing_config FOR SELECT USING (true);
CREATE POLICY "Authenticated can update pricing config"
  ON pricing_config FOR UPDATE USING (auth.role() = 'authenticated');

-- ── New columns on bookings ───────────────────────────────────
-- billing_mode may already exist — use IF NOT EXISTS for safety
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS billing_mode         TEXT NOT NULL DEFAULT 'per_km'
                                                CHECK (billing_mode IN ('per_km', 'per_day')),
  ADD COLUMN IF NOT EXISTS default_price_per_day NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_free_km       NUMERIC(10,1),
  ADD COLUMN IF NOT EXISTS free_km               NUMERIC(10,1),
  ADD COLUMN IF NOT EXISTS extra_km              NUMERIC(12,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_km_charge       NUMERIC(12,2) NOT NULL DEFAULT 0;
```

- [ ] **Step 2: Run migration in Supabase**

Open the Supabase Dashboard → SQL Editor → New Query → paste the file contents → Run.

Expected: no errors. If `billing_mode` constraint already exists, the `IF NOT EXISTS` clause will skip it silently.

- [ ] **Step 3: Update reference schema**

In `supabase/schema.sql`, add the `pricing_config` table definition after the `-- ── Revenue` section:

```sql
-- ── Pricing Config ────────────────────────────────────────────
CREATE TABLE pricing_config (
  id                     INTEGER PRIMARY KEY DEFAULT 1,
  first_day_free_km      NUMERIC(10,1) NOT NULL DEFAULT 150,
  subsequent_day_free_km NUMERIC(10,1) NOT NULL DEFAULT 100,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO pricing_config (id, first_day_free_km, subsequent_day_free_km)
VALUES (1, 150, 100)
ON CONFLICT (id) DO NOTHING;
```

And add the new `bookings` columns to the existing `CREATE TABLE bookings` block (after `notes TEXT DEFAULT ''`):

```sql
  billing_mode           TEXT NOT NULL DEFAULT 'per_km'
                         CHECK (billing_mode IN ('per_km', 'per_day')),
  default_price_per_day  NUMERIC(10,2) NOT NULL DEFAULT 0,
  default_free_km        NUMERIC(10,1),
  free_km                NUMERIC(10,1),
  extra_km               NUMERIC(12,1) NOT NULL DEFAULT 0,
  extra_km_charge        NUMERIC(12,2) NOT NULL DEFAULT 0,
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/001_pricing_logic.sql supabase/schema.sql
git commit -m "feat: add pricing_config table and free-km columns to bookings"
```

---

## Task 2: Backend — Pricing Config Route

**Files:**
- Create: `backend/src/routes/pricing-config.routes.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Create the route file**

Create `backend/src/routes/pricing-config.routes.ts`:

```typescript
import { Router } from 'express';
import { supabase } from '../config/supabase';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('pricing_config')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) throw error;
    res.json({
      firstDayFreeKm: data.first_day_free_km,
      subsequentDayFreeKm: data.subsequent_day_free_km,
      updatedAt: data.updated_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', authMiddleware, async (req, res) => {
  try {
    const { firstDayFreeKm, subsequentDayFreeKm } = req.body;
    if (Number(firstDayFreeKm) <= 0 || Number(subsequentDayFreeKm) <= 0) {
      return res.status(400).json({ error: 'Free KM values must be positive' });
    }
    const { error } = await supabase
      .from('pricing_config')
      .update({
        first_day_free_km: Number(firstDayFreeKm),
        subsequent_day_free_km: Number(subsequentDayFreeKm),
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

- [ ] **Step 2: Register the route in index.ts**

In `backend/src/index.ts`, add the import after the existing imports:

```typescript
import pricingConfigRoutes from './routes/pricing-config.routes';
```

And register it after the existing route registrations (before the health check):

```typescript
app.use('/api/pricing-config', pricingConfigRoutes);
```

- [ ] **Step 3: Verify with curl**

Start the backend (`cd backend && npm run dev`) then run:

```bash
curl http://localhost:5000/api/pricing-config
```

Expected response:
```json
{"firstDayFreeKm":150,"subsequentDayFreeKm":100,"updatedAt":"..."}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/pricing-config.routes.ts backend/src/index.ts
git commit -m "feat: add pricing-config GET/PUT endpoints"
```

---

## Task 3: Backend — Update Create Booking

**Files:**
- Modify: `backend/src/routes/bookings.routes.ts` (POST `/` handler, lines 93–157)

- [ ] **Step 1: Update the POST handler**

Replace the entire `router.post('/', ...)` handler in `backend/src/routes/bookings.routes.ts` with:

```typescript
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      customerId, vehicleId, startDate, endDate,
      startMeterReading, pricePerKm, pricePerDay,
      freeKm, isOutsourced, outsourcedPayment,
      commissionRate, billingMode, notes,
    } = req.body;

    const { data: vehicleData } = await supabase
      .from('vehicles')
      .select('last_meter_reading, price_per_km, price_per_day')
      .eq('id', vehicleId)
      .single();

    const defaultPricePerDay = vehicleData?.price_per_day || 0;
    const effectivePricePerDay = Number(pricePerDay) || defaultPricePerDay;
    const effectiveBillingMode = billingMode || 'per_km';

    // Resolve free_km for per_day bookings
    let resolvedFreeKm: number | null = null;
    if (effectiveBillingMode === 'per_day') {
      if (freeKm != null && freeKm !== '') {
        resolvedFreeKm = Number(freeKm);
      } else if (startDate && endDate) {
        const { data: config } = await supabase
          .from('pricing_config')
          .select('first_day_free_km, subsequent_day_free_km')
          .eq('id', 1)
          .single();
        if (config) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
          resolvedFreeKm = config.first_day_free_km + (days - 1) * config.subsequent_day_free_km;
        }
      }
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        customer_id: customerId,
        vehicle_id: vehicleId,
        start_date: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
        start_meter_reading: Number(startMeterReading) || vehicleData?.last_meter_reading || 0,
        end_meter_reading: null,
        total_km: 0,
        price_per_km: Number(pricePerKm) || vehicleData?.price_per_km || 0,
        price_per_day: effectivePricePerDay,
        default_price_per_day: defaultPricePerDay,
        billing_mode: effectiveBillingMode,
        free_km: resolvedFreeKm,
        extra_km: 0,
        extra_km_charge: 0,
        base_amount: 0,
        discount_amount: 0,
        final_amount: 0,
        is_outsourced: Boolean(isOutsourced),
        outsourced_payment: outsourcedPayment ? Number(outsourcedPayment) : null,
        commission_rate: Boolean(isOutsourced) ? (Number(commissionRate) || 10) : 0,
        status: 'active',
        invoice_url: '',
        notes: notes || '',
      })
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from('vehicles')
      .update({ is_available: false })
      .eq('id', vehicleId);

    await supabase
      .from('meter_readings')
      .insert({
        vehicle_id: vehicleId,
        booking_id: data.id,
        reading: Number(startMeterReading) || vehicleData?.last_meter_reading || 0,
        type: 'start',
        recorded_by: (req as any).user?.id || 'admin',
      });

    res.json({ id: data.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **Step 2: Verify — create a per_day booking with curl**

```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "customerId": "<any-customer-id>",
    "vehicleId": "<any-available-vehicle-id>",
    "billingMode": "per_day",
    "startDate": "2026-05-19",
    "endDate": "2026-05-22"
  }'
```

Expected: `{"id":"..."}`. Check the Supabase Dashboard → `bookings` table: the new row should have `default_price_per_day` matching the vehicle's price, and `free_km = 350` (150 + 2×100 for 3 days).

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/bookings.routes.ts
git commit -m "feat: store default_price_per_day and auto-calculate free_km on booking creation"
```

---

## Task 4: Backend — Update Complete Booking (per_day formula)

**Files:**
- Modify: `backend/src/routes/bookings.routes.ts` (PUT `/:id/complete` handler, lines 160–283)

- [ ] **Step 1: Update the complete handler**

Replace the entire `router.put('/:id/complete', ...)` handler with:

```typescript
router.put('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const {
      endMeterReading, discountAmount, endDate,
      outsourcedPayment, commissionRate, freeKm,
    } = req.body;

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !booking) return res.status(404).json({ error: 'Booking not found' });

    let finalAmount = 0;
    let totalKm = 0;
    let baseAmount = 0;
    let computedDiscount = 0;
    let extraKm = 0;
    let extraKmCharge = 0;
    let resolvedFreeKm: number | null = null;
    let computedDefaultFreeKm: number | null = null;

    if (booking.is_outsourced) {
      const payment = Number(outsourcedPayment) || 0;
      const commission = Number(commissionRate) || booking.commission_rate || 10;
      finalAmount = payment - (payment * commission / 100);
      baseAmount = payment;
      computedDiscount = 0;
    } else if (booking.billing_mode === 'per_day') {
      // Fetch pricing config for default free-km calculation
      const { data: config } = await supabase
        .from('pricing_config')
        .select('first_day_free_km, subsequent_day_free_km')
        .eq('id', 1)
        .single();

      const start = new Date(booking.start_date);
      const end = endDate ? new Date(endDate) : new Date();
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

      const endReading = Number(endMeterReading);
      totalKm = endReading - (booking.start_meter_reading || 0);

      // Compute the auto-calculated default free km (snapshot from current config)
      computedDefaultFreeKm = config
        ? config.first_day_free_km + (days - 1) * config.subsequent_day_free_km
        : (booking.free_km ?? 150);

      // Resolve free_km: completion-time param → stored booking value → default
      resolvedFreeKm = freeKm != null && freeKm !== ''
        ? Number(freeKm)
        : (booking.free_km ?? computedDefaultFreeKm);

      const defaultPricePerDay = booking.default_price_per_day || booking.price_per_day || 0;
      const pricePerDay = booking.price_per_day || 0;
      const pricePerKm = booking.price_per_km || 0;

      extraKm = Math.max(0, totalKm - resolvedFreeKm);
      extraKmCharge = extraKm * pricePerKm;

      // base_amount = what customer would pay at fully standard rates
      const defaultExtraKm = Math.max(0, totalKm - computedDefaultFreeKm);
      const defaultExtraKmCharge = defaultExtraKm * pricePerKm;
      baseAmount = days * defaultPricePerDay + defaultExtraKmCharge;

      // discount_amount = rate savings + free-km bonus savings (both auto-calculated)
      const rateDiscount = (defaultPricePerDay - pricePerDay) * days;
      const kmDiscount = defaultExtraKmCharge - extraKmCharge;
      computedDiscount = Math.max(0, rateDiscount + kmDiscount);

      finalAmount = baseAmount - computedDiscount;
      // Algebraically equals: days * pricePerDay + extraKm * pricePerKm
    } else {
      // per_km billing (unchanged)
      const endReading = Number(endMeterReading);
      totalKm = endReading - (booking.start_meter_reading || 0);
      baseAmount = totalKm * (booking.price_per_km || 0);
      const discount = Number(discountAmount) || 0;
      computedDiscount = discount;
      finalAmount = baseAmount - discount;
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        end_meter_reading: booking.is_outsourced ? null : Number(endMeterReading),
        end_date: endDate ? new Date(endDate).toISOString() : new Date().toISOString(),
        total_km: totalKm,
        base_amount: baseAmount,
        discount_amount: computedDiscount,
        final_amount: finalAmount,
        extra_km: extraKm,
        extra_km_charge: extraKmCharge,
        ...(booking.billing_mode === 'per_day' ? {
          default_free_km: computedDefaultFreeKm,
          free_km: resolvedFreeKm,
        } : {}),
        outsourced_payment: outsourcedPayment ? Number(outsourcedPayment) : booking.outsourced_payment,
        commission_rate: Number(commissionRate) || booking.commission_rate,
        status: 'completed',
      })
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    await supabase
      .from('vehicles')
      .update({
        is_available: true,
        last_meter_reading: booking.is_outsourced
          ? booking.start_meter_reading
          : Number(endMeterReading),
      })
      .eq('id', booking.vehicle_id);

    if (!booking.is_outsourced && endMeterReading) {
      await supabase
        .from('meter_readings')
        .insert({
          vehicle_id: booking.vehicle_id,
          booking_id: req.params.id,
          reading: Number(endMeterReading),
          type: 'end',
          recorded_by: (req as any).user?.id || 'admin',
        });
    }

    const monthKey = format(new Date(), 'yyyy-MM');
    const { data: revDoc } = await supabase
      .from('revenue')
      .select('*')
      .eq('month', monthKey)
      .single();

    if (revDoc) {
      await supabase
        .from('revenue')
        .update({
          total_revenue: (revDoc.total_revenue || 0) + finalAmount,
          total_bookings: (revDoc.total_bookings || 0) + 1,
          total_km: (revDoc.total_km || 0) + totalKm,
          updated_at: new Date().toISOString(),
        })
        .eq('month', monthKey);
    } else {
      await supabase
        .from('revenue')
        .insert({
          month: monthKey,
          total_revenue: finalAmount,
          total_bookings: 1,
          total_km: totalKm,
        });
    }

    const { data: updatedBooking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', req.params.id)
      .single();

    res.json(mapBookingToResponse(updatedBooking));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **Step 2: Update `mapBookingToResponse` to include new fields**

Replace the `mapBookingToResponse` function at the bottom of the file:

```typescript
function mapBookingToResponse(b: any) {
  if (!b) return null;
  return {
    id: b.id,
    customerId: b.customer_id,
    vehicleId: b.vehicle_id,
    startDate: b.start_date,
    endDate: b.end_date,
    startMeterReading: b.start_meter_reading,
    endMeterReading: b.end_meter_reading,
    totalKm: b.total_km,
    pricePerKm: b.price_per_km,
    pricePerDay: b.price_per_day,
    defaultPricePerDay: b.default_price_per_day,
    billingMode: b.billing_mode || 'per_km',
    defaultFreeKm: b.default_free_km,
    freeKm: b.free_km,
    extraKm: b.extra_km,
    extraKmCharge: b.extra_km_charge,
    baseAmount: b.base_amount,
    discountAmount: b.discount_amount,
    finalAmount: b.final_amount,
    isOutsourced: b.is_outsourced,
    outsourcedPayment: b.outsourced_payment,
    commissionRate: b.commission_rate,
    status: b.status,
    invoiceUrl: b.invoice_url,
    notes: b.notes,
    createdAt: b.created_at,
  };
}
```

- [ ] **Step 3: Verify — complete a per_day booking with curl**

Using the booking ID from Task 3 Step 2:

```bash
curl -X PUT http://localhost:5000/api/bookings/<booking-id>/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "endDate": "2026-05-22",
    "endMeterReading": 45250
  }'
```

Assuming `startMeterReading=45000`, vehicle `price_per_day=5000`, `price_per_km=50`:
- `days = 3`, `total_km = 250`, `default_free_km = 350`
- `extra_km = 0` (250 < 350), `extra_km_charge = 0`
- `base_amount = 3×5000 + 0 = 15000`
- `discount_amount = 0` (no override)
- `final_amount = 15000`

Expected response includes: `"finalAmount":15000,"extraKm":0,"extraKmCharge":0,"discountAmount":0`

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/bookings.routes.ts
git commit -m "feat: implement free-km pricing formula in complete booking endpoint"
```

---

## Task 5: Frontend — API Client

**Files:**
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Add pricing config functions**

After the last line of `frontend/lib/api.ts`, add:

```typescript
// ─── Pricing Config ───────────────────────────────────────────────────────────
export const getPricingConfig = () => API.get('/pricing-config');
export const updatePricingConfig = (data: { firstDayFreeKm: number; subsequentDayFreeKm: number }) =>
  API.put('/pricing-config', data);
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat: add getPricingConfig and updatePricingConfig API functions"
```

---

## Task 6: Frontend — Settings Page (Pricing Config Form)

**Files:**
- Modify: `frontend/app/admin/settings/page.tsx`

- [ ] **Step 1: Replace the settings page**

Replace the entire contents of `frontend/app/admin/settings/page.tsx`:

```tsx
'use client';
import { useEffect, useState } from 'react';
import { getPricingConfig, updatePricingConfig } from '@/lib/api';
import toast from 'react-hot-toast';
import { Route, CalendarDays, Save } from 'lucide-react';

export default function SettingsPage() {
  const [config, setConfig] = useState({ firstDayFreeKm: 150, subsequentDayFreeKm: 100 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPricingConfig()
      .then(r => setConfig({ firstDayFreeKm: r.data.firstDayFreeKm, subsequentDayFreeKm: r.data.subsequentDayFreeKm }))
      .catch(() => toast.error('Failed to load config'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updatePricingConfig(config);
      toast.success('Pricing config updated');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const previewDays = [1, 2, 3, 5, 7];
  const calcFreeKm = (days: number) =>
    config.firstDayFreeKm + (days - 1) * config.subsequentDayFreeKm;

  return (
    <div className="animate-fade">
      <div className="page-header" style={{ marginBottom: '1.75rem' }}>
        <div>
          <h1 className="page-title">Settings</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            System configuration and preferences
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', maxWidth: 560 }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>
          Free KM Allocation Defaults
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          These defaults apply to all new per-day bookings. Individual bookings can override them.
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto' }} />
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CalendarDays size={11} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                  First Day Free KM
                </label>
                <input
                  type="number" className="form-input" min={1}
                  value={config.firstDayFreeKm}
                  onChange={e => setConfig(c => ({ ...c, firstDayFreeKm: Number(e.target.value) }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Route size={11} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                  Each Subsequent Day Free KM
                </label>
                <input
                  type="number" className="form-input" min={1}
                  value={config.subsequentDayFreeKm}
                  onChange={e => setConfig(c => ({ ...c, subsequentDayFreeKm: Number(e.target.value) }))}
                  required
                />
              </div>
            </div>

            {/* Live preview table */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '0.6rem 0.85rem', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Free KM Preview
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${previewDays.length}, 1fr)` }}>
                {previewDays.map((days, i) => (
                  <div key={days} style={{ padding: '0.6rem 0.5rem', textAlign: 'center', borderRight: i < previewDays.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                      {days} day{days > 1 ? 's' : ''}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--gold)' }}>
                      {calcFreeKm(days)} km
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {saving ? <span className="spinner" /> : <><Save size={14} strokeWidth={2} /> Save Changes</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Test in browser**

Start the frontend (`cd frontend && npm run dev`), navigate to `/admin/settings`.

Verify:
- Page loads the current values (150 / 100)
- Changing the numbers updates the preview table instantly
- Clicking Save shows a success toast
- Refreshing the page shows the saved values

- [ ] **Step 3: Commit**

```bash
git add frontend/app/admin/settings/page.tsx
git commit -m "feat: implement pricing config settings page"
```

---

## Task 7: Frontend — Create Booking Modal (per_day additions)

**Files:**
- Modify: `frontend/app/admin/bookings/page.tsx`

- [ ] **Step 1: Add pricingConfig state and load it**

At the top of the `BookingsPage` component, after the existing `useState` declarations, add:

```tsx
const [pricingConfig, setPricingConfig] = useState<{ firstDayFreeKm: number; subsequentDayFreeKm: number } | null>(null);
```

After the existing `import` for `getBookings, getCustomers, getVehicles, createBooking, deleteBooking`, add `getPricingConfig` to the import:

```tsx
import { getBookings, getCustomers, getVehicles, createBooking, deleteBooking, getPricingConfig } from '@/lib/api';
```

Inside the `load` function, add the pricing config fetch:

```tsx
const load = () => {
  setLoading(true);
  Promise.all([getBookings(), getCustomers(), getVehicles(), getPricingConfig()])
    .then(([b, c, v, p]) => {
      setBookings(b.data);
      setCustomers(c.data);
      setVehicles(v.data);
      setPricingConfig(p.data);
    })
    .finally(() => setLoading(false));
};
```

- [ ] **Step 2: Extend form state with new per_day fields**

Replace the existing `form` state initialisation:

```tsx
// OLD
const [form, setForm] = useState({ customerId: '', vehicleId: '', startDate: '', notes: '', billingMode: 'per_km' as 'per_km' | 'per_day' });

// NEW
const [form, setForm] = useState({
  customerId: '',
  vehicleId: '',
  startDate: '',
  endDate: '',
  pricePerDay: '',
  freeKm: '',
  notes: '',
  billingMode: 'per_km' as 'per_km' | 'per_day',
});
```

- [ ] **Step 3: Add a helper to auto-calculate free KM**

After the `selectedVehicle` declaration, add:

```tsx
const calcDefaultFreeKm = (start: string, end: string) => {
  if (!start || !end || !pricingConfig) return null;
  const days = Math.max(1, Math.ceil(
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
  ));
  return pricingConfig.firstDayFreeKm + (days - 1) * pricingConfig.subsequentDayFreeKm;
};

const previewFreeKm = form.freeKm
  ? Number(form.freeKm)
  : calcDefaultFreeKm(form.startDate, form.endDate);

const previewDays = (form.startDate && form.endDate)
  ? Math.max(1, Math.ceil(
      (new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / (1000 * 60 * 60 * 24)
    ))
  : null;
```

- [ ] **Step 4: Update handleCreate to pass new fields**

Replace the `handleCreate` function:

```tsx
const handleCreate = async (e: React.FormEvent) => {
  e.preventDefault(); setSubmitting(true);
  try {
    await createBooking({
      ...form,
      startMeterReading: selectedVehicle?.lastMeterReading || 0,
      pricePerKm: selectedVehicle?.pricePerKm || 0,
      pricePerDay: form.pricePerDay ? Number(form.pricePerDay) : selectedVehicle?.pricePerDay || 0,
      freeKm: form.freeKm ? Number(form.freeKm) : undefined,
      isOutsourced: selectedVehicle?.isOutsourced || false,
      commissionRate: selectedVehicle?.isOutsourced ? (selectedVehicle?.commissionRate || 10) : 0,
      billingMode: form.billingMode,
    });
    toast.success('Booking created');
    setModalOpen(false);
    setForm({ customerId: '', vehicleId: '', startDate: '', endDate: '', pricePerDay: '', freeKm: '', notes: '', billingMode: 'per_km' });
    load();
  } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to create booking'); }
  finally { setSubmitting(false); }
};
```

- [ ] **Step 5: Add per_day fields to the modal Billing section**

Inside the modal form, replace the existing `{form.billingMode === 'per_day' && (...)}` start-date block and extend the Billing section. The section currently looks like:

```tsx
{/* Start date (per_day only) */}
{form.billingMode === 'per_day' && (
  <div className="form-group" style={{ marginBottom: '0.85rem' }}>
    <label className="form-label" ...> Start Date * </label>
    <input type="date" ... />
  </div>
)}
```

Replace it with:

```tsx
{form.billingMode === 'per_day' && (
  <>
    {/* Start + End date row */}
    <div className="grid-2" style={{ marginBottom: '0.85rem' }}>
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <CalendarDays size={11} strokeWidth={2} style={{ color: 'var(--text-muted)' }} /> Start Date *
        </label>
        <input type="date" className="form-input"
          value={form.startDate}
          onChange={e => setForm({ ...form, startDate: e.target.value })}
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <CalendarDays size={11} strokeWidth={2} style={{ color: 'var(--text-muted)' }} /> End Date
          <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.7rem' }}> (optional)</span>
        </label>
        <input type="date" className="form-input"
          value={form.endDate}
          min={form.startDate}
          onChange={e => setForm({ ...form, endDate: e.target.value })}
        />
      </div>
    </div>

    {/* Rate + Free KM overrides */}
    <div className="grid-2" style={{ marginBottom: '0.85rem' }}>
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Banknote size={11} strokeWidth={2} style={{ color: 'var(--text-muted)' }} /> Daily Rate (LKR)
        </label>
        <input type="number" className="form-input" min={0}
          placeholder={`Default: ${selectedVehicle?.pricePerDay || 0}`}
          value={form.pricePerDay}
          onChange={e => setForm({ ...form, pricePerDay: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Route size={11} strokeWidth={2} style={{ color: 'var(--text-muted)' }} /> Free KM Override
        </label>
        <input type="number" className="form-input" min={0}
          placeholder={previewFreeKm != null ? `Auto: ${previewFreeKm} km` : 'Set end date first'}
          value={form.freeKm}
          onChange={e => setForm({ ...form, freeKm: e.target.value })}
        />
      </div>
    </div>

    {/* Preview pill */}
    {(previewDays || form.pricePerDay || form.freeKm) && (
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '0.65rem 0.85rem', marginBottom: '0.85rem', display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.78rem' }}>
        {previewDays && (
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Duration: </span>
            <span style={{ fontWeight: 700 }}>{previewDays} day{previewDays > 1 ? 's' : ''}</span>
          </div>
        )}
        {previewFreeKm != null && (
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Free KM: </span>
            <span style={{ fontWeight: 700, color: form.freeKm ? 'var(--gold)' : 'inherit' }}>
              {form.freeKm ? Number(form.freeKm) : previewFreeKm} km
              {form.freeKm && previewFreeKm && Number(form.freeKm) !== previewFreeKm &&
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (default: {previewFreeKm})</span>
              }
            </span>
          </div>
        )}
        {form.pricePerDay && selectedVehicle && Number(form.pricePerDay) !== selectedVehicle.pricePerDay && (
          <div style={{ color: '#22c55e' }}>
            <span>Rate saving: </span>
            <span style={{ fontWeight: 700 }}>
              LKR {((selectedVehicle.pricePerDay - Number(form.pricePerDay)) * (previewDays || 1)).toLocaleString()}
              {previewDays ? '' : '/day'}
            </span>
          </div>
        )}
      </div>
    )}
  </>
)}
```

You will also need to add `Route` to the existing lucide-react import at the top of the file since it's used in the new fields. The current import is:
```tsx
import { Plus, Trash2, CalendarDays, Route, CalendarCheck, CalendarPlus, Users, Car, Gauge, Banknote, NotebookPen } from 'lucide-react';
```
`Route` and `Banknote` are already imported — no change needed.

- [ ] **Step 6: Test in browser**

Navigate to `/admin/bookings` → click **New Booking** → select Per Day mode.

Verify:
- Start Date and End Date fields appear
- Setting both dates shows a duration preview
- Free KM is auto-filled based on the duration
- Changing Free KM override shows "default: X km" note
- Setting a lower Daily Rate shows the rate saving in gold
- Creating the booking succeeds; the Supabase `bookings` row shows correct `default_price_per_day` and `free_km`

- [ ] **Step 7: Commit**

```bash
git add frontend/app/admin/bookings/page.tsx
git commit -m "feat: add end date, daily rate override and free-km override to create booking modal"
```

---

## Task 8: Frontend — Complete Booking Form (free-KM fields + full breakdown)

**Files:**
- Modify: `frontend/app/admin/bookings/[id]/page.tsx`

- [ ] **Step 1: Add pricingConfig state and load it**

After the existing imports, add `getPricingConfig` to the import from `@/lib/api`:

```tsx
import { getBooking, getCustomer, getVehicle, completeBooking, generateInvoice, getWhatsAppLink, getPricingConfig } from '@/lib/api';
```

After `const [invoice, setInvoice] = useState(...)`, add:

```tsx
const [pricingConfig, setPricingConfig] = useState<{ firstDayFreeKm: number; subsequentDayFreeKm: number } | null>(null);
```

In the `load` function, fetch pricing config alongside the booking:

```tsx
const load = async () => {
  setLoading(true);
  try {
    const [b, p] = await Promise.all([getBooking(id), getPricingConfig()]);
    setBooking(b.data);
    setPricingConfig(p.data);
    setEndForm(f => ({
      ...f,
      commissionRate: String(b.data.commissionRate || 10),
      freeKm: b.data.freeKm != null ? String(b.data.freeKm) : '',
    }));
    const [c, v] = await Promise.all([
      getCustomer(b.data.customerId),
      getVehicle(b.data.vehicleId),
    ]);
    setCustomer(c.data);
    setVehicle(v.data);
  } catch { toast.error('Failed to load booking'); }
  finally { setLoading(false)); }
};
```

- [ ] **Step 2: Add freeKm to endForm state**

Replace the existing `endForm` state initialisation:

```tsx
// OLD
const [endForm, setEndForm] = useState({
  endMeterReading: '',
  discountAmount: '0',
  endDate: new Date().toISOString().split('T')[0],
  outsourcedPayment: '',
  commissionRate: '10',
});

// NEW
const [endForm, setEndForm] = useState({
  endMeterReading: '',
  discountAmount: '0',
  endDate: new Date().toISOString().split('T')[0],
  outsourcedPayment: '',
  commissionRate: '10',
  freeKm: '',
});
```

- [ ] **Step 3: Replace `previewPerDay` with full-breakdown version**

Replace the existing `previewPerDay` function:

```tsx
const previewPerDay = () => {
  if (!booking || booking.isOutsourced || booking.billingMode !== 'per_day') return null;
  if (!endForm.endDate || !booking.startDate) return null;
  if (!endForm.endMeterReading) return null;

  const start = new Date(typeof booking.startDate === 'string'
    ? booking.startDate
    : new Date(booking.startDate._seconds * 1000));
  const end = new Date(endForm.endDate);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  const totalKm = Number(endForm.endMeterReading) - (booking.startMeterReading || 0);
  if (totalKm < 0) return null;

  const autoDefaultFreeKm = pricingConfig
    ? pricingConfig.firstDayFreeKm + (days - 1) * pricingConfig.subsequentDayFreeKm
    : (booking.freeKm ?? 150);

  const freeKm = endForm.freeKm
    ? Number(endForm.freeKm)
    : (booking.freeKm ?? autoDefaultFreeKm);

  const pricePerKm = booking.pricePerKm || 0;
  const pricePerDay = booking.pricePerDay || 0;
  const defaultPricePerDay = booking.defaultPricePerDay || pricePerDay;

  const extraKm = Math.max(0, totalKm - freeKm);
  const extraKmCharge = extraKm * pricePerKm;

  const defaultExtraKm = Math.max(0, totalKm - autoDefaultFreeKm);
  const defaultExtraKmCharge = defaultExtraKm * pricePerKm;

  const rateDiscount = Math.max(0, (defaultPricePerDay - pricePerDay) * days);
  const kmDiscount = Math.max(0, defaultExtraKmCharge - extraKmCharge);
  const totalDiscount = rateDiscount + kmDiscount;

  const base = days * defaultPricePerDay + defaultExtraKmCharge;
  const final = base - totalDiscount;

  return {
    days, totalKm, freeKm, autoDefaultFreeKm, extraKm, extraKmCharge,
    pricePerDay, defaultPricePerDay, rateDiscount, kmDiscount, totalDiscount,
    base, final,
  };
};
```

- [ ] **Step 4: Update handleComplete to send freeKm**

Replace the `handleComplete` function:

```tsx
const handleComplete = async (e: React.FormEvent) => {
  e.preventDefault(); setCompleting(true);
  try {
    await completeBooking(id, {
      endDate: endForm.endDate,
      endMeterReading: Number(endForm.endMeterReading),
      discountAmount: Number(endForm.discountAmount),
      outsourcedPayment: Number(endForm.outsourcedPayment),
      commissionRate: Number(endForm.commissionRate),
      freeKm: endForm.freeKm ? Number(endForm.freeKm) : undefined,
    });
    toast.success('Booking completed!'); load();
  } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed'); }
  finally { setCompleting(false); }
};
```

- [ ] **Step 5: Update the Complete Booking form fields (per_day section)**

In the JSX, find the `{isPerDay ? (...) : (...)}` branch inside the complete booking form. Replace the per_day branch (the `<>...</>` that contains end meter + discount fields) with:

```tsx
<>
  <div className="form-group">
    <label className="form-label">End Meter Reading (km) *</label>
    <input
      type="number" className="form-input"
      placeholder={`> ${booking.startMeterReading}`}
      value={endForm.endMeterReading}
      onChange={e => setEndForm({ ...endForm, endMeterReading: e.target.value })}
      required
    />
  </div>
  <div className="form-group">
    <label className="form-label">
      Free KM
      {calcDay?.autoDefaultFreeKm != null && (
        <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.4rem', fontSize: '0.72rem' }}>
          (default: {calcDay.autoDefaultFreeKm} km)
        </span>
      )}
    </label>
    <input
      type="number" className="form-input" min={0}
      placeholder={calcDay?.autoDefaultFreeKm != null ? String(calcDay.autoDefaultFreeKm) : 'Auto'}
      value={endForm.freeKm}
      onChange={e => setEndForm({ ...endForm, freeKm: e.target.value })}
    />
  </div>
</>
```

- [ ] **Step 6: Update the live price preview for per_day**

Find the `{calcDay && (...)}` section in the "Live preview" card and replace it with:

```tsx
{calcDay && (
  <>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--text-muted)' }}>Duration</span>
      <span>{calcDay.days} day{calcDay.days > 1 ? 's' : ''}</span>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--text-muted)' }}>Daily Rate</span>
      <span>
        LKR {calcDay.pricePerDay.toLocaleString()}
        {calcDay.defaultPricePerDay !== calcDay.pricePerDay && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginLeft: 6 }}>
            (default: LKR {calcDay.defaultPricePerDay.toLocaleString()})
          </span>
        )}
      </span>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--text-muted)' }}>KM Driven</span>
      <span>{calcDay.totalKm.toLocaleString()} km</span>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--text-muted)' }}>Free KM</span>
      <span style={{ color: calcDay.freeKm > calcDay.autoDefaultFreeKm ? 'var(--gold)' : 'inherit' }}>
        {calcDay.freeKm.toLocaleString()} km
      </span>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--text-muted)' }}>Extra KM</span>
      <span>{calcDay.extraKm.toLocaleString()} km</span>
    </div>
    {calcDay.extraKmCharge > 0 && (
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--text-muted)' }}>Extra KM Charge</span>
        <span>LKR {calcDay.extraKmCharge.toLocaleString()}</span>
      </div>
    )}
    {calcDay.rateDiscount > 0 && (
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e' }}>
        <span>Rate Discount</span>
        <span>− LKR {calcDay.rateDiscount.toLocaleString()}</span>
      </div>
    )}
    {calcDay.kmDiscount > 0 && (
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e' }}>
        <span>Free KM Bonus</span>
        <span>− LKR {calcDay.kmDiscount.toLocaleString()}</span>
      </div>
    )}
    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.45rem', marginTop: '0.2rem', fontWeight: 700, fontSize: '1rem', color: 'var(--gold)' }}>
      <span>Total</span>
      <span>LKR {calcDay.final.toLocaleString()}</span>
    </div>
  </>
)}
```

- [ ] **Step 7: Test in browser**

Navigate to an active per_day booking → scroll to Complete Booking.

Verify:
- End Meter Reading is now required
- Free KM shows the auto-calculated default in the placeholder
- Setting a custom Free KM updates the preview instantly
- Rate Discount and Free KM Bonus lines appear only when applicable
- Completing the booking → the Supabase row has correct `extra_km`, `extra_km_charge`, `discount_amount`, `final_amount`

Also test with a VIP override (lower rate + higher free KM) and confirm all discount lines appear correctly.

- [ ] **Step 8: Commit**

```bash
git add frontend/app/admin/bookings/[id]/page.tsx
git commit -m "feat: add free-km field and full pricing breakdown to complete booking form"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Free KM allocation calculated from `pricing_config` defaults (150 / 100)
- ✅ Defaults stored in DB, editable via Settings page
- ✅ Booking-level override: daily rate — Task 3 + Task 7
- ✅ Booking-level override: free KM — Task 3 + Task 7 + Task 8
- ✅ Overrides available at both creation and completion — Tasks 3, 7, 8
- ✅ Auto-calc days from pickup → return dates — Task 4
- ✅ Auto-calc extra KM = max(0, total_km − free_km) — Task 4
- ✅ Auto-calc extra KM charge — Task 4
- ✅ Discount auto-calculated from defaults (rate + free-km bonus) — Task 4
- ✅ Odometer: start/end reading → total KM — existing + Task 4
- ✅ Response mapper updated with new fields — Task 4 Step 2
- ✅ `per_km` mode unchanged — Task 4 (else branch preserved)
- ✅ Outsourced mode unchanged — Task 4 (first if-branch preserved)

**Type consistency:**
- `freeKm` (camelCase) used throughout frontend; `free_km` (snake_case) used throughout backend — consistent with existing field naming convention.
- `pricingConfig.firstDayFreeKm` / `pricingConfig.subsequentDayFreeKm` — used identically in Tasks 6, 7, 8.
- `calcDay` returned by `previewPerDay()` — all properties (`days`, `totalKm`, `freeKm`, `autoDefaultFreeKm`, `extraKm`, `extraKmCharge`, `rateDiscount`, `kmDiscount`, `final`) referenced consistently in Tasks 8 Step 5 and Step 6.
