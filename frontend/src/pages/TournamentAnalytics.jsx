import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

const label = (value) => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function TournamentAnalytics() {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [standings, setStandings] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const tournaments = await api.getTournaments();
        const current = (tournaments || []).find((item) => item.id === id);
        const [fx, st, lb] = await Promise.all([
          api.getTournamentFixtures(id),
          api.getTournamentStandings(id),
          api.getPlayerLeaderboard(id),
        ]);
        if (!active) return;
        setTournament(current || { id, name: 'Tournament' });
        setFixtures(fx || []);
        setStandings(st?.standings || []);
        setLeaderboard(lb || []);
        setError('');
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  const completed = fixtures.filter((m) => m.status === 'final');
  const live = fixtures.filter((m) => m.status === 'live');
  const scheduled = fixtures.filter((m) => m.status === 'scheduled');
  const totalGoals = completed.reduce((sum, m) => sum + Number(m.home_score || 0) + Number(m.away_score || 0), 0);
  const avgGoals = completed.length ? (totalGoals / completed.length).toFixed(2) : '0.00';
  const topScorer = leaderboard[0];
  const topTeam = standings[0];

  const filteredFixtures = useMemo(() => {
    if (filter === 'completed') return completed;
    if (filter === 'live') return live;
    if (filter === 'scheduled') return scheduled;
    return fixtures;
  }, [filter, fixtures, completed, live, scheduled]);

  if (loading) return <div className="page-loading">Loading tournament analytics…</div>;
  if (error) return <div className="page-loading">Unable to load analytics: {error}</div>;

  return (
    <div className="page-shell">
      <div className="page-head">
        <div>
          <span className="eyebrow">TOURNAMENT ANALYTICS</span>
          <h1>{tournament?.name}</h1>
          <p className="muted">Performance overview, match history and player statistics.</p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ghost" to="/tournaments">← Tournament manager</Link>
        </div>
      </div>

      <section className="dashboard-grid">
        <div className="stat-card"><span>FIXTURES</span><strong>{fixtures.length}</strong><small>{scheduled.length} scheduled</small></div>
        <div className="stat-card"><span>COMPLETED</span><strong>{completed.length}</strong><small>{live.length} live</small></div>
        <div className="stat-card"><span>TOTAL GOALS</span><strong>{totalGoals}</strong><small>{avgGoals} per completed match</small></div>
        <div className="stat-card"><span>LEADER</span><strong>{topScorer?.goals ?? 0}</strong><small>{topScorer?.player?.name || 'No scorer yet'}</small></div>
      </section>

      <div className="manager-layout">
        <section className="panel">
          <div className="section-heading"><div><span className="eyebrow">TABLE LEADER</span><h2>Current leader</h2></div></div>
          {topTeam ? <div className="list-row"><div><b>{topTeam.team?.name}</b><p className="muted">{topTeam.wins}W · {topTeam.draws}D · {topTeam.losses}L · GD {topTeam.goal_difference}</p></div><strong>{topTeam.points} pts</strong></div> : <p className="muted">No completed fixtures yet.</p>}
        </section>
        <section className="panel">
          <div className="section-heading"><div><span className="eyebrow">TOP PLAYER</span><h2>Golden performer</h2></div></div>
          {topScorer ? <Link className="list-row" to={`/players/${topScorer.player_id}`}><div><b>{topScorer.player?.name}</b><p className="muted">{topScorer.team?.name || 'Team'} · {topScorer.assists} assists · {topScorer.matches} GP</p></div><strong>{topScorer.goals} goals</strong></Link> : <p className="muted">No player statistics yet.</p>}
        </section>
      </div>

      <section className="panel">
        <div className="section-heading"><div><span className="eyebrow">MATCH HISTORY</span><h2>Fixtures & results</h2></div><div className="tabs">{[['all','All'],['scheduled','Upcoming'],['live','Live'],['completed','Completed']].map(([value, text]) => <button key={value} className={filter === value ? 'tab active' : 'tab'} onClick={() => setFilter(value)}>{text}</button>)}</div></div>
        <div className="table-wrap"><table><thead><tr><th>Date</th><th>Match</th><th>Status</th><th>Score</th><th>Action</th></tr></thead><tbody>
          {filteredFixtures.map((m) => <tr key={m.id}><td>{m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : '—'}</td><td><b>{m.home_team?.name || 'Home'}</b> <span className="muted">vs</span> <b>{m.away_team?.name || 'Away'}</b></td><td>{label(m.status)}</td><td>{m.status === 'scheduled' ? '—' : `${m.home_score ?? 0} — ${m.away_score ?? 0}`}</td><td><Link className="btn btn-ghost" to={`/matches/${m.id}`}>View</Link>{m.status === 'live' && <Link className="btn btn-primary" to={`/matches/${m.id}/score`}>Score</Link>}</td></tr>)}
          {!filteredFixtures.length && <tr><td colSpan="5">No matches in this view.</td></tr>}
        </tbody></table></div>
      </section>

      <section className="panel">
        <div className="section-heading"><div><span className="eyebrow">PLAYER PERFORMANCE</span><h2>Leaderboard</h2></div></div>
        <div className="table-wrap"><table><thead><tr><th>#</th><th>Player</th><th>Team</th><th>GP</th><th>G</th><th>A</th><th>Shots</th><th>Saves</th><th>Index</th></tr></thead><tbody>
          {leaderboard.slice(0, 10).map((p, index) => <tr key={p.player_id}><td>{index + 1}</td><td><Link to={`/players/${p.player_id}`}><b>{p.player?.name || 'Player'}</b></Link></td><td>{p.team?.short_name || p.team?.name || '—'}</td><td>{p.matches}</td><td>{p.goals}</td><td>{p.assists}</td><td>{p.shots}</td><td>{p.saves}</td><td><b>{p.points}</b></td></tr>)}
          {!leaderboard.length && <tr><td colSpan="9">No player statistics yet.</td></tr>}
        </tbody></table></div>
      </section>
    </div>
  );
}
