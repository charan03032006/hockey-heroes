import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.getMatches(filter ? `?status=${filter}` : '').then(setMatches).catch(() => setMatches([]));
  }, [filter]);

  return (
    <div>
      <h1>Matches</h1>
      <div className="filters">
        {['', 'scheduled', 'live', 'final'].map((s) => (
          <button key={s} className={filter === s ? 'active' : ''} onClick={() => setFilter(s)}>
            {s || 'All'}
          </button>
        ))}
      </div>
      <ul className="match-list">
        {matches.map((m) => (
          <li key={m.id}>
            <Link to={`/matches/${m.id}`}>
              {m.home_team?.name} {m.home_score} — {m.away_score} {m.away_team?.name}
              <span className={`status status-${m.status}`}>{m.status}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
