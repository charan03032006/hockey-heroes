import { Router } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();

router.get('/:id', async (req, res) => {
  const { data: player, error } = await supabase.from('player').select('*, team:team_id(id,name,short_name)').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: error.message });

  const [{ data: stats }, { data: events, error: eventsError }] = await Promise.all([
    supabase.from('player_stats').select('*').eq('player_id', req.params.id).maybeSingle(),
    supabase.from('event').select('match_id,type,period,game_time,team_id,match:match_id(id,scheduled_at,status,home_team:home_team_id(id,name,short_name),away_team:away_team_id(id,name,short_name))').eq('player_id', req.params.id).order('created_at', { ascending: false }),
  ]);
  if (eventsError) return res.status(500).json({ error: eventsError.message });

  const rows = events || [];
  const derived = {
    matches: new Set(rows.map((e) => e.match_id)).size,
    goals: rows.filter((e) => e.type === 'goal').length,
    assists: rows.filter((e) => e.type === 'assist').length,
    penalties: rows.filter((e) => e.type === 'penalty_corner' || e.type === 'penalty_stroke').length,
    shots: rows.filter((e) => e.type === 'shot').length,
    saves: rows.filter((e) => e.type === 'save').length,
    cards: rows.filter((e) => e.type === 'card').length,
    substitutions: rows.filter((e) => e.type === 'substitution').length,
  };

  res.json({
    ...player,
    stats: { ...(stats || {}), ...derived },
    recent_events: rows.slice(0, 20),
    recent_matches: [...new Map(rows.filter((e) => e.match).map((e) => [e.match_id, e.match])).values()].slice(0, 10),
  });
});

router.post('/', async (req, res) => {
  const { team_id, name, jersey_number, position } = req.body;
  if (!team_id || !name?.trim()) return res.status(400).json({ error: 'team_id and name are required' });
  const { data, error } = await supabase.from('player').insert({ team_id, name: name.trim(), jersey_number, position }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

export default router;
