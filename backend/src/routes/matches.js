import { Router } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();

// GET /api/matches?status=live
router.get('/', async (req, res) => {
  const { status, team } = req.query;
  let query = supabase.from('match').select('*, home_team:home_team_id(name), away_team:away_team_id(name)');
  if (status) query = query.eq('status', status);
  if (team) query = query.or(`home_team_id.eq.${team},away_team_id.eq.${team}`);

  const { data, error } = await query.order('scheduled_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/matches/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('match')
    .select('*, home_team:home_team_id(name), away_team:away_team_id(name)')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

// POST /api/matches
router.post('/', async (req, res) => {
  const { home_team_id, away_team_id, scheduled_at } = req.body;
  if (!home_team_id || !away_team_id) {
    return res.status(400).json({ error: 'home_team_id and away_team_id are required' });
  }
  const { data, error } = await supabase
    .from('match')
    .insert({ home_team_id, away_team_id, scheduled_at, status: 'scheduled' })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH /api/matches/:id
router.patch('/:id', async (req, res) => {
  const updates = req.body;
  const { data, error } = await supabase
    .from('match')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
