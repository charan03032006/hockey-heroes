import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

const FILTERS = [
  { value: '', label: 'All matches', hint: 'Every game' },
  { value: 'scheduled', label: 'Upcoming', hint: 'Games that have not started' },
  { value: 'live', label: 'Live now', hint: 'Games in progress' },
  { value: 'final', label: 'Finished', hint: 'Completed games' },
];

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    api.getMatches(filter ? `?status=${filter}` : '').then(setMatches).catch((e) => { setMatches([]); setError(e.message); });
  }, [filter]);

  return (
    <div className="matches-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">MATCH CENTRE</span>
          <h1>Matches</h1>
          <p className="muted">Choose a game to see its score and timeline. If you are a scorer, open the game and use the scorer console.</p>
        </div>
      </div>
      <div className="match-filter-guide">
        {FILTERS.map((f) => <button key={f.value} className={filter === f.value ? 'active' : ''} onClick={() => setFilter(f.value)}><b>{f.label}</b><small>{f.hint}</small></button>)}
      </div>
      {error && <div className="alert error">We couldn't load the matches. {error}</div>}
      {matches.length === 0 && !error && <div className="empty-card"><span>📅</span><div><strong>No matches in this category</strong><p className="muted">Try another filter or ask an admin to schedule a game.</p></div></div>}
      <div className="match-list">
        {matches.map((m) => (
          <Link className="match-row-card" key={m.id} to={`/matches/${m.id}`}>
            <div className="match-row-main">
              <span className={`status status-${m.status}`}>{m.status === 'scheduled' ? 'UPCOMING' : m.status === 'live' ? '● LIVE' : 'FINISHED'}</span>
              <div className="match-teams"><strong>{m.home_team?.name}</strong><span className="match-score">{m.home_score ?? 0} — {m.away_score ?? 0}</span><strong>{m.away_team?.name}</strong></div>
              {m.scheduled_at && <small className="muted">{m.status === 'scheduled' ? 'Starts ' : 'Played '}{new Date(m.scheduled_at).toLocaleString()}</small>}
            </div>
            <span className="match-open">View match →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
