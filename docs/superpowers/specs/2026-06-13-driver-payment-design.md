# Driver Payment Feature — Design Spec

**Date:** 2026-06-13  
**Status:** Approved

---

## Overview

When Gasith provides a driver with a rental, the admin needs to record a driver fee that is charged to the customer. The fee appears as a line item on the PDF invoice and is included in the booking's final amount.

---

## Data Model

New migration adds two columns to the `bookings` table:

```sql
ALTER TABLE bookings ADD COLUMN with_driver BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN driver_fee  NUMERIC(12,2);
```

- `with_driver` — informational flag set at booking creation. Serves as a visual reminder on the active booking card. Can also be changed at completion time.
- `driver_fee` — flat total amount (LKR) entered by the admin at completion time. `NULL` until booking is completed. `0` or `NULL` means no driver charge.
- `final_amount` stored in the DB **includes** `driver_fee` — `final_amount = trip_amount + driver_fee`. Revenue tracking and invoice total stay consistent.

---

## Backend

### POST `/bookings` (create)
- Accept `withDriver: boolean` in request body.
- Store as `with_driver`. Default `false` if not provided.
- `driver_fee` not set at creation (remains `NULL`).

### PUT `/bookings/:id/complete` (complete)
- Accept `withDriver: boolean` and `driverFee: number | undefined`.
- Update `with_driver` on the booking (allows toggling at completion even if not set at creation).
- If `driverFee` is provided and > 0, add it to `finalAmount` before storing.
- Store `driver_fee` on the booking record.
- `finalAmount = tripAmount + (driverFee || 0)` where `tripAmount = base - discounts`.

### PUT `/bookings/:id` (generic update)
- Add `withDriver` → `with_driver` and `driverFee` → `driver_fee` to the field map.

### `mapBookingToResponse`
- Add `withDriver: b.with_driver` and `driverFee: b.driver_fee` to the response shape.

---

## Frontend — Booking Creation Form

A **"With Driver" toggle** (checkbox) in the new booking modal. Defaults off. No fee entered here — this is informational only. Sends `withDriver` to the API.

When `withDriver` is true, the active booking card shows a **"With Driver"** badge (similar to the existing "Outsourced" badge).

---

## Frontend — Booking Completion Form

Two new fields in the completion form (`/admin/bookings/[id]/page.tsx`):

1. **"With Driver" toggle** — pre-filled from `booking.withDriver`. Admin can change it regardless of what was set at creation.
2. **"Driver Fee (LKR)"** input — visible only when the toggle is ON. Flat amount, no auto-calculation.

### Live Price Preview update

When driver fee > 0, the preview block shows:

```
Duration           3 days
Daily Rate         LKR 8,000
...
Trip Total         LKR 24,000
Driver Service   + LKR 1,500
─────────────────────────────
Grand Total        LKR 25,500
```

The `endForm` state gains two new fields: `withDriver: boolean` and `driverFee: string`.

### Completion payload

```ts
withDriver: endForm.withDriver,
driverFee: endForm.withDriver && endForm.driverFee ? Number(endForm.driverFee) : 0,
```

---

## Frontend — Booking Detail (completed view)

The invoice summary card shows a **"Driver Service"** `+` line item before the grand total, only when `booking.driverFee > 0`:

```
Base Amount          LKR 24,000
Driver Service     + LKR  1,500
─────────────────────────────────
Trip Total           LKR 25,500
```

---

## PDF Invoice (`invoice.service.ts`)

A new **"Driver Service"** row in the CHARGES section, between discounts and the TOTAL band. Only rendered when `driverFee > 0`.

Format: label "Driver Service" on left, `+ LKR X` on right, using the existing `DARK` color (not green/red — it's a positive charge, not a discount).

```
Subtotal              LKR 24,000
Rate / KM Discount  − LKR    500   (if any)
Driver Service      + LKR  1,500
[TOTAL AMOUNT band]   LKR 25,000
```

---

## Constraints & Edge Cases

- If `with_driver` is toggled ON at completion but `driverFee` is left blank/0, no driver charge is applied (treat as 0).
- Driver fee does **not** affect commission calculation for outsourced vehicles — commission is calculated on `tripAmount` (before driver fee), not `finalAmount`. This preserves the existing outsourced vehicle logic.
- Revenue tracking (`revenue` table `total_revenue`) uses `finalAmount` which includes driver fee — this is correct, as the driver fee is revenue collected from the customer.
- No per-day rate calculation — admin always enters a flat total.
