import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface InvoiceData {
  booking: any;
  customer: any;
  vehicle: any;
}

export async function generateInvoicePDF({ booking, customer, vehicle }: InvoiceData): Promise<Buffer> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const primary = [30, 30, 30];
  const accent = [201, 162, 39]; // Gold
  const light = [245, 245, 245];

  // Header background
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, 210, 45, 'F');

  // Company name
  doc.setTextColor(201, 162, 39);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('GASITH RENT A CAR', 15, 18);

  doc.setTextColor(200, 200, 200);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Premium Vehicle Rental Services', 15, 25);
  doc.text('Sri Lanka | WhatsApp: +94 XX XXX XXXX', 15, 31);

  // Invoice label
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 160, 18, { align: 'right' });

  const invoiceNo = `INV-${booking.id.substring(0, 8).toUpperCase()}`;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text(`No: ${invoiceNo}`, 160, 26, { align: 'right' });
  doc.text(`Date: ${format(new Date(), 'dd MMM yyyy')}`, 160, 32, { align: 'right' });

  // Customer Info
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', 15, 58);

  doc.setDrawColor(201, 162, 39);
  doc.setLineWidth(0.5);
  doc.line(15, 60, 80, 60);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(customer.name || 'N/A', 15, 67);
  doc.text(customer.phone || '', 15, 73);
  doc.text(customer.email || '', 15, 79);
  doc.text(`NIC: ${customer.nicNumber || 'N/A'}`, 15, 85);

  // Vehicle Info
  doc.setFont('helvetica', 'bold');
  doc.text('VEHICLE DETAILS', 115, 58);
  doc.line(115, 60, 195, 60);

  doc.setFont('helvetica', 'normal');
  doc.text(`Vehicle: ${vehicle.name || 'N/A'}`, 115, 67);
  doc.text(`Plate: ${vehicle.plate || 'N/A'}`, 115, 73);
  doc.text(`Type: ${vehicle.type || 'N/A'}`, 115, 79);

  // Booking Info
  doc.setFont('helvetica', 'bold');
  doc.text('RENTAL PERIOD', 15, 100);
  doc.line(15, 102, 100, 102);

  doc.setFont('helvetica', 'normal');
  const startDate = booking.startDate?._seconds
    ? format(new Date(booking.startDate._seconds * 1000), 'dd MMM yyyy')
    : 'N/A';
  const endDate = booking.endDate?._seconds
    ? format(new Date(booking.endDate._seconds * 1000), 'dd MMM yyyy')
    : 'N/A';
  doc.text(`From: ${startDate}`, 15, 109);
  doc.text(`To: ${endDate}`, 15, 115);

  if (!booking.isOutsourced) {
    doc.text(`Start Reading: ${booking.startMeterReading?.toLocaleString()} km`, 15, 121);
    doc.text(`End Reading: ${booking.endMeterReading?.toLocaleString()} km`, 15, 127);
    doc.text(`Total Distance: ${booking.totalKm?.toLocaleString()} km`, 15, 133);
  }

  // Table Header
  const tableTop = 148;
  doc.setFillColor(15, 15, 15);
  doc.rect(15, tableTop, 180, 9, 'F');
  doc.setTextColor(201, 162, 39);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIPTION', 18, tableTop + 6);
  doc.text('DETAILS', 100, tableTop + 6);
  doc.text('AMOUNT (LKR)', 180, tableTop + 6, { align: 'right' });

  // Table rows
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);

  let rowY = tableTop + 15;
  const rowH = 10;

  const rows = booking.isOutsourced
    ? [
        ['Outsourced Vehicle Rental', vehicle.plate, `${booking.outsourcedPayment?.toLocaleString() || 0}`],
        ['Commission', `${booking.commissionRate || 10}%`, `-${((booking.outsourcedPayment || 0) * (booking.commissionRate || 10) / 100).toLocaleString()}`],
      ]
    : [
        ['Mileage Charge', `${booking.totalKm?.toLocaleString() || 0} km × LKR ${booking.pricePerKm?.toLocaleString() || 0}`, `${booking.baseAmount?.toLocaleString() || 0}`],
      ];

  rows.forEach((row, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(15, rowY - 6, 180, rowH, 'F');
    }
    doc.setTextColor(40, 40, 40);
    doc.text(row[0], 18, rowY);
    doc.text(row[1], 100, rowY);
    doc.text(row[2], 180, rowY, { align: 'right' });
    rowY += rowH;
  });

  // Subtotal section
  rowY += 5;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(110, rowY, 195, rowY);
  rowY += 7;

  doc.setFontSize(9.5);
  doc.text('Subtotal', 120, rowY);
  doc.text(`LKR ${(booking.baseAmount || 0).toLocaleString()}`, 180, rowY, { align: 'right' });
  rowY += 9;

  if (booking.discountAmount > 0) {
    doc.setTextColor(34, 197, 94);
    doc.text('Discount', 120, rowY);
    doc.text(`- LKR ${booking.discountAmount.toLocaleString()}`, 180, rowY, { align: 'right' });
    rowY += 9;
  }

  // Total
  doc.setFillColor(15, 15, 15);
  doc.rect(110, rowY - 5, 85, 13, 'F');
  doc.setTextColor(201, 162, 39);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', 120, rowY + 4);
  doc.text(`LKR ${(booking.finalAmount || 0).toLocaleString()}`, 180, rowY + 4, { align: 'right' });

  // Footer
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 272, 210, 25, 'F');
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for choosing Gasith Rent a Car!', 105, 281, { align: 'center' });
  doc.text('For queries: WhatsApp us at +94 XX XXX XXXX', 105, 287, { align: 'center' });
  doc.setTextColor(201, 162, 39);
  doc.text(`Invoice No: ${invoiceNo}`, 105, 293, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}
