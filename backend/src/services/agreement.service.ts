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

// ── Logo loader ───────────────────────────────────────────────────────────────

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

// ── Date helpers ──────────────────────────────────────────────────────────────

const parseDate = (d: any): Date | null => {
  if (!d) return null;
  if (typeof d === 'string') return new Date(d);
  if (d._seconds) return new Date(d._seconds * 1000);
  return null;
};
const fmt = (d: Date | null) => d ? format(d, 'dd MMM yyyy') : 'N/A';

// ── PDF generation ────────────────────────────────────────────────────────────

export async function generateAgreementPDF(data: AgreementData): Promise<Buffer> {
  const {
    booking, customer, vehicle,
    customerSignature, companySignature,
    companySignatoryName, companySignatoryTitle,
    language, signedAt,
  } = data;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, PH = 297, ML = 18, MR = 18, CW = PW - ML - MR;

  const GOLD:      [number,number,number] = [180, 140, 30];
  const DARK:      [number,number,number] = [22, 22, 22];
  const MID:       [number,number,number] = [80, 80, 80];
  const MUTED:     [number,number,number] = [140, 140, 140];
  const WHITE:     [number,number,number] = [255, 255, 255];
  const HEADER_BG: [number,number,number] = [22, 22, 22];
  const DIVIDER:   [number,number,number] = [220, 210, 180];

  const setFont = (weight: 'normal' | 'bold' | 'italic', size: number, color: [number, number, number]) => {
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
  const colR = ML + CW / 2 + 4;

  setFont('bold', 7.5, GOLD);
  doc.text('RENTER DETAILS', ML, y);
  doc.text('VEHICLE & BOOKING', colR, y);
  y += 5;

  setFont('bold', 10, DARK);
  doc.text(customer.name || 'N/A', ML, y);
  doc.text(vehicle.name || 'N/A', colR, y);
  y += 5;

  setFont('normal', 8.5, MID);
  if (customer.nicNumber) doc.text(`NIC: ${customer.nicNumber}`, ML, y);
  doc.text(`Plate: ${vehicle.plate || '—'}`, colR, y);
  y += 4.5;

  if (customer.phone) doc.text(customer.phone, ML, y);
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
  if (y > PH - 68) { doc.addPage(); y = 20; }
  divider(y); y += 8;

  // ── 4. SIGNATURES ────────────────────────────────────────────────────────────
  setFont('bold', 7.5, GOLD);
  doc.text('SIGNATURES', ML, y);
  y += 5;

  const sigW = CW / 2 - 6;
  const sigH = 30;
  const sigRightX = ML + CW / 2 + 6;

  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.3);
  doc.rect(ML, y, sigW, sigH);
  doc.rect(sigRightX, y, sigW, sigH);

  try {
    doc.addImage(customerSignature, 'PNG', ML + 2, y + 2, sigW - 4, sigH - 4);
  } catch { /* skip if invalid */ }

  if (companySignature) {
    try {
      doc.addImage(companySignature, 'PNG', sigRightX + 2, y + 2, sigW - 4, sigH - 4);
    } catch { /* skip if invalid */ }
  } else {
    setFont('normal', 7.5, MUTED);
    doc.text('(signature not configured)', sigRightX + sigW / 2, y + sigH / 2, { align: 'center' });
  }

  y += sigH + 4;

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
