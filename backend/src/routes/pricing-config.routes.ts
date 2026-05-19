import { Router } from 'express';
import { supabase } from '../config/supabase';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('pricing_config')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) throw error;
    res.json({
      firstDayFreeKm: data.first_day_free_km,
      subsequentDayFreeKm: data.subsequent_day_free_km,
      updatedAt: data.updated_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', authMiddleware, async (req, res) => {
  try {
    const { firstDayFreeKm, subsequentDayFreeKm } = req.body;
    if (Number(firstDayFreeKm) <= 0 || Number(subsequentDayFreeKm) <= 0) {
      return res.status(400).json({ error: 'Free KM values must be positive' });
    }
    const { error } = await supabase
      .from('pricing_config')
      .update({
        first_day_free_km: Number(firstDayFreeKm),
        subsequent_day_free_km: Number(subsequentDayFreeKm),
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
