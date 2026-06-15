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

    return res.json({ pdfUrl, whatsappUrl });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /agreements/app-config
router.get('/app-config', authMiddleware, async (_req, res) => {
  try {
    const { data, error } = await supabase.from('app_config').select('*').eq('id', 1).single();
    if (error) throw error;
    return res.json({
      companySignatoryName:  data?.company_signatory_name  || '',
      companySignatoryTitle: data?.company_signatory_title || '',
      companySignature:      data?.company_signature       || '',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
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
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
