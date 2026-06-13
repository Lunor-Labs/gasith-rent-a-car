import jsPDF from 'jspdf';
import { format } from 'date-fns';
import path from 'path';
import fs from 'fs';

interface InvoiceData {
  booking: any;
  customer: any;
  vehicle: any;
}

let logoJpgBase64: string | null = null;

function getLogoBase64(): string | null {
  if (logoJpgBase64) return logoJpgBase64;
  try {
    const possiblePaths = [
      path.join(__dirname, '../../assets/logo.jpg'),
      path.join(__dirname, '../../../assets/logo.jpg'),
      path.join(process.cwd(), 'assets/logo.jpg'),
    ];
    let logoPath = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) { logoPath = p; break; }
    }
    if (!logoPath) return null;
    logoJpgBase64 = fs.readFileSync(logoPath).toString('base64');
    return logoJpgBase64;
  } catch { return null; }
}

const parseDate = (d: any): Date | null => {
  if (!d) return null;
  if (typeof d === 'string') return new Date(d);
  if (d._seconds) return new Date(d._seconds * 1000);
  return null;
};

const fmt = (d: Date | null) => d ? format(d, 'dd MMM yyyy') : 'N/A';
const lkr = (n: number) => `LKR ${Math.round(n).toLocaleString()}`;

export async function generateInvoicePDF({ booking, customer, vehicle }: InvoiceData): Promise<Buffer> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const PW = 210;
  const PH = 297;
  const ML = 18;
  const MR = 18;
  const CW = PW - ML - MR;

  // ── Palette ─────────────────────────────────────────────────────────────────
  const GOLD:   [number,number,number] = [180, 140, 30];
  const DARK:   [number,number,number] = [22, 22, 22];
  const MID:    [number,number,number] = [80, 80, 80];
  const MUTED:  [number,number,number] = [140, 140, 140];
  const GREEN:  [number,number,number] = [30, 160, 80];
  const WHITE:  [number,number,number] = [255, 255, 255];
  const HEADER_BG: [number,number,number] = [22, 22, 22];
  const DIVIDER: [number,number,number] = [220, 210, 180];

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const setFont = (weight: 'normal'|'bold'|'italic', size: number, color: [number,number,number]) => {
    doc.setFont('helvetica', weight);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const line = (x1: number, y1: number, x2: number, y2: number, color: [number,number,number], w = 0.3) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(w);
    doc.line(x1, y1, x2, y2);
  };

  // ── Data prep ────────────────────────────────────────────────────────────────
  const invoiceNo   = `INV-${booking.id.substring(0, 8).toUpperCase()}`;
  const startDate   = parseDate(booking.startDate || booking.start_date);
  const endDate     = parseDate(booking.endDate   || booking.end_date);
  const issueDate   = format(new Date(), 'dd MMM yyyy');
  const pricePerDay = booking.pricePerDay   || booking.price_per_day   || 0;
  const pricePerKm  = booking.pricePerKm    || booking.price_per_km    || 0;
  const baseAmount  = booking.baseAmount    || booking.base_amount     || 0;
  const discountAmt = booking.discountAmount|| booking.discount_amount || 0;
  const additionalDiscount = booking.additionalDiscount || booking.additional_discount || 0;
  const finalAmount = booking.finalAmount   || booking.final_amount    || 0;
  const totalKm     = booking.totalKm       || booking.total_km        || 0;
  const freeKm      = booking.freeKm        || booking.free_km         || 0;
  const extraKm     = booking.extraKm       || booking.extra_km        || 0;
  const extraKmCharge = booking.extraKmCharge || booking.extra_km_charge || 0;
  const startReading = booking.startMeterReading || booking.start_meter_reading;
  const endReading   = booking.endMeterReading   || booking.end_meter_reading;
  const notes        = booking.notes || '';
  const isOutsourced = booking.isOutsourced || booking.is_outsourced || false;
  const driverFee = booking.driverFee || booking.driver_fee || 0;

  let days = 1;
  if (startDate && endDate) {
    days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }

  const autoDiscount = Math.max(0, discountAmt - additionalDiscount);

  // ── 1. HEADER BAND ──────────────────────────────────────────────────────────
  doc.setFillColor(...HEADER_BG);
  doc.rect(0, 0, PW, 38, 'F');

  // Gold left accent bar
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, 4, 38, 'F');

  // Logo
  const logoBase64 = getLogoBase64();
  if (logoBase64) {
    doc.addImage(`data:image/jpeg;base64,${logoBase64}`, 'JPEG', ML + 2, 6, 26, 26);
  }

  // Company name
  const textX = logoBase64 ? ML + 34 : ML + 2;
  setFont('bold', 16, WHITE);
  doc.text('GASITH RENT A CAR', textX, 17);
  setFont('normal', 8, [180, 180, 180]);
  doc.text('Premium Vehicle Rental Services · Sri Lanka', textX, 23);

  // Invoice label (right side)
  setFont('bold', 22, GOLD);
  doc.text('INVOICE', PW - MR, 16, { align: 'right' });
  setFont('normal', 8.5, [200, 200, 200]);
  doc.text(invoiceNo, PW - MR, 23, { align: 'right' });
  setFont('normal', 8, [160, 160, 160]);
  doc.text(`Date: ${issueDate}`, PW - MR, 29, { align: 'right' });

  // Gold bottom border on header
  doc.setFillColor(...GOLD);
  doc.rect(0, 38, PW, 1.2, 'F');

  let y = 50;

  // ── 2. BILL TO + VEHICLE ────────────────────────────────────────────────────
  const colL = ML;
  const colR = ML + CW / 2 + 6;
  const colW = CW / 2 - 6;

  // Left: Bill To
  setFont('bold', 7.5, GOLD);
  doc.text('BILL TO', colL, y);
  y += 5;
  setFont('bold', 11, DARK);
  doc.text(customer.name || 'N/A', colL, y);
  y += 5.5;
  setFont('normal', 9, MID);
  if (customer.phone) { doc.text(customer.phone, colL, y); y += 4.5; }
  if (customer.nicNumber) { doc.text(`NIC: ${customer.nicNumber}`, colL, y); y += 4.5; }
  if (customer.address) {
    const lines = doc.splitTextToSize(customer.address, colW);
    doc.text(lines, colL, y);
    y += lines.length * 4.5;
  }

  // Right: Vehicle
  const vy = 50;
  setFont('bold', 7.5, GOLD);
  doc.text('VEHICLE', colR, vy);
  setFont('bold', 11, DARK);
  doc.text(`${vehicle.name || 'N/A'}`, colR, vy + 5);
  setFont('normal', 9, MID);
  doc.text(`Plate: ${vehicle.plate || '—'}`, colR, vy + 10.5);
  if (vehicle.type) doc.text(`Type: ${vehicle.type}`, colR, vy + 15);

  y = Math.max(y, vy + 22) + 8;

  // ── Divider ──────────────────────────────────────────────────────────────────
  line(ML, y, ML + CW, y, DIVIDER, 0.5);
  y += 8;

  // ── 3. BOOKING DETAILS ───────────────────────────────────────────────────────
  setFont('bold', 7.5, GOLD);
  doc.text('BOOKING DETAILS', ML, y);
  y += 5;

  const detailCol2 = ML + CW / 3;
  const detailCol3 = ML + (CW * 2) / 3;

  // Row: Booking ID | Start Date | End Date
  setFont('bold', 7.5, MUTED);
  doc.text('BOOKING ID', ML, y);
  doc.text('START DATE', detailCol2, y);
  doc.text('END DATE', detailCol3, y);
  y += 4;
  setFont('bold', 9.5, DARK);
  doc.text(booking.id.substring(0, 8).toUpperCase(), ML, y);
  doc.text(fmt(startDate), detailCol2, y);
  doc.text(fmt(endDate), detailCol3, y);
  y += 7;

  // Row: No of Days
  setFont('bold', 7.5, MUTED);
  doc.text('NO OF DAYS', ML, y);
  y += 4;
  setFont('bold', 9.5, DARK);
  doc.text(`${days} day${days > 1 ? 's' : ''}`, ML, y);
  y += 7;

  if (!isOutsourced && (startReading || endReading)) {
    setFont('bold', 7.5, MUTED);
    doc.text('START ODOMETER', ML, y);
    doc.text('END ODOMETER', detailCol2, y);
    doc.text('TOTAL KM', detailCol3, y);
    y += 4;
    setFont('normal', 9, DARK);
    doc.text(startReading != null ? `${Number(startReading).toLocaleString()} km` : '—', ML, y);
    doc.text(endReading != null ? `${Number(endReading).toLocaleString()} km` : '—', detailCol2, y);
    doc.text(totalKm > 0 ? `${totalKm.toLocaleString()} km` : '—', detailCol3, y);
    y += 7;
  }

  y += 4;
  line(ML, y, ML + CW, y, DIVIDER, 0.5);
  y += 8;

  // ── 4. CHARGES TABLE ─────────────────────────────────────────────────────────
  setFont('bold', 7.5, GOLD);
  doc.text('CHARGES', ML, y);
  y += 5;

  // Subtotal
  y += 3;
  line(ML, y, ML + CW, y, DIVIDER, 0.4);
  y += 5;
  setFont('normal', 8.5, MUTED);
  doc.text('Subtotal', ML + 5, y);
  setFont('bold', 9, DARK);
  doc.text(lkr(baseAmount), ML + CW - 5, y, { align: 'right' });
  y += 7;

  // Discounts
  if (autoDiscount > 0) {
    setFont('normal', 8.5, GREEN);
    doc.text('Rate / KM Discount', ML + 5, y);
    setFont('bold', 9, GREEN);
    doc.text(`- ${lkr(autoDiscount)}`, ML + CW - 5, y, { align: 'right' });
    y += 6.5;
  }

  if (additionalDiscount > 0) {
    setFont('normal', 8.5, GREEN);
    doc.text('Additional Discount', ML + 5, y);
    setFont('bold', 9, GREEN);
    doc.text(`- ${lkr(additionalDiscount)}`, ML + CW - 5, y, { align: 'right' });
    y += 6.5;
  }

  if (driverFee > 0) {
    setFont('normal', 8.5, MID);
    doc.text('Driver Service', ML + 5, y);
    setFont('bold', 9, DARK);
    doc.text(`+ ${lkr(driverFee)}`, ML + CW - 5, y, { align: 'right' });
    y += 6.5;
  }

  // Total band
  y += 3;
  doc.setFillColor(...HEADER_BG);
  doc.roundedRect(ML, y, CW, 13, 2, 2, 'F');
  doc.setFillColor(...GOLD);
  doc.roundedRect(ML, y, 4, 13, 1, 1, 'F');
  setFont('bold', 10, [200, 200, 200]);
  doc.text('TOTAL AMOUNT', ML + 10, y + 8.5);
  setFont('bold', 14, GOLD);
  doc.text(lkr(finalAmount), ML + CW - 6, y + 8.5, { align: 'right' });
  y += 20;

  // ── 5. NOTES ─────────────────────────────────────────────────────────────────
  if (notes) {
    doc.setFillColor(252, 250, 240);
    doc.setDrawColor(...DIVIDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(ML, y, CW, 16, 2, 2, 'FD');
    setFont('bold', 7.5, GOLD);
    doc.text('NOTES', ML + 5, y + 5.5);
    setFont('normal', 8.5, MID);
    const noteLines = doc.splitTextToSize(notes, CW - 10);
    doc.text(noteLines, ML + 5, y + 10);
    y += 16 + noteLines.length * 4 + 4;
  }

  // ── 6. FOOTER ────────────────────────────────────────────────────────────────
  const footerY = PH - 22;
  doc.setFillColor(...HEADER_BG);
  doc.rect(0, footerY, PW, PH - footerY, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, footerY, PW, 1, 'F');

  setFont('italic', 9, [200, 200, 200]);
  doc.text('Thank you for choosing Gasith Rent a Car — Wishing you safe travels!', PW / 2, footerY + 8, { align: 'center' });

  setFont('normal', 7, [100, 100, 100]);
  doc.text(`${invoiceNo}  ·  Generated ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, ML, footerY + 15);

  setFont('normal', 7, [100, 100, 100]);
  doc.text('Made with ♥ by Lunor Labs', PW - MR, footerY + 15, { align: 'right' });

  return Buffer.from(doc.output('arraybuffer'));
}
