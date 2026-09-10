import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';

const EVENTS = [
  ['goal', 'Goal', 'Adds 1 to the score'],
  ['assist', 'Assist', 'Goal assist'],
  ['penalty_corner', 'Penalty corner', 'PC awarded'],
  ['penalty_stroke', 'Penalty stroke', 'PS awarded'],
  ['shot', 'Shot', 'Shot attempt'],
  ['save', 'Save', 'Goalkeeper save'],
  ['card', 'Card', 'Green / yellow / red'],
];

const clockLabel = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export default function Scorer() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [home, setHome] = useState([]);
  const [away, setAway] = useState([]);
  const [events, setEvents] = useState([]);
  const [period, setPeriod] = useState(1);
  const [clock, setClock] = useState(0);
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState(null);
  const [subOut, setSubOut] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [shootoutHome, setShootoutHome] = useState(0);
  const [shootoutAway, setShootoutAway] = useState(0);
  const [shootoutMode, setShootoutMode] = useState(false);

  const load = async () => {
    const m = await api.getMatch(id);
    setMatch(m);
    setPeriod(Number(m.current_period || 1));
    setClock(Number(m.clock_seconds || 0));
    setRunning(Boolean(m.clock_running));
    setShootoutHome(Number(m.shootout_home || 0));
    setShootoutAway(Number(m.shootout_away || 0));
    const [h, a, e] = await Promise.all([api.getTeam(m.home_team_id), api.getTeam(m.away_team_id), api.getEvents(id)]);
    setHome(h.roster || []);
    setAway(a.roster || []);
    setEvents(e || []);
  };

  useEffect(() => { load().catch((e) => setMessage(e.message)); }, [id]);
  useEffect(() => {
    if (!running || shootoutMode) return undefined;
    const timer = setInterval(() => setClock((value) => {
      if (value >= 900) { setRunning(false); return 900; }
      return value + 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [running, shootoutMode]);

  const homeName = match?.home_team?.name || 'Home';
  const awayName = match?.away_team?.name || 'Away';
  const selectedTeam = selected?.teamId === match?.home_team_id ? homeName : awayName;
  const selectedRoster = selected?.teamId === match?.home_team_id ? home : away;
  const hasTie = Number(match?.home_score || 0) === Number(match?.away_score || 0);
  const canShootout = match?.status === 'live' && period === 4 && clock >= 900 && hasTie;
  const stats = useMemo(() => {
    const count = (teamId, type) => events.filter((e) => e.team_id === teamId && e.type === type).length;
    return { hc: count(match?.home_team_id, 'penalty_corner'), ac: count(match?.away_team_id, 'penalty_corner'), hs: count(match?.home_team_id, 'penalty_stroke'), as: count(match?.away_team_id, 'penalty_stroke') };
  }, [events, match]);

  const saveMatch = async (patch) => {
    const next = await api.updateMatch(id, patch);
    setMatch((value) => ({ ...value, ...next }));
    setPeriod(Number(next.current_period ?? period));
    setClock(Number(next.clock_seconds ?? clock));
    setRunning(Boolean(next.clock_running));
    return next;
  };

  const toggleClock = async () => {
    try { setMessage(''); const next = !running; setRunning(next); await saveMatch({ status: 'live', clock_running: next, current_period: period, clock_seconds: clock }); }
    catch (e) { setRunning(false); setMessage(e.message); }
  };

  const endPeriod = async () => {
    try {
      setMessage('');
      setRunning(false);
      if (period < 4) await saveMatch({ status: 'live', current_period: period + 1, clock_seconds: 0, clock_running: false });
      else await saveMatch({ status: 'live', current_period: 4, clock_seconds: 900, clock_running: false });
    } catch (e) { setMessage(e.message); }
  };

  const logEvent = async (type) => {
    if (!selected || busy) return;
    setBusy(true); setMessage('');
    try {
      const extra = {};
      if (type === 'card') {
        const card = window.prompt('Card type: green, yellow or red', 'green');
        if (!card) return;
        extra.card_type = card.toLowerCase();
      }
      const event = await api.createEvent(id, {
        player_id: selected.player.id,
        team_id: selected.teamId,
        type,
        period,
        game_time: clockLabel(clock),
        ...extra,
      });
      setEvents((value) => [event, ...value]);
      if (type === 'goal') setMatch(await api.getMatch(id));
      setSelected(null);
    } catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  };

  const logSubstitution = async () => {
    if (!selected || !subOut || selected.player.id === subOut) return;
    setBusy(true); setMessage('');
    try {
      const event = await api.createEvent(id, {
        player_id: selected.player.id,
        related_player_id: subOut,
        team_id: selected.teamId,
        type: 'substitution',
        period,
        game_time: clockLabel(clock),
        substitution_in: true,
        substitution_out: true,
      });
      setEvents((value) => [event, ...value]); setSelected(null); setSubOut('');
    } catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  };

  const undo = async () => {
    if (!events.length) return;
    setBusy(true); setMessage('');
    try { await api.deleteEvent(events[0].id); await load(); }
    catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  };

  const addShootout = async (team) => {
    const field = team === 'home' ? 'shootout_home' : 'shootout_away';
    const value = team === 'home' ? shootoutHome + 1 : shootoutAway + 1;
    try {
      setMessage('');
      await saveMatch({ [field]: value, tiebreaker: `${shootoutHome + (team === 'home' ? 1 : 0)}-${shootoutAway + (team === 'away' ? 1 : 0)}` });
      if (team === 'home') setShootoutHome(value); else setShootoutAway(value);
    } catch (e) { setMessage(e.message); }
  };

  const finish = async () => {
    try {
      setMessage('');
      if (hasTie && (shootoutHome === shootoutAway)) { setMessage('The shoot-out is still tied. Record the deciding attempt first.'); return; }
      setRunning(false);
      await saveMatch({ status: 'final', clock_running: false, clock_seconds: clock, tiebreaker: shootoutMode ? `${shootoutHome}-${shootoutAway}` : null });
      setShootoutMode(false);
      setMessage('Final score locked successfully.');
    } catch (e) { setMessage(e.message); }
  };

  if (!match) return <div className="page-loading">Loading scorer console…</div>;

  const renderTeam = (roster, teamId, name) => (
    <section className="scorer-team" key={teamId}>
      <div className="team-header"><div><span className="eyebrow">{teamId === match.home_team_id ? 'HOME' : 'AWAY'}</span><h2>{name}</h2></div><span className="team-score">{teamId === match.home_team_id ? match.home_score : match.away_score}</span></div>
      <div className="scorer-player-grid">{roster.map((player) => (
        <button key={player.id} className={selected?.player?.id === player.id ? 'player-select selected' : 'player-select'} onClick={() => { setSelected({ player, teamId }); setSubOut(''); }}>
          <b>#{player.jersey_number ?? '—'}</b><span>{player.name}<small>{player.position || 'Player'}</small></span>
        </button>
      ))}</div>
    </section>
  );

  return <div className="scorer-page">
    <div className="scorer-help"><b>Phase 2 · Live scoring</b><span>Record goals, cards, PCs, strokes, shots, saves and substitutions with a period clock.</span></div>
    <div className="scorer-topbar"><div><span className="eyebrow">MATCH CONTROL</span><h1>{homeName} <span>vs</span> {awayName}</h1></div><div className="clock-panel"><small>PERIOD {period} / 4</small><strong>{clockLabel(clock)}</strong><span>{running ? 'CLOCK RUNNING' : 'CLOCK PAUSED'}</span></div></div>
    <section className="operator-score"><div><span>{homeName}</span><strong>{match.home_score ?? 0}</strong></div><div className="operator-vs">P{period}</div><div><span>{awayName}</span><strong>{match.away_score ?? 0}</strong></div></section>
    <div className="match-controls">
      <button className="btn btn-primary" onClick={toggleClock} disabled={match.status === 'final' || shootoutMode}>{running ? 'Pause clock' : 'Start clock'}</button>
      <button className="btn btn-ghost" onClick={endPeriod} disabled={match.status === 'final' || running || shootoutMode}>{period < 4 ? 'End period →' : 'End regulation'}</button>
      <button className="btn btn-ghost" onClick={undo} disabled={!events.length || busy || match.status === 'final'}>↶ Undo last</button>
      {canShootout && <button className="btn btn-primary" onClick={() => setShootoutMode(true)}>Start shoot-out</button>}
      <button className="btn btn-danger" onClick={finish} disabled={match.status === 'final'}>Finish match</button>
    </div>

    {shootoutMode && <section className="event-dock">
      <div><span className="eyebrow">SHOOT-OUT</span><h2>{homeName} {shootoutHome} — {shootoutAway} {awayName}</h2><p className="muted">Record each successful attempt. Misses can simply be skipped.</p></div>
      <div className="event-actions"><button onClick={() => addShootout('home')} disabled={busy}><b>{homeName} goal</b><small>Successful attempt</small></button><button onClick={() => addShootout('away')} disabled={busy}><b>{awayName} goal</b><small>Successful attempt</small></button><button onClick={() => { if (shootoutHome !== shootoutAway) setShootoutMode(false); }} disabled={shootoutHome === shootoutAway}>End shoot-out</button></div>
    </section>}

    {selected && !shootoutMode && <section className="event-dock"><div><span className="eyebrow">SELECTED PLAYER</span><h2>#{selected.player.jersey_number ?? '—'} {selected.player.name}</h2><p className="muted">{selectedTeam} · {selected.player.position || 'Player'}</p></div><div className="event-actions">{EVENTS.map(([type, label, hint]) => <button key={type} disabled={busy || match.status === 'final'} onClick={() => logEvent(type)}><b>{label}</b><small>{hint}</small></button>)}<select value={subOut} onChange={(e) => setSubOut(e.target.value)}><option value="">Outgoing player…</option>{selectedRoster.filter((p) => p.id !== selected.player.id).map((p) => <option key={p.id} value={p.id}>#{p.jersey_number ?? '—'} {p.name}</option>)}</select><button disabled={busy || !subOut || match.status === 'final'} onClick={logSubstitution}><b>Substitution</b><small>Selected player in</small></button></div></section>}
    {!selected && !shootoutMode && <div className="select-prompt">Choose a player below to record an event.</div>}
    {message && <div className="admin-success">{message}</div>}

    <div className="scorer-grid">{renderTeam(home, match.home_team_id, homeName)}{renderTeam(away, match.away_team_id, awayName)}</div>
    <section className="scorer-timeline"><div className="section-heading"><div><span className="eyebrow">LIVE LOG</span><h2>Match events</h2></div><span className="event-count">{events.length} events</span></div>{events.length ? <div className="mini-events">{events.map((event) => <div key={event.id}><span>P{event.period} · {event.game_time || '—'}</span><strong>{String(event.type).replaceAll('_', ' ')}</strong><small>{event.player?.name || 'Team event'}{event.type === 'substitution' && event.related_player?.name ? ` → ${event.related_player.name}` : ''}</small></div>)}</div> : <p className="muted">No events recorded yet.</p>}</section>
    <Link className="btn btn-ghost" to={`/matches/${id}`}>View final/live scorecard →</Link>
  </div>;
}
