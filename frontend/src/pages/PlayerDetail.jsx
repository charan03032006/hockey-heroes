import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function PlayerDetail() {
  const { id } = useParams();
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    api.getPlayer(id).then(setPlayer).catch(() => setPlayer(null));
  }, [id]);

  if (!player) return <p>Loading…</p>;

  return (
    <div>
      <h1>
        #{player.jersey_number} {player.name}
      </h1>
      <p className="muted">
        {player.team?.name} — {player.position}
      </p>

      <h2>Career stats</h2>
      <table className="stats-table">
        <tbody>
          <tr><td>Goals</td><td>{player.stats.goals}</td></tr>
          <tr><td>Assists</td><td>{player.stats.assists}</td></tr>
          <tr><td>Penalties</td><td>{player.stats.penalties}</td></tr>
          <tr><td>Shots</td><td>{player.stats.shots}</td></tr>
          <tr><td>Saves</td><td>{player.stats.saves}</td></tr>
        </tbody>
      </table>
    </div>
  );
}
