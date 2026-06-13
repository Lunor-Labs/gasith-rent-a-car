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
    const { range } = req.query;

    if (range === '7d') {
      const from = new Date();
      from.setDate(from.getDate() - 6);
      const fromStr = from.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('bookings')
        .select('end_date, final_amount, commission_amount, is_outsourced')
        .eq('status', 'completed')
        .gte('end_date', fromStr);

      if (error) throw error;

      const days: Record<string, { period: string; totalRevenue: number; totalBookings: number }> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const s = d.toISOString().slice(0, 10);
        days[s] = { period: s, totalRevenue: 0, totalBookings: 0 };
      }
      for (const b of data || []) {
        const s = (b.end_date as string).slice(0, 10);
        if (days[s]) {
          const income = b.is_outsourced ? (b.commission_amount || 0) : (b.final_amount || 0);
          days[s].totalRevenue += income;
          days[s].totalBookings++;
        }
      }
      return res.json(Object.values(days));
    }

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
      freeKm, firstDayFreeKm, subsequentDayFreeKm,
      isOutsourced, outsourcedPayment,
      commissionRate, notes,
    } = req.body;

    const { data: vehicleData } = await supabase
      .from('vehicles')
      .select('last_meter_reading, price_per_km, price_per_day')
      .eq('id', vehicleId)
      .single();

    const defaultPricePerDay = vehicleData?.price_per_day || 0;
    const effectivePricePerDay = Number(pricePerDay) || defaultPricePerDay;

    // Resolve free_km — use per-booking rate overrides if provided, else global config
    let resolvedFreeKm: number | null = null;
    if (freeKm != null && freeKm !== '') {
      resolvedFreeKm = Number(freeKm);
    } else if (startDate && endDate) {
      const { data: config } = await supabase
        .from('pricing_config')
        .select('first_day_free_km, subsequent_day_free_km')
        .eq('id', 1)
        .single();
      if (config) {
        const d1 = firstDayFreeKm != null && firstDayFreeKm !== '' ? Number(firstDayFreeKm) : config.first_day_free_km;
        const sub = subsequentDayFreeKm != null && subsequentDayFreeKm !== '' ? Number(subsequentDayFreeKm) : config.subsequent_day_free_km;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        resolvedFreeKm = d1 + (days - 1) * sub;
      }
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        customer_id: customerId,
        vehicle_id: vehicleId,
        start_date: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
        start_meter_reading: Number(startMeterReading) || vehicleData?.last_meter_reading || 0,
        end_meter_reading: null,
        total_km: 0,
        price_per_km: Number(pricePerKm) || vehicleData?.price_per_km || 0,
        price_per_day: effectivePricePerDay,
        default_price_per_day: defaultPricePerDay,
        billing_mode: 'per_day',
        free_km: resolvedFreeKm,
        booking_first_day_free_km: firstDayFreeKm != null && firstDayFreeKm !== '' ? Number(firstDayFreeKm) : null,
        booking_subsequent_day_free_km: subsequentDayFreeKm != null && subsequentDayFreeKm !== '' ? Number(subsequentDayFreeKm) : null,
        extra_km: 0,
        extra_km_charge: 0,
        base_amount: 0,
        discount_amount: 0,
        final_amount: 0,
        is_outsourced: Boolean(isOutsourced),
        outsourced_payment: outsourcedPayment ? Number(outsourcedPayment) : null,
        commission_rate: Boolean(isOutsourced) ? (Number(commissionRate) || 10) : 0,
        status: 'active',
        invoice_url: '',
        notes: notes || '',
      })
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from('vehicles')
      .update({ is_available: false })
      .eq('id', vehicleId);

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
      endMeterReading, endDate,
      dueDate, actualReturnDate,
      paymentMethod, cashAmount, creditAmount,
      commissionAmount, freeKm, additionalDiscount,
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
    let computedDiscount = 0;
    let extraKm = 0;
    let extraKmCharge = 0;
    let resolvedFreeKm: number | null = null;
    let computedDefaultFreeKm: number | null = null;
    let resolvedCommissionAmount = 0;

    // Same pricing logic for owned and outsourced vehicles
    const { data: config } = await supabase
      .from('pricing_config')
      .select('first_day_free_km, subsequent_day_free_km')
      .eq('id', 1)
      .single();

    const start = new Date(booking.start_date);
    // Use due date for billing calculation; fall back to endDate or today
    const billingEnd = dueDate ? new Date(dueDate) : (endDate ? new Date(endDate) : new Date());
    const days = Math.max(1, Math.ceil((billingEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // Outsourced vehicles: meter reading is optional — 0 KM if not provided
    const endReading = endMeterReading ? Number(endMeterReading) : null;
    totalKm = endReading != null ? Math.max(0, endReading - (booking.start_meter_reading || 0)) : 0;

    computedDefaultFreeKm = config
      ? config.first_day_free_km + (days - 1) * config.subsequent_day_free_km
      : (booking.free_km ?? 150);

    // Per-booking rate overrides → used to recompute effective free KM for this booking
    const bookingD1 = booking.booking_first_day_free_km;
    const bookingSubseq = booking.booking_subsequent_day_free_km;
    const autoFreeKm = (bookingD1 != null || bookingSubseq != null)
      ? (bookingD1 ?? (config?.first_day_free_km ?? 150)) + (days - 1) * (bookingSubseq ?? (config?.subsequent_day_free_km ?? 100))
      : computedDefaultFreeKm;

    // Priority: completion-time manual override → auto-computed from booking rates + actual days
    resolvedFreeKm = freeKm != null && freeKm !== ''
      ? Number(freeKm)
      : autoFreeKm;

    const defaultPricePerDay = booking.default_price_per_day || booking.price_per_day || 0;
    const pricePerDay = booking.price_per_day || 0;
    const pricePerKm = booking.price_per_km || 0;

    extraKm = Math.max(0, totalKm - resolvedFreeKm);
    extraKmCharge = extraKm * pricePerKm;

    const defaultExtraKm = Math.max(0, totalKm - computedDefaultFreeKm);
    const defaultExtraKmCharge = defaultExtraKm * pricePerKm;
    baseAmount = days * defaultPricePerDay + defaultExtraKmCharge;

    const rateDiscount = (defaultPricePerDay - pricePerDay) * days;
    const kmDiscount = defaultExtraKmCharge - extraKmCharge;
    const extraDiscount = Number(additionalDiscount) || 0;
    computedDiscount = Math.max(0, rateDiscount + kmDiscount) + extraDiscount;

    finalAmount = Math.max(0, baseAmount - computedDiscount);

    // Commission on top of computed trip price for outsourced vehicles
    if (booking.is_outsourced) {
      const defaultCommission = finalAmount < 5000 ? 500 : Math.round(finalAmount * 0.10);
      resolvedCommissionAmount = commissionAmount != null && commissionAmount !== ''
        ? Number(commissionAmount)
        : defaultCommission;
    }

    // Resolve payment method fields
    const resolvedPaymentMethod = paymentMethod || 'cash';
    let resolvedCashAmount: number | null = null;
    let resolvedCreditAmount: number | null = null;
    if (resolvedPaymentMethod === 'cash') {
      resolvedCashAmount = finalAmount;
      resolvedCreditAmount = null;
    } else if (resolvedPaymentMethod === 'credit') {
      resolvedCashAmount = null;
      resolvedCreditAmount = finalAmount;
    } else if (resolvedPaymentMethod === 'mixed') {
      resolvedCashAmount = Number(cashAmount) || 0;
      resolvedCreditAmount = Number(creditAmount) || 0;
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        end_meter_reading: endReading,
        end_date: endDate ? new Date(endDate).toISOString() : new Date().toISOString(),
        due_date: dueDate ? new Date(dueDate).toISOString() : (endDate ? new Date(endDate).toISOString() : new Date().toISOString()),
        actual_return_date: actualReturnDate ? new Date(actualReturnDate).toISOString() : new Date().toISOString(),
        total_km: totalKm,
        base_amount: baseAmount,
        discount_amount: computedDiscount,
        additional_discount: Number(additionalDiscount) || 0,
        final_amount: finalAmount,
        extra_km: extraKm,
        extra_km_charge: extraKmCharge,
        default_free_km: computedDefaultFreeKm,
        free_km: resolvedFreeKm,
        outsourced_payment: booking.is_outsourced ? finalAmount : booking.outsourced_payment,
        commission_amount: booking.is_outsourced ? resolvedCommissionAmount : null,
        payment_method: resolvedPaymentMethod,
        cash_amount: resolvedCashAmount,
        credit_amount: resolvedCreditAmount,
        status: 'completed',
      })
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    await supabase
      .from('vehicles')
      .update({
        is_available: true,
        last_meter_reading: endReading ?? booking.start_meter_reading,
      })
      .eq('id', booking.vehicle_id);

    if (endReading != null) {
      await supabase
        .from('meter_readings')
        .insert({
          vehicle_id: booking.vehicle_id,
          booking_id: req.params.id,
          reading: endReading,
          type: 'end',
          recorded_by: (req as any).user?.id || 'admin',
        });
    }

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
      billingMode: 'billing_mode',
      baseAmount: 'base_amount',
      discountAmount: 'discount_amount',
      finalAmount: 'final_amount',
      isOutsourced: 'is_outsourced',
      outsourcedPayment: 'outsourced_payment',
      commissionRate: 'commission_rate',
      invoiceUrl: 'invoice_url',
      dueDate: 'due_date',
      actualReturnDate: 'actual_return_date',
      paymentMethod: 'payment_method',
      cashAmount: 'cash_amount',
      creditAmount: 'credit_amount',
      withDriver: 'with_driver',
      driverFee: 'driver_fee',
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
    defaultPricePerDay: b.default_price_per_day,
    billingMode: b.billing_mode || 'per_km',
    defaultFreeKm: b.default_free_km,
    freeKm: b.free_km,
    bookingFirstDayFreeKm: b.booking_first_day_free_km,
    bookingSubsequentDayFreeKm: b.booking_subsequent_day_free_km,
    extraKm: b.extra_km,
    extraKmCharge: b.extra_km_charge,
    baseAmount: b.base_amount,
    discountAmount: b.discount_amount,
    additionalDiscount: b.additional_discount,
    finalAmount: b.final_amount,
    isOutsourced: b.is_outsourced,
    outsourcedPayment: b.outsourced_payment,
    commissionRate: b.commission_rate,
    commissionAmount: b.commission_amount,
    status: b.status,
    invoiceUrl: b.invoice_url,
    notes: b.notes,
    dueDate: b.due_date,
    actualReturnDate: b.actual_return_date,
    paymentMethod: b.payment_method,
    cashAmount: b.cash_amount,
    creditAmount: b.credit_amount,
    withDriver: b.with_driver,
    driverFee: b.driver_fee,
    createdAt: b.created_at,
  };
}

export default router;
