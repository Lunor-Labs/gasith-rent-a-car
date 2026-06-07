import { Router } from 'express';
import { supabase } from '../config/supabase';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// GET /reports/financial — monthly income breakdown, optionally filtered by date range
router.get('/financial', authMiddleware, async (req, res) => {
  try {
    const { from, to, vehicleId } = req.query;

    let query = supabase
      .from('bookings')
      .select('end_date, start_date, final_amount, commission_amount, is_outsourced')
      .eq('status', 'completed')
      .order('end_date', { ascending: false });

    if (from)      query = query.gte('end_date', from as string);
    if (to)        query = query.lte('end_date', `${to}T23:59:59`);
    if (vehicleId) query = query.eq('vehicle_id', vehicleId as string);

    const { data: bookings, error } = await query;
    if (error) throw error;

    const monthMap: Record<string, {
      month: string;
      ownedRevenue: number;
      commissionIncome: number;
      ownedBookings: number;
      outsourcedBookings: number;
    }> = {};

    for (const b of bookings || []) {
      const d = b.end_date || b.start_date;
      const month = d ? (d as string).slice(0, 7) : 'unknown';
      if (!monthMap[month]) {
        monthMap[month] = { month, ownedRevenue: 0, commissionIncome: 0, ownedBookings: 0, outsourcedBookings: 0 };
      }
      if (b.is_outsourced) {
        monthMap[month].commissionIncome += Number(b.commission_amount) || 0;
        monthMap[month].outsourcedBookings++;
      } else {
        monthMap[month].ownedRevenue += Number(b.final_amount) || 0;
        monthMap[month].ownedBookings++;
      }
    }

    const result = Object.values(monthMap)
      .map(m => ({
        ...m,
        totalAdminIncome: m.ownedRevenue + m.commissionIncome,
        totalBookings: m.ownedBookings + m.outsourcedBookings,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /reports/commissions — outsourced bookings with commission detail and paid status
router.get('/commissions', authMiddleware, async (req, res) => {
  try {
    const { from, to, vehicleId } = req.query;

    let query = supabase
      .from('bookings')
      .select('*, customers(name, phone), vehicles(name, plate)')
      .eq('status', 'completed')
      .eq('is_outsourced', true)
      .order('end_date', { ascending: false });

    if (from)      query = query.gte('end_date', from as string);
    if (to)        query = query.lte('end_date', `${to}T23:59:59`);
    if (vehicleId) query = query.eq('vehicle_id', vehicleId as string);

    const { data, error } = await query;
    if (error) throw error;

    res.json((data || []).map((b: any) => ({
      id: b.id,
      customerName: b.customers?.name || '—',
      customerPhone: b.customers?.phone || '',
      vehicleName: b.vehicles?.name || '—',
      vehiclePlate: b.vehicles?.plate || '',
      startDate: b.start_date,
      endDate: b.end_date,
      totalKm: b.total_km,
      tripPrice: b.final_amount,
      commissionAmount: b.commission_amount,
      netToOwner: Math.max(0, (b.final_amount || 0) - (b.commission_amount || 0)),
      commissionPaid: b.commission_paid || false,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /reports/commissions/:id/toggle-paid — toggle commission_paid on a booking
router.patch('/commissions/:id/toggle-paid', authMiddleware, async (req, res) => {
  try {
    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('commission_paid')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !booking) return res.status(404).json({ error: 'Booking not found' });

    const newValue = !booking.commission_paid;
    const { error } = await supabase
      .from('bookings')
      .update({ commission_paid: newValue })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ commissionPaid: newValue });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /reports/bookings — all completed bookings, filterable by date range
router.get('/bookings', authMiddleware, async (req, res) => {
  try {
    const { from, to, vehicleId } = req.query;

    let query = supabase
      .from('bookings')
      .select('*, customers(name, phone), vehicles(name, plate)')
      .eq('status', 'completed')
      .order('end_date', { ascending: false });

    if (from)      query = query.gte('end_date', from as string);
    if (to)        query = query.lte('end_date', `${to}T23:59:59`);
    if (vehicleId) query = query.eq('vehicle_id', vehicleId as string);

    const { data, error } = await query;
    if (error) throw error;

    res.json((data || []).map((b: any) => ({
      id: b.id,
      customerName: b.customers?.name || '—',
      vehicleName: b.vehicles?.name || '—',
      vehiclePlate: b.vehicles?.plate || '',
      isOutsourced: b.is_outsourced,
      startDate: b.start_date,
      endDate: b.end_date,
      totalKm: b.total_km,
      baseAmount: b.base_amount,
      discountAmount: b.discount_amount,
      finalAmount: b.final_amount,
      commissionAmount: b.commission_amount,
      adminIncome: b.is_outsourced ? (b.commission_amount || 0) : (b.final_amount || 0),
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /reports/vehicles — per-vehicle utilization and income stats, optionally filtered by date range
router.get('/vehicles', authMiddleware, async (req, res) => {
  try {
    const { from, to, vehicleId } = req.query;

    let vQuery = supabase
      .from('vehicles')
      .select('id, name, plate, is_outsourced')
      .order('name');

    if (vehicleId) vQuery = vQuery.eq('id', vehicleId as string);

    const { data: vehicles, error: vErr } = await vQuery;
    if (vErr) throw vErr;

    let bQuery = supabase
      .from('bookings')
      .select('vehicle_id, final_amount, commission_amount, total_km, is_outsourced, start_date, end_date')
      .eq('status', 'completed');

    if (from)      bQuery = bQuery.gte('end_date', from as string);
    if (to)        bQuery = bQuery.lte('end_date', `${to}T23:59:59`);
    if (vehicleId) bQuery = bQuery.eq('vehicle_id', vehicleId as string);

    const { data: bookings, error: bErr } = await bQuery;
    if (bErr) throw bErr;

    const stats = (vehicles || []).map(v => {
      const vBookings = (bookings || []).filter(b => b.vehicle_id === v.id);
      const totalKm = vBookings.reduce((s, b) => s + (b.total_km || 0), 0);
      const adminIncome = vBookings.reduce(
        (s, b) => s + (b.is_outsourced ? (b.commission_amount || 0) : (b.final_amount || 0)), 0
      );
      const totalRevenue = vBookings.reduce((s, b) => s + (b.final_amount || 0), 0);

      const daysRented = vBookings.reduce((s, b) => {
        if (!b.start_date || !b.end_date) return s;
        return s + Math.max(1, Math.ceil(
          (new Date(b.end_date).getTime() - new Date(b.start_date).getTime()) / (1000 * 60 * 60 * 24)
        ));
      }, 0);

      return {
        id: v.id,
        name: v.name,
        plate: v.plate,
        isOutsourced: v.is_outsourced,
        totalBookings: vBookings.length,
        daysRented,
        totalKm,
        totalRevenue,
        adminIncome,
        netToOwner: v.is_outsourced ? Math.max(0, totalRevenue - adminIncome) : 0,
      };
    });

    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
