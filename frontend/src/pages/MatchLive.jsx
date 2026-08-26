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

    // Subscribe to realtime updates on this match's score and events
    const channel = supabase
      .channel(`match-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match', filter: `id=eq.${id}` }, (payload) =>
        setMatch((prev) => ({ ...prev, ...payload.new }))
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event', filter: `match_id=eq.${id}` }, (payload) =>
        setEvents((prev) => [payload.new, ...prev])
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [id]);

  if (!match) return <p>Loading match…</p>;

  return (
    <div>
      <h1>
        {match.home_team?.name} <span className="score">{match.home_score}</span> —{' '}
        <span className="score">{match.away_score}</span> {match.away_team?.name}
      </h1>
      <p className="muted">Status: {match.status}</p>
      <Link to={`/matches/${id}/score`}>Open scorer console →</Link>

      <h2>Event feed</h2>
      <ul className="event-feed">
        {events.map((e) => (
          <li key={e.id}>
            <strong>{e.type}</strong> — {e.player?.name || 'Unknown player'} {e.game_time && `(P${e.period} ${e.game_time})`}
          </li>
        ))}
        {events.length === 0 && <li className="muted">No events logged yet.</li>}
      </ul>
    </div>
  );
}
