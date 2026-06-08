import { Router } from 'express';
import axios from 'axios';
import { supabase } from '../config/supabase';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// GET reviews shown on homepage (public)
router.get('/public', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('show_on_homepage', true)
      .order('time', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET all cached reviews (admin)
router.get('/', authMiddleware, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('time', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST sync reviews from Google Places API (admin)
router.post('/sync', authMiddleware, async (_req, res) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID must be set in environment variables' });
  }

  try {
    const { data: placeData } = await axios.get(
      'https://maps.googleapis.com/maps/api/place/details/json',
      { params: { place_id: placeId, fields: 'reviews', key: apiKey, reviews_sort: 'newest' } }
    );

    if (placeData.status !== 'OK') {
      return res.status(502).json({ error: `Google Places API error: ${placeData.status}`, details: placeData.error_message });
    }

    const googleReviews: any[] = placeData.result?.reviews || [];
    if (googleReviews.length === 0) {
      return res.json({ synced: 0, message: 'No reviews found for this place' });
    }

    // Upsert all reviews; preserve show_on_homepage for existing rows
    const rows = googleReviews.map((r: any) => ({
      id: `${r.author_url ?? r.author_name}_${r.time}`.replace(/[^a-z0-9_]/gi, '_'),
      author_name: r.author_name,
      author_url: r.author_url ?? null,
      profile_photo_url: r.profile_photo_url ?? null,
      rating: r.rating,
      text: r.text,
      time: r.time,
      relative_time_description: r.relative_time_description ?? null,
      synced_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('reviews')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: false });

    if (error) throw error;
    res.json({ synced: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT toggle show_on_homepage for a review (admin)
router.put('/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('reviews')
      .select('show_on_homepage')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !existing) return res.status(404).json({ error: 'Review not found' });

    const { error } = await supabase
      .from('reviews')
      .update({ show_on_homepage: !existing.show_on_homepage })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ show_on_homepage: !existing.show_on_homepage });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
