import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function Teams() {
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    api.getTeams().then(setTeams).catch(() => setTeams([]));
  }, []);

  return (
    <div>
      <h1>Teams</h1>
      <ul className="team-list">
        {teams.map((t) => (
          <li key={t.id}>
            <Link to={`/teams/${t.id}`}>{t.name}</Link>
          </li>
        ))}
        {teams.length === 0 && <p className="muted">No teams yet — add one in Admin.</p>}
      </ul>
    </div>
  );
}
