import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/AuthContext.jsx';

const tabs = ['Overview', 'Teams & lineups', 'Officials', 'Fixtures'];
const roles = [
  ['umpire_1', 'Umpire 1'],
  ['umpire_2', 'Umpire 2'],
  ['technical_official', 'Technical official'],
  ['scorer', 'Match scorer'],
];

export default function TournamentManager() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [teams, setTeams] = useState([]);
  const [tournamentTeams, setTournamentTeams] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [fixture, setFixture] = useState(null);
  const [rosters, setRosters] = useState({});
  const [lineups, setLineups] = useState({});
  const [officials, setOfficials] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fixtureForm, setFixtureForm] = useState({ home_team_id: '', away_team_id: '', scheduled_at: '' });
  const [form, setForm] = useState({ name: '', rule_profile: 'standard', points_win: 3, points_draw: 1, points_loss: 0, shootout_enabled: true });

  async function loadBase() {
    const [ts, tm] = await Promise.all([api.getTournaments(), api.getTeams()]);
    setTournaments(ts || []);
    setTeams(tm || []);
    if (!selected && ts?.[0]) setSelected(ts[0]);
  }

  async function loadTournament(tournament) {
    if (!tournament) return;
    setError('');
    try {
      const [tt, fs] = await Promise.all([api.getTournamentTeams(tournament.id), api.getTournamentFixtures(tournament.id)]);
      setTournamentTeams(tt || []);
      setFixtures(fs || []);
      setFixture(null);
      setReadiness(null);
      setOfficials([]);
    } catch (e) { setError(e.message); }
  }

  useEffect(() => { loadBase().catch((e) => setError(e.message)); }, []);
  useEffect(() => { loadTournament(selected); }, [selected?.id]);

  async function create(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const t = await api.createTournament(form);
      setTournaments((v) => [t, ...v]); setSelected(t); setTab('Teams & lineups'); setMessage('Tournament created.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function addTeam(teamId) {
    setBusy(true); setError('');
    try {
      await api.addTournamentTeam(selected.id, teamId);
      await loadTournament(selected);
      setMessage('Team added to tournament.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function loadRoster(teamId) {
    if (rosters[teamId]) return rosters[teamId];
    const team = await api.getTeam(teamId);
    const roster = team.roster || [];
    setRosters((v) => ({ ...v, [teamId]: roster }));
    return roster;
  }

  async function selectFixture(f) {
    setFixture(f); setError(''); setMessage('');
    try {
      const [ls, os, r] = await Promise.all([api.getMatchLineups(f.id), api.getMatchOfficials(f.id), api.getMatchReadiness(f.id)]);
      setOfficials(os || []); setReadiness(r);
      const next = {};
      for (const teamId of [f.home_team_id, f.away_team_id]) {
        const roster = await loadRoster(teamId);
        const saved = (ls || []).filter((x) => x.team_id === teamId);
        next[teamId] = saved.length ? saved.reduce((acc, x) => ({ ...acc, [x.player_id]: { starting: !!x.is_starting, goalkeeper: !!x.is_goalkeeper } }), {}) : Object.fromEntries(roster.map((p) => [p.id, { starting: false, goalkeeper: false }]));
      }
      setLineups(next);
    } catch (e) { setError(e.message); }
  }

  function togglePlayer(teamId, playerId, field) {
    setLineups((current) => {
      const team = { ...(current[teamId] || {}) };
      const player = { ...(team[playerId] || {}) };
      if (field === 'starting') player.starting = !player.starting;
      if (field === 'goalkeeper') {
        Object.keys(team).forEach((id) => { team[id] = { ...(team[id] || {}), goalkeeper: false }; });
        player.goalkeeper = true; player.starting = true;
      }
      team[playerId] = player;
      return { ...current, [teamId]: team };
    });
  }

  async function saveLineups() {
    if (!fixture) return;
    setBusy(true); setError('');
    try {
      const payload = [];
      for (const teamId of [fixture.home_team_id, fixture.away_team_id]) {
        const roster = await loadRoster(teamId);
        const selectedPlayers = roster.filter((p) => lineups[teamId]?.[p.id]?.starting || lineups[teamId]?.[p.id]?.goalkeeper);
        const starters = selectedPlayers.filter((p) => lineups[teamId]?.[p.id]?.starting);
        const keepers = selectedPlayers.filter((p) => lineups[teamId]?.[p.id]?.goalkeeper);
        if (selectedPlayers.length < 11 || selectedPlayers.length > 18) throw new Error(`${pTeamName(teamId)} needs 11–18 matchday players.`);
        if (starters.length !== 11) throw new Error(`${pTeamName(teamId)} needs exactly 11 starting players.`);
        if (keepers.length !== 1 || !lineups[teamId][keepers[0].id].starting) throw new Error(`${pTeamName(teamId)} needs exactly one starting goalkeeper.`);
        payload.push(...selectedPlayers.map((p) => ({ player_id: p.id, team_id: teamId, is_starting: !!lineups[teamId][p.id].starting, is_goalkeeper: !!lineups[teamId][p.id].goalkeeper })));
      }
      await api.saveMatchLineups(fixture.id, payload);
      const r = await api.getMatchReadiness(fixture.id); setReadiness(r); setMessage('Lineups saved and validated.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  function pTeamName(teamId) {
    return teams.find((t) => t.id === teamId)?.name || tournamentTeams.find((t) => t.team_id === teamId)?.team?.name || 'Team';
  }

  async function createFixture(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const f = await api.createTournamentFixture(selected.id, fixtureForm);
      setFixtures((v) => [...v, f]); setFixtureForm({ home_team_id: '', away_team_id: '', scheduled_at: '' }); setFixture(f); setTab('Fixtures'); setMessage('Fixture created. Configure lineups and officials before kickoff.');
      await selectFixture(f);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function saveOfficials() {
    if (!fixture || !user?.id) return setError('You must be signed in to assign officials.');
    setBusy(true); setError('');
    try {
      await api.saveMatchOfficials(fixture.id, officials);
      setOfficials(await api.getMatchOfficials(fixture.id));
      setReadiness(await api.getMatchReadiness(fixture.id));
      setMessage('Officials saved.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  function assignMe(role) {
    if (!user?.id) return setError('No signed-in user is available.');
    setOfficials((current) => [...current.filter((x) => x.role !== role), { user_id: user.id, role }]);
  }

  async function startMatch() {
    if (!fixture) return;
    setBusy(true); setError('');
    try {
      const r = await api.getMatchReadiness(fixture.id); setReadiness(r);
      if (!r.ready) throw new Error('Pre-match checks are incomplete. Finish both lineups, starting goalkeepers, Umpire 1 and Match scorer.');
      const updated = await api.updateMatch(fixture.id, { status: 'live', clock_running: true });
      setFixture(updated); setFixtures((v) => v.map((f) => f.id === updated.id ? { ...f, ...updated } : f)); setMessage('Match started.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const assignedRoles = useMemo(() => new Set(officials.map((x) => x.role)), [officials]);
  const tournamentTeamIds = useMemo(() => new Set(tournamentTeams.map((x) => x.team_id)), [tournamentTeams]);
  const selectableTeams = teams.filter((t) => !tournamentTeamIds.has(t.id));

  if (!selected) {
    return <div className="tournament-page"><div className="page-head"><div><span className="eyebrow">TOURNAMENT MANAGER</span><h1>Create your first competition</h1><p className="muted">Build teams, lineups, officials and fixtures in one place.</p></div><Link className="btn btn-ghost" to="/admin">← Manage</Link></div><section className="admin-card create-tour"><span className="eyebrow">START HERE</span><h2>Create tournament</h2><form onSubmit={create}><input placeholder="Tournament name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /><select value={form.rule_profile} onChange={(e) => setForm({ ...form, rule_profile: e.target.value })}><option value="standard">Standard hockey</option><option value="custom">Custom competition</option></select><div className="form-row"><input type="number" min="0" value={form.points_win} onChange={(e) => setForm({ ...form, points_win: Number(e.target.value) })} /><input type="number" min="0" value={form.points_draw} onChange={(e) => setForm({ ...form, points_draw: Number(e.target.value) })} /><input type="number" min="0" value={form.points_loss} onChange={(e) => setForm({ ...form, points_loss: Number(e.target.value) })} /></div><label className="check-row"><input type="checkbox" checked={form.shootout_enabled} onChange={(e) => setForm({ ...form, shootout_enabled: e.target.checked })} /> Enable knockout shoot-outs</label><button disabled={busy}>{busy ? 'Creating…' : 'Create tournament →'}</button></form></section>{error && <div className="admin-error">{error}</div>}</div>;
  }

  return (
    <div className="tournament-page">
      <div className="page-head"><div><span className="eyebrow">TOURNAMENT MANAGER</span><h1>{selected.name}</h1><p className="muted">Create → teams → lineups → officials → fixtures → kickoff.</p></div><Link className="btn btn-ghost" to="/admin">← Manage</Link></div>
      <div className="tournament-layout">
        <aside className="tournament-side"><div className="side-title">Competitions</div>{tournaments.map((t) => <button className={selected.id === t.id ? 'side-item active' : 'side-item'} key={t.id} onClick={() => { setSelected(t); setTab('Overview'); }}><b>{t.name}</b><small>{t.rule_profile} rules</small></button>)}</aside>
        <main>
          <div className="tour-hero"><div><span className="eyebrow">ACTIVE COMPETITION</span><h2>{selected.name}</h2><p>{selected.shootout_enabled ? 'Shoot-outs enabled' : 'Shoot-outs disabled'} · {tournamentTeams.length} teams · {fixtures.length} fixtures</p></div><div className="tour-score"><b>{selected.points_win}</b><small>WIN POINTS</small></div></div>
          <div className="manager-tabs">{tabs.map((t) => <button className={tab === t ? 'active' : ''} onClick={() => setTab(t)} key={t}>{t}</button>)}</div>

          {tab === 'Overview' && <section className="manager-grid"><div className="admin-card"><span className="eyebrow">01</span><h3>Competition rules</h3><p className="muted">Win {selected.points_win} · Draw {selected.points_draw} · Loss {selected.points_loss} points. Regulation is 4 × 15 minutes.</p></div><div className="admin-card"><span className="eyebrow">02</span><h3>Pre-match gate</h3><p className="muted">A match can start only after both teams have valid 11-player starting lineups, one starting goalkeeper each, Umpire 1 and a match scorer.</p></div></section>}

          {tab === 'Teams & lineups' && <section className="admin-card"><span className="eyebrow">01 · TEAMS</span><h2>Tournament teams</h2><p className="muted">Add teams to this competition. Lineups are configured for an individual fixture.</p><div className="manager-team-list">{tournamentTeams.map((m) => <div key={m.team_id}><span><b>{m.team?.name || pTeamName(m.team_id)}</b><small>{m.team?.short_name || 'Tournament team'}</small></span><span className="status">ADDED</span></div>)}{selectableTeams.map((t) => <div key={t.id}><span><b>{t.name}</b><small>{t.short_name || 'Team'}</small></span><button disabled={busy} onClick={() => addTeam(t.id)}>Add to tournament</button></div>)}{!teams.length && <p className="muted">Create teams in Admin first.</p>}</div><div className="info-callout"><b>Lineup rules</b><br />Each matchday squad must contain 11–18 players, exactly 11 starters and exactly one starting goalkeeper.</div>{fixture && <LineupEditor fixture={fixture} tournamentTeams={tournamentTeams} rosters={rosters} lineups={lineups} loadRoster={loadRoster} togglePlayer={togglePlayer} saveLineups={saveLineups} busy={busy} pTeamName={pTeamName} />}</section>}

          {tab === 'Officials' && <section className="admin-card"><span className="eyebrow">03 · OFFICIALS</span><h2>Assign officials</h2><p className="muted">Select a fixture, then assign the signed-in official to the required roles.</p><select value={fixture?.id || ''} onChange={(e) => { const f = fixtures.find((x) => x.id === e.target.value); if (f) selectFixture(f); }}><option value="">Select fixture</option>{fixtures.map((f) => <option key={f.id} value={f.id}>{f.home_team?.name} vs {f.away_team?.name}</option>)}</select>{fixture && <div className="manager-team-list">{roles.map(([role, label]) => { const assigned = officials.find((x) => x.role === role); return <div key={role}><span><b>{label}</b><small>{assigned ? 'Assigned' : 'Not assigned'}</small></span><button type="button" onClick={() => assignMe(role)}>{assigned?.user_id === user?.id ? 'Assigned to me' : 'Assign me'}</button></div>; })}<button className="btn btn-primary" disabled={busy || !assignedRoles.size} onClick={saveOfficials}>Save officials →</button></div>}</section>}

          {tab === 'Fixtures' && <section className="admin-card"><span className="eyebrow">04 · FIXTURES</span><h2>Create & prepare fixtures</h2><form onSubmit={createFixture}><div className="form-row"><select value={fixtureForm.home_team_id} onChange={(e) => setFixtureForm({ ...fixtureForm, home_team_id: e.target.value })} required><option value="">Home team</option>{tournamentTeams.map((m) => <option key={m.team_id} value={m.team_id}>{m.team?.name || pTeamName(m.team_id)}</option>)}</select><select value={fixtureForm.away_team_id} onChange={(e) => setFixtureForm({ ...fixtureForm, away_team_id: e.target.value })} required><option value="">Away team</option>{tournamentTeams.map((m) => <option key={m.team_id} value={m.team_id}>{m.team?.name || pTeamName(m.team_id)}</option>)}</select></div><input type="datetime-local" value={fixtureForm.scheduled_at} onChange={(e) => setFixtureForm({ ...fixtureForm, scheduled_at: e.target.value })} required /><button disabled={busy || tournamentTeams.length < 2}>{busy ? 'Saving…' : 'Create fixture →'}</button></form><div className="fixture-list">{fixtures.map((f) => <div className={fixture?.id === f.id ? 'fixture-item active' : 'fixture-item'} key={f.id}><div><b>{f.home_team?.name || pTeamName(f.home_team_id)} <span>vs</span> {f.away_team?.name || pTeamName(f.away_team_id)}</b><small>{f.scheduled_at ? new Date(f.scheduled_at).toLocaleString() : 'No time'} · {String(f.status).toUpperCase()}</small></div><div className="fixture-actions"><button onClick={() => { selectFixture(f); setTab('Teams & lineups'); }}>Lineups</button><button onClick={() => { selectFixture(f); setTab('Officials'); }}>Officials</button>{f.status === 'scheduled' && <button className="btn btn-primary" onClick={() => { selectFixture(f); setTab('Fixtures'); }}>Prepare</button>}</div></div>)}{!fixtures.length && <p className="muted">No fixtures yet. Add at least two tournament teams first.</p>}</div>{fixture && <div className="pre-match"><div><span className="eyebrow">PRE-MATCH CHECK</span><h3>{fixture.home_team?.name || pTeamName(fixture.home_team_id)} vs {fixture.away_team?.name || pTeamName(fixture.away_team_id)}</h3></div><div className="check-list">{readiness?.checks?.map((c, i) => <div key={i}>{c.team_id ? <><span>{pTeamName(c.team_id)}</span><b>{c.starting_players && c.goalkeeper ? '✓ Ready' : '⚠ Incomplete'}</b></> : <><span>Officials</span><b>{c.officials ? '✓ Ready' : '⚠ Umpire 1 + scorer required'}</b></>}</div>)}</div><button className="btn btn-primary" disabled={busy || !readiness?.ready || fixture.status !== 'scheduled'} onClick={startMatch}>{fixture.status === 'live' ? 'Match live' : readiness?.ready ? 'Start match →' : 'Complete checks to start'}</button>{fixture.status === 'live' && <Link className="btn btn-ghost" to={`/matches/${fixture.id}/score`}>Open scorer console →</Link>}</div>}</section>}
        </main>
      </div>
      {message && <div className="admin-success">✓ {message}</div>}
      {error && <div className="admin-error">{error}</div>}
    </div>
  );
}

function LineupEditor({ fixture, tournamentTeams, rosters, lineups, loadRoster, togglePlayer, saveLineups, busy, pTeamName }) {
  return <div className="lineup-editor"><div className="section-heading"><div><span className="eyebrow">LINEUP BUILDER</span><h3>{pTeamName(fixture.home_team_id)} vs {pTeamName(fixture.away_team_id)}</h3></div></div><div className="manager-grid">{[fixture.home_team_id, fixture.away_team_id].map((teamId) => { const roster = rosters[teamId] || []; const state = lineups[teamId] || {}; const starters = roster.filter((p) => state[p.id]?.starting).length; const selectedCount = roster.filter((p) => state[p.id]?.starting || state[p.id]?.goalkeeper).length; return <div className="admin-card" key={teamId}><span className="eyebrow">{pTeamName(teamId)}</span><h3>{starters}/11 starters · {selectedCount}/18 squad</h3>{!roster.length ? <button onClick={() => loadRoster(teamId)}>Load roster</button> : <div className="player-pick-list">{roster.map((p) => <div key={p.id}><label><input type="checkbox" checked={!!state[p.id]?.starting} onChange={() => togglePlayer(teamId, p.id, 'starting')} /> <b>#{p.jersey_number ?? '—'} {p.name}</b><small>{p.position || 'Player'}</small></label><button type="button" className={state[p.id]?.goalkeeper ? 'active' : ''} onClick={() => togglePlayer(teamId, p.id, 'goalkeeper')}>{state[p.id]?.goalkeeper ? 'GK ✓' : 'GK'}</button></div>)}</div>}</div>; })}</div><button className="btn btn-primary" disabled={busy} onClick={saveLineups}>{busy ? 'Saving…' : 'Save & validate lineups →'}</button></div>;
}
