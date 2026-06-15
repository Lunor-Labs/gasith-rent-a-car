# Booking Price Breakdown — Design

Date: 2026-06-15
Status: Approved (design), pending spec review

## Problem

The completed-booking "Invoice" summary on the booking detail page
(`frontend/app/admin/bookings/[id]/page.tsx`) is confusing. It lists `Extra KM
Charge` and `Free KM Used`, then a `Base Amount` number that silently includes
both a `days × default-rate` charge and the extra-KM charge — none of which is
shown as a line. The column does not visibly add up, so users cannot see how
`Base Amount` was derived or how the final price was reached.

Separately, the admin gives discounts three ways, but only two are recorded as
discounts today:

| Lever | Stored as | Shown as discount? |
|---|---|---|
| Lower daily rate | `default_price_per_day` vs `price_per_day` | ✅ rate discount |
| Lower KM rate | only `price_per_km` (no baseline) | ❌ **invisible** |
| More free KM | `default_free_km` vs `free_km` | ✅ free-KM bonus |

A lowered KM rate is invisible because `base_amount` and the extra-KM charge use
the **same** `price_per_km` (`bookings.routes.ts:287,290`), so the reduction
cancels out (`kmDiscount = 0`) and `base_amount` is computed from the
already-lowered rate. There is no standard KM rate to compare against.

## Goals

1. Capture a lowered KM rate as a real, itemized discount.
2. Replace the confusing `Base Amount` block with an itemized breakdown where
   every line is justified and the column adds up.
3. Apply the breakdown to the **Completed Invoice summary** and the **Live Price
   Preview** (during return). NOT the generated PDF invoice.

Non-goals: changing the PDF invoice; reworking outsourced commission display
(only ensure it still renders after the breakdown changes).

## Data model change

Add one column to `bookings`:

```sql
ALTER TABLE bookings ADD COLUMN default_price_per_km numeric;
```

Captured at booking creation as the vehicle's standard KM rate, mirroring
`default_price_per_day`:

- On insert (`bookings.routes.ts` create): `default_price_per_km =
  vehicleData?.price_per_km` (the rack rate), while `price_per_km` stays the
  entered/overridden value.

**Old bookings** have `default_price_per_km = NULL`. Everywhere it is read, fall
back to `price_per_km` ⇒ `kmRateDiscount = 0` and `base_amount` unchanged, so
historical totals are identical. No backfill required.

## Calculation change (completion endpoint)

In `bookings.routes.ts` completion handler, `base_amount` must reflect full rack
pricing, and the KM discount splits into two components:

```
defaultPricePerKm   = booking.default_price_per_km ?? booking.price_per_km
defaultExtraKm      = max(0, total_km − default_free_km)
defaultExtraKmCharge = defaultExtraKm × defaultPricePerKm        // was × price_per_km
base_amount         = days × default_price_per_day + defaultExtraKmCharge

rateDiscount   = (default_price_per_day − price_per_day) × days
kmRateDiscount = (defaultPricePerKm − price_per_km) × extraKm     // extraKm = billed extra km
freeKmBonus    = (free_km − default_free_km) × defaultPricePerKm
kmDiscount     = kmRateDiscount + freeKmBonus
computedDiscount = max(0, rateDiscount + kmDiscount) + additionalDiscount
```

Verified algebra: `base_amount − (rateDiscount + kmRateDiscount + freeKmBonus) =
days × price_per_day + extraKm × price_per_km` = the actual trip amount. So the
itemized breakdown reconciles exactly to `final_amount` (driver fee added on
top, unchanged).

The stored `base_amount` and `discount_amount` already exist; only their inputs
change. No new discount columns are stored — the three components are derived for
display (below).

## Display

Both surfaces show the same itemized structure. Lines hide when their value is 0.

```
Daily charge      {days} × LKR {default_price_per_day}    LKR {days×defaultPPD}
Extra KM charge   {defaultExtraKm} km × LKR {defaultPPK}   LKR {defaultExtraKmCharge}
──────────────────────────────────────────────────────────────────────────────
Base Amount                                                LKR {base_amount}
Rate Discount     LKR {defaultPPD−PPD}/day × {days} days  − LKR {rateDiscount}
KM Rate Discount  LKR {defaultPPK−PPK}/km × {extraKm} km  − LKR {kmRateDiscount}
Free KM Bonus     {free−defaultFree} km × LKR {defaultPPK}− LKR {freeKmBonus}
Additional Discount                                       − LKR {additionalDiscount}
──────────────────────────────────────────────────────────────────────────────
Trip Total                                                 LKR {final_amount − driver_fee}
+ Driver Service                                           + LKR {driver_fee}
════════════════════════════════════════════════════════════════════════════════
Grand Total                                                LKR {final_amount}
```

For outsourced bookings, the existing `Commission` / `Net to Owner` lines remain
below `Trip Total`, unchanged.

### Where the display numbers come from

- **Live Price Preview** (`calcDay` in the detail page): already computes
  client-side from rate fields; extend it to fetch `defaultPricePerKm` and emit
  `kmRateDiscount` and `freeKmBonus` (replacing the single `kmDiscount`).
- **Completed Invoice summary**: compute the three components client-side from
  the booking GET response, which must now also return `defaultPricePerKm`.
  `days` is derived from `start_date` and the due date (same inclusive rule as
  `bookings.routes.ts:260`). All other inputs (`defaultPricePerDay`,
  `pricePerDay`, `pricePerKm`, `defaultFreeKm`, `freeKm`, `extraKm`,
  `baseAmount`) are already returned.

Single formula, two call sites — matching the current arrangement.

## API change

`GET /bookings/:id` response (`bookings.routes.ts` mapping) adds
`defaultPricePerKm: b.default_price_per_km`. No other endpoints change.

## Components touched

- `backend` — add column (SQL), capture on create, recompute base/discount on
  completion, return `defaultPricePerKm`.
- `frontend/app/admin/bookings/[id]/page.tsx` — `calcDay` split + live preview
  lines; completed invoice summary rewritten to the itemized layout.

## Testing

- Booking with all three discounts → breakdown lines sum to `Trip Total`;
  `Trip Total = days×price_per_day + extraKm×price_per_km`.
- Booking with no discounts → only `Daily charge`, `Extra KM charge`,
  `Base Amount = Trip Total`; discount lines hidden.
- Old booking (`default_price_per_km` NULL) → KM Rate Discount hidden, total
  matches stored `final_amount`.
- Driver fee present → `Grand Total` line appears and equals `final_amount`.
- Outsourced booking → Commission / Net to Owner still render.
```
