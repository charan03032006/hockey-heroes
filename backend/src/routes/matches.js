import { Router } from 'express';
import { supabase } from '../db/supabase.js';
const router = Router();

router.get('/matches', async (req, res) => {
  const { status } = req.query;
  let q = supabase.from('match').select('*,home_team:home_team_id(name),away_team:away_team_id(name)').order('scheduled_at', { ascending: true });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/matches/:id', async (req, res) => {
  const { data, error } = await supabase.from('match').select('*,home_team:home_team_id(name),away_team:away_team_id(name)').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

router.post('/matches', async (req, res) => {
  const { home_team_id, away_team_id, scheduled_at, tournament_id, competition_rule = 'standard' } = req.body;
  if (!home_team_id || !away_team_id || !scheduled_at) return res.status(400).json({ error: 'Home team, away team and date/time are required.' });
  if (home_team_id === away_team_id) return res.status(400).json({ error: 'Home and away teams must be different.' });
  const { data, error } = await supabase.from('match').insert({
    home_team_id, away_team_id, scheduled_at, tournament_id: tournament_id || null,
    competition_rule, status: 'scheduled', home_score: 0, away_score: 0,
    current_period: 1, clock_seconds: 0, clock_running: false,
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.get('/matches/:id/lineups', async (req, res) => {
  const { data, error } = await supabase.from('match_lineup')
    .select('*,player:player_id(id,name,jersey_number,position,is_goalkeeper,team_id)')
    .eq('match_id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.put('/matches/:id/lineups', async (req, res) => {
  const { lineups = [] } = req.body;
  if (!Array.isArray(lineups)) return res.status(400).json({ error: 'Lineups must be an array.' });
  const { data: match, error: matchError } = await supabase.from('match').select('home_team_id,away_team_id,status').eq('id', req.params.id).single();
  if (matchError) return res.status(404).json({ error: 'Match not found.' });
  if (match.status === 'live' || match.status === 'final') return res.status(400).json({ error: 'Lineups cannot be changed after the match starts.' });

  const allowedTeams = [match.home_team_id, match.away_team_id];
  const ids = lineups.map((x) => x.player_id);
  if (new Set(ids).size !== ids.length) return res.status(400).json({ error: 'A player cannot appear twice in a lineup.' });
  if (lineups.some((x) => !allowedTeams.includes(x.team_id))) return res.status(400).json({ error: 'Lineup contains a player from another team.' });

  const { data: players } = await supabase.from('player').select('id,team_id').in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
  const playerMap = new Map((players || []).map((p) => [p.id, p]));
  if (lineups.some((x) => !playerMap.has(x.player_id) || playerMap.get(x.player_id).team_id !== x.team_id)) return res.status(400).json({ error: 'Every lineup player must belong to the selected team.' });

  for (const teamId of allowedTeams) {
    const rows = lineups.filter((x) => x.team_id === teamId);
    if (!rows.length) return res.status(400).json({ error: 'Both teams need a lineup.' });
    const starting = rows.filter((x) => x.is_starting);
    const keepers = rows.filter((x) => x.is_goalkeeper);
    if (!starting.length) return res.status(400).json({ error: 'Each team needs at least one starting player.' });
    if (keepers.length !== 1) return res.status(400).json({ error: 'Each team must have exactly one designated goalkeeper.' });
    if (!keepers[0].is_starting) return res.status(400).json({ error: 'The designated goalkeeper must be a starting player.' });
  }

  const { error: deleteError } = await supabase.from('match_lineup').delete().eq('match_id', req.params.id);
  if (deleteError) return res.status(500).json({ error: deleteError.message });
  const payload = lineups.map((x) => ({ match_id: req.params.id, player_id: x.player_id, team_id: x.team_id, is_starting: !!x.is_starting, is_goalkeeper: !!x.is_goalkeeper }));
  const { data, error } = await supabase.from('match_lineup').insert(payload).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.get('/matches/:id/officials', async (req, res) => {
  const { data, error } = await supabase.from('match_official').select('*').eq('match_id', req.params.id).order('role');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.put('/matches/:id/officials', async (req, res) => {
  const { officials = [] } = req.body;
  if (!Array.isArray(officials)) return res.status(400).json({ error: 'Officials must be an array.' });
  const validRoles = ['umpire_1', 'umpire_2', 'technical_official', 'scorer'];
  const rows = officials.filter((x) => x.user_id && validRoles.includes(x.role));
  if (new Set(rows.map((x) => x.role)).size !== rows.length) return res.status(400).json({ error: 'Each official role can only be assigned once.' });
  const { data: match } = await supabase.from('match').select('status').eq('id', req.params.id).maybeSingle();
  if (!match) return res.status(404).json({ error: 'Match not found.' });
  if (match.status === 'live' || match.status === 'final') return res.status(400).json({ error: 'Officials cannot be changed after the match starts.' });
  const { error: deleteError } = await supabase.from('match_official').delete().eq('match_id', req.params.id);
  if (deleteError) return res.status(500).json({ error: deleteError.message });
  if (!rows.length) return res.json([]);
  const { data, error } = await supabase.from('match_official').insert(rows.map((x) => ({ match_id: req.params.id, user_id: x.user_id, role: x.role }))).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.get('/matches/:id/readiness', async (req, res) => {
  const { data: match, error: matchError } = await supabase.from('match').select('id,home_team_id,away_team_id,status').eq('id', req.params.id).single();
  if (matchError) return res.status(404).json({ error: 'Match not found.' });
  const [{ data: lineups }, { data: officials }] = await Promise.all([
    supabase.from('match_lineup').select('team_id,is_starting,is_goalkeeper').eq('match_id', req.params.id),
    supabase.from('match_official').select('role').eq('match_id', req.params.id),
  ]);
  const checks = [
    ...[match.home_team_id, match.away_team_id].map((teamId) => {
      const rows = (lineups || []).filter((x) => x.team_id === teamId);
      return { team_id: teamId, lineup: rows.length > 0, goalkeeper: rows.filter((x) => x.is_goalkeeper && x.is_starting).length === 1 };
    }),
    { officials: (officials || []).some((x) => x.role === 'scorer') },
  ];
  const ready = checks.every((check) => Object.entries(check).filter(([key]) => key !== 'team_id').every(([, value]) => value === true));
  res.json({ ready, checks });
});

router.patch('/matches/:id', async (req, res) => {
  const allowed = ['status','current_period','clock_seconds','clock_running','started_at','ended_at','competition_rule','official_id','tiebreaker','shootout_home','shootout_away'];
  const patch = {};
  for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
  if (patch.current_period !== undefined && (Number(patch.current_period) < 1 || Number(patch.current_period) > 4)) return res.status(400).json({ error: 'There are four regulation periods.' });
  if (patch.clock_seconds !== undefined && (Number(patch.clock_seconds) < 0 || Number(patch.clock_seconds) > 900)) return res.status(400).json({ error: 'A regulation period is 15 minutes.' });

  if (patch.status === 'live') {
    const { data: match } = await supabase.from('match').select('home_team_id,away_team_id,status').eq('id', req.params.id).maybeSingle();
    if (!match) return res.status(404).json({ error: 'Match not found.' });
    const [{ data: lineups }, { data: officials }] = await Promise.all([
      supabase.from('match_lineup').select('team_id,is_starting,is_goalkeeper').eq('match_id', req.params.id),
      supabase.from('match_official').select('role').eq('match_id', req.params.id),
    ]);
    const ready = [match.home_team_id, match.away_team_id].every((teamId) => {
      const rows = (lineups || []).filter((x) => x.team_id === teamId);
      return rows.length > 0 && rows.some((x) => x.is_starting) && rows.filter((x) => x.is_goalkeeper && x.is_starting).length === 1;
    }) && (officials || []).some((x) => x.role === 'scorer');
    if (!ready) return res.status(400).json({ error: 'Pre-match checks are incomplete. Both lineups, starting goalkeepers and a scorer are required.' });
    if (!patch.started_at) patch.started_at = new Date().toISOString();
  }
  if (patch.status === 'final') { patch.clock_running = false; patch.ended_at = new Date().toISOString(); }
  const { data, error } = await supabase.from('match').update(patch).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
