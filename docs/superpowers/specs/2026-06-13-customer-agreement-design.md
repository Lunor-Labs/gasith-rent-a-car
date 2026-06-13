# Customer Agreement & E-Signature — Design Spec

**Date:** 2026-06-13  
**Status:** Approved

---

## Overview

After a booking is created, the admin hands their device to the customer. The customer reads the full rental agreement (in English or Sinhala), signs on the touch screen, and a separate agreement PDF is generated and stored. The PDF includes the customer's signature and a pre-configured company signatory signature. The admin can download or WhatsApp the PDF to the customer.

---

## Data Model

### `bookings` table — new columns

```sql
ALTER TABLE bookings ADD COLUMN agreement_url       TEXT;
ALTER TABLE bookings ADD COLUMN agreement_signature TEXT;        -- customer signature base64 PNG
ALTER TABLE bookings ADD COLUMN agreement_signed_at TIMESTAMPTZ;
```

### New `app_config` table

```sql
CREATE TABLE app_config (
  id                       INTEGER PRIMARY KEY DEFAULT 1,
  company_signatory_name   TEXT,
  company_signatory_title  TEXT,
  company_signature        TEXT    -- base64 PNG drawn once in settings
);

INSERT INTO app_config (id) VALUES (1);  -- ensure one row always exists
```

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/011_agreement.sql` | Create | Add booking columns + app_config table |
| `backend/src/routes/agreements.routes.ts` | Create | POST /:bookingId/sign, GET/PUT /app-config |
| `backend/src/services/agreement.service.ts` | Create | Generate agreement PDF with jsPDF |
| `backend/src/app.ts` (or index) | Modify | Register agreements router |
| `frontend/app/admin/settings/page.tsx` | Create | Company signatory settings page |
| `frontend/app/admin/bookings/page.tsx` | Modify | Open agreement modal after booking creation |
| `frontend/app/admin/bookings/[id]/page.tsx` | Modify | Agreement section (get signature / view PDF) |
| `frontend/components/AgreementSignModal.tsx` | Create | Full-screen sign modal with bilingual terms + canvas |
| `frontend/lib/api.ts` | Modify | Add signAgreement, getAppConfig, saveAppConfig API calls |

---

## Backend

### Routes — `agreements.routes.ts`

**`POST /agreements/:bookingId/sign`**
- Body: `{ signature: string (base64 PNG), language: 'en' | 'si' }`
- Loads booking, customer, vehicle, app_config from Supabase
- Calls `generateAgreementPDF()`
- Uploads PDF to Supabase Storage bucket `agreements/`
- Updates booking: `agreement_url`, `agreement_signature`, `agreement_signed_at = NOW()`
- Returns: `{ pdfUrl }`

**`GET /agreements/app-config`**
- Returns current `app_config` row (id=1)

**`PUT /agreements/app-config`**
- Body: `{ companySignatoryName, companySignatoryTitle, companySignature }`
- Upserts `app_config` row

### Service — `agreement.service.ts`

`generateAgreementPDF({ booking, customer, vehicle, customerSignature, companySignature, companySignatoryName, companySignatoryTitle, language, signedAt }): Promise<Buffer>`

PDF structure (A4, same branding as invoice):
1. Header band — company name, "RENTAL AGREEMENT" label, agreement ref, date
2. Details section — customer name/NIC/phone, vehicle name/plate, booking dates, booking ID
3. Terms section — full terms in selected language (see Terms Content below)
4. Signature band — two columns: customer sig + name + date | company sig + name + title

---

## Agreement PDF Layout

```
┌─ Header (dark band, gold accent) ─────────────────────┐
│  [LOGO]  GASITH RENT A CAR         RENTAL AGREEMENT   │
│          Premium Vehicle Rental    AGR-XXXXXXXX        │
│                                    Date: 13 Jun 2026   │
├───────────────────────────────────────────────────────┤
│  RENTER DETAILS              │  VEHICLE DETAILS        │
│  Name: John Silva            │  Vehicle: Toyota Aqua   │
│  NIC:  123456789V            │  Plate: CAB-1234         │
│  Phone: 0771234567           │  Booking: ABCD1234       │
│                              │  Period: 10–13 Jun 2026  │
├───────────────────────────────────────────────────────┤
│  TERMS & CONDITIONS                                    │
│  (full bilingual terms text — see below)              │
├──────────────────────┬────────────────────────────────┤
│  RENTER SIGNATURE    │  AUTHORIZED SIGNATURE           │
│  [signature image]   │  [company signature image]      │
│  Name: John Silva    │  Name: [companySignatoryName]   │
│  Date: 13 Jun 2026   │  Title: [companySignatoryTitle] │
└──────────────────────┴────────────────────────────────┘
```

---

## Terms Content

Stored as constants in `agreement.service.ts`. Both languages shown based on `language` param.

### English Terms

```
RENTAL AGREEMENT — TERMS & CONDITIONS

1. Vehicle Condition
   The renter agrees to return the vehicle in the same condition as received. Any damage,
   scratches, dents, or mechanical faults caused during the rental period are the full
   financial responsibility of the renter.

2. Damage Liability
   In the event of any damage to the vehicle during the rental period (including accidents,
   vandalism, or negligence), the renter agrees to bear the full cost of repairs as assessed
   by Gasith Rent a Car. The renter shall not dispute the repair cost assessment.

3. Fuel Policy
   The vehicle must be returned with the same fuel level as at the time of collection.
   Any fuel deficit will be charged at market rate plus a service fee.

4. Late Return
   The vehicle must be returned on or before the agreed due date. Late returns will be
   charged at the daily rental rate for each additional day or part thereof.

5. Traffic Fines & Violations
   The renter is solely responsible for any traffic fines, parking violations, or legal
   penalties incurred during the rental period.

6. Prohibited Use
   The vehicle shall not be used for illegal purposes, racing, or driven outside of Sri Lanka
   without prior written consent from Gasith Rent a Car.

7. Acceptance
   By signing below, the renter confirms they have read, understood, and agreed to all of
   the above terms and conditions. This agreement is legally binding.
```

### Sinhala Terms

```
කුලී රථ ගිවිසුම — නියම සහ කොන්දේසි

1. වාහන තත්ත්වය
   කුලී ගන්නා තැනැත්තා, ලැබුණු ඒකම තත්ත්වයේ වාහනය ආපසු සළකා ගැනීමට එකඟ වෙයි. කුලී
   කාලය තුළ සිදු වූ ඕනෑම හානියක්, සීරීම්, රළු ගැටීම් හෝ යාන්ත්‍රික දෝෂ සඳහා කුලී
   ගන්නා තැනැත්තා සම්පූර්ණ මූල්‍ය වගකීම භාරගනී.

2. හානි වගකීම
   කුලී කාලය තුළ වාහනයට ඕනෑම හානියක් සිදු වූ විට (අනතුරු, කාරණා හෝ නොසැලකිලිමත්කම
   ඇතුළුව), Gasith Rent a Car ආයතනය විසින් තක්සේරු කළ සම්පූර්ණ අලුත්වැඩියා පිරිවැය
   දැරීමට කුලී ගන්නා තැනැත්තා එකඟ වෙයි.

3. ඉන්ධන ප්‍රතිපත්තිය
   වාහනය ලබාගත් විට තිබූ ඉන්ධන ප්‍රමාණයෙන්ම ආපසු ලබා දිය යුතුය. ඉන්ධන හිඟය
   වෙළඳපල මිලට අමතරව සේවා ගාස්තුවක් සහිතව අය කෙරෙනු ඇත.

4. ප්‍රමාදය
   වාහනය එකඟ වූ නියමිත දිනට හෝ ඊට පෙර ආපසු ලබා දිය යුතුය. ප්‍රමාද ආපසු ලබා
   දීම් සඳහා අමතර දිනකට හෝ එහි කොටසකට දෛනික කුලී අනුපාතය අය කෙරෙනු ඇත.

5. රථ වාහන දඩ සහ උල්ලංඝනයන්
   කුලී කාලය තුළ ලැබෙන ඕනෑම රථ වාහන දඩ, නවතා තැබීමේ දඩ හෝ නීතිමය දඬුවම් සඳහා
   කුලී ගන්නා තැනැත්තා පමණක් වගකිව යුතුය.

6. තහනම් භාවිතය
   Gasith Rent a Car ආයතනයේ පූර්ව ලිඛිත අනුමැතියකින් තොරව නීති විරෝධී කටයුතු,
   රේස් කිරීම හෝ ශ්‍රී ලංකාවෙන් පිටත වාහනය ධාවනය කිරීම තහනම්ය.

7. පිළිගැනීම
   පහත අත්සන් කිරීමෙන්, කුලී ගන්නා තැනැත්තා ඉහත සියලු නියම සහ කොන්දේසි කියවා,
   තේරුම් ගෙන, එකඟ වී ඇති බව තහවුරු කරයි. මෙම ගිවිසුම නීතිමය වශයෙන් බැඳෙනසුළු වේ.
```

---

## Frontend — `AgreementSignModal.tsx`

**Props:** `bookingId: string`, `customerName: string`, `onClose: () => void`, `onSigned: (pdfUrl: string) => void`

**State:**
- `language: 'en' | 'si'` — default `'en'`
- `signed: boolean` — true when canvas has at least one stroke
- `submitting: boolean`

**Canvas:** Native HTML5 canvas with pointer/touch event listeners (`pointerdown`, `pointermove`, `pointerup`). Uses `canvas.getContext('2d')` for drawing and `canvas.toDataURL('image/png')` to extract base64. "Clear" button calls `ctx.clearRect()` and resets `signed = false`.

**"Sign & Agree" button:** Disabled until `signed === true`. On click, calls `POST /agreements/:bookingId/sign`, shows spinner, then calls `onSigned(pdfUrl)` and closes.

**Skip:** X button closes modal without signing. Admin can get the signature later from the booking detail.

---

## Frontend — Settings Page (`/admin/settings`)

New nav link "Settings" in the admin sidebar/nav.

Sections:
1. **Company Signatory** — name input, title input, signature canvas (same draw pattern as agreement modal), "Save" button. On load, pre-fills from `GET /agreements/app-config`. On save, calls `PUT /agreements/app-config`.
2. The canvas shows the existing signature if one is saved, with a "Clear & Redraw" button.

---

## Frontend — Booking Creation Flow (`bookings/page.tsx`)

After `createBooking` succeeds:
1. Store returned `bookingId` in state
2. Close creation modal
3. Open `AgreementSignModal` with the new `bookingId`
4. On signed: show success toast "Agreement signed & PDF generated"
5. On skip: show toast "Booking created — get signature from booking detail"

---

## Frontend — Booking Detail (`bookings/[id]/page.tsx`)

New **"Agreement"** card visible for all bookings, below the invoice card:

- **Not signed:**
  ```
  📋 Agreement
  [Get Customer Signature]
  ```
- **Signed:**
  ```
  📋 Agreement  ✓ Signed — 13 Jun 2026
  [⬇ Download]  [WhatsApp]
  ```

WhatsApp URL: `https://wa.me/?text=<encoded message with PDF link>` — same pattern as invoice sharing.

---

## Constraints & Edge Cases

- Company signature not yet configured: agreement PDF still generates, the company sig box shows name/title as text only (no image). Admin is nudged to configure it in Settings.
- Signing is never mandatory — admin can always skip.
- `agreement_signature` (base64) stored in DB is used for record-keeping only; it is not re-sent to the client after generation.
- The agreement PDF is separate from the invoice PDF — different document, different Storage path (`agreements/` vs `invoices/`).
- Language selection affects only the terms text in the PDF — the header, details section, and signature block remain in English.
