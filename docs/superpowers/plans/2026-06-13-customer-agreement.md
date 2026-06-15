# Customer Agreement & E-Signature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bilingual (English/Sinhala) rental agreement that the customer signs on the admin's device after booking creation, generating a separate PDF with both the customer's signature and a pre-configured company signatory.

**Architecture:** New `app_config` table stores the company signatory details (drawn once in Settings). New `agreements` backend routes handle signing and config. A full-screen `AgreementSignModal` component uses HTML5 Canvas for touch-based signing. The agreement PDF is generated server-side with jsPDF (same pattern as invoices) and stored in Supabase Storage under `agreements/`. The signed PDF URL is saved to the booking.

**Tech Stack:** Supabase (PostgreSQL + Storage), Express.js 5 backend (TypeScript), jsPDF, Next.js 16 + React 19 frontend (TypeScript), HTML5 Canvas Pointer Events API.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/011_agreement.sql` | Create | New booking columns + `app_config` table |
| `backend/src/services/agreement.service.ts` | Create | PDF generation with bilingual terms + both signatures |
| `backend/src/routes/agreements.routes.ts` | Create | POST sign, GET/PUT app-config |
| `backend/src/index.ts` | Modify | Register agreements router at `/api/agreements` |
| `frontend/lib/api.ts` | Modify | Add `signAgreement`, `getAppConfig`, `saveAppConfig` |
| `frontend/components/AgreementSignModal.tsx` | Create | Full-screen sign modal: language toggle, terms, canvas |
| `frontend/app/admin/settings/page.tsx` | Modify | Add company signatory section with signature canvas |
| `frontend/app/admin/bookings/page.tsx` | Modify | Open `AgreementSignModal` after booking creation |
| `frontend/app/admin/bookings/[id]/page.tsx` | Modify | Agreement section: get signature / view + share PDF |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/011_agreement.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/011_agreement.sql

-- Add agreement fields to bookings
ALTER TABLE bookings
  ADD COLUMN agreement_url        TEXT,
  ADD COLUMN agreement_signature  TEXT,
  ADD COLUMN agreement_signed_at  TIMESTAMPTZ;

-- Company signatory config (single-row table)
CREATE TABLE app_config (
  id                      INTEGER PRIMARY KEY DEFAULT 1,
  company_signatory_name  TEXT,
  company_signatory_title TEXT,
  company_signature       TEXT
);

INSERT INTO app_config (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 2: Apply the migration in Supabase**

Open Supabase dashboard → SQL Editor, paste and run the migration.
Verify: `bookings` has the three new columns; `app_config` table exists with one row.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/011_agreement.sql
git commit -m "feat: add agreement columns to bookings and app_config table"
```

---

## Task 2: Backend — Agreement PDF Service

**Files:**
- Create: `backend/src/services/agreement.service.ts`

This service generates the agreement PDF. It follows the same jsPDF pattern as `invoice.service.ts`. Read that file for reference — palette constants, `setFont`, `line` helpers are identical.

- [ ] **Step 1: Create `agreement.service.ts`**

```ts
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import path from 'path';
import fs from 'fs';

export interface AgreementData {
  booking: {
    id: string;
    startDate: any;
    endDate: any;
  };
  customer: {
    name: string;
    nicNumber?: string;
    phone?: string;
  };
  vehicle: {
    name: string;
    plate: string;
  };
  customerSignature: string;
  companySignature: string | null;
  companySignatoryName: string;
  companySignatoryTitle: string;
  language: 'en' | 'si';
  signedAt: Date;
}

// ── Terms content ─────────────────────────────────────────────────────────────

const TERMS = {
  en: [
    { title: '1. Vehicle Condition', body: 'The renter agrees to return the vehicle in the same condition as received. Any damage, scratches, dents, or mechanical faults caused during the rental period are the full financial responsibility of the renter.' },
    { title: '2. Damage Liability', body: 'In the event of any damage to the vehicle during the rental period (including accidents, vandalism, or negligence), the renter agrees to bear the full cost of repairs as assessed by Gasith Rent a Car. The renter shall not dispute the repair cost assessment.' },
    { title: '3. Fuel Policy', body: 'The vehicle must be returned with the same fuel level as at the time of collection. Any fuel deficit will be charged at market rate plus a service fee.' },
    { title: '4. Late Return', body: 'The vehicle must be returned on or before the agreed due date. Late returns will be charged at the daily rental rate for each additional day or part thereof.' },
    { title: '5. Traffic Fines & Violations', body: 'The renter is solely responsible for any traffic fines, parking violations, or legal penalties incurred during the rental period.' },
    { title: '6. Prohibited Use', body: 'The vehicle shall not be used for illegal purposes, racing, or driven outside of Sri Lanka without prior written consent from Gasith Rent a Car.' },
    { title: '7. Acceptance', body: 'By signing below, the renter confirms they have read, understood, and agreed to all of the above terms and conditions. This agreement is legally binding.' },
  ],
  si: [
    { title: '1. වාහන තත්ත්වය', body: 'කුලී ගන්නා තැනැත්තා, ලැබුණු ඒකම තත්ත්වයේ වාහනය ආපසු සළකා ගැනීමට එකඟ වෙයි. කුලී කාලය තුළ සිදු වූ ඕනෑම හානියක්, සීරීම්, රළු ගැටීම් හෝ යාන්ත්‍රික දෝෂ සඳහා කුලී ගන්නා තැනැත්තා සම්පූර්ණ මූල්‍ය වගකීම භාරගනී.' },
    { title: '2. හානි වගකීම', body: 'කුලී කාලය තුළ වාහනයට ඕනෑම හානියක් සිදු වූ විට (අනතුරු, කාරණා හෝ නොසැලකිලිමත්කම ඇතුළුව), Gasith Rent a Car ආයතනය විසින් තක්සේරු කළ සම්පූර්ණ අලුත්වැඩියා පිරිවැය දැරීමට කුලී ගන්නා තැනැත්තා එකඟ වෙයි.' },
    { title: '3. ඉන්ධන ප්‍රතිපත්තිය', body: 'වාහනය ලබාගත් විට තිබූ ඉන්ධන ප්‍රමාණයෙන්ම ආපසු ලබා දිය යුතුය. ඉන්ධන හිඟය වෙළඳපල මිලට අමතරව සේවා ගාස්තුවක් සහිතව අය කෙරෙනු ඇත.' },
    { title: '4. ප්‍රමාදය', body: 'වාහනය එකඟ වූ නියමිත දිනට හෝ ඊට පෙර ආපසු ලබා දිය යුතුය. ප්‍රමාද ආපසු ලබා දීම් සඳහා අමතර දිනකට හෝ එහි කොටසකට දෛනික කුලී අනුපාතය අය කෙරෙනු ඇත.' },
    { title: '5. රථ වාහන දඩ', body: 'කුලී කාලය තුළ ලැබෙන ඕනෑම රථ වාහන දඩ, නවතා තැබීමේ දඩ හෝ නීතිමය දඬුවම් සඳහා කුලී ගන්නා තැනැත්තා පමණක් වගකිව යුතුය.' },
    { title: '6. තහනම් භාවිතය', body: 'Gasith Rent a Car ආයතනයේ පූර්ව ලිඛිත අනුමැතියකින් තොරව නීති විරෝධී කටයුතු, රේස් කිරීම හෝ ශ්‍රී ලංකාවෙන් පිටත වාහනය ධාවනය කිරීම තහනම්ය.' },
    { title: '7. පිළිගැනීම', body: 'පහත අත්සන් කිරීමෙන්, කුලී ගන්නා තැනැත්තා ඉහත සියලු නියම සහ කොන්දේසි කියවා, තේරුම් ගෙන, එකඟ වී ඇති බව තහවුරු කරයි. මෙම ගිවිසුම නීතිමය වශයෙන් බැඳෙනසුළු වේ.' },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

let logoJpgBase64: string | null = null;
function getLogoBase64(): string | null {
  if (logoJpgBase64) return logoJpgBase64;
  try {
    const possiblePaths = [
      path.join(__dirname, '../../assets/logo.jpg'),
      path.join(__dirname, '../../../assets/logo.jpg'),
      path.join(process.cwd(), 'assets/logo.jpg'),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        logoJpgBase64 = fs.readFileSync(p).toString('base64');
        return logoJpgBase64;
      }
    }
    return null;
  } catch { return null; }
}

const parseDate = (d: any): Date | null => {
  if (!d) return null;
  if (typeof d === 'string') return new Date(d);
  if (d._seconds) return new Date(d._seconds * 1000);
  return null;
};
const fmt = (d: Date | null) => d ? format(d, 'dd MMM yyyy') : 'N/A';

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateAgreementPDF(data: AgreementData): Promise<Buffer> {
  const { booking, customer, vehicle, customerSignature, companySignature,
          companySignatoryName, companySignatoryTitle, language, signedAt } = data;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, PH = 297, ML = 18, MR = 18, CW = PW - ML - MR;

  const GOLD:      [number,number,number] = [180, 140, 30];
  const DARK:      [number,number,number] = [22, 22, 22];
  const MID:       [number,number,number] = [80, 80, 80];
  const MUTED:     [number,number,number] = [140, 140, 140];
  const WHITE:     [number,number,number] = [255, 255, 255];
  const HEADER_BG: [number,number,number] = [22, 22, 22];
  const DIVIDER:   [number,number,number] = [220, 210, 180];

  const setFont = (weight: 'normal'|'bold'|'italic', size: number, color: [number,number,number]) => {
    doc.setFont('helvetica', weight);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const divider = (y: number) => {
    doc.setDrawColor(...DIVIDER);
    doc.setLineWidth(0.4);
    doc.line(ML, y, ML + CW, y);
  };

  const agRef = `AGR-${booking.id.substring(0, 8).toUpperCase()}`;
  const startDate = parseDate(booking.startDate);
  const endDate   = parseDate(booking.endDate);
  const issueDate = format(new Date(), 'dd MMM yyyy');

  // ── 1. HEADER ────────────────────────────────────────────────────────────────
  doc.setFillColor(...HEADER_BG);
  doc.rect(0, 0, PW, 38, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, 4, 38, 'F');

  const logoBase64 = getLogoBase64();
  if (logoBase64) doc.addImage(`data:image/jpeg;base64,${logoBase64}`, 'JPEG', ML + 2, 6, 26, 26);
  const textX = logoBase64 ? ML + 34 : ML + 2;
  setFont('bold', 16, WHITE);
  doc.text('GASITH RENT A CAR', textX, 17);
  setFont('normal', 8, [180, 180, 180]);
  doc.text('Premium Vehicle Rental Services · Sri Lanka', textX, 23);

  setFont('bold', 18, GOLD);
  doc.text('RENTAL AGREEMENT', PW - MR, 16, { align: 'right' });
  setFont('normal', 8.5, [200, 200, 200]);
  doc.text(agRef, PW - MR, 23, { align: 'right' });
  setFont('normal', 8, [160, 160, 160]);
  doc.text(`Date: ${issueDate}`, PW - MR, 29, { align: 'right' });

  doc.setFillColor(...GOLD);
  doc.rect(0, 38, PW, 1.2, 'F');

  let y = 48;

  // ── 2. DETAILS ───────────────────────────────────────────────────────────────
  const colL = ML, colR = ML + CW / 2 + 4, colW = CW / 2 - 4;

  setFont('bold', 7.5, GOLD);
  doc.text('RENTER DETAILS', colL, y);
  doc.text('VEHICLE & BOOKING', colR, y);
  y += 5;

  setFont('bold', 10, DARK);
  doc.text(customer.name || 'N/A', colL, y);
  setFont('bold', 10, DARK);
  doc.text(vehicle.name || 'N/A', colR, y);
  y += 5;

  setFont('normal', 8.5, MID);
  if (customer.nicNumber) { doc.text(`NIC: ${customer.nicNumber}`, colL, y); }
  doc.text(`Plate: ${vehicle.plate || '—'}`, colR, y);
  y += 4.5;

  if (customer.phone) { doc.text(customer.phone, colL, y); }
  doc.text(`Booking: ${booking.id.substring(0, 8).toUpperCase()}`, colR, y);
  y += 4.5;

  doc.text(`Period: ${fmt(startDate)} – ${fmt(endDate)}`, colR, y);
  y += 8;

  divider(y); y += 7;

  // ── 3. TERMS ─────────────────────────────────────────────────────────────────
  setFont('bold', 7.5, GOLD);
  doc.text('TERMS & CONDITIONS', ML, y);
  y += 6;

  const terms = TERMS[language] || TERMS.en;
  for (const clause of terms) {
    // Check if we need a new page (leave 70mm for signature band)
    if (y > PH - 75) {
      doc.addPage();
      y = 20;
    }

    setFont('bold', 8.5, DARK);
    doc.text(clause.title, ML, y);
    y += 4.5;

    setFont('normal', 8, MID);
    const lines = doc.splitTextToSize(clause.body, CW);
    doc.text(lines, ML, y);
    y += lines.length * 4 + 3;
  }

  y += 4;
  // If no room for signatures, new page
  if (y > PH - 68) { doc.addPage(); y = 20; }
  divider(y); y += 8;

  // ── 4. SIGNATURES ────────────────────────────────────────────────────────────
  setFont('bold', 7.5, GOLD);
  doc.text('SIGNATURES', ML, y);
  y += 5;

  const sigW = CW / 2 - 6;
  const sigH = 30;
  const sigRightX = ML + CW / 2 + 6;

  // Signature boxes
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.3);
  doc.rect(ML, y, sigW, sigH);
  doc.rect(sigRightX, y, sigW, sigH);

  // Customer signature image
  try {
    doc.addImage(customerSignature, 'PNG', ML + 2, y + 2, sigW - 4, sigH - 4);
  } catch { /* skip if invalid */ }

  // Company signature image (if available)
  if (companySignature) {
    try {
      doc.addImage(companySignature, 'PNG', sigRightX + 2, y + 2, sigW - 4, sigH - 4);
    } catch { /* skip if invalid */ }
  } else {
    setFont('normal', 7.5, MUTED);
    doc.text('(signature not configured)', sigRightX + sigW / 2, y + sigH / 2, { align: 'center' });
  }

  y += sigH + 4;

  // Labels below boxes
  setFont('bold', 7.5, MUTED);
  doc.text('RENTER SIGNATURE', ML, y);
  doc.text('AUTHORIZED SIGNATURE', sigRightX, y);
  y += 4.5;

  setFont('normal', 8.5, DARK);
  doc.text(customer.name || '', ML, y);
  doc.text(companySignatoryName || 'Gasith Rent a Car', sigRightX, y);
  y += 4.5;

  setFont('normal', 8, MUTED);
  doc.text(`Date: ${format(signedAt, 'dd MMM yyyy')}`, ML, y);
  if (companySignatoryTitle) doc.text(companySignatoryTitle, sigRightX, y);

  // ── 5. FOOTER ─────────────────────────────────────────────────────────────────
  const footerY = PH - 18;
  doc.setFillColor(...HEADER_BG);
  doc.rect(0, footerY, PW, PH - footerY, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, footerY, PW, 1, 'F');
  setFont('italic', 8.5, [200, 200, 200]);
  doc.text('Thank you for choosing Gasith Rent a Car — Safe travels!', PW / 2, footerY + 7, { align: 'center' });
  setFont('normal', 7, [100, 100, 100]);
  doc.text(`${agRef} · Generated ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, ML, footerY + 13);
  doc.text('Made with ♥ by Lunor Labs', PW - MR, footerY + 13, { align: 'right' });

  return Buffer.from(doc.output('arraybuffer'));
}
```

- [ ] **Step 2: Verify backend compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/agreement.service.ts
git commit -m "feat: add agreement PDF generation service with bilingual terms"
```

---

## Task 3: Backend — Agreement Routes

**Files:**
- Create: `backend/src/routes/agreements.routes.ts`

Follows the same pattern as `invoices.routes.ts`. Uses `STORAGE_BUCKET = 'uploads'` with path prefix `agreements/`.

- [ ] **Step 1: Create `agreements.routes.ts`**

```ts
import { Router } from 'express';
import { supabase, STORAGE_BUCKET } from '../config/supabase';
import { authMiddleware } from '../middleware/auth.middleware';
import { generateAgreementPDF } from '../services/agreement.service';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// POST /agreements/:bookingId/sign
router.post('/:bookingId/sign', authMiddleware, async (req, res) => {
  try {
    const { signature, language } = req.body;
    if (!signature) return res.status(400).json({ error: 'Signature is required' });

    const { data: booking, error: bErr } = await supabase
      .from('bookings').select('*').eq('id', req.params.bookingId).single();
    if (bErr || !booking) return res.status(404).json({ error: 'Booking not found' });

    const [customerRes, vehicleRes, configRes] = await Promise.all([
      supabase.from('customers').select('*').eq('id', booking.customer_id).single(),
      supabase.from('vehicles').select('*').eq('id', booking.vehicle_id).single(),
      supabase.from('app_config').select('*').eq('id', 1).single(),
    ]);

    const customer = customerRes.data;
    const vehicle  = vehicleRes.data;
    const config   = configRes.data;

    if (!customer || !vehicle) return res.status(404).json({ error: 'Customer or vehicle not found' });

    const signedAt = new Date();

    const pdfBuffer = await generateAgreementPDF({
      booking: {
        id: booking.id,
        startDate: booking.start_date,
        endDate: booking.end_date,
      },
      customer: {
        name: customer.name,
        nicNumber: customer.nic_number,
        phone: customer.phone,
      },
      vehicle: {
        name: vehicle.name,
        plate: vehicle.plate,
      },
      customerSignature: signature,
      companySignature: config?.company_signature || null,
      companySignatoryName: config?.company_signatory_name || 'Gasith Rent a Car',
      companySignatoryTitle: config?.company_signatory_title || '',
      language: language === 'si' ? 'si' : 'en',
      signedAt,
    });

    const fileName = `agreements/AGR-${booking.id}-${uuidv4()}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: false });
    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    const pdfUrl = urlData.publicUrl;

    await supabase.from('bookings').update({
      agreement_url: pdfUrl,
      agreement_signature: signature,
      agreement_signed_at: signedAt.toISOString(),
    }).eq('id', req.params.bookingId);

    const phone = customer.phone?.replace(/\D/g, '');
    const whatsappUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(`Dear ${customer.name}, please find your rental agreement here: ${pdfUrl}`)}`
      : null;

    res.json({ pdfUrl, whatsappUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /agreements/app-config
router.get('/app-config', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('app_config').select('*').eq('id', 1).single();
    if (error) throw error;
    res.json({
      companySignatoryName:  data?.company_signatory_name  || '',
      companySignatoryTitle: data?.company_signatory_title || '',
      companySignature:      data?.company_signature       || '',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /agreements/app-config
router.put('/app-config', authMiddleware, async (req, res) => {
  try {
    const { companySignatoryName, companySignatoryTitle, companySignature } = req.body;
    const { error } = await supabase.from('app_config').upsert({
      id: 1,
      company_signatory_name:  companySignatoryName  || '',
      company_signatory_title: companySignatoryTitle || '',
      company_signature:       companySignature      || '',
    }, { onConflict: 'id' });
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

- [ ] **Step 2: Verify backend compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/agreements.routes.ts
git commit -m "feat: add agreements routes — sign booking and app-config"
```

---

## Task 4: Backend — Register Agreements Router

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Import and register the agreements router**

Add the import at the top of `index.ts` with the other route imports:

```ts
import agreementRoutes from './routes/agreements.routes';
```

Add the route registration after the existing routes (after `app.use('/api/credits', creditRoutes)`):

```ts
app.use('/api/agreements', agreementRoutes);
```

- [ ] **Step 2: Verify backend compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat: register agreements router"
```

---

## Task 5: Frontend API — Agreement Calls

**Files:**
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Add agreement API functions**

At the end of `frontend/lib/api.ts`, add a new section:

```ts
// ─── Agreements ───────────────────────────────────────────────────────────────
export const signAgreement = (bookingId: string, data: { signature: string; language: 'en' | 'si' }) =>
  API.post(`/agreements/${bookingId}/sign`, data);
export const getAppConfig  = () => API.get('/agreements/app-config');
export const saveAppConfig = (data: { companySignatoryName: string; companySignatoryTitle: string; companySignature: string }) =>
  API.put('/agreements/app-config', data);
```

- [ ] **Step 2: Verify frontend compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -v '\.next/'
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat: add agreement API functions"
```

---

## Task 6: Frontend — AgreementSignModal Component

**Files:**
- Create: `frontend/components/AgreementSignModal.tsx`

This is a full-screen modal for handing to the customer. Uses HTML5 Canvas Pointer Events for cross-device touch support (works on phone, tablet, laptop with touchscreen).

- [ ] **Step 1: Create `AgreementSignModal.tsx`**

```tsx
'use client';
import { useRef, useState, useEffect } from 'react';
import { signAgreement } from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
  bookingId: string;
  customerName: string;
  onClose: () => void;
  onSigned: (pdfUrl: string) => void;
}

const TERMS = {
  en: [
    { title: '1. Vehicle Condition', body: 'The renter agrees to return the vehicle in the same condition as received. Any damage, scratches, dents, or mechanical faults caused during the rental period are the full financial responsibility of the renter.' },
    { title: '2. Damage Liability', body: 'In the event of any damage to the vehicle during the rental period (including accidents, vandalism, or negligence), the renter agrees to bear the full cost of repairs as assessed by Gasith Rent a Car. The renter shall not dispute the repair cost assessment.' },
    { title: '3. Fuel Policy', body: 'The vehicle must be returned with the same fuel level as at the time of collection. Any fuel deficit will be charged at market rate plus a service fee.' },
    { title: '4. Late Return', body: 'The vehicle must be returned on or before the agreed due date. Late returns will be charged at the daily rental rate for each additional day or part thereof.' },
    { title: '5. Traffic Fines & Violations', body: 'The renter is solely responsible for any traffic fines, parking violations, or legal penalties incurred during the rental period.' },
    { title: '6. Prohibited Use', body: 'The vehicle shall not be used for illegal purposes, racing, or driven outside of Sri Lanka without prior written consent from Gasith Rent a Car.' },
    { title: '7. Acceptance', body: 'By signing below, the renter confirms they have read, understood, and agreed to all of the above terms and conditions. This agreement is legally binding.' },
  ],
  si: [
    { title: '1. වාහන තත්ත්වය', body: 'කුලී ගන්නා තැනැත්තා, ලැබුණු ඒකම තත්ත්වයේ වාහනය ආපසු සළකා ගැනීමට එකඟ වෙයි. කුලී කාලය තුළ සිදු වූ ඕනෑම හානියක්, සීරීම්, රළු ගැටීම් හෝ යාන්ත්‍රික දෝෂ සඳහා කුලී ගන්නා තැනැත්තා සම්පූර්ණ මූල්‍ය වගකීම භාරගනී.' },
    { title: '2. හානි වගකීම', body: 'කුලී කාලය තුළ වාහනයට ඕනෑම හානියක් සිදු වූ විට (අනතුරු, කාරණා හෝ නොසැලකිලිමත්කම ඇතුළුව), Gasith Rent a Car ආයතනය විසින් තක්සේරු කළ සම්පූර්ණ අලුත්වැඩියා පිරිවැය දැරීමට කුලී ගන්නා තැනැත්තා එකඟ වෙයි.' },
    { title: '3. ඉන්ධන ප්‍රතිපත්තිය', body: 'වාහනය ලබාගත් විට තිබූ ඉන්ධන ප්‍රමාණයෙන්ම ආපසු ලබා දිය යුතුය. ඉන්ධන හිඟය වෙළඳපල මිලට අමතරව සේවා ගාස්තුවක් සහිතව අය කෙරෙනු ඇත.' },
    { title: '4. ප්‍රමාදය', body: 'වාහනය එකඟ වූ නියමිත දිනට හෝ ඊට පෙර ආපසු ලබා දිය යුතුය. ප්‍රමාද ආපසු ලබා දීම් සඳහා අමතර දිනකට හෝ එහි කොටසකට දෛනික කුලී අනුපාතය අය කෙරෙනු ඇත.' },
    { title: '5. රථ වාහන දඩ', body: 'කුලී කාලය තුළ ලැබෙන ඕනෑම රථ වාහන දඩ, නවතා තැබීමේ දඩ හෝ නීතිමය දඬුවම් සඳහා කුලී ගන්නා තැනැත්තා පමණක් වගකිව යුතුය.' },
    { title: '6. තහනම් භාවිතය', body: 'Gasith Rent a Car ආයතනයේ පූර්ව ලිඛිත අනුමැතියකින් තොරව නීති විරෝධී කටයුතු, රේස් කිරීම හෝ ශ්‍රී ලංකාවෙන් පිටත වාහනය ධාවනය කිරීම තහනම්ය.' },
    { title: '7. පිළිගැනීම', body: 'පහත අත්සන් කිරීමෙන්, කුලී ගන්නා තැනැත්තා ඉහත සියලු නියම සහ කොන්දේසි කියවා, තේරුම් ගෙන, එකඟ වී ඇති බව තහවුරු කරයි. මෙම ගිවිසුම නීතිමය වශයෙන් බැඳෙනසුළු වේ.' },
  ],
};

export default function AgreementSignModal({ bookingId, customerName, onClose, onSigned }: Props) {
  const [language, setLanguage] = useState<'en' | 'si'>('en');
  const [signed, setSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasStroke = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas internal resolution to match display size
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d')!;
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };
    resize();

    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      drawing.current = true;
      const ctx = canvas.getContext('2d')!;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      if (!drawing.current) return;
      const ctx = canvas.getContext('2d')!;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      if (!hasStroke.current) { hasStroke.current = true; setSigned(true); }
    };

    const onUp = () => { drawing.current = false; };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', onUp);

    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onUp);
    };
  }, []);

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    hasStroke.current = false;
    setSigned(false);
  };

  const handleSign = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signature = canvas.toDataURL('image/png');
    setSubmitting(true);
    try {
      const r = await signAgreement(bookingId, { signature, language });
      toast.success('Agreement signed!');
      onSigned(r.data.pdfUrl);
    } catch {
      toast.error('Failed to save agreement');
    } finally {
      setSubmitting(false);
    }
  };

  const terms = TERMS[language];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg-base)',
      zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: '#161616', borderBottom: '2px solid var(--gold)',
        padding: '0.75rem 1rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gold)' }}>Rental Agreement</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{customerName}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Language toggle */}
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {(['en', 'si'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                style={{
                  padding: '0.3rem 0.7rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
                  cursor: 'pointer', border: 'none',
                  background: language === lang ? 'var(--gold)' : 'rgba(255,255,255,0.08)',
                  color: language === lang ? '#161616' : 'var(--text-secondary)',
                }}
              >
                {lang === 'en' ? 'EN' : 'සිං'}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.3rem', lineHeight: 1 }}
          >×</button>
        </div>
      </div>

      {/* Terms — scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', paddingBottom: 0 }}>
        <div style={{ marginBottom: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Terms &amp; Conditions
        </div>
        {terms.map((clause, i) => (
          <div key={i} style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
              {clause.title}
            </div>
            <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {clause.body}
            </div>
          </div>
        ))}
      </div>

      {/* Signature area — fixed at bottom */}
      <div style={{
        flexShrink: 0, padding: '1rem',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-elevated)',
      }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
          Your Signature
        </div>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%', height: 130,
            background: '#fff', borderRadius: 10,
            border: '2px solid var(--border)',
            display: 'block', touchAction: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem' }}>
          <button
            onClick={handleClear}
            className="btn btn-secondary btn-sm"
            style={{ flex: 1 }}
          >
            Clear
          </button>
          <button
            onClick={handleSign}
            className="btn btn-primary"
            disabled={!signed || submitting}
            style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            {submitting ? <span className="spinner" /> : '✓ Sign & Agree'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify frontend compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -v '\.next/'
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/AgreementSignModal.tsx
git commit -m "feat: add AgreementSignModal component with bilingual terms and canvas signature"
```

---

## Task 7: Frontend — Settings Page — Company Signatory Section

**Files:**
- Modify: `frontend/app/admin/settings/page.tsx`

The settings page already exists with pricing config. Read the full file before editing. Add the company signatory section at the bottom of the page, after the existing pricing config card.

- [ ] **Step 1: Read the current settings page**

```bash
cat frontend/app/admin/settings/page.tsx
```

Note the existing import list, state structure, and JSX layout before proceeding.

- [ ] **Step 2: Add imports and state**

At the top of the file, add `getAppConfig` and `saveAppConfig` to the existing import from `@/lib/api`:

```ts
import { getPricingConfig, updatePricingConfig, getAppConfig, saveAppConfig } from '@/lib/api';
```

Add refs and state for the signatory section inside the component (after existing state):

```ts
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigDrawing = useRef(false);
  const [signatoryName, setSignatoryName]   = useState('');
  const [signatoryTitle, setSignatoryTitle] = useState('');
  const [sigHasStroke, setSigHasStroke]     = useState(false);
  const [savingSig, setSavingSig]           = useState(false);
  const [sigLoaded, setSigLoaded]           = useState(false);
```

Add `useRef` to the React import if not already there:
```ts
import { useEffect, useState, useRef } from 'react';
```

- [ ] **Step 3: Load app config on mount**

In the existing `useEffect` that calls `getPricingConfig()`, add `getAppConfig()` in parallel:

```ts
  useEffect(() => {
    Promise.all([getPricingConfig(), getAppConfig()])
      .then(([pRes, aRes]) => {
        setConfig({ firstDayFreeKm: pRes.data.firstDayFreeKm, subsequentDayFreeKm: pRes.data.subsequentDayFreeKm });
        setSignatoryName(aRes.data.companySignatoryName || '');
        setSignatoryTitle(aRes.data.companySignatoryTitle || '');
        // Draw existing signature onto canvas after it mounts
        if (aRes.data.companySignature) {
          setSigLoaded(true);
          setTimeout(() => {
            const canvas = sigCanvasRef.current;
            if (!canvas) return;
            canvas.width  = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            const img = new Image();
            img.onload = () => canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
            img.src = aRes.data.companySignature;
            setSigHasStroke(true);
          }, 100);
        }
      })
      .catch(() => toast.error('Failed to load config'))
      .finally(() => setLoading(false));
  }, []);
```

- [ ] **Step 4: Add canvas setup useEffect**

Add after the existing useEffect:

```ts
  useEffect(() => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onDown = (e: PointerEvent) => {
      e.preventDefault(); sigDrawing.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath(); ctx.moveTo(x, y);
    };
    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      if (!sigDrawing.current) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y); ctx.stroke();
      setSigHasStroke(true);
    };
    const onUp = () => { sigDrawing.current = false; };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', onUp);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onUp);
    };
  }, []);
```

- [ ] **Step 5: Add save handler**

Add after the existing `handleSave`:

```ts
  const handleSaveSignatory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSig(true);
    try {
      const companySignature = sigCanvasRef.current?.toDataURL('image/png') || '';
      await saveAppConfig({ companySignatoryName: signatoryName, companySignatoryTitle: signatoryTitle, companySignature });
      toast.success('Company signatory saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSavingSig(false);
    }
  };

  const handleClearSig = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setSigHasStroke(false);
  };
```

- [ ] **Step 6: Add JSX section**

At the bottom of the JSX (after the existing pricing config card, before the closing `</div>` of the page container), add:

```tsx
      {/* ── Company Signatory ── */}
      <div className="card" style={{ padding: '1.25rem', marginTop: '1.5rem' }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ✍️ Company Signatory
          <span style={{ fontWeight: 400, fontSize: '0.72rem', color: 'var(--text-muted)' }}>(appears on all rental agreements)</span>
        </div>
        <form onSubmit={handleSaveSignatory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Authorized Person Name</label>
              <input
                type="text" className="form-input"
                placeholder="e.g. Gasith Rajapaksa"
                value={signatoryName}
                onChange={e => setSignatoryName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Designation / Title</label>
              <input
                type="text" className="form-input"
                placeholder="e.g. Manager"
                value={signatoryTitle}
                onChange={e => setSignatoryTitle(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">
              Authorized Signature
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.4rem', fontSize: '0.72rem' }}>
                (draw with mouse or finger)
              </span>
            </label>
            <canvas
              ref={sigCanvasRef}
              style={{
                width: '100%', height: 120,
                background: '#fff', borderRadius: 10,
                border: '2px solid var(--border)',
                display: 'block', touchAction: 'none',
              }}
            />
            {sigHasStroke && (
              <button type="button" onClick={handleClearSig}
                style={{ fontSize: '0.72rem', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}>
                ↺ Clear & redraw
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingSig} style={{ alignSelf: 'flex-start', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            {savingSig ? <span className="spinner" /> : <><Save size={14} /> Save Signatory</>}
          </button>
        </form>
      </div>
```

- [ ] **Step 7: Verify frontend compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -v '\.next/'
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/app/admin/settings/page.tsx
git commit -m "feat: add company signatory section to settings page"
```

---

## Task 8: Frontend — Open Agreement Modal After Booking Creation

**Files:**
- Modify: `frontend/app/admin/bookings/page.tsx`

- [ ] **Step 1: Add import for AgreementSignModal**

At the top of the file, add:

```ts
import AgreementSignModal from '@/components/AgreementSignModal';
```

- [ ] **Step 2: Add state for the agreement modal**

After the existing `const [submitting, setSubmitting] = useState(false);` line, add:

```ts
  const [agreementBooking, setAgreementBooking] = useState<{ id: string; customerName: string } | null>(null);
```

- [ ] **Step 3: Open modal after booking creation**

In `handleCreate`, after `toast.success('Booking created')` and before `setModalOpen(false)`, capture the new booking ID and customer name then open the modal:

```ts
      toast.success('Booking created');
      setModalOpen(false);
      setForm({ customerId: '', vehicleId: '', startDate: '', endDate: '', startMeterReading: '', pricePerDay: '', pricePerKm: '', firstDayFreeKm: '', subsequentDayFreeKm: '', notes: '', withDriver: false });
      // Open agreement modal — find customer name for display
      const createdId = (await createBooking({ /* already called above */ })); // NOTE: use the response id from the existing call
```

Actually, the existing `handleCreate` already calls `createBooking` and the response isn't captured. Update the call to capture the ID:

Replace:
```ts
      await createBooking({ ... });
      toast.success('Booking created');
      setModalOpen(false);
      setForm({ ... });
      load();
```

With:
```ts
      const res = await createBooking({
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
      toast.success('Booking created');
      setModalOpen(false);
      setForm({ customerId: '', vehicleId: '', startDate: '', endDate: '', startMeterReading: '', pricePerDay: '', pricePerKm: '', firstDayFreeKm: '', subsequentDayFreeKm: '', notes: '', withDriver: false });
      const customerName = customers.find(c => c.id === form.customerId)?.name || 'Customer';
      setAgreementBooking({ id: res.data.id, customerName });
      load();
```

- [ ] **Step 4: Render the modal**

At the very bottom of the JSX (before the closing `</div>` of the component return), add:

```tsx
      {/* Agreement Sign Modal */}
      {agreementBooking && (
        <AgreementSignModal
          bookingId={agreementBooking.id}
          customerName={agreementBooking.customerName}
          onClose={() => { setAgreementBooking(null); toast('Agreement skipped — get signature from booking detail', { icon: 'ℹ️' }); }}
          onSigned={() => { setAgreementBooking(null); load(); }}
        />
      )}
```

- [ ] **Step 5: Verify frontend compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -v '\.next/'
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/admin/bookings/page.tsx
git commit -m "feat: open agreement signing modal after booking creation"
```

---

## Task 9: Frontend — Booking Detail — Agreement Section

**Files:**
- Modify: `frontend/app/admin/bookings/[id]/page.tsx`

Add an Agreement card below the invoice card. Visible for all bookings (active + completed).

- [ ] **Step 1: Add import for AgreementSignModal**

At the top of the file, add:

```ts
import AgreementSignModal from '@/components/AgreementSignModal';
```

- [ ] **Step 2: Add state for agreement modal and result**

After the existing `const [invoice, setInvoice] = useState(...)` line, add:

```ts
  const [agreementModalOpen, setAgreementModalOpen] = useState(false);
  const [agreementUrl, setAgreementUrl] = useState<string | null>(null);
```

- [ ] **Step 3: Pre-fill agreementUrl from booking data**

In the `load` function, after `setBooking(b.data)`, add:

```ts
      if (b.data.agreementUrl) setAgreementUrl(b.data.agreementUrl);
```

Also add `agreementUrl` and `agreementSignedAt` to `mapBookingToResponse` in the backend (already done via the mapper — these come through as `b.agreement_url` etc.). Verify the booking response includes them by checking the mapper in Task 2 of the driver-payment plan. If not, add to `mapBookingToResponse` in `bookings.routes.ts`:

```ts
    agreementUrl:      b.agreement_url,
    agreementSignedAt: b.agreement_signed_at,
```

- [ ] **Step 4: Add Agreement card to JSX**

After the invoice card closing `</div>` (search for `</>)}` that closes the completed section), add the Agreement section outside the `booking.status === 'completed'` condition so it appears for all bookings:

```tsx
      {/* ── Agreement ──────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: '1.25rem', marginTop: '1rem' }}>
        <div style={{ fontWeight: 700, marginBottom: '1rem' }}>📋 Agreement</div>

        {(agreementUrl || booking.agreementUrl) ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span className="badge badge-success">✓ Signed</span>
              {booking.agreementSignedAt && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {fmtDate(booking.agreementSignedAt)}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <a
                href={agreementUrl || booking.agreementUrl}
                target="_blank"
                className="btn btn-secondary"
              >
                ⬇ Download Agreement
              </a>
              <button
                onClick={() => {
                  const url = agreementUrl || booking.agreementUrl;
                  const phone = customer?.phone?.replace(/\D/g, '');
                  const wa = phone
                    ? `https://wa.me/${phone}?text=${encodeURIComponent(`Dear ${customer?.name}, please find your rental agreement here: ${url}`)}`
                    : `https://wa.me/?text=${encodeURIComponent(`Rental agreement: ${url}`)}`;
                  window.open(wa, '_blank');
                }}
                className="btn btn-sm"
                style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 10, padding: '0.55rem 0.9rem', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15 }}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                WhatsApp
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => setAgreementModalOpen(true)}
            className="btn btn-secondary"
          >
            ✍️ Get Customer Signature
          </button>
        )}
      </div>

      {/* Agreement modal (triggered from detail page) */}
      {agreementModalOpen && (
        <AgreementSignModal
          bookingId={id}
          customerName={customer?.name || 'Customer'}
          onClose={() => setAgreementModalOpen(false)}
          onSigned={(pdfUrl) => { setAgreementUrl(pdfUrl); setAgreementModalOpen(false); load(); }}
        />
      )}
```

- [ ] **Step 5: Add agreementUrl and agreementSignedAt to mapBookingToResponse**

In `backend/src/routes/bookings.routes.ts`, find the `mapBookingToResponse` function and add after `driverFee: b.driver_fee,`:

```ts
    agreementUrl:      b.agreement_url,
    agreementSignedAt: b.agreement_signed_at,
```

- [ ] **Step 6: Verify frontend and backend compile**

```bash
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit 2>&1 | grep -v '\.next/'
```

Expected: no errors from either.

- [ ] **Step 7: Commit**

```bash
git add frontend/app/admin/bookings/[id]/page.tsx backend/src/routes/bookings.routes.ts
git commit -m "feat: add Agreement section to booking detail with get-signature and share"
```

---

## Task 10: End-to-End Manual Test

- [ ] **Step 1: Apply the DB migration in Supabase**

Run in SQL Editor:
```sql
ALTER TABLE bookings
  ADD COLUMN agreement_url        TEXT,
  ADD COLUMN agreement_signature  TEXT,
  ADD COLUMN agreement_signed_at  TIMESTAMPTZ;

CREATE TABLE app_config (
  id                      INTEGER PRIMARY KEY DEFAULT 1,
  company_signatory_name  TEXT,
  company_signatory_title TEXT,
  company_signature       TEXT
);
INSERT INTO app_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 2: Configure company signatory in Settings**

Go to Admin → Settings → Company Signatory section.
Enter name and title. Draw a signature on the canvas. Save.
Expected: "Company signatory saved" toast.

- [ ] **Step 3: Create a booking and sign the agreement**

Create a new booking. After creation, the Agreement modal opens automatically.
Toggle language (EN / සිං) — terms should switch.
Draw a signature on the canvas. Tap "Sign & Agree".
Expected: "Agreement signed!" toast. Modal closes.

- [ ] **Step 4: Verify PDF**

Go to the booking detail. Agreement section shows "✓ Signed" with the date.
Click "Download Agreement". Open the PDF.
Expected: Agreement PDF with customer name, vehicle, terms, customer signature, and company signatory signature side by side.

- [ ] **Step 5: Test WhatsApp share**

Click "WhatsApp" in the Agreement section.
Expected: WhatsApp opens with a pre-filled message containing the PDF URL.

- [ ] **Step 6: Test skip + get signature later**

Create a booking. When the modal opens, click ×. 
Expected: Toast "Agreement skipped — get signature from booking detail".
Open booking detail. Agreement section shows "Get Customer Signature" button.
Click it, sign. Expected: PDF generated and section updates to signed state.

- [ ] **Step 7: Test without company signature configured**

Temporarily clear the company signature from Settings. Generate a new agreement.
Open the PDF. Expected: Company signature box shows "(signature not configured)" text — no crash.
