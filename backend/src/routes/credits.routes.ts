import { Router } from 'express';
import { supabase } from '../config/supabase';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// GET /api/credits — list of customers with outstanding credit balance > 0
router.get('/', authMiddleware, async (_req, res) => {
  try {
    const [bookingsRes, paymentsRes, customersRes] = await Promise.all([
      supabase
        .from('bookings')
        .select('customer_id, credit_amount, end_date, created_at')
        .gt('credit_amount', 0),
      supabase
        .from('credit_payments')
        .select('customer_id, amount, paid_at'),
      supabase
        .from('customers')
        .select('id, name, phone, email, is_active'),
    ]);

    if (bookingsRes.error) throw bookingsRes.error;
    if (paymentsRes.error) throw paymentsRes.error;
    if (customersRes.error) throw customersRes.error;

    const customerMap = new Map<string, any>();
    for (const c of customersRes.data || []) customerMap.set(c.id, c);

    const aggregates = new Map<string, { totalCredit: number; totalPaid: number; lastActivity: string | null }>();
    const touch = (id: string) => {
      if (!aggregates.has(id)) aggregates.set(id, { totalCredit: 0, totalPaid: 0, lastActivity: null });
      return aggregates.get(id)!;
    };
    const bumpActivity = (agg: { lastActivity: string | null }, ts: string | null) => {
      if (!ts) return;
      if (!agg.lastActivity || new Date(ts) > new Date(agg.lastActivity)) agg.lastActivity = ts;
    };

    for (const b of bookingsRes.data || []) {
      if (!b.customer_id) continue;
      const agg = touch(b.customer_id);
      agg.totalCredit += Number(b.credit_amount) || 0;
      bumpActivity(agg, b.end_date || b.created_at);
    }
    for (const p of paymentsRes.data || []) {
      if (!p.customer_id) continue;
      const agg = touch(p.customer_id);
      agg.totalPaid += Number(p.amount) || 0;
      bumpActivity(agg, p.paid_at);
    }

    const rows = [...aggregates.entries()]
      .map(([customerId, agg]) => {
        const customer = customerMap.get(customerId);
        const balance = +(agg.totalCredit - agg.totalPaid).toFixed(2);
        return {
          customerId,
          customerName: customer?.name || 'Unknown',
          customerPhone: customer?.phone || '',
          customerEmail: customer?.email || '',
          totalCredit: +agg.totalCredit.toFixed(2),
          totalPaid: +agg.totalPaid.toFixed(2),
          balance,
          lastActivity: agg.lastActivity,
        };
      })
      .filter(r => r.balance > 0.009)
      .sort((a, b) => b.balance - a.balance);

    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/credits/:customerId — full credit detail for one customer
router.get('/:customerId', authMiddleware, async (req, res) => {
  try {
    const customerId = req.params.customerId;

    const [customerRes, bookingsRes, paymentsRes] = await Promise.all([
      supabase.from('customers').select('id, name, phone, email').eq('id', customerId).single(),
      supabase
        .from('bookings')
        .select('id, credit_amount, cash_amount, payment_method, final_amount, end_date, created_at, vehicle_id, status')
        .eq('customer_id', customerId)
        .gt('credit_amount', 0)
        .order('end_date', { ascending: false, nullsFirst: false }),
      supabase
        .from('credit_payments')
        .select('*')
        .eq('customer_id', customerId)
        .order('paid_at', { ascending: false }),
    ]);

    if (customerRes.error || !customerRes.data) return res.status(404).json({ error: 'Customer not found' });
    if (bookingsRes.error) throw bookingsRes.error;
    if (paymentsRes.error) throw paymentsRes.error;

    const vehicleIds = [...new Set((bookingsRes.data || []).map(b => b.vehicle_id).filter(Boolean))];
    let vehicleMap = new Map<string, any>();
    if (vehicleIds.length > 0) {
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, name, plate')
        .in('id', vehicleIds);
      for (const v of vehicles || []) vehicleMap.set(v.id, v);
    }

    const bookings = (bookingsRes.data || []).map(b => {
      const v = vehicleMap.get(b.vehicle_id);
      return {
        id: b.id,
        creditAmount: Number(b.credit_amount) || 0,
        cashAmount: Number(b.cash_amount) || 0,
        finalAmount: Number(b.final_amount) || 0,
        paymentMethod: b.payment_method,
        date: b.end_date || b.created_at,
        status: b.status,
        vehicleName: v?.name || '',
        vehiclePlate: v?.plate || '',
      };
    });

    const payments = (paymentsRes.data || []).map(p => ({
      id: p.id,
      amount: Number(p.amount) || 0,
      paidAt: p.paid_at,
      note: p.note,
      createdBy: p.created_by,
      createdAt: p.created_at,
    }));

    const totalCredit = bookings.reduce((s, b) => s + b.creditAmount, 0);
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const balance = +(totalCredit - totalPaid).toFixed(2);

    res.json({
      customer: {
        id: customerRes.data.id,
        name: customerRes.data.name,
        phone: customerRes.data.phone,
        email: customerRes.data.email,
      },
      totalCredit: +totalCredit.toFixed(2),
      totalPaid: +totalPaid.toFixed(2),
      balance,
      bookings,
      payments,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/credits/:customerId/payments — record a settlement payment
router.post('/:customerId/payments', authMiddleware, async (req, res) => {
  try {
    const { amount, paidAt, note } = req.body;
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const { data, error } = await supabase
      .from('credit_payments')
      .insert({
        customer_id: req.params.customerId,
        amount: numericAmount,
        paid_at: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
        note: note || null,
        created_by: (req as any).user?.email || (req as any).user?.id || 'admin',
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ id: data.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/credits/payments/:id — remove a settlement payment
router.delete('/payments/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('credit_payments')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
