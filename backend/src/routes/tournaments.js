import { Router } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('tournament').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { name, rule_profile = 'standard', points_win = 3, points_draw = 1, points_loss = 0, shootout_enabled = true } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Tournament name is required.' });
  const { data, error } = await supabase.from('tournament').insert({
    name: name.trim(), rule_profile, points_win, points_draw, points_loss, shootout_enabled,
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.get('/:id/teams', async (req, res) => {
  const { data, error } = await supabase
    .from('tournament_team')
    .select('*, team:team_id(id,name,short_name)')
    .eq('tournament_id', req.params.id)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/:id/teams', async (req, res) => {
  const { team_id } = req.body;
  if (!team_id) return res.status(400).json({ error: 'Team is required.' });
  const { data: tournament } = await supabase.from('tournament').select('id').eq('id', req.params.id).maybeSingle();
  if (!tournament) return res.status(404).json({ error: 'Tournament not found.' });
  const { data: team } = await supabase.from('team').select('id').eq('id', team_id).maybeSingle();
  if (!team) return res.status(404).json({ error: 'Team not found.' });
  const { data, error } = await supabase.from('tournament_team').upsert(
    { tournament_id: req.params.id, team_id }, { onConflict: 'tournament_id,team_id' }
  ).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.get('/:id/fixtures', async (req, res) => {
  const { data, error } = await supabase
    .from('match')
    .select('*,home_team:home_team_id(id,name,short_name),away_team:away_team_id(id,name,short_name)')
    .eq('tournament_id', req.params.id)
    .order('scheduled_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/:id/fixtures', async (req, res) => {
  const { home_team_id, away_team_id, scheduled_at, competition_rule = 'standard' } = req.body;
  if (!home_team_id || !away_team_id || !scheduled_at) return res.status(400).json({ error: 'Home team, away team and date/time are required.' });
  if (home_team_id === away_team_id) return res.status(400).json({ error: 'Home and away teams must be different.' });

  const { data: tournament } = await supabase.from('tournament').select('id').eq('id', req.params.id).maybeSingle();
  if (!tournament) return res.status(404).json({ error: 'Tournament not found.' });

  const { data: memberships, error: membershipError } = await supabase
    .from('tournament_team').select('team_id').eq('tournament_id', req.params.id).in('team_id', [home_team_id, away_team_id]);
  if (membershipError) return res.status(500).json({ error: membershipError.message });
  if ((memberships || []).length !== 2) return res.status(400).json({ error: 'Both teams must be added to this tournament first.' });

  const { data: duplicate } = await supabase.from('match').select('id').eq('tournament_id', req.params.id)
    .in('home_team_id', [home_team_id, away_team_id]).in('away_team_id', [home_team_id, away_team_id])
    .eq('scheduled_at', scheduled_at).maybeSingle();
  if (duplicate) return res.status(409).json({ error: 'A fixture between these teams already exists at this time.' });

  const { data, error } = await supabase.from('match').insert({
    tournament_id: req.params.id, home_team_id, away_team_id, scheduled_at,
    status: 'scheduled', home_score: 0, away_score: 0, current_period: 1,
    clock_seconds: 0, clock_running: false, competition_rule,
  }).select('*,home_team:home_team_id(id,name,short_name),away_team:away_team_id(id,name,short_name)').single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

export default router;
