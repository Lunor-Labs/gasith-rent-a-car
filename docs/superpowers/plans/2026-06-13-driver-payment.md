# Driver Payment Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "with driver" toggle to bookings and a flat driver fee charge that is billed to the customer, shown in the booking completion form, invoice summary, and PDF invoice.

**Architecture:** Two new columns (`with_driver`, `driver_fee`) on the `bookings` table. The toggle is set at creation and can be overridden at completion. `driver_fee` is entered as a flat amount at completion and is added to `final_amount`. Commission for outsourced vehicles is calculated on the trip subtotal before adding the driver fee.

**Tech Stack:** Supabase (PostgreSQL migrations), Express.js 5 backend (TypeScript), Next.js 16 + React 19 frontend (TypeScript), jsPDF for PDF generation.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/010_driver_payment.sql` | Create | Add `with_driver` and `driver_fee` columns |
| `backend/src/routes/bookings.routes.ts` | Modify | Accept/store/return new fields in POST, PUT complete, PUT generic, mapper |
| `backend/src/services/invoice.service.ts` | Modify | Add Driver Service line item to PDF |
| `frontend/app/admin/bookings/page.tsx` | Modify | With Driver toggle in booking creation form |
| `frontend/app/admin/bookings/[id]/page.tsx` | Modify | With Driver toggle + Driver Fee input in completion form, preview, summary |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/010_driver_payment.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/010_driver_payment.sql
ALTER TABLE bookings ADD COLUMN with_driver BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN driver_fee  NUMERIC(12,2);
```

- [ ] **Step 2: Apply the migration**

Open the Supabase dashboard → SQL Editor, paste the migration and run it. Or via CLI:

```bash
supabase db push
```

Verify by checking the `bookings` table has the two new columns.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/010_driver_payment.sql
git commit -m "feat: add with_driver and driver_fee columns to bookings"
```

---

## Task 2: Backend — `mapBookingToResponse` + generic update field map

**Files:**
- Modify: `backend/src/routes/bookings.routes.ts`

These are the two smallest, safest changes — do them first so every subsequent task can return and send the new fields.

- [ ] **Step 1: Add fields to `mapBookingToResponse`**

Find the `mapBookingToResponse` function (line ~486). Add these two lines after `creditAmount: b.credit_amount,`:

```ts
    withDriver: b.with_driver,
    driverFee: b.driver_fee,
```

- [ ] **Step 2: Add fields to the generic PUT field map**

Find the `fieldMap` object in `router.put('/:id', ...)` (line ~413). Add these two entries:

```ts
      withDriver: 'with_driver',
      driverFee: 'driver_fee',
```

- [ ] **Step 3: Verify the server still compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/bookings.routes.ts
git commit -m "feat: expose withDriver and driverFee in booking response and generic update"
```

---

## Task 3: Backend — Accept `withDriver` on booking creation

**Files:**
- Modify: `backend/src/routes/bookings.routes.ts`

- [ ] **Step 1: Destructure `withDriver` from the POST body**

In `router.post('/', ...)` find the destructure block (line ~129). Add `withDriver` to it:

```ts
    const {
      customerId, vehicleId, startDate, endDate,
      startMeterReading, pricePerKm, pricePerDay,
      freeKm, firstDayFreeKm, subsequentDayFreeKm,
      isOutsourced, outsourcedPayment,
      commissionRate, notes, withDriver,
    } = req.body;
```

- [ ] **Step 2: Include `with_driver` in the insert**

In the same handler, find the `.insert({...})` call. Add this line after `status: 'active',`:

```ts
        with_driver: Boolean(withDriver),
```

- [ ] **Step 3: Verify the server compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/bookings.routes.ts
git commit -m "feat: store with_driver flag on booking creation"
```

---

## Task 4: Backend — Driver fee in booking completion

**Files:**
- Modify: `backend/src/routes/bookings.routes.ts`

This is the most important backend change. The driver fee is added to `final_amount`. Commission for outsourced vehicles must be calculated on the **trip subtotal before** the driver fee is added.

- [ ] **Step 1: Destructure `withDriver` and `driverFee` from the completion body**

In `router.put('/:id/complete', ...)` find the destructure block (line ~224). Add the two new fields:

```ts
    const {
      endMeterReading, endDate,
      dueDate, actualReturnDate,
      paymentMethod, cashAmount, creditAmount,
      commissionAmount, freeKm, additionalDiscount,
      withDriver, driverFee,
    } = req.body;
```

- [ ] **Step 2: Calculate driver fee and split trip amount from final amount**

Find the block that computes `finalAmount` (currently `finalAmount = Math.max(0, baseAmount - computedDiscount)`). Replace that single line with:

```ts
    const tripAmount = Math.max(0, baseAmount - computedDiscount);
    const resolvedDriverFee = withDriver && driverFee != null && driverFee !== ''
      ? Number(driverFee)
      : 0;
    finalAmount = tripAmount + resolvedDriverFee;
```

Note: the variable `finalAmount` is already declared as `let finalAmount = 0;` earlier in the function — just reassign it here.

- [ ] **Step 3: Fix outsourced commission to use `tripAmount`, not `finalAmount`**

The commission block currently reads:

```ts
    if (booking.is_outsourced) {
      const defaultCommission = finalAmount < 5000 ? 500 : Math.round(finalAmount * 0.10);
```

Change `finalAmount` to `tripAmount` in that block so driver fee doesn't inflate the commission:

```ts
    if (booking.is_outsourced) {
      const defaultCommission = tripAmount < 5000 ? 500 : Math.round(tripAmount * 0.10);
```

- [ ] **Step 4: Store `with_driver` and `driver_fee` in the Supabase update**

In the `.update({...})` call (line ~322), add these two fields after `credit_amount: resolvedCreditAmount,`:

```ts
        with_driver: withDriver != null ? Boolean(withDriver) : booking.with_driver,
        driver_fee: resolvedDriverFee > 0 ? resolvedDriverFee : null,
```

- [ ] **Step 5: Verify compilation**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Manual smoke test**

Start the backend (`npm run dev` in `backend/`). Using a REST client or curl, complete an existing test booking with:

```json
{
  "endMeterReading": 50000,
  "dueDate": "2026-06-15",
  "actualReturnDate": "2026-06-15",
  "withDriver": true,
  "driverFee": 1500,
  "paymentMethod": "cash"
}
```

Verify the response has `finalAmount` = (trip subtotal) + 1500, and `driverFee: 1500`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/routes/bookings.routes.ts
git commit -m "feat: add driver fee to booking completion, add to final_amount"
```

---

## Task 5: PDF Invoice — Driver Service line item

**Files:**
- Modify: `backend/src/services/invoice.service.ts`

- [ ] **Step 1: Extract `driverFee` in the data prep section**

In `generateInvoicePDF`, find the data prep block (line ~75 area). After the `isOutsourced` line, add:

```ts
  const driverFee = booking.driverFee || booking.driver_fee || 0;
```

- [ ] **Step 2: Insert the Driver Service row in the CHARGES section**

Find the block that renders discounts (the `if (autoDiscount > 0)` and `if (additionalDiscount > 0)` blocks). After both discount blocks and before the "Total band" comment, add:

```ts
  if (driverFee > 0) {
    setFont('normal', 8.5, MID);
    doc.text('Driver Service', ML + 5, y);
    setFont('bold', 9, DARK);
    doc.text(`+ ${lkr(driverFee)}`, ML + CW - 5, y, { align: 'right' });
    y += 6.5;
  }
```

- [ ] **Step 3: Verify compilation**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/invoice.service.ts
git commit -m "feat: add Driver Service line item to PDF invoice"
```

---

## Task 6: Frontend — With Driver toggle in booking creation form

**Files:**
- Modify: `frontend/app/admin/bookings/page.tsx`

- [ ] **Step 1: Add `withDriver` to the form state**

Find the `form` state initialisation (line ~28). Add `withDriver: false` to it:

```ts
  const [form, setForm] = useState({
    customerId: '',
    vehicleId: '',
    startDate: '',
    endDate: '',
    startMeterReading: '',
    pricePerDay: '',
    pricePerKm: '',
    firstDayFreeKm: '',
    subsequentDayFreeKm: '',
    notes: '',
    withDriver: false,
  });
```

- [ ] **Step 2: Pass `withDriver` in `handleCreate`**

In `handleCreate`, find the `createBooking({...})` call. Add `withDriver: form.withDriver` to the object:

```ts
      await createBooking({
        customerId: form.customerId,
        vehicleId: form.vehicleId,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        notes: form.notes,
        startMeterReading: form.startMeterReading !== '' ? Number(form.startMeterReading) : (selectedVehicle?.lastMeterReading || 0),
        pricePerKm: form.pricePerKm ? Number(form.pricePerKm) : selectedVehicle?.pricePerKm || 0,
        pricePerDay: form.pricePerDay ? Number(form.pricePerDay) : selectedVehicle?.pricePerDay || 0,
        firstDayFreeKm: form.firstDayFreeKm ? Number(form.firstDayFreeKm) : undefined,
        subsequentDayFreeKm: form.subsequentDayFreeKm ? Number(form.subsequentDayFreeKm) : undefined,
        freeKm: previewFreeKm ?? undefined,
        isOutsourced: selectedVehicle?.isOutsourced || false,
        commissionRate: selectedVehicle?.isOutsourced ? (selectedVehicle?.commissionRate || 10) : 0,
        billingMode: 'per_day',
        withDriver: form.withDriver,
      });
```

- [ ] **Step 3: Reset `withDriver` in the form reset after submit**

Find the `setForm({...})` reset call after `toast.success('Booking created')`. Add `withDriver: false` to the reset object:

```ts
      setForm({ customerId: '', vehicleId: '', startDate: '', endDate: '', startMeterReading: '', pricePerDay: '', pricePerKm: '', firstDayFreeKm: '', subsequentDayFreeKm: '', notes: '', withDriver: false });
```

- [ ] **Step 4: Add the toggle UI to the creation modal**

In the booking creation modal form, find the "Notes" field section. Add the toggle **above** it:

```tsx
            {/* With Driver */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.withDriver}
                  onChange={e => setForm({ ...form, withDriver: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: 'var(--gold)', cursor: 'pointer' }}
                />
                With Driver
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.72rem' }}>(driver fee set at completion)</span>
              </label>
            </div>
```

- [ ] **Step 5: Add `withDriver` to the `Booking` type**

At the top of the file, find `type Booking = {...}`. Add `withDriver: boolean;` to it:

```ts
type Booking = { id: string; customerId: string; vehicleId: string; status: string; startDate: any; endDate: any; finalAmount: number; totalKm: number; isOutsourced: boolean; billingMode: string; notes: string; withDriver: boolean; };
```

- [ ] **Step 6: Show a "With Driver" badge in the booking list**

In the booking list table/card, find where the "Outsourced" indicator is shown (or notes). After or near it, add a badge for `withDriver`:

```tsx
{b.withDriver && (
  <span className="badge badge-muted" style={{ marginLeft: '0.3rem' }}>With Driver</span>
)}
```

Find the row/cell where booking attributes are displayed in the table (the mapped list). Search for `b.isOutsourced` or similar in the JSX and add the badge nearby.

- [ ] **Step 7: Verify no TypeScript errors**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/app/admin/bookings/page.tsx
git commit -m "feat: add With Driver toggle to booking creation form"
```

---

## Task 7: Frontend — With Driver toggle + Driver Fee in completion form

**Files:**
- Modify: `frontend/app/admin/bookings/[id]/page.tsx`

This is the largest frontend task. Read the file carefully before editing — the `endForm` state, `previewPerDay` function, `calcDay` usage, `handleComplete`, and the completion form JSX all need updating.

- [ ] **Step 1: Add `withDriver` and `driverFee` to `endForm` state**

Find the `endForm` useState initialisation (line ~19). Add the two new fields:

```ts
  const [endForm, setEndForm] = useState({
    endMeterReading: '',
    dueDate: new Date().toISOString().split('T')[0],
    actualReturnDate: new Date().toISOString().split('T')[0],
    commissionAmount: '',
    freeKm: '',
    additionalDiscount: '',
    paymentMethod: 'cash' as 'cash' | 'credit' | 'mixed',
    cashAmount: '',
    creditAmount: '',
    withDriver: false,
    driverFee: '',
  });
```

- [ ] **Step 2: Pre-fill `withDriver` from booking data in `load()`**

In the `load` function, find `setEndForm(f => ({...f, ...}))`. Add `withDriver` pre-fill:

```ts
      setEndForm(f => ({
        ...f,
        dueDate: b.data.endDate ? new Date(b.data.endDate).toISOString().split('T')[0] : f.dueDate,
        commissionAmount: b.data.commissionAmount != null ? String(b.data.commissionAmount) : '',
        withDriver: b.data.withDriver || false,
      }));
```

- [ ] **Step 3: Update `previewPerDay` to include driver fee**

Find the `previewPerDay` function. At the end of the function, change:

```ts
    return {
      days, totalKm, freeKm, autoDefaultFreeKm, extraKm, extraKmCharge,
      pricePerDay, defaultPricePerDay, rateDiscount, kmDiscount, additionalDiscount, totalDiscount,
      base, final,
    };
```

to:

```ts
    const driverFee = endForm.withDriver ? (Number(endForm.driverFee) || 0) : 0;
    const grandTotal = final + driverFee;

    return {
      days, totalKm, freeKm, autoDefaultFreeKm, extraKm, extraKmCharge,
      pricePerDay, defaultPricePerDay, rateDiscount, kmDiscount, additionalDiscount, totalDiscount,
      base, final, driverFee, grandTotal,
    };
```

- [ ] **Step 4: Update `paymentValid` to use `grandTotal`**

Find the `paymentValid` check. Change `calcDay.final` to `calcDay.grandTotal`:

```ts
  const paymentValid = (() => {
    if (endForm.paymentMethod !== 'mixed') return true;
    if (!calcDay) return false;
    const cash = Number(endForm.cashAmount) || 0;
    const credit = Number(endForm.creditAmount) || 0;
    return Math.abs((cash + credit) - calcDay.grandTotal) < 1;
  })();
```

- [ ] **Step 5: Update `handleComplete` to send `withDriver` and `driverFee`**

Find `completeBooking(id, {...})` call. Add the two new fields:

```ts
      await completeBooking(id, {
        dueDate: endForm.dueDate,
        actualReturnDate: endForm.actualReturnDate,
        endDate: endForm.dueDate,
        endMeterReading: endForm.endMeterReading ? Number(endForm.endMeterReading) : undefined,
        commissionAmount: endForm.commissionAmount !== '' ? Number(endForm.commissionAmount) : undefined,
        freeKm: endForm.freeKm ? Number(endForm.freeKm) : undefined,
        additionalDiscount: endForm.additionalDiscount ? Number(endForm.additionalDiscount) : 0,
        paymentMethod: endForm.paymentMethod,
        cashAmount: endForm.paymentMethod === 'mixed' ? Number(endForm.cashAmount) || 0
          : endForm.paymentMethod === 'cash' ? (calcDay?.grandTotal ?? 0) : undefined,
        creditAmount: endForm.paymentMethod === 'mixed' ? Number(endForm.creditAmount) || 0
          : endForm.paymentMethod === 'credit' ? (calcDay?.grandTotal ?? 0) : undefined,
        withDriver: endForm.withDriver,
        driverFee: endForm.withDriver && endForm.driverFee ? Number(endForm.driverFee) : 0,
      });
```

- [ ] **Step 6: Add "With Driver" toggle to the completion form JSX**

Find the "Additional Discount" form group in the completion form JSX. Add the toggle **below** it (and above the commission section):

```tsx
            {/* With Driver toggle */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={endForm.withDriver}
                  onChange={e => setEndForm({ ...endForm, withDriver: e.target.checked, driverFee: '' })}
                  style={{ width: 16, height: 16, accentColor: 'var(--gold)', cursor: 'pointer' }}
                />
                With Driver
              </label>
            </div>

            {/* Driver Fee (shown only when withDriver is on) */}
            {endForm.withDriver && (
              <div className="form-group">
                <label className="form-label">Driver Fee (LKR)</label>
                <input
                  type="number" className="form-input" min={0}
                  placeholder="0"
                  value={endForm.driverFee}
                  onChange={e => setEndForm({ ...endForm, driverFee: e.target.value })}
                />
              </div>
            )}
```

- [ ] **Step 7: Add Driver Service to the live price preview**

In the price preview block (the dark background div with "Price Preview"), find the "Trip Total" row. Add a "Driver Service" row and update "Trip Total" label to "Grand Total" when driver fee > 0:

After the existing Trip Total row (which ends with `LKR {calcDay.final.toLocaleString()}`), add:

```tsx
                  {calcDay.driverFee > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Driver Service</span>
                      <span>+ LKR {calcDay.driverFee.toLocaleString()}</span>
                    </div>
                  )}
                  {calcDay.driverFee > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.45rem', marginTop: '0.2rem', fontWeight: 700, fontSize: '1rem', color: 'var(--gold)' }}>
                      <span>Grand Total</span>
                      <span>LKR {calcDay.grandTotal.toLocaleString()}</span>
                    </div>
                  )}
```

Also update the mixed payment validation display (the `paymentValid` status row) to use `calcDay.grandTotal` instead of `calcDay.final`:

Find the line containing `must equal LKR ${calcDay.final.toLocaleString()}` and change it to `calcDay.grandTotal.toLocaleString()`.

- [ ] **Step 8: Verify no TypeScript errors**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add frontend/app/admin/bookings/[id]/page.tsx
git commit -m "feat: add With Driver toggle and Driver Fee field to booking completion"
```

---

## Task 8: Frontend — Driver Service in completed booking summary

**Files:**
- Modify: `frontend/app/admin/bookings/[id]/page.tsx`

- [ ] **Step 1: Add Driver Service line in the completed invoice summary card**

In the completed booking section, find the invoice summary card (the dark background div that shows "Base Amount", "Trip Total", etc.). After the `additionalDiscount` row and before the "Trip Total" row, add:

```tsx
              {booking.driverFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Driver Service</span>
                  <span>+ LKR {Number(booking.driverFee).toLocaleString()}</span>
                </div>
              )}
```

- [ ] **Step 2: Show a "With Driver" badge on the booking summary card**

In the booking summary card (the first `.card` in the render), find the `booking.isOutsourced` badge block. Add a "With Driver" badge nearby:

```tsx
        {booking.withDriver && (
          <div style={{ marginTop: '0.75rem' }}>
            <span className="badge badge-muted">With Driver</span>
          </div>
        )}
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/admin/bookings/[id]/page.tsx
git commit -m "feat: show Driver Service charge in completed booking summary and badge on booking card"
```

---

## Task 9: End-to-end manual test

- [ ] **Step 1: Start both servers**

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

- [ ] **Step 2: Create a booking with "With Driver" toggled ON**

Go to Admin → Bookings → New Booking. Toggle "With Driver" on. Save.
Expected: Booking created. Booking card shows "With Driver" badge.

- [ ] **Step 3: Complete the booking with a driver fee**

Open the booking detail. In the Complete Booking form:
- Toggle "With Driver" is pre-filled as ON
- Enter a driver fee (e.g., 1500)
- Verify the price preview shows "Driver Service + LKR 1,500" and an updated "Grand Total"
- Complete the booking.

Expected: Booking completed. Invoice summary shows "Driver Service + LKR 1,500".

- [ ] **Step 4: Generate the PDF invoice**

Click "Generate PDF". Open the PDF.
Expected: PDF CHARGES section shows "Driver Service  + LKR 1,500" row between discounts and the TOTAL band.

- [ ] **Step 5: Test without driver**

Create and complete a booking without "With Driver" toggled.
Expected: No "Driver Service" row anywhere. `final_amount` is the trip subtotal only.

- [ ] **Step 6: Test override at completion**

Create a booking with "With Driver" OFF. Complete it, toggle "With Driver" ON at completion, enter a fee.
Expected: Driver fee is applied correctly.
