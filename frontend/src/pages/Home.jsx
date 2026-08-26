import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function Home() {
  const [live, setLive] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getMatches('?status=live').then(setLive).catch((e) => setError(e.message));
    api.getMatches('?status=scheduled').then(setUpcoming).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1>Hockey Heroes</h1>
      {error && <p className="error">Couldn't load matches: {error}</p>}

      <section>
        <h2>Live now</h2>
        {live.length === 0 && <p className="muted">No live matches right now.</p>}
        <ul className="match-list">
          {live.map((m) => (
            <li key={m.id}>
              <Link to={`/matches/${m.id}`}>
                {m.home_team?.name} {m.home_score} — {m.away_score} {m.away_team?.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Upcoming</h2>
        {upcoming.length === 0 && <p className="muted">No upcoming matches scheduled.</p>}
        <ul className="match-list">
          {upcoming.map((m) => (
            <li key={m.id}>
              <Link to={`/matches/${m.id}`}>
                {m.home_team?.name} vs {m.away_team?.name} — {new Date(m.scheduled_at).toLocaleString()}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
