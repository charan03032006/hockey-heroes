import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { supabase } from '../lib/supabase.js';

const label = (value) => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function MatchLive() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [m, e] = await Promise.all([api.getMatch(id), api.getEvents(id)]);
      setMatch(m); setEvents(e || []); setError('');
    } catch (e) { setError(e.message); }
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`match-centre-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match', filter: `id=eq.${id}` }, (payload) => setMatch((value) => ({ ...value, ...payload.new })))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event', filter: `match_id=eq.${id}` }, (payload) => setEvents((value) => [payload.new, ...value]))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'event', filter: `match_id=eq.${id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const stats = useMemo(() => {
    if (!match) return null;
    const count = (teamId, type) => events.filter((e) => e.team_id === teamId && e.type === type).length;
    const goals = (teamId) => events.filter((e) => e.team_id === teamId && e.type === 'goal');
    const cards = (teamId) => events.filter((e) => e.team_id === teamId && e.type === 'card');
    const subs = (teamId) => events.filter((e) => e.team_id === teamId && e.type === 'substitution');
    return {
      home: { corners: count(match.home_team_id, 'penalty_corner'), strokes: count(match.home_team_id, 'penalty_stroke'), shots: count(match.home_team_id, 'shot'), saves: count(match.home_team_id, 'save'), goals: goals(match.home_team_id), cards: cards(match.home_team_id), subs: subs(match.home_team_id) },
      away: { corners: count(match.away_team_id, 'penalty_corner'), strokes: count(match.away_team_id, 'penalty_stroke'), shots: count(match.away_team_id, 'shot'), saves: count(match.away_team_id, 'save'), goals: goals(match.away_team_id), cards: cards(match.away_team_id), subs: subs(match.away_team_id) },
    };
  }, [events, match]);

  if (error) return <div className="page-loading">Unable to load match: {error}</div>;
  if (!match) return <div className="page-loading">Loading match centre…</div>;

  const final = match.status === 'final';
  const shootout = Number(match.shootout_home || 0) || Number(match.shootout_away || 0);
  const winner = final ? (shootout ? (Number(match.shootout_home || 0) > Number(match.shootout_away || 0) ? match.home_team?.name : match.away_team?.name) : (Number(match.home_score || 0) === Number(match.away_score || 0) ? 'Draw' : Number(match.home_score || 0) > Number(match.away_score || 0) ? match.home_team?.name : match.away_team?.name)) : null;

  return <div className="live-page">
    <div className="page-head"><div><span className="eyebrow">{final ? 'FINAL SCORECARD' : 'MATCH CENTRE'}</span><h1>{match.home_team?.name} <span>vs</span> {match.away_team?.name}</h1><p className="muted">{final ? 'Final · 4 periods × 15 minutes' : match.status === 'live' ? `Live now · Period ${match.current_period || 1} of 4` : `Upcoming · Period ${match.current_period || 1} of 4`}</p></div>{!final && <Link className="btn btn-primary" to={`/matches/${id}/score`}>Open scorer console →</Link>}</div>

    <section className="live-scoreboard"><div className="score-team"><span>HOME</span><strong>{match.home_score ?? 0}</strong><b>{match.home_team?.name}</b></div><div className="score-middle"><span className={match.status === 'live' ? 'live-pill' : 'status'}>{match.status === 'live' ? '● LIVE' : String(match.status).toUpperCase()}</span><small>{match.current_period ? `PERIOD ${match.current_period} / 4` : '4 × 15 MIN'}</small>{final && <em>{winner}</em>}</div><div className="score-team"><span>AWAY</span><strong>{match.away_score ?? 0}</strong><b>{match.away_team?.name}</b></div></section>

    {final && shootout > 0 && <section className="scorecard-stats"><div><span>SHOOT-OUT</span><b>{match.shootout_home || 0} — {match.shootout_away || 0}</b></div><div><span>DECISION</span><b>{winner}</b></div></section>}

    <section className="scorecard-stats"><div><span>GOALS</span><b>{match.home_score ?? 0} — {match.away_score ?? 0}</b></div><div><span>PENALTY CORNERS</span><b>{stats.home.corners} — {stats.away.corners}</b></div><div><span>PENALTY STROKES</span><b>{stats.home.strokes} — {stats.away.strokes}</b></div><div><span>SHOTS</span><b>{stats.home.shots} — {stats.away.shots}</b></div><div><span>SAVES</span><b>{stats.home.saves} — {stats.away.saves}</b></div><div><span>CARDS</span><b>{stats.home.cards.length} — {stats.away.cards.length}</b></div></section>

    <div className="live-layout"><section className="feed-card"><div className="section-heading"><div><span className="eyebrow">EVENT LOG</span><h2>{final ? 'Final match timeline' : 'Match events'}</h2></div><span className="event-count">{events.length} events</span></div><ul className="event-feed">{events.map((e, i) => <li key={e.id}><span className="event-dot">{e.type === 'goal' ? '●' : '•'}</span><div><strong>{label(e.type)}</strong><p>{e.player?.name || 'Team event'}{e.related_player?.name ? ` → ${e.related_player.name}` : ''} <span className="muted">· P{e.period} · {e.game_time || '—'}</span></p>{e.card_type && <small>{label(e.card_type)} card</small>}</div><small>#{events.length - i}</small></li>)}{!events.length && <li className="empty-event"><span>🏑</span><div><strong>No events yet</strong><p className="muted">The scorer's updates will appear here live.</p></div></li>}</ul></section>

      <aside className="match-info-card"><span className="eyebrow">SCORECARD SUMMARY</span><h3>{final ? 'Final result' : 'Live match'}</h3>{final && <><p><b>{winner}</b></p><p className="muted">Regulation: {match.home_score} — {match.away_score}{shootout ? ` · Shoot-out: ${match.shootout_home} — ${match.shootout_away}` : ''}</p></>}{!final && <p className="muted">Goals, PCs, strokes, cards, substitutions, shots and saves are tracked in real time.</p>}<Link to="/matches" className="btn btn-ghost">← All matches</Link></aside>
    </div>

    <section className="feed-card"><div className="section-heading"><div><span className="eyebrow">GOAL SCORERS</span><h2>Scoring summary</h2></div></div><div className="mini-events">{[...stats.home.goals, ...stats.away.goals].map((goal) => <div key={goal.id}><span>{goal.team_id === match.home_team_id ? match.home_team?.name : match.away_team?.name}</span><strong>{goal.player?.name || 'Goal'}</strong><small>P{goal.period} · {goal.game_time || '—'}</small></div>)}{!stats.home.goals.length && !stats.away.goals.length && <p className="muted">No goals recorded.</p>}</div></section>
  </div>;
}
