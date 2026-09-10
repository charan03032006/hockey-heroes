import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

const tabs = ['Overview', 'Teams & lineups', 'Officials', 'Fixtures', 'Leaderboard'];

export default function TournamentManager() {
  const [tournaments, setTournaments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [teams, setTeams] = useState([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    rule_profile: 'standard',
    points_win: 3,
    points_draw: 1,
    points_loss: 0,
    shootout_enabled: true,
  });

  const load = async () => {
    const [ts, tm] = await Promise.all([api.getTournaments(), api.getTeams()]);
    setTournaments(ts);
    setTeams(tm);
    if (!selected && ts[0]) setSelected(ts[0]);
  };

  useEffect(() => {
    load().catch((e) => setMessage(e.message));
  }, []);

  async function create(e) {
    e.preventDefault();
    const t = await api.createTournament(form);
    setTournaments((v) => [t, ...v]);
    setSelected(t);
    setMessage('Tournament created.');
  }

  async function addTeam(team_id) {
    await api.addTournamentTeam(selected.id, team_id);
    setMessage('Team added to tournament.');
  }

  return (
    <div className="tournament-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">TOURNAMENT MANAGER</span>
          <h1>Run your hockey competition</h1>
          <p className="muted">Create → teams → lineups → officials → fixtures → live score → shoot-out → scorecard → table.</p>
        </div>
        <Link className="btn btn-ghost" to="/admin">← Manage</Link>
      </div>

      <div className="tournament-layout">
        <aside className="tournament-side">
          <div className="side-title">Competitions</div>
          {tournaments.map((t) => (
            <button
              className={selected?.id === t.id ? 'side-item active' : 'side-item'}
              onClick={() => { setSelected(t); setTab('Overview'); }}
              key={t.id}
            >
              <b>{t.name}</b>
              <small>{t.rule_profile} rules</small>
            </button>
          ))}
          {!tournaments.length && <p className="muted">No tournaments yet.</p>}
        </aside>

        <main>
          {!selected ? (
            <section className="admin-card create-tour">
              <span className="eyebrow">START HERE</span>
              <h2>Create tournament</h2>
              <form onSubmit={create}>
                <input placeholder="Tournament name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <select value={form.rule_profile} onChange={(e) => setForm({ ...form, rule_profile: e.target.value })}>
                  <option value="standard">Standard hockey</option>
                  <option value="custom">Custom competition</option>
                </select>
                <div className="form-row">
                  <input type="number" min="0" value={form.points_win} onChange={(e) => setForm({ ...form, points_win: +e.target.value })} />
                  <input type="number" min="0" value={form.points_draw} onChange={(e) => setForm({ ...form, points_draw: +e.target.value })} />
                  <input type="number" min="0" value={form.points_loss} onChange={(e) => setForm({ ...form, points_loss: +e.target.value })} />
                </div>
                <label className="check-row">
                  <input type="checkbox" checked={form.shootout_enabled} onChange={(e) => setForm({ ...form, shootout_enabled: e.target.checked })} />
                  Enable knockout shoot-outs
                </label>
                <button>Create tournament →</button>
              </form>
            </section>
          ) : (
            <>
              <div className="tour-hero">
                <div>
                  <span className="eyebrow">ACTIVE COMPETITION</span>
                  <h2>{selected.name}</h2>
                  <p>{selected.rule_profile === 'standard' ? 'Standard hockey rules' : 'Custom rules'} · {selected.shootout_enabled ? 'Shoot-outs enabled' : 'Shoot-outs disabled'}</p>
                </div>
                <div className="tour-score"><b>{selected.points_win}</b><small>WIN POINTS</small></div>
              </div>

              <div className="manager-tabs">
                {tabs.map((t) => <button className={tab === t ? 'active' : ''} onClick={() => setTab(t)} key={t}>{t}</button>)}
              </div>

              {tab === 'Overview' && (
                <section className="manager-grid">
                  <div className="admin-card"><span className="eyebrow">01</span><h3>Rules</h3><p className="muted">Win {selected.points_win} · Draw {selected.points_draw} · Loss {selected.points_loss} points. Regulation: 4 × 15 minutes.</p></div>
                  <div className="admin-card"><span className="eyebrow">02</span><h3>Workflow</h3><p className="muted">Teams → lineups → officials → fixtures → scoring → shoot-out → scorecard → table.</p></div>
                </section>
              )}

              {tab === 'Teams & lineups' && (
                <section className="admin-card">
                  <span className="eyebrow">02 · TEAMS & LINEUPS</span><h2>Add teams</h2>
                  <div className="manager-team-list">
                    {teams.map((t) => <div key={t.id}><span><b>{t.name}</b><small>{t.short_name || 'Team'}</small></span><button onClick={() => addTeam(t.id)}>Add to tournament</button></div>)}
                  </div>
                  <p className="muted">Lineups and goalkeeper selection are completed on the fixture before kickoff.</p>
                </section>
              )}

              {tab === 'Officials' && (
                <section className="admin-card"><span className="eyebrow">03 · OFFICIALS</span><h2>Assign officials</h2><p className="muted">Each fixture supports assigned officials and scorer roles.</p><div className="info-callout">Create a fixture, then assign its umpire, technical official and scorer.</div></section>
              )}

              {tab === 'Fixtures' && (
                <section className="admin-card"><span className="eyebrow">04 · FIXTURES</span><h2>Operate matches</h2><p className="muted">Every fixture connects to the live scorer and public match centre.</p><Link className="btn btn-primary" to="/admin">Open fixture manager →</Link></section>
              )}

              {tab === 'Leaderboard' && (
                <section className="admin-card">
                  <span className="eyebrow">05 · LEADERBOARD</span><h2>Points & player leaders</h2>
                  <p className="muted">Completed match results and events drive standings, goals, assists, shots, saves and discipline.</p>
                  <div className="leaderboard-preview"><b>🏆 Points table</b><span>Wins, draws, losses and goal difference.</span><b>🥇 Player leaderboard</b><span>Top scorers and contributors from match events.</span></div>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      {message && <div className="admin-success">✓ {message}</div>}
    </div>
  );
}
