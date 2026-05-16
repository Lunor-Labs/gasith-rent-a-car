import { Router } from 'express';
import { supabase, STORAGE_BUCKET } from '../config/supabase';
import { authMiddleware } from '../middleware/auth.middleware';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const docFields = upload.fields([
  { name: 'nicFront', maxCount: 1 },
  { name: 'nicBack', maxCount: 1 },
  { name: 'drivingLicense', maxCount: 1 },
]);

// GET all customers
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json((data || []).map(mapCustomerToResponse));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single customer
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ error: 'Customer not found' });
    res.json(mapCustomerToResponse(data));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create customer
router.post('/', authMiddleware, docFields, async (req, res) => {
  try {
    const { name, phone, email, address, nicNumber } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const [nicFrontUrl, nicBackUrl, drivingLicenseUrl] = await Promise.all([
      uploadDoc(files, 'nicFront'),
      uploadDoc(files, 'nicBack'),
      uploadDoc(files, 'drivingLicense'),
    ]);

    const { data, error } = await supabase
      .from('customers')
      .insert({
        name,
        phone,
        email,
        address,
        nic_number: nicNumber,
        nic_front_url: nicFrontUrl,
        nic_back_url: nicBackUrl,
        driving_license_url: drivingLicenseUrl,
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ id: data.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update customer
router.put('/:id', authMiddleware, docFields, async (req, res) => {
  try {
    const { name, phone, email, address, nicNumber } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const updateData: any = { name, phone, email, address, nic_number: nicNumber };

    const [nicFrontUrl, nicBackUrl, drivingLicenseUrl] = await Promise.all([
      uploadDoc(files, 'nicFront'),
      uploadDoc(files, 'nicBack'),
      uploadDoc(files, 'drivingLicense'),
    ]);
    if (nicFrontUrl) updateData.nic_front_url = nicFrontUrl;
    if (nicBackUrl) updateData.nic_back_url = nicBackUrl;
    if (drivingLicenseUrl) updateData.driving_license_url = drivingLicenseUrl;

    const { error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE customer
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET bookings for a customer
router.get('/:id/bookings', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('customer_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json((data || []).map(mapBookingToResponse));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

async function uploadDoc(files: { [fieldname: string]: Express.Multer.File[] }, fieldName: string): Promise<string> {
  if (files?.[fieldName]?.[0]) {
    const f = files[fieldName][0];
    const fileName = `customers/docs/${uuidv4()}-${f.originalname}`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, f.buffer, {
        contentType: f.mimetype,
        upsert: false,
      });
    if (error) throw error;

    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    return data.publicUrl;
  }
  return '';
}

function mapCustomerToResponse(c: any) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    nicNumber: c.nic_number,
    nicFrontUrl: c.nic_front_url,
    nicBackUrl: c.nic_back_url,
    drivingLicenseUrl: c.driving_license_url,
    createdAt: c.created_at,
  };
}

function mapBookingToResponse(b: any) {
  return {
    id: b.id,
    customerId: b.customer_id,
    vehicleId: b.vehicle_id,
    startDate: b.start_date,
    endDate: b.end_date,
    startMeterReading: b.start_meter_reading,
    endMeterReading: b.end_meter_reading,
    totalKm: b.total_km,
    pricePerKm: b.price_per_km,
    pricePerDay: b.price_per_day,
    baseAmount: b.base_amount,
    discountAmount: b.discount_amount,
    finalAmount: b.final_amount,
    isOutsourced: b.is_outsourced,
    outsourcedPayment: b.outsourced_payment,
    commissionRate: b.commission_rate,
    status: b.status,
    invoiceUrl: b.invoice_url,
    notes: b.notes,
    createdAt: b.created_at,
  };
}

export default router;
