import { Router } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('team').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/:id', async (req, res) => {
  const { data: team, error } = await supabase.from('team').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: error.message });

  const { data: roster } = await supabase.from('player').select('*').eq('team_id', req.params.id);
  const { data: matches } = await supabase
    .from('match')
    .select('*')
    .or(`home_team_id.eq.${req.params.id},away_team_id.eq.${req.params.id}`)
    .order('scheduled_at', { ascending: false });

  res.json({ ...team, roster, matches });
});

router.post('/', async (req, res) => {
  const { name, short_name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const { data, error } = await supabase.from('team').insert({ name, short_name }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

export default router;
