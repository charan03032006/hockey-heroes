import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

const label = (value) => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function PlayerDetail() {
  const { id } = useParams();
  const [player, setPlayer] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.getPlayer(id).then((data) => { if (active) setPlayer(data); }).catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [id]);

  const stats = useMemo(() => player?.stats || {}, [player]);
  if (error) return <div className="page-loading">Unable to load player: {error}</div>;
  if (!player) return <div className="page-loading">Loading player profile…</div>;

  const cards = [
    ['Matches', stats.matches ?? 0], ['Goals', stats.goals ?? 0], ['Assists', stats.assists ?? 0],
    ['Shots', stats.shots ?? 0], ['Saves', stats.saves ?? 0], ['Penalties', stats.penalties ?? 0],
    ['Cards', stats.cards ?? 0], ['Substitutions', stats.substitutions ?? 0],
  ];

  return (
    <div className="page-shell">
      <div className="page-head">
        <div><span className="eyebrow">PLAYER PROFILE</span><h1>#{player.jersey_number ?? '—'} {player.name}</h1><p className="muted">{player.team?.name || 'No team'} · {player.position || 'Player'}</p></div>
        <Link className="btn btn-ghost" to="/players">← Players</Link>
      </div>

      <section className="dashboard-grid">{cards.map(([name, value]) => <div className="stat-card" key={name}><span>{name.toUpperCase()}</span><strong>{value}</strong></div>)}</section>

      <section className="panel"><div className="section-heading"><div><span className="eyebrow">RECENT MATCHES</span><h2>Match history</h2></div></div>
        {player.recent_matches?.length ? <div className="table-wrap"><table><thead><tr><th>Date</th><th>Match</th><th>Status</th><th>Events</th></tr></thead><tbody>{player.recent_matches.map((match) => <tr key={match.id}><td>{match.scheduled_at ? new Date(match.scheduled_at).toLocaleDateString() : '—'}</td><td><Link to={`/matches/${match.id}`}><b>{match.home_team?.name || 'Home'}</b> vs <b>{match.away_team?.name || 'Away'}</b></Link></td><td>{label(match.status)}</td><td>{(player.recent_events || []).filter((event) => event.match_id === match.id).length}</td></tr>)}</tbody></table></div> : <p className="muted">No recorded match history yet.</p>}
      </section>

      <section className="panel"><div className="section-heading"><div><span className="eyebrow">ACTIVITY</span><h2>Recent events</h2></div></div>
        {player.recent_events?.length ? <div className="mini-events">{player.recent_events.map((event) => <div key={event.id}><span>{label(event.type)}</span><strong>{event.match?.home_team?.short_name || event.match?.home_team?.name || 'Home'} vs {event.match?.away_team?.short_name || event.match?.away_team?.name || 'Away'}</strong><small>Period {event.period || '—'} · {event.game_time || '—'}</small></div>)}</div> : <p className="muted">No events recorded yet.</p>}
      </section>
    </div>
  );
}
