import { Router } from 'express';
import { db, storage } from '../config/firebase';
import { authMiddleware } from '../middleware/auth.middleware';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET all vehicles (public - for landing page filtering)
router.get('/', async (req, res) => {
  try {
    const snap = await db.collection('vehicles').orderBy('createdAt', 'desc').get();
    const vehicles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(vehicles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET only vehicles shown on landing page (public)
router.get('/landing', async (req, res) => {
  try {
    const snap = await db.collection('vehicles').where('showOnLanding', '==', true).get();
    const vehicles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(vehicles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single vehicle
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('vehicles').doc(String(req.params.id)).get();
    if (!doc.exists) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ id: doc.id, ...doc.data() });
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
      const bucket = storage.bucket();
      const fileName = `vehicles/${uuidv4()}-${req.file.originalname}`;
      const file = bucket.file(fileName);
      await file.save(req.file.buffer, { contentType: req.file.mimetype, public: true });
      imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    }

    const docRef = await db.collection('vehicles').add({
      name,
      type,
      plate,
      pricePerKm: Number(pricePerKm),
      pricePerDay: Number(pricePerDay),
      isOutsourced: isOutsourced === 'true',
      commissionRate: Number(commissionRate) || 10,
      lastMeterReading: Number(initialMeterReading) || 0,
      imageUrl,
      isAvailable: true,
      showOnLanding: false,
      createdAt: new Date(),
    });

    res.json({ id: docRef.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update vehicle (admin)
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const updateData: any = { ...req.body };
    if (req.body.pricePerKm) updateData.pricePerKm = Number(req.body.pricePerKm);
    if (req.body.pricePerDay) updateData.pricePerDay = Number(req.body.pricePerDay);
    if (req.body.commissionRate) updateData.commissionRate = Number(req.body.commissionRate);
    if (req.body.isOutsourced !== undefined) updateData.isOutsourced = req.body.isOutsourced === 'true';
    if (req.body.showOnLanding !== undefined) updateData.showOnLanding = req.body.showOnLanding === 'true';
    if (req.body.isAvailable !== undefined) updateData.isAvailable = req.body.isAvailable === 'true';

    if (req.file) {
      const bucket = storage.bucket();
      const fileName = `vehicles/${uuidv4()}-${req.file.originalname}`;
      const file = bucket.file(fileName);
      await file.save(req.file.buffer, { contentType: req.file.mimetype, public: true });
      updateData.imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    }

    await db.collection('vehicles').doc(String(req.params.id)).update(updateData);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE vehicle (admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await db.collection('vehicles').doc(String(req.params.id)).delete();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET meter readings for a vehicle
router.get('/:id/meter-readings', authMiddleware, async (req, res) => {
  try {
    const snap = await db.collection('meterReadings')
      .where('vehicleId', '==', String(req.params.id))
      .orderBy('recordedAt', 'desc')
      .limit(20)
      .get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
