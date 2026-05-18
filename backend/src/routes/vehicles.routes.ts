import { Router } from 'express';
import { supabase, STORAGE_BUCKET } from '../config/supabase';
import { authMiddleware } from '../middleware/auth.middleware';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET all vehicles (public - for landing page filtering)
router.get('/', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    let query = supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });

    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;

    // Map snake_case DB fields to camelCase for frontend compatibility
    res.json((data || []).map(mapVehicleToResponse));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET only vehicles shown on landing page (public)
router.get('/landing', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('show_on_landing', true);

    if (error) throw error;
    res.json((data || []).map(mapVehicleToResponse));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single vehicle
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(mapVehicleToResponse(data));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create vehicle (admin)
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, type, plate, pricePerKm, pricePerDay, isOutsourced, commissionRate, initialMeterReading } = req.body;
    let imageUrl = '';

    if (req.file) {
      imageUrl = await uploadFile('vehicles', req.file);
    }

    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        name,
        type,
        plate,
        price_per_km: Number(pricePerKm),
        price_per_day: Number(pricePerDay),
        is_outsourced: isOutsourced === 'true',
        commission_rate: isOutsourced === 'true' ? (Number(commissionRate) || 10) : 0,
        last_meter_reading: Number(initialMeterReading) || 0,
        image_url: imageUrl,
        is_available: true,
        show_on_landing: false,
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ id: data.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update vehicle (admin)
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const updateData: any = {};

    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.type !== undefined) updateData.type = req.body.type;
    if (req.body.plate !== undefined) updateData.plate = req.body.plate;
    if (req.body.pricePerKm) updateData.price_per_km = Number(req.body.pricePerKm);
    if (req.body.pricePerDay) updateData.price_per_day = Number(req.body.pricePerDay);
    if (req.body.isOutsourced !== undefined) {
      const isOutsourced = req.body.isOutsourced === 'true';
      updateData.is_outsourced = isOutsourced;
      // Only store commission for outsourced vehicles, reset to 0 for own vehicles
      if (isOutsourced) {
        updateData.commission_rate = Number(req.body.commissionRate) || 10;
      } else {
        updateData.commission_rate = 0;
      }
    } else if (req.body.commissionRate) {
      updateData.commission_rate = Number(req.body.commissionRate);
    }
    if (req.body.showOnLanding !== undefined) updateData.show_on_landing = req.body.showOnLanding === 'true';
    if (req.body.isAvailable !== undefined) updateData.is_available = req.body.isAvailable === 'true';

    if (req.file) {
      updateData.image_url = await uploadFile('vehicles', req.file);
    }

    const { error } = await supabase
      .from('vehicles')
      .update(updateData)
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE vehicle (admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET meter readings for a vehicle
router.get('/:id/meter-readings', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('meter_readings')
      .select('*')
      .eq('vehicle_id', req.params.id)
      .order('recorded_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json((data || []).map(r => ({
      id: r.id,
      vehicleId: r.vehicle_id,
      bookingId: r.booking_id,
      reading: r.reading,
      type: r.type,
      recordedAt: r.recorded_at,
      recordedBy: r.recorded_by,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

async function uploadFile(folder: string, file: Express.Multer.File): Promise<string> {
  const fileName = `${folder}/${uuidv4()}-${file.originalname}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
  if (error) throw error;

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(fileName);

  return data.publicUrl;
}

function mapVehicleToResponse(v: any) {
  return {
    id: v.id,
    name: v.name,
    type: v.type,
    plate: v.plate,
    pricePerKm: v.price_per_km,
    pricePerDay: v.price_per_day,
    isOutsourced: v.is_outsourced,
    commissionRate: v.commission_rate,
    lastMeterReading: v.last_meter_reading,
    imageUrl: v.image_url,
    isAvailable: v.is_available,
    showOnLanding: v.show_on_landing,
    createdAt: v.created_at,
  };
}

export default router;
