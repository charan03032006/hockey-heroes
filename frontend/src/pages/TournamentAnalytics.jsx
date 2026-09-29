import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

const label = (value) => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const number = (value) => Number(value || 0);
const statCards = (totals) => [
  ['Matches', totals.fixtures, `${totals.completed || 0} completed`],
  ['Live now', totals.live, `${totals.scheduled || 0} upcoming`],
  ['Goals', totals.goals, `${number(totals.average_goals).toFixed(2)} per completed match`],
  ['Penalty corners', totals.penalty_corners, 'Recorded events'],
  ['Penalty strokes', totals.penalty_strokes, 'Recorded events'],
  ['Shots', totals.shots, 'Recorded events'],
  ['Saves', totals.saves, 'Recorded events'],
  ['Cards', totals.cards, 'Recorded events'],
  ['Substitutions', totals.substitutions, 'Recorded events'],
];

export default function TournamentAnalytics() {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [standings, setStandings] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [totals, setTotals] = useState({});
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [tournaments, fx, st, lb, analytics] = await Promise.all([
        api.getTournaments(),
        api.getTournamentFixtures(id),
        api.getTournamentStandings(id),
        api.getPlayerLeaderboard(id),
        api.getTournamentAnalytics(id),
      ]);
      const current = (tournaments || []).find((item) => String(item.id) === String(id));
      setTournament(analytics?.tournament || current || { id, name: 'Tournament' });
      setFixtures(Array.isArray(fx) ? fx : []);
      setStandings(st?.standings || []);
      setLeaderboard(Array.isArray(lb) ? lb : []);
      setTotals(analytics?.totals || {});
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e.message || 'Unable to load tournament analytics.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  const completed = fixtures.filter((m) => m.status === 'final');
  const live = fixtures.filter((m) => m.status === 'live');
  const scheduled = fixtures.filter((m) => m.status === 'scheduled');
  const topScorer = leaderboard[0];
  const topTeam = standings[0];
  const filteredFixtures = useMemo(() => {
    if (filter === 'completed') return completed;
    if (filter === 'live') return live;
    if (filter === 'scheduled') return scheduled;
    return fixtures;
  }, [filter, fixtures]);

  const maxGoals = Math.max(1, ...standings.map((row) => number(row.goals_for)));
  const maxPlayerGoals = Math.max(1, ...leaderboard.slice(0, 8).map((row) => number(row.goals)));

  if (loading && !updatedAt) return <div className="page-loading">Loading tournament analytics…</div>;
  if (error && !updatedAt) return <div className="page-loading">Unable to load analytics: {error}</div>;

  return (
    <div className="page-shell">
      <div className="page-head">
        <div>
          <span className="eyebrow">TOURNAMENT ANALYTICS</span>
          <h1>{tournament?.name || 'Tournament'}</h1>
          <p className="muted">Match results, team standings, event totals and player performance.</p>
          {updatedAt && <small className="muted">Updated {updatedAt.toLocaleTimeString()}</small>}
        </div>
        <div className="page-actions">
          <Link className="btn btn-ghost" to="/tournaments">← Tournament manager</Link>
          <button className="btn btn-primary" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : '↻ Refresh'}</button>
        </div>
      </div>

      {error && <div className="admin-error" role="alert">{error}</div>}

      <section className="dashboard-grid">
        {statCards(totals).map(([name, value, hint]) => (
          <div className="stat-card" key={name}><span>{name.toUpperCase()}</span><strong>{number(value)}</strong><small>{hint}</small></div>
        ))}
      </section>

      <div className="manager-layout">
        <section className="panel">
          <div className="section-heading"><div><span className="eyebrow">TEAM PERFORMANCE</span><h2>Goals by team</h2></div></div>
          {standings.length ? <div className="analytics-bars">{standings.slice(0, 8).map((row) => (
            <div className="analytics-bar-row" key={row.team_id}>
              <div className="analytics-bar-label"><span>{row.team?.short_name || row.team?.name || 'Team'}</span><b>{number(row.goals_for)}</b></div>
              <div className="analytics-bar-track"><div className="analytics-bar-fill" style={{ width: `${Math.max(0, number(row.goals_for) / maxGoals * 100)}%` }} /></div>
            </div>
          ))}</div> : <p className="muted">Team statistics will appear when teams are added.</p>}
        </section>
        <section className="panel">
          <div className="section-heading"><div><span className="eyebrow">TOP PERFORMERS</span><h2>Goals by player</h2></div></div>
          {leaderboard.length ? <div className="analytics-bars">{leaderboard.slice(0, 8).map((row) => (
            <div className="analytics-bar-row" key={row.player_id}>
              <div className="analytics-bar-label"><Link to={`/players/${row.player_id}`}>{row.player?.name || 'Player'}</Link><b>{number(row.goals)}</b></div>
              <div className="analytics-bar-track"><div className="analytics-bar-fill analytics-bar-player" style={{ width: `${Math.max(0, number(row.goals) / maxPlayerGoals * 100)}%` }} /></div>
            </div>
          ))}</div> : <p className="muted">No player events have been recorded yet.</p>}
        </section>
      </div>

      <section className="panel">
        <div className="section-heading"><div><span className="eyebrow">POINTS TABLE</span><h2>Team standings</h2></div></div>
        <div className="table-wrap"><table><thead><tr><th>#</th><th>Team</th><th>MP</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead><tbody>
          {standings.map((row, i) => <tr key={row.team_id}><td>{i + 1}</td><td><b>{row.team?.name || 'Team'}</b></td><td>{row.played}</td><td>{row.wins}</td><td>{row.draws}</td><td>{row.losses}</td><td>{row.goals_for}</td><td>{row.goals_against}</td><td>{row.goal_difference}</td><td><b>{row.points}</b></td></tr>)}
          {!standings.length && <tr><td colSpan="10">No standings available yet.</td></tr>}
        </tbody></table></div>
        {topTeam && <p className="muted profile-note">Current table leader: <b>{topTeam.team?.name}</b> · {topTeam.points} points.</p>}
      </section>

      <section className="panel">
        <div className="section-heading"><div><span className="eyebrow">MATCH HISTORY</span><h2>Fixtures & results</h2></div><div className="tabs">{[['all','All'],['scheduled','Upcoming'],['live','Live'],['completed','Completed']].map(([value, text]) => <button key={value} className={filter === value ? 'tab active' : 'tab'} onClick={() => setFilter(value)}>{text}</button>)}</div></div>
        <div className="table-wrap"><table><thead><tr><th>Date</th><th>Match</th><th>Status</th><th>Score</th><th>Action</th></tr></thead><tbody>
          {filteredFixtures.map((m) => <tr key={m.id}><td>{m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : '—'}</td><td><b>{m.home_team?.name || 'Home'}</b> <span className="muted">vs</span> <b>{m.away_team?.name || 'Away'}</b></td><td><span className={`status status-${m.status}`}>{label(m.status)}</span></td><td>{m.status === 'scheduled' ? '—' : `${m.home_score ?? 0} — ${m.away_score ?? 0}`}</td><td><div className="fixture-actions"><Link className="btn btn-ghost" to={`/matches/${m.id}`}>Scorecard</Link>{m.status === 'live' && <Link className="btn btn-primary" to={`/matches/${m.id}/score`}>Live scoring</Link>}</div></td></tr>)}
          {!filteredFixtures.length && <tr><td colSpan="5">No matches in this view.</td></tr>}
        </tbody></table></div>
      </section>

      <section className="panel">
        <div className="section-heading"><div><span className="eyebrow">PLAYER PERFORMANCE</span><h2>Player statistics</h2></div><Link className="btn btn-ghost" to="/leaderboard">Full leaderboard →</Link></div>
        <div className="table-wrap"><table><thead><tr><th>#</th><th>Player</th><th>Team</th><th>GP</th><th>G</th><th>A</th><th>Shots</th><th>Saves</th><th>PC</th><th>PS</th><th>Cards</th><th>Index</th></tr></thead><tbody>
          {leaderboard.slice(0, 20).map((p, index) => <tr key={p.player_id}><td>{index + 1}</td><td><Link to={`/players/${p.player_id}`}><b>{p.player?.name || 'Player'}</b></Link></td><td>{p.team?.short_name || p.team?.name || '—'}</td><td>{p.matches}</td><td>{p.goals}</td><td>{p.assists}</td><td>{p.shots}</td><td>{p.saves}</td><td>{p.penalty_corners ?? 0}</td><td>{p.penalty_strokes ?? 0}</td><td>{p.cards ?? 0}</td><td><b>{p.points}</b></td></tr>)}
          {!leaderboard.length && <tr><td colSpan="12">No player statistics yet.</td></tr>}
        </tbody></table></div>
      </section>
    </div>
  );
}
