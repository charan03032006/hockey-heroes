import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

const EVENT_TYPES = ['goal', 'assist', 'penalty', 'shot', 'save'];

export default function Scorer() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [homeRoster, setHomeRoster] = useState([]);
  const [awayRoster, setAwayRoster] = useState([]);
  const [lastEvent, setLastEvent] = useState(null);
  const [period, setPeriod] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.getMatch(id).then((m) => { setMatch(m); api.getTeam(m.home_team_id).then((t) => setHomeRoster(t.roster || [])); api.getTeam(m.away_team_id).then((t) => setAwayRoster(t.roster || [])); }); }, [id]);

  async function logEvent(type, player, team_id) {
    setSaving(true);
    try { const event = await api.createEvent(id, { player_id: player.id, team_id, type, period, game_time: new Date().toISOString().slice(11, 16) }); setLastEvent(event); if (type === 'goal') api.getMatch(id).then(setMatch); } finally { setSaving(false); }
  }
  async function undo() { if (!lastEvent) return; await api.deleteEvent(lastEvent.id); setLastEvent(null); api.getMatch(id).then(setMatch); }
  if (!match) return <div className="page-loading">Loading scorer console…</div>;

  const renderRoster = (roster, teamId, teamName) => (
    <section className="scorer-team">
      <div className="team-header"><div><span className="eyebrow">TEAM</span><h2>{teamName}</h2></div><span className="team-score">{teamId === match.home_team_id ? match.home_score : match.away_score}</span></div>
      <div className="scorer-legend"><span>PLAYER</span><span>ACTIONS</span></div>
      {roster.map((p) => <div key={p.id} className="scorer-player"><div className="player-name"><b>#{p.jersey_number ?? '—'}</b><span>{p.name}<small>{p.position || 'Player'}</small></span></div><div className="event-buttons">{EVENT_TYPES.map((type) => <button disabled={saving} key={type} className={`event-${type}`} onClick={() => logEvent(type, p, teamId)}>{type}</button>)}</div></div>)}
      {roster.length === 0 && <p className="muted">No players registered for this team.</p>}
    </section>
  );

  return <div className="scorer-page">
    <div className="scorer-help"><b>How to score</b><span>1. Choose the player → 2. Choose the event → 3. The score and timeline update automatically.</span></div><div className="page-head"><div><span className="eyebrow">SCORER CONSOLE</span><h1>Control room</h1><p className="muted">{match.home_team?.name} vs {match.away_team?.name}</p></div><div className="scorer-controls"><label>Period<select value={period} onChange={(e) => setPeriod(Number(e.target.value))}><option value={1}>1st</option><option value={2}>2nd</option><option value={3}>3rd</option><option value={4}>OT</option></select></label><button onClick={undo} disabled={!lastEvent || saving} className="undo-btn">↶ Undo</button></div></div>
    <section className="operator-score"><div><span>{match.home_team?.name}</span><strong>{match.home_score ?? 0}</strong></div><div className="operator-vs">PERIOD {period}</div><div><span>{match.away_team?.name}</span><strong>{match.away_score ?? 0}</strong></div></section>
    {saving && <div className="save-indicator">Saving event…</div>}
    <div className="scorer-grid">{renderRoster(homeRoster, match.home_team_id, match.home_team?.name)}{renderRoster(awayRoster, match.away_team_id, match.away_team?.name)}</div>
  </div>;
}
