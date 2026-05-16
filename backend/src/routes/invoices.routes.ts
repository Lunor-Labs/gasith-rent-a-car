import { Router } from 'express';
import { supabase, STORAGE_BUCKET } from '../config/supabase';
import { authMiddleware } from '../middleware/auth.middleware';
import { generateInvoicePDF } from '../services/invoice.service';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET all invoices
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json((data || []).map(mapInvoiceToResponse));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single invoice
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ error: 'Invoice not found' });
    res.json(mapInvoiceToResponse(data));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST generate invoice for a booking
router.post('/generate/:bookingId', authMiddleware, async (req, res) => {
  try {
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', req.params.bookingId)
      .single();

    if (bookingErr || !booking) return res.status(404).json({ error: 'Booking not found' });

    const [customerRes, vehicleRes] = await Promise.all([
      supabase.from('customers').select('*').eq('id', booking.customer_id).single(),
      supabase.from('vehicles').select('*').eq('id', booking.vehicle_id).single(),
    ]);

    const customer = customerRes.data;
    const vehicle = vehicleRes.data;

    if (!customer || !vehicle) {
      return res.status(404).json({ error: 'Customer or vehicle not found' });
    }

    // Map to camelCase for the invoice service (which expects the old format)
    const bookingForPDF = {
      id: booking.id,
      startDate: booking.start_date,
      endDate: booking.end_date,
      startMeterReading: booking.start_meter_reading,
      endMeterReading: booking.end_meter_reading,
      totalKm: booking.total_km,
      pricePerKm: booking.price_per_km,
      baseAmount: booking.base_amount,
      discountAmount: booking.discount_amount,
      finalAmount: booking.final_amount,
      isOutsourced: booking.is_outsourced,
      outsourcedPayment: booking.outsourced_payment,
      commissionRate: booking.commission_rate,
    };

    const customerForPDF = {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      nicNumber: customer.nic_number,
    };

    const vehicleForPDF = {
      name: vehicle.name,
      plate: vehicle.plate,
      type: vehicle.type,
    };

    // Generate PDF buffer
    const pdfBuffer = await generateInvoicePDF({
      booking: bookingForPDF,
      customer: customerForPDF,
      vehicle: vehicleForPDF,
    });

    // Upload to Supabase Storage
    const fileName = `invoices/INV-${booking.id}-${uuidv4()}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    const pdfUrl = urlData.publicUrl;

    // Check if invoice already exists for this booking
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('booking_id', booking.id)
      .limit(1);

    let invoiceId: string;

    if (existing && existing.length > 0) {
      invoiceId = existing[0].id;
      await supabase
        .from('invoices')
        .update({ pdf_url: pdfUrl, updated_at: new Date().toISOString() })
        .eq('id', invoiceId);
    } else {
      const { data: newInvoice, error: insertErr } = await supabase
        .from('invoices')
        .insert({
          booking_id: booking.id,
          customer_id: booking.customer_id,
          vehicle_id: booking.vehicle_id,
          amount: booking.final_amount,
          discount_amount: booking.discount_amount,
          pdf_url: pdfUrl,
          whatsapp_sent: false,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      invoiceId = newInvoice.id;
    }

    // Update booking with invoice URL
    await supabase
      .from('bookings')
      .update({ invoice_url: pdfUrl })
      .eq('id', booking.id);

    // Build WhatsApp share URL
    const phone = customer.phone?.replace(/\D/g, '');
    const whatsappUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(`Dear ${customer.name}, your invoice for vehicle ${vehicle.plate} is ready. Total: LKR ${booking.final_amount?.toLocaleString()}. Invoice: ${pdfUrl}`)}`
      : null;

    res.json({ invoiceId, pdfUrl, whatsappUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET whatsapp share link for existing invoice
router.get('/:id/whatsapp', authMiddleware, async (req, res) => {
  try {
    const { data: invoice, error: invoiceErr } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (invoiceErr || !invoice) return res.status(404).json({ error: 'Invoice not found' });

    const [customerRes, bookingRes, vehicleRes] = await Promise.all([
      supabase.from('customers').select('*').eq('id', invoice.customer_id).single(),
      supabase.from('bookings').select('*').eq('id', invoice.booking_id).single(),
      supabase.from('vehicles').select('*').eq('id', invoice.vehicle_id).single(),
    ]);

    const customer = customerRes.data!;
    const booking = bookingRes.data!;
    const vehicle = vehicleRes.data!;

    const phone = customer.phone?.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(`Dear ${customer.name}, your invoice for ${vehicle.plate} is ready. Total: LKR ${booking.final_amount?.toLocaleString()}. View/Download: ${invoice.pdf_url}`)}`;

    await supabase
      .from('invoices')
      .update({ whatsapp_sent: true })
      .eq('id', req.params.id);

    res.json({ whatsappUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapInvoiceToResponse(inv: any) {
  return {
    id: inv.id,
    bookingId: inv.booking_id,
    customerId: inv.customer_id,
    vehicleId: inv.vehicle_id,
    amount: inv.amount,
    discountAmount: inv.discount_amount,
    pdfUrl: inv.pdf_url,
    whatsappSent: inv.whatsapp_sent,
    createdAt: inv.created_at,
    updatedAt: inv.updated_at,
  };
}

export default router;
