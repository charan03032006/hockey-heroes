import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function TeamDetail() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);

  useEffect(() => {
    api.getTeam(id).then(setTeam).catch(() => setTeam(null));
  }, [id]);

  if (!team) return <p>Loading…</p>;

  return (
    <div>
      <h1>{team.name}</h1>

      <h2>Roster</h2>
      <ul>
        {(team.roster || []).map((p) => (
          <li key={p.id}>
            <Link to={`/players/${p.id}`}>
              #{p.jersey_number} {p.name} — {p.position}
            </Link>
          </li>
        ))}
        {(team.roster || []).length === 0 && <p className="muted">No players added yet.</p>}
      </ul>

      <h2>Matches</h2>
      <ul>
        {(team.matches || []).map((m) => (
          <li key={m.id}>
            <Link to={`/matches/${m.id}`}>
              {m.home_score} — {m.away_score} ({m.status})
            </Link>
          </li>
        ))}
        {(team.matches || []).length === 0 && <p className="muted">No matches yet.</p>}
      </ul>
    </div>
  );
}
