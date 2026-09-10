import { Router } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();
const TYPES = ['goal', 'assist', 'penalty_corner', 'penalty_stroke', 'card', 'substitution', 'shot', 'save'];
const CARDS = ['green', 'yellow', 'red'];

router.get('/matches/:matchId/events', async (req, res) => {
  const { data, error } = await supabase
    .from('event')
    .select('*, player:player_id(name, jersey_number), related_player:related_player_id(name, jersey_number)')
    .eq('match_id', req.params.matchId)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/matches/:matchId/events', async (req, res) => {
  const { player_id, team_id, type, period, game_time, x, y, penalty_minutes, outcome, related_player_id, card_type, substitution_in, substitution_out } = req.body;
  if (!TYPES.includes(type)) return res.status(400).json({ error: `type must be one of ${TYPES.join(', ')}` });
  if (!team_id) return res.status(400).json({ error: 'A team is required for every match event.' });
  if (!Number.isInteger(Number(period)) || Number(period) < 1 || Number(period) > 4) return res.status(400).json({ error: 'period must be 1, 2, 3 or 4.' });
  if (type === 'goal' && !player_id) return res.status(400).json({ error: 'A goal must be assigned to a player.' });
  if (type === 'card' && !CARDS.includes(card_type)) return res.status(400).json({ error: 'Card must be green, yellow or red.' });

  const { data: match, error: matchError } = await supabase.from('match').select('id,home_team_id,away_team_id,status,current_period,clock_seconds').eq('id', req.params.matchId).single();
  if (matchError || !match) return res.status(404).json({ error: 'Match not found.' });
  if (match.status !== 'live') return res.status(400).json({ error: 'Match events can only be recorded while the match is live.' });
  if (Number(period) !== Number(match.current_period)) return res.status(400).json({ error: `The match is currently in period ${match.current_period}.` });
  if (![match.home_team_id, match.away_team_id].includes(team_id)) return res.status(400).json({ error: 'Event team must be one of the teams in this match.' });

  const ids = [player_id, related_player_id].filter(Boolean);
  if (ids.length) {
    const { data: players, error: playerError } = await supabase.from('player').select('id,team_id').in('id', ids);
    if (playerError) return res.status(500).json({ error: playerError.message });
    const playerMap = new Map((players || []).map((p) => [p.id, p]));
    if (ids.some((id) => !playerMap.has(id))) return res.status(400).json({ error: 'Selected player was not found.' });
    if (ids.some((id) => playerMap.get(id).team_id !== team_id)) return res.status(400).json({ error: 'Event players must belong to the selected team.' });
  }

  const payload = {
    match_id: req.params.matchId,
    player_id: player_id || null,
    team_id,
    type,
    period: Number(period),
    game_time: game_time || `${Math.floor((match.clock_seconds || 0) / 60)}:${String((match.clock_seconds || 0) % 60).padStart(2, '0')}`,
    x: x ?? null,
    y: y ?? null,
    penalty_minutes: penalty_minutes ?? null,
    outcome: outcome ?? null,
    related_player_id: related_player_id || null,
    card_type: card_type || null,
    substitution_in: substitution_in ?? null,
    substitution_out: substitution_out ?? null,
  };

  const { data: event, error } = await supabase.from('event').insert(payload).select().single();
  if (error) return res.status(500).json({ error: error.message });

  if (type === 'goal') {
    const field = team_id === match.home_team_id ? 'home_score' : 'away_score';
    const { data: freshMatch } = await supabase.from('match').select(field).eq('id', req.params.matchId).single();
    await supabase.from('match').update({ [field]: Number(freshMatch?.[field] || 0) + 1 }).eq('id', req.params.matchId);
  }

  res.status(201).json(event);
});

router.delete('/events/:id', async (req, res) => {
  const { data: event, error: eventError } = await supabase.from('event').select('*').eq('id', req.params.id).single();
  if (eventError || !event) return res.status(404).json({ error: 'Event not found.' });
  const { data: match } = await supabase.from('match').select('id,status,home_team_id,away_team_id').eq('id', event.match_id).single();
  if (!match) return res.status(404).json({ error: 'Match not found.' });
  if (match.status === 'final') return res.status(400).json({ error: 'Events cannot be changed after the final score is locked.' });

  const { error } = await supabase.from('event').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  if (event.type === 'goal') {
    const field = event.team_id === match.home_team_id ? 'home_score' : 'away_score';
    const { data: freshMatch } = await supabase.from('match').select(field).eq('id', event.match_id).single();
    await supabase.from('match').update({ [field]: Math.max(0, Number(freshMatch?.[field] || 0) - 1) }).eq('id', event.match_id);
  }
  res.status(204).send();
});

export default router;
