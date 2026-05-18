import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// Verify admin token and return user info
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const token = authHeader.split('Bearer ')[1];
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: 'Invalid token' });
    res.json({ uid: data.user.id, email: data.user.email });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
