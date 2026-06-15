# Booking Price Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show an itemized, self-reconciling price breakdown on the booking detail page and capture a lowered KM rate as a real discount.

**Architecture:** Add a `default_price_per_km` baseline column captured at booking creation. The completion endpoint recomputes `base_amount` at rack rates and splits the KM discount into a KM-rate discount and a free-KM bonus. The frontend centralizes the discount math in one pure function (`buildBreakdown`) used by both the live preview and the completed summary, rendered by one shared `PriceBreakdown` component.

**Tech Stack:** Express 5 + Supabase (backend), Next.js + React (frontend), TypeScript throughout. NOTE: this repo has **no test runner**; verification is a pure-math reconciliation check plus manual end-to-end testing. Do not add Jest — out of scope.

---

## Design notes (read before starting)

The verified discount model (all amounts clamped at 0; admin only ever lowers rates / raises free KM):

```
defaultPricePerKm    = booking.default_price_per_km ?? price_per_km   (fallback keeps old bookings identical)
defaultExtraKm       = max(0, total_km − default_free_km)
extraKm              = max(0, total_km − free_km)            (the billed extra km)
defaultExtraKmCharge = defaultExtraKm × defaultPricePerKm
base_amount          = days × default_price_per_day + defaultExtraKmCharge

rateDiscount   = (default_price_per_day − price_per_day) × days
kmRateDiscount = (defaultPricePerKm − price_per_km) × extraKm
freeKmBonus    = (free_km − default_free_km) × defaultPricePerKm
totalDiscount  = rateDiscount + kmRateDiscount + freeKmBonus + additionalDiscount

tripTotal = base_amount − totalDiscount = days × price_per_day + extraKm × price_per_km   (algebra verified)
grandTotal = tripTotal + driver_fee
```

`days` is inclusive: `max(1, ceil((dueDate − startDate)/86400000) + 1)`.

---

## File Structure

- **Create** `backend/sql/add_default_price_per_km.sql` — DB migration (run once in Supabase).
- **Modify** `backend/src/routes/bookings.routes.ts` — capture column on create; recompute base/discount on completion; return `defaultPricePerKm`.
- **Create** `frontend/app/admin/bookings/[id]/pricing.ts` — pure `buildBreakdown`, `breakdownFromBooking`, `bookingDays`, and the `Breakdown` type. Single source of truth for the math.
- **Create** `frontend/app/admin/bookings/[id]/PriceBreakdown.tsx` — presentational component rendering a `Breakdown` (rows hide when 0; optional commission lines).
- **Modify** `frontend/app/admin/bookings/[id]/page.tsx` — `calcDay` delegates to `buildBreakdown`; live preview and completed summary both render `<PriceBreakdown>`.

---

## Task 1: DB migration — add `default_price_per_km`

**Files:**
- Create: `backend/sql/add_default_price_per_km.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Standard (rack) KM rate captured at booking creation, so a lowered
-- price_per_km can be shown as a discount. NULL on old rows; readers fall
-- back to price_per_km, keeping historical totals identical.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS default_price_per_km numeric;
```

- [ ] **Step 2: Apply it**

Run the SQL in the Supabase SQL editor (or `psql`). Verify the column exists:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'bookings' AND column_name = 'default_price_per_km';
```
Expected: one row returned.

- [ ] **Step 3: Commit**

```bash
git add backend/sql/add_default_price_per_km.sql
git commit -m "feat(db): add default_price_per_km column to bookings"
```

---

## Task 2: Capture `default_price_per_km` on booking creation

**Files:**
- Modify: `backend/src/routes/bookings.routes.ts` (create handler, near line 142 and the insert near line 177)

- [ ] **Step 1: Compute the rack KM rate**

Find (near line 142):

```ts
    const defaultPricePerDay = vehicleData?.price_per_day || 0;
    const effectivePricePerDay = Number(pricePerDay) || defaultPricePerDay;
```

Add directly below:

```ts
    const defaultPricePerKm = vehicleData?.price_per_km || Number(pricePerKm) || 0;
```

- [ ] **Step 2: Store it in the insert**

Find in the `.insert({ ... })` (line 177):

```ts
        default_price_per_day: defaultPricePerDay,
```

Add directly below:

```ts
        default_price_per_km: defaultPricePerKm,
```

- [ ] **Step 3: Verify it compiles**

Run: `cd backend && npm install && npx tsc --noEmit`
Expected: no errors. (If deps were already installed, skip `npm install`.)

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/bookings.routes.ts
git commit -m "feat: capture default_price_per_km when creating a booking"
```

---

## Task 3: Recompute base & split KM discount on completion

**Files:**
- Modify: `backend/src/routes/bookings.routes.ts` (completion handler, lines 282-296)

- [ ] **Step 1: Replace the pricing block**

Find (lines 282-296):

```ts
    const defaultPricePerDay = booking.default_price_per_day || booking.price_per_day || 0;
    const pricePerDay = booking.price_per_day || 0;
    const pricePerKm = booking.price_per_km || 0;

    extraKm = Math.max(0, totalKm - resolvedFreeKm);
    extraKmCharge = extraKm * pricePerKm;

    const defaultExtraKm = Math.max(0, totalKm - computedDefaultFreeKm);
    const defaultExtraKmCharge = defaultExtraKm * pricePerKm;
    baseAmount = days * defaultPricePerDay + defaultExtraKmCharge;

    const rateDiscount = (defaultPricePerDay - pricePerDay) * days;
    const kmDiscount = defaultExtraKmCharge - extraKmCharge;
    const extraDiscount = Number(additionalDiscount) || 0;
    computedDiscount = Math.max(0, rateDiscount + kmDiscount) + extraDiscount;
```

Replace with:

```ts
    const defaultPricePerDay = booking.default_price_per_day || booking.price_per_day || 0;
    const pricePerDay = booking.price_per_day || 0;
    const pricePerKm = booking.price_per_km || 0;
    // Old bookings have no rack KM rate stored — fall back to the charged rate
    // so kmRateDiscount is 0 and base_amount is unchanged for them.
    const defaultPricePerKm = booking.default_price_per_km ?? pricePerKm;

    extraKm = Math.max(0, totalKm - resolvedFreeKm);
    extraKmCharge = extraKm * pricePerKm;

    const defaultExtraKm = Math.max(0, totalKm - computedDefaultFreeKm);
    const defaultExtraKmCharge = defaultExtraKm * defaultPricePerKm;
    baseAmount = days * defaultPricePerDay + defaultExtraKmCharge;

    const rateDiscount = (defaultPricePerDay - pricePerDay) * days;
    const kmRateDiscount = (defaultPricePerKm - pricePerKm) * extraKm;
    const freeKmBonus = (resolvedFreeKm - computedDefaultFreeKm) * defaultPricePerKm;
    const kmDiscount = kmRateDiscount + freeKmBonus;
    const extraDiscount = Number(additionalDiscount) || 0;
    computedDiscount = Math.max(0, rateDiscount + kmDiscount) + extraDiscount;
```

- [ ] **Step 2: Verify the math reconciles (pure check, no project tooling)**

Run this standalone reconciliation (proves `base − discounts == days×price_per_day + extraKm×price_per_km`):

```bash
node -e '
const days=2, totalKm=745;
const defPPD=8000, ppd=7000, defPPK=50, ppk=40, defFree=200, free=250;
const extraKm=Math.max(0,totalKm-free);
const defExtraKm=Math.max(0,totalKm-defFree);
const base=days*defPPD+defExtraKm*defPPK;
const rate=(defPPD-ppd)*days, kmRate=(defPPK-ppk)*extraKm, freeBonus=(free-defFree)*defPPK;
const trip=base-(rate+kmRate+freeBonus);
const expect=days*ppd+extraKm*ppk;
console.log({base,rate,kmRate,freeBonus,trip,expect});
if(trip!==expect){console.error("MISMATCH");process.exit(1)}
console.log("OK");
'
```
Expected: prints `{ base: 43250, rate: 2000, kmRate: 4950, freeBonus: 2500, trip: 33800, expect: 33800 }` then `OK`.

- [ ] **Step 3: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/bookings.routes.ts
git commit -m "feat: split KM discount into rate-discount and free-km bonus on completion"
```

---

## Task 4: Return `defaultPricePerKm` from the API

**Files:**
- Modify: `backend/src/routes/bookings.routes.ts` (`mapBookingToResponse`, line 515)

- [ ] **Step 1: Add the field**

Find (line 515):

```ts
    defaultPricePerDay: b.default_price_per_day,
```

Add directly below:

```ts
    defaultPricePerKm: b.default_price_per_km,
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/bookings.routes.ts
git commit -m "feat: expose defaultPricePerKm in booking response"
```

---

## Task 5: Pure breakdown math module

**Files:**
- Create: `frontend/app/admin/bookings/[id]/pricing.ts`

- [ ] **Step 1: Create the module**

```ts
// Single source of truth for the booking price breakdown math.
// Used by the live preview (buildBreakdown) and the completed summary
// (breakdownFromBooking). All discount components clamp at 0 — the admin
// only ever lowers rates or raises free KM.

export type Breakdown = {
  days: number;
  defaultPricePerDay: number;
  defaultExtraKm: number;
  defaultPricePerKm: number;
  defaultExtraKmCharge: number;
  base: number;
  rateDiscount: number;
  kmRateDiscount: number;
  freeKmBonus: number;
  additionalDiscount: number;
  tripTotal: number;   // final amount excluding driver fee
  driverFee: number;
  grandTotal: number;  // tripTotal + driver fee
};

export type BreakdownInput = {
  days: number;
  totalKm: number;
  defaultPricePerDay: number;
  pricePerDay: number;
  defaultPricePerKm: number;
  pricePerKm: number;
  defaultFreeKm: number;
  freeKm: number;
  additionalDiscount: number;
  driverFee: number;
};

export function buildBreakdown(i: BreakdownInput): Breakdown {
  const defaultExtraKm = Math.max(0, i.totalKm - i.defaultFreeKm);
  const extraKm = Math.max(0, i.totalKm - i.freeKm);
  const defaultExtraKmCharge = defaultExtraKm * i.defaultPricePerKm;
  const base = i.days * i.defaultPricePerDay + defaultExtraKmCharge;

  const rateDiscount = Math.max(0, (i.defaultPricePerDay - i.pricePerDay) * i.days);
  const kmRateDiscount = Math.max(0, (i.defaultPricePerKm - i.pricePerKm) * extraKm);
  const freeKmBonus = Math.max(0, (i.freeKm - i.defaultFreeKm) * i.defaultPricePerKm);
  const totalDiscount = rateDiscount + kmRateDiscount + freeKmBonus + i.additionalDiscount;

  const tripTotal = Math.max(0, base - totalDiscount);
  return {
    days: i.days,
    defaultPricePerDay: i.defaultPricePerDay,
    defaultExtraKm,
    defaultPricePerKm: i.defaultPricePerKm,
    defaultExtraKmCharge,
    base,
    rateDiscount,
    kmRateDiscount,
    freeKmBonus,
    additionalDiscount: i.additionalDiscount,
    tripTotal,
    driverFee: i.driverFee,
    grandTotal: tripTotal + i.driverFee,
  };
}

function toDate(v: any): Date {
  if (!v) return new Date();
  if (typeof v === 'string') return new Date(v);
  if (v._seconds) return new Date(v._seconds * 1000);
  return new Date(v);
}

export function bookingDays(b: any): number {
  const start = toDate(b.startDate);
  const end = toDate(b.dueDate || b.endDate);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

// For a completed booking, use the STORED base_amount and final_amount as the
// authoritative totals (so the card always reconciles to what was billed) and
// derive the three discount lines for display.
export function breakdownFromBooking(b: any): Breakdown {
  const days = bookingDays(b);
  const pricePerKm = b.pricePerKm || 0;
  const defaultPricePerKm = b.defaultPricePerKm ?? pricePerKm;
  const pricePerDay = b.pricePerDay || 0;
  const defaultPricePerDay = b.defaultPricePerDay || pricePerDay;
  const freeKm = b.freeKm ?? 0;
  const defaultFreeKm = b.defaultFreeKm ?? freeKm;
  const totalKm = b.totalKm || 0;
  const extraKm = b.extraKm ?? Math.max(0, totalKm - freeKm);
  const defaultExtraKm = Math.max(0, totalKm - defaultFreeKm);

  const base = b.baseAmount || 0;
  const defaultExtraKmCharge = Math.max(0, base - days * defaultPricePerDay);
  const rateDiscount = Math.max(0, (defaultPricePerDay - pricePerDay) * days);
  const kmRateDiscount = Math.max(0, (defaultPricePerKm - pricePerKm) * extraKm);
  const freeKmBonus = Math.max(0, (freeKm - defaultFreeKm) * defaultPricePerKm);
  const additionalDiscount = b.additionalDiscount || 0;
  const driverFee = Number(b.driverFee) || 0;
  const grandTotal = b.finalAmount || 0;

  return {
    days,
    defaultPricePerDay,
    defaultExtraKm,
    defaultPricePerKm,
    defaultExtraKmCharge,
    base,
    rateDiscount,
    kmRateDiscount,
    freeKmBonus,
    additionalDiscount,
    tripTotal: Math.max(0, grandTotal - driverFee),
    driverFee,
    grandTotal,
  };
}
```

- [ ] **Step 2: Verify the module reconciles**

Run (compiles the file standalone and checks reconciliation):

```bash
cd frontend && npx tsc --noEmit app/admin/bookings/\[id\]/pricing.ts
node -e '
function build(i){const dxk=Math.max(0,i.totalKm-i.defaultFreeKm),xk=Math.max(0,i.totalKm-i.freeKm),dxc=dxk*i.defaultPricePerKm,base=i.days*i.defaultPricePerDay+dxc;const r=Math.max(0,(i.defaultPricePerDay-i.pricePerDay)*i.days),kr=Math.max(0,(i.defaultPricePerKm-i.pricePerKm)*xk),fb=Math.max(0,(i.freeKm-i.defaultFreeKm)*i.defaultPricePerKm);const t=Math.max(0,base-(r+kr+fb+i.additionalDiscount));return{base,t}}
const o=build({days:2,totalKm:745,defaultPricePerDay:8000,pricePerDay:7000,defaultPricePerKm:50,pricePerKm:40,defaultFreeKm:200,freeKm:250,additionalDiscount:0,driverFee:0});
console.log(o); if(o.base!==43250||o.t!==33800){console.error("MISMATCH");process.exit(1)} console.log("OK");
'
```
Expected: `{ base: 43250, t: 33800 }` then `OK`. (`tsc --noEmit` prints nothing.)

- [ ] **Step 3: Commit**

```bash
git add frontend/app/admin/bookings/\[id\]/pricing.ts
git commit -m "feat: add pure booking price breakdown module"
```

---

## Task 6: Shared `PriceBreakdown` component

**Files:**
- Create: `frontend/app/admin/bookings/[id]/PriceBreakdown.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Breakdown } from './pricing';

const lkr = (n: number) => `LKR ${Math.round(n).toLocaleString()}`;

const Row = ({ label, sub, value, color, muted }: {
  label: string; sub?: string; value: string; color?: string; muted?: boolean;
}) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
    <span style={{ color: muted ? 'var(--text-muted)' : 'inherit' }}>
      {label}
      {sub && <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginLeft: 6 }}>{sub}</span>}
    </span>
    <span style={{ color }}>{value}</span>
  </div>
);

export default function PriceBreakdown({ b, isOutsourced, commissionAmount }: {
  b: Breakdown; isOutsourced?: boolean; commissionAmount?: number | null;
}) {
  const divider = { borderTop: '1px solid var(--border)', paddingTop: '0.45rem', marginTop: '0.2rem' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.88rem' }}>
      <Row muted label="Daily charge" sub={`${b.days} day${b.days > 1 ? 's' : ''} × ${lkr(b.defaultPricePerDay)}`}
           value={lkr(b.days * b.defaultPricePerDay)} />
      {b.defaultExtraKmCharge > 0 && (
        <Row muted label="Extra KM charge" sub={`${b.defaultExtraKm.toLocaleString()} km × ${lkr(b.defaultPricePerKm)}`}
             value={lkr(b.defaultExtraKmCharge)} />
      )}
      <div style={divider}>
        <Row label="Base Amount" value={lkr(b.base)} />
      </div>
      {b.rateDiscount > 0 && (
        <Row label="Rate Discount" color="#22c55e" value={`− ${lkr(b.rateDiscount)}`} />
      )}
      {b.kmRateDiscount > 0 && (
        <Row label="KM Rate Discount" color="#22c55e" value={`− ${lkr(b.kmRateDiscount)}`} />
      )}
      {b.freeKmBonus > 0 && (
        <Row label="Free KM Bonus" color="#22c55e" value={`− ${lkr(b.freeKmBonus)}`} />
      )}
      {b.additionalDiscount > 0 && (
        <Row label="Additional Discount" color="#22c55e" value={`− ${lkr(b.additionalDiscount)}`} />
      )}
      <div style={{ ...divider, fontWeight: 700, fontSize: '1.05rem', color: 'var(--gold)' }}>
        <Row label="Trip Total" value={lkr(b.tripTotal)} />
      </div>
      {b.driverFee > 0 && (
        <Row muted label="Driver Service" value={`+ ${lkr(b.driverFee)}`} />
      )}
      {b.driverFee > 0 && (
        <div style={{ ...divider, fontWeight: 700, fontSize: '1.05rem', color: 'var(--gold)' }}>
          <Row label="Grand Total" value={lkr(b.grandTotal)} />
        </div>
      )}
      {isOutsourced && commissionAmount != null && (
        <>
          <div style={{ marginTop: '0.35rem' }}>
            <Row label="Commission" color="#ef4444" value={`− ${lkr(Number(commissionAmount))}`} />
          </div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#22c55e' }}>
            <Row label="Net to Owner" value={lkr(Math.max(0, b.grandTotal - Number(commissionAmount)))} />
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors (the component is not yet imported — that's fine).

- [ ] **Step 3: Commit**

```bash
git add frontend/app/admin/bookings/\[id\]/PriceBreakdown.tsx
git commit -m "feat: add shared PriceBreakdown component"
```

---

## Task 7: Wire both surfaces to the breakdown

**Files:**
- Modify: `frontend/app/admin/bookings/[id]/page.tsx` (imports; `calcDay` ~107-132; live preview ~419-495; completed summary ~636-665)

- [ ] **Step 1: Add imports**

At the top of the file, after the existing imports, add:

```tsx
import PriceBreakdown from './PriceBreakdown';
import { buildBreakdown, breakdownFromBooking } from './pricing';
```

- [ ] **Step 2: Make `calcDay` return a `Breakdown`**

Replace the body from `const pricePerKm = booking.pricePerKm || 0;` (line 107) through the `return { ... };` (lines 128-132) with:

```tsx
    const pricePerKm = booking.pricePerKm || 0;
    const pricePerDay = booking.pricePerDay || 0;
    const defaultPricePerDay = booking.defaultPricePerDay || pricePerDay;
    const defaultPricePerKm = booking.defaultPricePerKm ?? pricePerKm;

    const breakdown = buildBreakdown({
      days, totalKm,
      defaultPricePerDay, pricePerDay,
      defaultPricePerKm, pricePerKm,
      defaultFreeKm: autoDefaultFreeKm, freeKm,
      additionalDiscount: Number(endForm.additionalDiscount) || 0,
      driverFee: endForm.withDriver ? (Number(endForm.driverFee) || 0) : 0,
    });
    return breakdown;
```

(The intermediate `extraKm`, `extraKmCharge`, `rateDiscount`, `kmDiscount`,
`totalDiscount`, `base`, `final`, `driverFee`, `grandTotal` locals on lines
111-126 are now computed inside `buildBreakdown` — delete lines 111-126.)

- [ ] **Step 3: Confirm no stale `calcDay.` field references remain**

Run: `cd frontend && grep -n "calcDay\." "app/admin/bookings/[id]/page.tsx"`
Expected: only references inside the live-preview block you are about to replace (Step 4). If any reference uses a removed field (e.g. `calcDay.final`, `calcDay.extraKmCharge`) outside that block, it will be removed in Step 4; there should be none elsewhere.

- [ ] **Step 4: Replace the live-preview block**

Replace the entire `{/* Live preview */}` block — the `{calcDay && ( ... )}` JSX spanning lines ~418-498 (the outer wrapper `<div>` with the "Price Preview" label down to its closing `)}`) — with:

```tsx
            {/* Live preview */}
            {calcDay && (
              <div style={{ background: '#0f0f0f', border: '1px solid rgba(201,162,39,0.3)', borderRadius: 12, padding: '1rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>Price Preview</div>
                <PriceBreakdown b={calcDay} isOutsourced={booking.isOutsourced} commissionAmount={booking.commissionAmount} />
              </div>
            )}
```

- [ ] **Step 5: Replace the completed Invoice summary**

Replace the amount-summary inner block — the `<div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.88rem' }}>` and all its children (lines ~637-678, i.e. from that opening div through its matching `</div>` just before the card's `</div>` containing the buttons) — with:

```tsx
            <PriceBreakdown
              b={breakdownFromBooking(booking)}
              isOutsourced={booking.isOutsourced}
              commissionAmount={booking.commissionAmount}
            />
```

Leave the surrounding card wrapper (`<div className="card" ...>`, the `🧾 Invoice` heading, and the bordered `<div style={{ background: '#0f0f0f', ... }}>` container) intact.

- [ ] **Step 6: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Manual end-to-end verification**

Start both servers (`cd backend && npm run dev`, `cd frontend && npm run dev`). Then:

1. Create a booking; in the form lower the daily rate, lower the KM rate, and raise free KM below/above the vehicle defaults.
2. Complete the return with a meter reading that produces extra KM.
3. On the booking detail page confirm the **Live Price Preview** (during return) and the **Completed Invoice** card both show: Daily charge, Extra KM charge, Base Amount, and a separate **Rate Discount**, **KM Rate Discount**, and **Free KM Bonus** line.
4. Confirm `Base Amount − (all discount lines) = Trip Total`, and `Trip Total` equals the stored final amount (matches the bookings list / reports).
5. Open an **old** booking (created before this change): KM Rate Discount line is absent and the total is unchanged.
6. Open an **outsourced** booking: Commission / Net to Owner still render below Trip Total.

Expected: all six hold.

- [ ] **Step 8: Commit**

```bash
git add "frontend/app/admin/bookings/[id]/page.tsx"
git commit -m "feat: itemized price breakdown on live preview and completed invoice"
```

---

## Self-Review

- **Spec coverage:** data model (Task 1), capture on create (Task 2), completion recompute + KM-discount split (Task 3), API field (Task 4), display on both surfaces (Tasks 5-7), old-booking fallback (Tasks 3 & 5 via `?? price_per_km`), outsourced commission preserved (Task 6 + Task 7 Step 7). PDF invoice intentionally excluded per spec. ✅
- **Placeholder scan:** none — every step has concrete code/commands.
- **Type consistency:** `Breakdown` produced by both `buildBreakdown` and `breakdownFromBooking`; `PriceBreakdown` consumes `Breakdown`. `defaultPricePerKm` named consistently across backend (`default_price_per_km`) and frontend (`defaultPricePerKm`).
```
