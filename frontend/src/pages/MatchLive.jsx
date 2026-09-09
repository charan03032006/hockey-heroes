import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { supabase } from '../lib/supabase.js';

export default function MatchLive() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.getMatch(id).then(setMatch);
    api.getEvents(id).then(setEvents);
    const channel = supabase.channel(`match-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match', filter: `id=eq.${id}` }, (payload) => setMatch((prev) => ({ ...prev, ...payload.new })))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event', filter: `match_id=eq.${id}` }, (payload) => setEvents((prev) => [payload.new, ...prev]))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [id]);

  if (!match) return <div className="page-loading">Loading match centre…</div>;

  return (
    <div className="live-page">
      <div className="page-head">
        <div><span className="eyebrow">MATCH CENTRE</span><h1>{match.home_team?.name} <span>vs</span> {match.away_team?.name}</h1></div>
        <Link className="btn btn-primary" to={`/matches/${id}/score`}>Open scorer console →</Link>
      </div>
      <section className="live-scoreboard">
        <div className="score-team"><span>HOME</span><strong>{match.home_score ?? 0}</strong><b>{match.home_team?.name}</b></div>
        <div className="score-middle"><span className={match.status === 'live' ? 'live-pill' : 'status'}>{match.status === 'live' ? '● LIVE' : String(match.status).toUpperCase()}</span><small>HOCKEY</small><em>VS</em></div>
        <div className="score-team"><span>AWAY</span><strong>{match.away_score ?? 0}</strong><b>{match.away_team?.name}</b></div>
      </section>
      <div className="live-layout">
        <section className="feed-card">
          <div className="section-heading"><div><span className="eyebrow">TIMELINE</span><h2>Match events</h2></div><span className="event-count">{events.length} events</span></div>
          <ul className="event-feed">
            {events.map((e, i) => <li key={e.id}><span className="event-dot">{e.type === 'goal' ? '●' : '•'}</span><div><strong>{String(e.type).toUpperCase()}</strong><p>{e.player?.name || 'Unknown player'} {e.game_time && <span className="muted"> · P{e.period} · {e.game_time}</span>}</p></div><small>#{events.length - i}</small></li>)}
            {events.length === 0 && <li className="empty-event"><span>🏑</span><div><strong>Waiting for the first event</strong><p className="muted">The timeline will update live as the scorer records action.</p></div></li>}
          </ul>
        </section>
        <aside className="match-info-card"><span className="eyebrow">LIVE STATUS</span><h3>{match.status === 'live' ? 'Game in progress' : 'Match overview'}</h3><p className="muted">Scores and events update automatically in real time.</p><Link to="/matches" className="btn btn-ghost">← All matches</Link></aside>
      </div>
    </div>
  );
}
