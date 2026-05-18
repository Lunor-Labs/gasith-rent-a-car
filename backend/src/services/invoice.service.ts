import jsPDF from 'jspdf';
import { format } from 'date-fns';
import path from 'path';
import fs from 'fs';

interface InvoiceData {
  booking: any;
  customer: any;
  vehicle: any;
}

// ── Cache the logo as JPEG base64 ─────────────────────────────────────────────
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
    if (!logoPath) {
      console.warn('Logo file not found in any expected path');
      return null;
    }

    logoJpgBase64 = fs.readFileSync(logoPath).toString('base64');
    return logoJpgBase64;
  } catch (e) {
    console.warn('Could not load logo for invoice:', e);
    return null;
  }
}

// ── Generate Invoice PDF ──────────────────────────────────────────────────────
export async function generateInvoicePDF({ booking, customer, vehicle }: InvoiceData): Promise<Buffer> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;

  // Colors
  const gold: [number, number, number] = [201, 162, 39];
  const dark: [number, number, number] = [20, 20, 20];
  const muted: [number, number, number] = [130, 130, 130];
  const cardBg: [number, number, number] = [248, 248, 248];
  const green: [number, number, number] = [34, 197, 94];

  let y = 15;

  // ── Logo (top center) ───────────────────────────────────────────────────────
  const logoBase64 = getLogoBase64();
  if (logoBase64) {
    const logoSize = 24;
    const logoX = (pageW - logoSize) / 2;
    doc.addImage(`data:image/jpeg;base64,${logoBase64}`, 'JPEG', logoX, y, logoSize, logoSize);
    y += logoSize + 8; // generous gap between logo and title
  }

  // ── Company name (no tagline) ───────────────────────────────────────────────
  doc.setTextColor(...gold);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('GASITH RENT A CAR', pageW / 2, y, { align: 'center' });
  y += 10;

  // Thin gold separator
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.line(pageW / 2 - 30, y, pageW / 2 + 30, y);
  y += 14;

  // ── Invoice Card ────────────────────────────────────────────────────────────
  const cardX = margin;
  const cardStartY = y;
  const cardPadding = 14;
  const rowH = 12;

  // Helper to draw a detail row inside the card
  function drawRow(label: string, value: string, isHighlight = false, isGreen = false) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...muted);
    doc.text(label, cardX + cardPadding, y);

    doc.setFont('helvetica', 'bold');
    if (isHighlight) {
      doc.setTextColor(...gold);
      doc.setFontSize(14);
    } else if (isGreen) {
      doc.setTextColor(...green);
      doc.setFontSize(11);
    } else {
      doc.setTextColor(...dark);
      doc.setFontSize(11);
    }
    doc.text(value, cardX + contentW - cardPadding, y, { align: 'right' });
    y += rowH;
  }

  // Calculate rows content
  const invoiceNo = `INV-${booking.id.substring(0, 8).toUpperCase()}`;

  // Parse dates
  const parseDate = (d: any): Date | null => {
    if (!d) return null;
    if (typeof d === 'string') return new Date(d);
    if (d._seconds) return new Date(d._seconds * 1000);
    return null;
  };

  const startDate = parseDate(booking.startDate || booking.start_date);
  const endDate = parseDate(booking.endDate || booking.end_date);
  const startStr = startDate ? format(startDate, 'dd MMM yyyy') : 'N/A';
  const endStr = endDate ? format(endDate, 'dd MMM yyyy') : 'N/A';

  // Billing mode determines which rows to show
  const billingMode = booking.billingMode || booking.billing_mode || 'per_km';
  let thirdRowLabel = '';
  let thirdRowValue = '';
  let chargesDetail = '';

  if (billingMode === 'per_day') {
    // Per-day: show Rental Period + days × rate
    thirdRowLabel = 'Rental Period';
    thirdRowValue = `${startStr}  —  ${endStr}`;
    if (startDate && endDate) {
      const diffMs = endDate.getTime() - startDate.getTime();
      const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      const rate = booking.pricePerDay || booking.price_per_day || 0;
      chargesDetail = `${days} day${days > 1 ? 's' : ''} x LKR ${rate.toLocaleString()}`;
    } else {
      chargesDetail = `LKR ${(booking.baseAmount || booking.base_amount || 0).toLocaleString()}`;
    }
  } else {
    // Per-km: show Distance Traveled + km × rate
    const totalKm = booking.totalKm || booking.total_km || 0;
    const rate = booking.pricePerKm || booking.price_per_km || 0;
    thirdRowLabel = 'Distance Traveled';
    thirdRowValue = `${totalKm.toLocaleString()} km`;
    if (totalKm > 0 && rate > 0) {
      chargesDetail = `${totalKm.toLocaleString()} km x LKR ${rate.toLocaleString()}`;
    } else {
      chargesDetail = `LKR ${(booking.baseAmount || booking.base_amount || 0).toLocaleString()}`;
    }
  }

  const discountAmount = booking.discountAmount || booking.discount_amount || 0;
  const finalAmount = booking.finalAmount || booking.final_amount || 0;

  // Calculate card height: customer + vehicle + third row + charges + separator + (discount?) + total
  let rowCount = 5; // customer, vehicle, thirdRow, charges, total
  if (discountAmount > 0) rowCount += 1;
  const cardH = cardPadding * 2 + rowCount * rowH + 10; // extra 10 for separator

  // Draw card background
  doc.setFillColor(...cardBg);
  doc.roundedRect(cardX, cardStartY, contentW, cardH, 4, 4, 'F');

  // Draw subtle border
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(cardX, cardStartY, contentW, cardH, 4, 4, 'S');

  y = cardStartY + cardPadding + 5;

  // Invoice card rows
  drawRow('Customer', customer.name || 'N/A');
  drawRow('Vehicle', `${vehicle.name || 'N/A'} (${vehicle.plate || ''})`.trim());
  drawRow(thirdRowLabel, thirdRowValue);
  drawRow('Charges', chargesDetail);

  // Separator before totals
  y += 2;
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.line(cardX + cardPadding, y, cardX + contentW - cardPadding, y);
  y += 8;

  if (discountAmount > 0) {
    drawRow('Discount', `- LKR ${discountAmount.toLocaleString()}`, false, true);
  }

  // Total — highlighted
  drawRow('Total', `LKR ${finalAmount.toLocaleString()}`, true);

  y = cardStartY + cardH + 16;

  // ── Greeting tagline ────────────────────────────────────────────────────────
  doc.setTextColor(...dark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('We appreciate your trust in Gasith Rent a Car.', pageW / 2, y, { align: 'center' });
  y += 5.5;
  doc.text('Wish you a safe and pleasant journey ahead!', pageW / 2, y, { align: 'center' });
  y += 16;

  // ── Invoice metadata (minor) ────────────────────────────────────────────────
  doc.setTextColor(...muted);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  const nowStr = format(new Date(), 'dd MMM yyyy, hh:mm a');
  doc.text(`Invoice ${invoiceNo}  ·  Generated on ${nowStr}`, pageW / 2, y, { align: 'center' });
  y += 14;

  // ── Made with ♥ by Lunor Labs (drawn heart) ─────────────────────────────────
  const heartY = y;
  const heartX = pageW / 2;

  doc.setTextColor(180, 180, 180);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Made with', heartX - 16, heartY, { align: 'center' });

  // Draw a small filled heart shape using lines
  const hx = heartX + 0.5;
  const hy = heartY - 1.2;
  const hs = 1.4; // heart scale
  doc.setFillColor(220, 50, 50);
  // Left bump
  doc.circle(hx - hs * 0.5, hy - hs * 0.15, hs * 0.55, 'F');
  // Right bump
  doc.circle(hx + hs * 0.5, hy - hs * 0.15, hs * 0.55, 'F');
  // Bottom triangle
  doc.triangle(
    hx - hs * 1.05, hy,
    hx + hs * 1.05, hy,
    hx, hy + hs * 1.2,
    'F'
  );

  doc.setTextColor(180, 180, 180);
  doc.text('by Lunor Labs', heartX + 17, heartY, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}
