import { Router } from 'express';
import { db, storage } from '../config/firebase';
import { authMiddleware } from '../middleware/auth.middleware';
import { generateInvoicePDF } from '../services/invoice.service';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET all invoices
router.get('/', authMiddleware, async (req, res) => {
  try {
    const snap = await db.collection('invoices').orderBy('createdAt', 'desc').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single invoice
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await db.collection('invoices').doc(String(req.params.id)).get();
    if (!doc.exists) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST generate invoice for a booking
router.post('/generate/:bookingId', authMiddleware, async (req, res) => {
  try {
    const bookingDoc = await db.collection('bookings').doc(String(req.params.bookingId)).get();
    if (!bookingDoc.exists) return res.status(404).json({ error: 'Booking not found' });
    const booking = { id: bookingDoc.id, ...bookingDoc.data() } as any;

    const [customerDoc, vehicleDoc] = await Promise.all([
      db.collection('customers').doc(booking.customerId).get(),
      db.collection('vehicles').doc(booking.vehicleId).get(),
    ]);

    const customer = { id: customerDoc.id, ...customerDoc.data() } as any;
    const vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() } as any;

    // Generate PDF buffer
    const pdfBuffer = await generateInvoicePDF({ booking, customer, vehicle });

    // Upload to Firebase Storage
    const bucket = storage.bucket();
    const fileName = `invoices/INV-${booking.id}-${uuidv4()}.pdf`;
    const fileRef = bucket.file(fileName);
    await fileRef.save(pdfBuffer, { contentType: 'application/pdf', public: true });
    const pdfUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    // Save invoice record
    const existing = await db.collection('invoices').where('bookingId', '==', booking.id).limit(1).get();
    let invoiceId: string;

    if (!existing.empty) {
      invoiceId = existing.docs[0].id;
      await db.collection('invoices').doc(invoiceId).update({ pdfUrl, updatedAt: new Date() });
    } else {
      const invoiceRef = await db.collection('invoices').add({
        bookingId: booking.id,
        customerId: booking.customerId,
        vehicleId: booking.vehicleId,
        amount: booking.finalAmount,
        discountAmount: booking.discountAmount,
        pdfUrl,
        whatsappSent: false,
        createdAt: new Date(),
      });
      invoiceId = invoiceRef.id;
    }

    // Update booking with invoice URL
    await db.collection('bookings').doc(booking.id).update({ invoiceUrl: pdfUrl });

    // Build WhatsApp share URL
    const phone = customer.phone?.replace(/\D/g, '');
    const whatsappUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(`Dear ${customer.name}, your invoice for vehicle ${vehicle.plate} is ready. Total: LKR ${booking.finalAmount.toLocaleString()}. Invoice: ${pdfUrl}`)}`
      : null;

    res.json({ invoiceId, pdfUrl, whatsappUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET whatsapp share link for existing invoice
router.get('/:id/whatsapp', authMiddleware, async (req, res) => {
  try {
    const invoiceDoc = await db.collection('invoices').doc(String(req.params.id)).get();
    if (!invoiceDoc.exists) return res.status(404).json({ error: 'Invoice not found' });
    const invoice = invoiceDoc.data()!;

    const customerDoc = await db.collection('customers').doc(invoice.customerId).get();
    const customer = customerDoc.data()!;
    const phone = customer.phone?.replace(/\D/g, '');
    const bookingDoc = await db.collection('bookings').doc(invoice.bookingId).get();
    const booking = bookingDoc.data()!;
    const vehicleDoc = await db.collection('vehicles').doc(invoice.vehicleId).get();
    const vehicle = vehicleDoc.data()!;

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(`Dear ${customer.name}, your invoice for ${vehicle.plate} is ready. Total: LKR ${booking.finalAmount?.toLocaleString()}. View/Download: ${invoice.pdfUrl}`)}`;

    await db.collection('invoices').doc(String(req.params.id)).update({ whatsappSent: true });
    res.json({ whatsappUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
