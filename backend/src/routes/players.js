import { Router } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();

// GET /api/players/:id - profile + derived career stats
router.get('/:id', async (req, res) => {
  const { data: player, error } = await supabase.from('player').select('*, team:team_id(name)').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: error.message });

  const { data: stats } = await supabase.from('player_stats').select('*').eq('player_id', req.params.id).single();

  res.json({ ...player, stats: stats || { goals: 0, assists: 0, penalties: 0, shots: 0, saves: 0 } });
});

router.post('/', async (req, res) => {
  const { team_id, name, jersey_number, position } = req.body;
  if (!team_id || !name) return res.status(400).json({ error: 'team_id and name are required' });
  const { data, error } = await supabase
    .from('player')
    .insert({ team_id, name, jersey_number, position })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

export default router;
