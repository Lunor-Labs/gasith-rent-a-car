import { Router } from 'express';
import { supabase } from '../config/supabase';
import { authMiddleware } from '../middleware/auth.middleware';
import { format } from 'date-fns';

const router = Router();

// GET all bookings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    let query = supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    res.json((data || []).map(mapBookingToResponse));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET dashboard stats — must be before /:id to avoid route conflict
router.get('/stats/dashboard', authMiddleware, async (req, res) => {
  try {
    const monthKey = format(new Date(), 'yyyy-MM');

    const [activeRes, totalRes, customerRes, vehicleRes, revRes] = await Promise.all([
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('bookings').select('id', { count: 'exact', head: true }),
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('vehicles').select('id', { count: 'exact', head: true }),
      supabase.from('revenue').select('*').eq('month', monthKey).single(),
    ]);

    const monthRevenue = revRes.data?.total_revenue || 0;

    res.json({
      activeBookings: activeRes.count || 0,
      totalBookings: totalRes.count || 0,
      totalCustomers: customerRes.count || 0,
      totalVehicles: vehicleRes.count || 0,
      monthRevenue,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET revenue stats — must be before /:id to avoid route conflict
router.get('/stats/revenue', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('revenue')
      .select('*')
      .order('month', { ascending: false })
      .limit(12);

    if (error) throw error;
    res.json((data || []).map(r => ({
      month: r.month,
      totalRevenue: r.total_revenue,
      totalBookings: r.total_bookings,
      totalKm: r.total_km,
      updatedAt: r.updated_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single booking
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ error: 'Booking not found' });
    res.json(mapBookingToResponse(data));
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
    const { data: vehicleData } = await supabase
      .from('vehicles')
      .select('last_meter_reading, price_per_km, price_per_day')
      .eq('id', vehicleId)
      .single();

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        customer_id: customerId,
        vehicle_id: vehicleId,
        start_date: new Date(startDate).toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
        start_meter_reading: Number(startMeterReading) || vehicleData?.last_meter_reading || 0,
        end_meter_reading: null,
        total_km: 0,
        price_per_km: Number(pricePerKm) || vehicleData?.price_per_km || 0,
        price_per_day: Number(pricePerDay) || vehicleData?.price_per_day || 0,
        base_amount: 0,
        discount_amount: 0,
        final_amount: 0,
        is_outsourced: Boolean(isOutsourced),
        outsourced_payment: outsourcedPayment ? Number(outsourcedPayment) : null,
        commission_rate: Number(commissionRate) || 10,
        status: 'active',
        invoice_url: '',
        notes: notes || '',
      })
      .select()
      .single();

    if (error) throw error;

    // Mark vehicle as unavailable
    await supabase
      .from('vehicles')
      .update({ is_available: false })
      .eq('id', vehicleId);

    // Record start meter reading
    await supabase
      .from('meter_readings')
      .insert({
        vehicle_id: vehicleId,
        booking_id: data.id,
        reading: Number(startMeterReading) || vehicleData?.last_meter_reading || 0,
        type: 'start',
        recorded_by: (req as any).user?.id || 'admin',
      });

    res.json({ id: data.id });
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

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !booking) return res.status(404).json({ error: 'Booking not found' });

    let finalAmount = 0;
    let totalKm = 0;
    let baseAmount = 0;

    if (booking.is_outsourced) {
      // Outsourced: just record payment and commission
      const payment = Number(outsourcedPayment) || 0;
      const commission = Number(commissionRate) || booking.commission_rate || 10;
      finalAmount = payment - (payment * commission / 100);
      baseAmount = payment;
    } else {
      const endReading = Number(endMeterReading);
      totalKm = endReading - booking.start_meter_reading;
      baseAmount = totalKm * booking.price_per_km;
      const discount = Number(discountAmount) || 0;
      finalAmount = baseAmount - discount;
    }

    const discount = Number(discountAmount) || 0;

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        end_meter_reading: booking.is_outsourced ? null : Number(endMeterReading),
        end_date: endDate ? new Date(endDate).toISOString() : new Date().toISOString(),
        total_km: totalKm,
        base_amount: baseAmount,
        discount_amount: discount,
        final_amount: finalAmount,
        outsourced_payment: outsourcedPayment ? Number(outsourcedPayment) : booking.outsourced_payment,
        commission_rate: Number(commissionRate) || booking.commission_rate,
        status: 'completed',
      })
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    // Mark vehicle as available and update last meter
    await supabase
      .from('vehicles')
      .update({
        is_available: true,
        last_meter_reading: booking.is_outsourced ? booking.start_meter_reading : Number(endMeterReading),
      })
      .eq('id', booking.vehicle_id);

    if (!booking.is_outsourced && endMeterReading) {
      await supabase
        .from('meter_readings')
        .insert({
          vehicle_id: booking.vehicle_id,
          booking_id: req.params.id,
          reading: Number(endMeterReading),
          type: 'end',
          recorded_by: (req as any).user?.id || 'admin',
        });
    }

    // Update monthly revenue (upsert)
    const monthKey = format(new Date(), 'yyyy-MM');
    const { data: revDoc } = await supabase
      .from('revenue')
      .select('*')
      .eq('month', monthKey)
      .single();

    if (revDoc) {
      await supabase
        .from('revenue')
        .update({
          total_revenue: (revDoc.total_revenue || 0) + finalAmount,
          total_bookings: (revDoc.total_bookings || 0) + 1,
          total_km: (revDoc.total_km || 0) + totalKm,
          updated_at: new Date().toISOString(),
        })
        .eq('month', monthKey);
    } else {
      await supabase
        .from('revenue')
        .insert({
          month: monthKey,
          total_revenue: finalAmount,
          total_bookings: 1,
          total_km: totalKm,
        });
    }

    const { data: updatedBooking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', req.params.id)
      .single();

    res.json(mapBookingToResponse(updatedBooking));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update booking (generic)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    // Map any camelCase fields from frontend to snake_case for DB
    const updateData: any = {};
    const fieldMap: Record<string, string> = {
      customerId: 'customer_id',
      vehicleId: 'vehicle_id',
      startDate: 'start_date',
      endDate: 'end_date',
      startMeterReading: 'start_meter_reading',
      endMeterReading: 'end_meter_reading',
      totalKm: 'total_km',
      pricePerKm: 'price_per_km',
      pricePerDay: 'price_per_day',
      baseAmount: 'base_amount',
      discountAmount: 'discount_amount',
      finalAmount: 'final_amount',
      isOutsourced: 'is_outsourced',
      outsourcedPayment: 'outsourced_payment',
      commissionRate: 'commission_rate',
      invoiceUrl: 'invoice_url',
    };

    for (const [key, value] of Object.entries(req.body)) {
      const dbKey = fieldMap[key] || key;
      updateData[dbKey] = value;
    }

    const { error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE booking
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Get the booking to find the vehicle
    const { data: booking } = await supabase
      .from('bookings')
      .select('vehicle_id')
      .eq('id', req.params.id)
      .single();

    if (booking) {
      await supabase
        .from('vehicles')
        .update({ is_available: true })
        .eq('id', booking.vehicle_id);
    }

    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapBookingToResponse(b: any) {
  if (!b) return null;
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
