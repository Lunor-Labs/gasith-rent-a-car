import { Router } from 'express';
import { db } from '../config/firebase';
import { authMiddleware } from '../middleware/auth.middleware';
import { format } from 'date-fns';

const router = Router();

// GET all bookings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const base = db.collection('bookings').orderBy('createdAt', 'desc');
    const snap = await (limit ? base.limit(limit) : base).get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single booking
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await db.collection('bookings').doc(String(req.params.id)).get();
    if (!doc.exists) return res.status(404).json({ error: 'Booking not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create booking
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      customerId, vehicleId, startDate, endDate,
      startMeterReading, pricePerKm, pricePerDay,
      isOutsourced, outsourcedPayment, commissionRate, notes
    } = req.body;

    // Get vehicle's last meter reading
    const vehicleDoc = await db.collection('vehicles').doc(vehicleId).get();
    const vehicleData = vehicleDoc.data();

    const docRef = await db.collection('bookings').add({
      customerId, vehicleId,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      startMeterReading: Number(startMeterReading) || vehicleData?.lastMeterReading || 0,
      endMeterReading: null,
      totalKm: 0,
      pricePerKm: Number(pricePerKm) || vehicleData?.pricePerKm || 0,
      pricePerDay: Number(pricePerDay) || vehicleData?.pricePerDay || 0,
      baseAmount: 0,
      discountAmount: 0,
      finalAmount: 0,
      isOutsourced: Boolean(isOutsourced),
      outsourcedPayment: outsourcedPayment ? Number(outsourcedPayment) : null,
      commissionRate: Number(commissionRate) || 10,
      status: 'active',
      invoiceUrl: '',
      notes: notes || '',
      createdAt: new Date(),
    });

    // Mark vehicle as unavailable
    await db.collection('vehicles').doc(vehicleId).update({ isAvailable: false });

    // Record start meter reading
    await db.collection('meterReadings').add({
      vehicleId,
      bookingId: docRef.id,
      reading: Number(startMeterReading) || vehicleData?.lastMeterReading || 0,
      type: 'start',
      recordedAt: new Date(),
      recordedBy: (req as any).user?.uid || 'admin',
    });

    res.json({ id: docRef.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT complete/update booking - calc price from meter reading
router.put('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const {
      endMeterReading, discountAmount, endDate,
      outsourcedPayment, commissionRate
    } = req.body;

    const bookingDoc = await db.collection('bookings').doc(String(req.params.id)).get();
    if (!bookingDoc.exists) return res.status(404).json({ error: 'Booking not found' });
    const booking = bookingDoc.data()!;

    let finalAmount = 0;
    let totalKm = 0;
    let baseAmount = 0;

    if (booking.isOutsourced) {
      // Outsourced: just record payment and commission
      const payment = Number(outsourcedPayment) || 0;
      const commission = Number(commissionRate) || booking.commissionRate || 10;
      finalAmount = payment - (payment * commission / 100);
      baseAmount = payment;
    } else {
      const endReading = Number(endMeterReading);
      totalKm = endReading - booking.startMeterReading;
      baseAmount = totalKm * booking.pricePerKm;
      const discount = Number(discountAmount) || 0;
      finalAmount = baseAmount - discount;
    }

    const discount = Number(discountAmount) || 0;

    await db.collection('bookings').doc(String(req.params.id)).update({
      endMeterReading: booking.isOutsourced ? null : Number(endMeterReading),
      endDate: endDate ? new Date(endDate) : new Date(),
      totalKm,
      baseAmount,
      discountAmount: discount,
      finalAmount,
      outsourcedPayment: outsourcedPayment ? Number(outsourcedPayment) : booking.outsourcedPayment,
      commissionRate: Number(commissionRate) || booking.commissionRate,
      status: 'completed',
    });

    // Mark vehicle as available and update last meter
    await db.collection('vehicles').doc(booking.vehicleId).update({
      isAvailable: true,
      lastMeterReading: booking.isOutsourced ? booking.startMeterReading : Number(endMeterReading),
    });

    if (!booking.isOutsourced && endMeterReading) {
      await db.collection('meterReadings').add({
        vehicleId: booking.vehicleId,
        bookingId: String(req.params.id),
        reading: Number(endMeterReading),
        type: 'end',
        recordedAt: new Date(),
        recordedBy: (req as any).user?.uid || 'admin',
      });
    }

    // Update monthly revenue
    const monthKey = format(new Date(), 'yyyy-MM');
    const revRef = db.collection('revenue').doc(monthKey);
    const revDoc = await revRef.get();
    if (revDoc.exists) {
      await revRef.update({
        totalRevenue: (revDoc.data()!.totalRevenue || 0) + finalAmount,
        totalBookings: (revDoc.data()!.totalBookings || 0) + 1,
        totalKm: (revDoc.data()!.totalKm || 0) + totalKm,
        updatedAt: new Date(),
      });
    } else {
      await revRef.set({
        totalRevenue: finalAmount,
        totalBookings: 1,
        totalKm,
        updatedAt: new Date(),
      });
    }

    const updatedDoc = await db.collection('bookings').doc(String(req.params.id)).get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update booking (generic)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    await db.collection('bookings').doc(String(req.params.id)).update(req.body);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE booking
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await db.collection('bookings').doc(String(req.params.id)).get();
    if (doc.exists) {
      const data = doc.data()!;
      await db.collection('vehicles').doc(data.vehicleId).update({ isAvailable: true });
    }
    await db.collection('bookings').doc(String(req.params.id)).delete();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET revenue stats
router.get('/stats/revenue', authMiddleware, async (req, res) => {
  try {
    const snap = await db.collection('revenue').orderBy('__name__', 'desc').limit(12).get();
    res.json(snap.docs.map(d => ({ month: d.id, ...d.data() })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET dashboard stats
router.get('/stats/dashboard', authMiddleware, async (req, res) => {
  try {
    const monthKey = format(new Date(), 'yyyy-MM');
    const [activeSnap, totalSnap, customerSnap, vehicleSnap, revDoc] = await Promise.all([
      db.collection('bookings').where('status', '==', 'active').get(),
      db.collection('bookings').get(),
      db.collection('customers').get(),
      db.collection('vehicles').get(),
      db.collection('revenue').doc(monthKey).get(),
    ]);

    const monthRevenue = revDoc.exists ? revDoc.data()!.totalRevenue : 0;

    res.json({
      activeBookings: activeSnap.size,
      totalBookings: totalSnap.size,
      totalCustomers: customerSnap.size,
      totalVehicles: vehicleSnap.size,
      monthRevenue,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
