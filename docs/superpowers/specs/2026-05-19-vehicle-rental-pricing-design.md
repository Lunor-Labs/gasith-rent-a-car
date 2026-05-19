# Vehicle Rental Pricing Logic — Design Spec

**Date:** 2026-05-19  
**Status:** Approved

---

## Overview

Upgrade the existing `per_day` billing mode to support a **free-KM allocation model**. Customers pay a daily rate but receive a configurable number of free kilometres per day. Any kilometres driven beyond the free allocation are charged at the vehicle's `price_per_km` rate. Booking-level overrides allow special pricing for VIP customers or promotions. Discounts are auto-calculated — not manually entered.

---

## Decisions Made

| Question | Decision |
|----------|----------|
| New mode vs. replace per_day | Replace `per_day` — all day-based bookings use free-KM logic |
| Extra KM rate | Vehicle's existing `price_per_km` |
| Free KM override location | Both at creation and at completion |
| End date at creation | Optional (enables free-KM preview if provided) |
| Discount source | Auto-calculated from rate + free-KM overrides against defaults |

---

## 1. Data Model

### New table: `pricing_config`

Single-row configuration table for system-wide free-KM defaults.

```sql
CREATE TABLE pricing_config (
  id                       INTEGER PRIMARY KEY DEFAULT 1,
  first_day_free_km        NUMERIC(10,1) NOT NULL DEFAULT 150,
  subsequent_day_free_km   NUMERIC(10,1) NOT NULL DEFAULT 100,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO pricing_config (id, first_day_free_km, subsequent_day_free_km)
VALUES (1, 150, 100)
ON CONFLICT (id) DO NOTHING;
```

**Free KM formula:**
```
free_km = first_day_free_km + (days − 1) × subsequent_day_free_km
```

Examples with defaults (150 / 100):
- 1 day  → 150 km
- 2 days → 250 km
- 3 days → 350 km
- 5 days → 550 km

### New columns on `bookings`

```sql
ALTER TABLE bookings
  ADD COLUMN default_price_per_day  NUMERIC(10,2)  NOT NULL DEFAULT 0,
  ADD COLUMN default_free_km        NUMERIC(10,1),   -- snapshot at completion
  ADD COLUMN free_km                NUMERIC(10,1),   -- actual free km (default or override)
  ADD COLUMN extra_km               NUMERIC(12,1)   NOT NULL DEFAULT 0,
  ADD COLUMN extra_km_charge        NUMERIC(12,2)   NOT NULL DEFAULT 0;
```

| Column | Populated | Notes |
|--------|-----------|-------|
| `default_price_per_day` | At creation | Snapshot of vehicle's `price_per_day` at booking time |
| `default_free_km` | At completion | Auto-calculated from `pricing_config` × actual days |
| `free_km` | At creation (if override) or completion | Override or equals `default_free_km` |
| `extra_km` | At completion | `max(0, total_km − free_km)` |
| `extra_km_charge` | At completion | `extra_km × price_per_km` |

The existing `base_amount`, `discount_amount`, and `final_amount` columns are reused with new formulas for `per_day` mode.

---

## 2. Pricing Formulas (per_day mode)

All calculations happen on the backend at booking completion.

```
// Inputs
days              = calendar days from start_date to end_date (min 1)
total_km          = end_meter_reading − start_meter_reading
default_price_per_day = booking.default_price_per_day   (vehicle snapshot)
price_per_day     = booking.price_per_day               (override or equals default)
default_free_km   = first_day_free_km + (days−1) × subsequent_day_free_km
free_km           = booking.free_km ?? default_free_km  (override or auto)
price_per_km      = booking.price_per_km                (vehicle's extra-km rate)

// Derived
extra_km          = max(0, total_km − free_km)
extra_km_charge   = extra_km × price_per_km

// Base: what the customer would pay at fully standard rates
base_amount       = days × default_price_per_day
                  + max(0, total_km − default_free_km) × price_per_km

// Discount: auto-calculated (no manual entry for per_day mode)
rate_discount     = (default_price_per_day − price_per_day) × days
km_discount       = max(0, total_km − default_free_km) × price_per_km − extra_km_charge
discount_amount   = rate_discount + km_discount

// Final
final_amount      = base_amount − discount_amount
                  = days × price_per_day + extra_km × price_per_km  ✓
```

> `per_km` billing mode is unchanged.

---

## 3. Backend Changes

### New endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/pricing-config` | Public | Returns current free-KM defaults |
| `PUT` | `/api/pricing-config` | Admin | Updates `first_day_free_km` and `subsequent_day_free_km` |

### Modified: `POST /api/bookings` (create)

New accepted fields:

| Field | Type | Notes |
|-------|------|-------|
| `endDate` | string (ISO date) | Optional — enables free-KM preview |
| `pricePerDay` | number | Override (defaults to vehicle's `price_per_day`) |
| `freeKm` | number | Override — if omitted and `endDate` provided, auto-calculated |

Logic changes:
- Always snapshot `default_price_per_day` = vehicle's `price_per_day`
- If `endDate` and no `freeKm` override: compute and store `free_km` from pricing_config
- If `freeKm` override provided: store it as `free_km`
- Otherwise: store `free_km = null` (will be resolved at completion)

### Modified: `PUT /api/bookings/:id/complete` (complete)

New accepted fields:

| Field | Type | Notes |
|-------|------|-------|
| `freeKm` | number | Override at completion — pre-filled from stored value, still editable |

`per_day` calculation changes:
1. `endMeterReading` is now **required** (was optional)
2. Compute `days`, `total_km`, `default_free_km` (from pricing_config)
3. Resolve `free_km` (priority order): completion-time `freeKm` param → stored `booking.free_km` → `default_free_km`
4. Apply formulas from Section 2
5. Store all new fields: `default_free_km`, `free_km`, `extra_km`, `extra_km_charge`, `base_amount`, `discount_amount`, `final_amount`
6. Remove manual `discountAmount` input from per_day flow (discount is now auto-calculated)

---

## 4. Frontend Changes

### Create Booking Modal (`/admin/bookings`)

Per-day mode additions:
- **Optional End Date** — date picker; when set, triggers live free-KM preview
- **Daily Rate** — number input, pre-filled from vehicle's `price_per_day`, editable
- **Free KM** — number input, pre-filled with auto-calculated value if end date is given, editable

Live preview (shown when end date is set):
```
Estimated duration    : X days
Standard free KM      : N km
Your free KM          : M km  (shown in gold if overridden)
Rate discount         : LKR D  (shown only if rate is lower than default)
```

### Complete Booking Form (`/admin/bookings/[id]`)

Per-day mode upgrades:
- **End Meter Reading** — now required (previously optional)
- **Free KM** — pre-filled from stored `booking.free_km`, editable
- Remove manual Discount Amount field (replaced by auto-calculation)
- Live price preview shows full breakdown:

```
Duration              : X days
Daily Rate            : LKR Y/day  [default: LKR Z]  ← shown only if overridden
─────────────────────────────────────────────
KM Driven             : M km
Free KM               : N km
Extra KM              : K km
Extra KM Charge       : LKR E
─────────────────────────────────────────────
Rate Discount         : −LKR D1  ← only if rate was overridden
Free KM Bonus         : −LKR D2  ← only if free_km > default_free_km
─────────────────────────────────────────────
Total                 : LKR F
```

### New Admin Settings Page (`/admin/settings`)

Simple form with two fields:
- First day free KM (default: 150)
- Subsequent days free KM per day (default: 100)

Calls `PUT /api/pricing-config`. Changes take effect on new bookings; existing bookings are unaffected.

---

## 5. Booking Response Mapping

`mapBookingToResponse` to include new fields:

```ts
defaultPricePerDay: b.default_price_per_day,
defaultFreeKm:      b.default_free_km,
freeKm:             b.free_km,
extraKm:            b.extra_km,
extraKmCharge:      b.extra_km_charge,
```

---

## 6. Scope & Constraints

- `per_km` billing mode: **no changes**
- Outsourced bookings: **no changes**
- The `pricing_config` table holds one row. It can only be updated, never deleted.
- `discount_amount` for `per_day` bookings is always auto-calculated — there is no manual discount input for this mode.
- If `free_km` is not set at creation and no end date was provided, it is resolved at completion using the actual trip days and the current `pricing_config` values.
