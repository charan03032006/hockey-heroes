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

  useEffect(() => {
    api.getMatch(id).then((m) => {
      setMatch(m);
      api.getTeam(m.home_team_id).then((t) => setHomeRoster(t.roster || []));
      api.getTeam(m.away_team_id).then((t) => setAwayRoster(t.roster || []));
    });
  }, [id]);

  async function logEvent(type, player, team_id) {
    const event = await api.createEvent(id, {
      player_id: player.id,
      team_id,
      type,
      period,
      game_time: new Date().toISOString().slice(11, 16),
    });
    setLastEvent(event);
    // Refresh score if it was a goal
    if (type === 'goal') api.getMatch(id).then(setMatch);
  }

  async function undo() {
    if (!lastEvent) return;
    await api.deleteEvent(lastEvent.id);
    setLastEvent(null);
    api.getMatch(id).then(setMatch);
  }

  if (!match) return <p>Loading…</p>;

  const renderRoster = (roster, teamId, teamName) => (
    <div className="roster-column">
      <h3>{teamName}</h3>
      {roster.map((p) => (
        <div key={p.id} className="player-row">
          <span>#{p.jersey_number} {p.name}</span>
          <div className="event-buttons">
            {EVENT_TYPES.map((type) => (
              <button key={type} onClick={() => logEvent(type, p, teamId)}>
                {type}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <h1>Scorer console</h1>
      <p>
        {match.home_team?.name} {match.home_score} — {match.away_score} {match.away_team?.name}
      </p>
      <label>
        Period:{' '}
        <select value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </label>
      <button onClick={undo} disabled={!lastEvent} className="undo-btn">
        Undo last event
      </button>

      <div className="roster-grid">
        {renderRoster(homeRoster, match.home_team_id, match.home_team?.name)}
        {renderRoster(awayRoster, match.away_team_id, match.away_team?.name)}
      </div>
    </div>
  );
}
