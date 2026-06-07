import { Router } from 'express';
import { supabase } from '../config/supabase';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json((data || []).map((t: any) => ({
      id:       t.id,
      title:    t.title,
      tag:      t.tag,
      tagLabel: t.tag_label,
      done:     t.done,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, tag, tagLabel } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'title required' });
    const { data, error } = await supabase
      .from('tasks')
      .insert({ title: title.trim(), tag, tag_label: tagLabel, done: false })
      .select()
      .single();
    if (error) throw error;
    res.json({ id: data.id, title: data.title, tag: data.tag, tagLabel: data.tag_label, done: data.done });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { data: task, error: fetchErr } = await supabase
      .from('tasks')
      .select('done')
      .eq('id', req.params.id)
      .single();
    if (fetchErr || !task) return res.status(404).json({ error: 'Task not found' });
    const { error } = await supabase
      .from('tasks')
      .update({ done: !task.done })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ done: !task.done });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
