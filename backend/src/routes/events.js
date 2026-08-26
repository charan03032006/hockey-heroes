import { Router } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();

// GET /api/matches/:matchId/events
router.get('/matches/:matchId/events', async (req, res) => {
  const { data, error } = await supabase
    .from('event')
    .select('*, player:player_id(name, jersey_number)')
    .eq('match_id', req.params.matchId)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/matches/:matchId/events
router.post('/matches/:matchId/events', async (req, res) => {
  const { player_id, team_id, type, period, game_time, x, y, penalty_minutes } = req.body;
  const validTypes = ['goal', 'assist', 'penalty', 'shot', 'save'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `type must be one of ${validTypes.join(', ')}` });
  }

  const { data: event, error } = await supabase
    .from('event')
    .insert({
      match_id: req.params.matchId,
      player_id,
      team_id,
      type,
      period,
      game_time,
      x,
      y,
      penalty_minutes,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });

  // Bump the scoreboard if it's a goal
  if (type === 'goal') {
    const { data: match } = await supabase.from('match').select('*').eq('id', req.params.matchId).single();
    if (match) {
      const field = team_id === match.home_team_id ? 'home_score' : 'away_score';
      await supabase
        .from('match')
        .update({ [field]: match[field] + 1 })
        .eq('id', req.params.matchId);
    }
  }

  res.status(201).json(event);
});

// DELETE /api/events/:id  (undo)
router.delete('/events/:id', async (req, res) => {
  const { data: event } = await supabase.from('event').select('*').eq('id', req.params.id).single();
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const { error } = await supabase.from('event').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });

  // Roll back the scoreboard if it was a goal
  if (event.type === 'goal') {
    const { data: match } = await supabase.from('match').select('*').eq('id', event.match_id).single();
    if (match) {
      const field = event.team_id === match.home_team_id ? 'home_score' : 'away_score';
      await supabase
        .from('match')
        .update({ [field]: Math.max(0, match[field] - 1) })
        .eq('id', event.match_id);
    }
  }

  res.status(204).send();
});

export default router;
