import { Router } from 'express';
import { db, auth } from '../config/firebase';

const router = Router();

// Verify admin token and return user info
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await auth.verifyIdToken(token);
    res.json({ uid: decoded.uid, email: decoded.email });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
