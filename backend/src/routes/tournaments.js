import { Router } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('tournament').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/', async (req, res) => {
  const { name, rule_profile = 'standard', points_win = 3, points_draw = 1, points_loss = 0, shootout_enabled = true } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Tournament name is required.' });
  const { data, error } = await supabase.from('tournament').insert({ name: name.trim(), rule_profile, points_win, points_draw, points_loss, shootout_enabled }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.get('/:id/teams', async (req, res) => {
  const { data, error } = await supabase.from('tournament_team').select('*, team:team_id(id,name,short_name)').eq('tournament_id', req.params.id).order('created_at', { ascending: true });
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
  const { data, error } = await supabase.from('tournament_team').upsert({ tournament_id: req.params.id, team_id }, { onConflict: 'tournament_id,team_id' }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.get('/:id/fixtures', async (req, res) => {
  const { data, error } = await supabase.from('match').select('*,home_team:home_team_id(id,name,short_name),away_team:away_team_id(id,name,short_name)').eq('tournament_id', req.params.id).order('scheduled_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/:id/fixtures', async (req, res) => {
  const { home_team_id, away_team_id, scheduled_at, competition_rule = 'standard' } = req.body;
  if (!home_team_id || !away_team_id || !scheduled_at) return res.status(400).json({ error: 'Home team, away team and date/time are required.' });
  if (home_team_id === away_team_id) return res.status(400).json({ error: 'Home and away teams must be different.' });
  const { data: tournament } = await supabase.from('tournament').select('id').eq('id', req.params.id).maybeSingle();
  if (!tournament) return res.status(404).json({ error: 'Tournament not found.' });
  const { data: memberships, error: membershipError } = await supabase.from('tournament_team').select('team_id').eq('tournament_id', req.params.id).in('team_id', [home_team_id, away_team_id]);
  if (membershipError) return res.status(500).json({ error: membershipError.message });
  if ((memberships || []).length !== 2) return res.status(400).json({ error: 'Both teams must be added to this tournament first.' });
  const { data: duplicate } = await supabase.from('match').select('id').eq('tournament_id', req.params.id).in('home_team_id', [home_team_id, away_team_id]).in('away_team_id', [home_team_id, away_team_id]).eq('scheduled_at', scheduled_at).maybeSingle();
  if (duplicate) return res.status(409).json({ error: 'A fixture between these teams already exists at this time.' });
  const { data, error } = await supabase.from('match').insert({ tournament_id: req.params.id, home_team_id, away_team_id, scheduled_at, status: 'scheduled', home_score: 0, away_score: 0, current_period: 1, clock_seconds: 0, clock_running: false, competition_rule }).select('*,home_team:home_team_id(id,name,short_name),away_team:away_team_id(id,name,short_name)').single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

async function getTournamentData(tournamentId) {
  const [{ data: tournament, error: tournamentError }, { data: matches, error: matchesError }] = await Promise.all([
    supabase.from('tournament').select('id,name,points_win,points_draw,points_loss,shootout_enabled').eq('id', tournamentId).maybeSingle(),
    supabase.from('match').select('id,home_team_id,away_team_id,status,home_score,away_score,shootout_home,shootout_away,scheduled_at,home_team:home_team_id(id,name,short_name),away_team:away_team_id(id,name,short_name)').eq('tournament_id', tournamentId).order('scheduled_at', { ascending: true }),
  ]);
  if (tournamentError) throw new Error(tournamentError.message);
  if (matchesError) throw new Error(matchesError.message);
  if (!tournament) return null;
  return { tournament, matches: matches || [] };
}

router.get('/:id/standings', async (req, res) => {
  try {
    const data = await getTournamentData(req.params.id);
    if (!data) return res.status(404).json({ error: 'Tournament not found.' });
    const { tournament, matches } = data;
    const { data: memberships, error } = await supabase.from('tournament_team').select('team_id,team:team_id(id,name,short_name)').eq('tournament_id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    const table = new Map((memberships || []).map((row) => [row.team_id, { team_id: row.team_id, team: row.team, played: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, points: 0 }]));
    for (const match of matches.filter((m) => m.status === 'final')) {
      const home = table.get(match.home_team_id); const away = table.get(match.away_team_id);
      if (!home || !away) continue;
      const hs = Number(match.home_score || 0); const as = Number(match.away_score || 0);
      home.played += 1; away.played += 1; home.goals_for += hs; home.goals_against += as; away.goals_for += as; away.goals_against += hs;
      if (hs === as) {
        const sh = Number(match.shootout_home || 0); const sa = Number(match.shootout_away || 0);
        if (sh !== sa) { const winner = sh > sa ? home : away; const loser = sh > sa ? away : home; winner.wins += 1; loser.losses += 1; winner.points += Number(tournament.points_win || 0); loser.points += Number(tournament.points_loss || 0); }
        else { home.draws += 1; away.draws += 1; home.points += Number(tournament.points_draw || 0); away.points += Number(tournament.points_draw || 0); }
      } else if (hs > as) { home.wins += 1; away.losses += 1; home.points += Number(tournament.points_win || 0); away.points += Number(tournament.points_loss || 0); }
      else { away.wins += 1; home.losses += 1; away.points += Number(tournament.points_win || 0); home.points += Number(tournament.points_loss || 0); }
    }
    const standings = [...table.values()].map((row) => ({ ...row, goal_difference: row.goals_for - row.goals_against })).sort((a, b) => b.points - a.points || b.goal_difference - a.goal_difference || b.goals_for - a.goals_for || String(a.team?.name || '').localeCompare(String(b.team?.name || '')));
    res.json({ points_win: tournament.points_win, points_draw: tournament.points_draw, points_loss: tournament.points_loss, standings });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id/player-leaderboard', async (req, res) => {
  try {
    const data = await getTournamentData(req.params.id);
    if (!data) return res.status(404).json({ error: 'Tournament not found.' });
    const matchIds = data.matches.filter((m) => m.status === 'final').map((m) => m.id);
    if (!matchIds.length) return res.json([]);
    const { data: events, error } = await supabase.from('event').select('match_id,player_id,team_id,type,related_player_id,card_type,player:player_id(id,name,jersey_number,position),team:team_id(id,name,short_name)').in('match_id', matchIds);
    if (error) return res.status(500).json({ error: error.message });
    const map = new Map();
    for (const event of events || []) {
      if (!event.player_id) continue;
      if (!map.has(event.player_id)) map.set(event.player_id, { player_id: event.player_id, player: event.player, team: event.team, matchSet: new Set(), goals: 0, assists: 0, shots: 0, saves: 0, penalty_corners: 0, penalty_strokes: 0, cards: 0 });
      const row = map.get(event.player_id); row.matchSet.add(event.match_id);
      if (event.type === 'goal') row.goals += 1;
      if (event.type === 'assist') row.assists += 1;
      if (event.type === 'shot') row.shots += 1;
      if (event.type === 'save') row.saves += 1;
      if (event.type === 'penalty_corner') row.penalty_corners += 1;
      if (event.type === 'penalty_stroke') row.penalty_strokes += 1;
      if (event.type === 'card') row.cards += 1;
    }
    const leaderboard = [...map.values()].map((row) => ({ ...row, matches: row.matchSet.size, points: row.goals * 5 + row.assists * 3 + row.saves + row.shots + row.penalty_corners + row.penalty_strokes })).sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.points - a.points || String(a.player?.name || '').localeCompare(String(b.player?.name || '')));
    res.json(leaderboard);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id/analytics', async (req, res) => {
  try {
    const data = await getTournamentData(req.params.id);
    if (!data) return res.status(404).json({ error: 'Tournament not found.' });
    const { tournament, matches } = data;
    const completed = matches.filter((m) => m.status === 'final');
    const live = matches.filter((m) => m.status === 'live');
    const scheduled = matches.filter((m) => m.status === 'scheduled');
    const totalGoals = completed.reduce((sum, m) => sum + Number(m.home_score || 0) + Number(m.away_score || 0), 0);
    const shootouts = completed.filter((m) => Number(m.shootout_home || 0) !== Number(m.shootout_away || 0) && Number(m.shootout_home || 0) + Number(m.shootout_away || 0) > 0);
    const { data: events, error } = completed.length ? await supabase.from('event').select('match_id,team_id,type,card_type').in('match_id', completed.map((m) => m.id)) : { data: [], error: null };
    if (error) return res.status(500).json({ error: error.message });
    const eventCount = (type) => (events || []).filter((e) => e.type === type).length;
    res.json({ tournament, totals: { fixtures: matches.length, completed: completed.length, live: live.length, scheduled: scheduled.length, goals: totalGoals, average_goals: completed.length ? Number((totalGoals / completed.length).toFixed(2)) : 0, shootouts: shootouts.length, penalty_corners: eventCount('penalty_corner'), penalty_strokes: eventCount('penalty_stroke'), shots: eventCount('shot'), saves: eventCount('save'), cards: eventCount('card'), substitutions: eventCount('substitution') } });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

export default router;
