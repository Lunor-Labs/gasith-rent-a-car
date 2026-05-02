import { Router } from 'express';
import { db, storage } from '../config/firebase';
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
    const snap = await db.collection('customers').orderBy('createdAt', 'desc').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single customer
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await db.collection('customers').doc(String(req.params.id)).get();
    if (!doc.exists) return res.status(404).json({ error: 'Customer not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create customer
router.post('/', authMiddleware, docFields, async (req, res) => {
  try {
    const { name, phone, email, address, nicNumber } = req.body;
    const bucket = storage.bucket();
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    async function uploadDoc(fieldName: string) {
      if (files?.[fieldName]?.[0]) {
        const f = files[fieldName][0];
        const fileName = `customers/docs/${uuidv4()}-${f.originalname}`;
        const fileRef = bucket.file(fileName);
        await fileRef.save(f.buffer, { contentType: f.mimetype, public: true });
        return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      }
      return '';
    }

    const [nicFrontUrl, nicBackUrl, drivingLicenseUrl] = await Promise.all([
      uploadDoc('nicFront'),
      uploadDoc('nicBack'),
      uploadDoc('drivingLicense'),
    ]);

    const docRef = await db.collection('customers').add({
      name, phone, email, address, nicNumber,
      nicFrontUrl, nicBackUrl, drivingLicenseUrl,
      createdAt: new Date(),
    });

    res.json({ id: docRef.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update customer
router.put('/:id', authMiddleware, docFields, async (req, res) => {
  try {
    const { name, phone, email, address, nicNumber } = req.body;
    const bucket = storage.bucket();
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const updateData: any = { name, phone, email, address, nicNumber };

    async function uploadDoc(fieldName: string) {
      if (files?.[fieldName]?.[0]) {
        const f = files[fieldName][0];
        const fileName = `customers/docs/${uuidv4()}-${f.originalname}`;
        const fileRef = bucket.file(fileName);
        await fileRef.save(f.buffer, { contentType: f.mimetype, public: true });
        return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      }
      return null;
    }

    const [nicFrontUrl, nicBackUrl, drivingLicenseUrl] = await Promise.all([
      uploadDoc('nicFront'), uploadDoc('nicBack'), uploadDoc('drivingLicense'),
    ]);
    if (nicFrontUrl) updateData.nicFrontUrl = nicFrontUrl;
    if (nicBackUrl) updateData.nicBackUrl = nicBackUrl;
    if (drivingLicenseUrl) updateData.drivingLicenseUrl = drivingLicenseUrl;

    await db.collection('customers').doc(String(req.params.id)).update(updateData);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE customer
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await db.collection('customers').doc(String(req.params.id)).delete();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET bookings for a customer
router.get('/:id/bookings', authMiddleware, async (req, res) => {
  try {
    const snap = await db.collection('bookings')
      .where('customerId', '==', String(req.params.id))
      .orderBy('createdAt', 'desc')
      .get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
