import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

const categories = [
  ['goals', 'Goals'], ['assists', 'Assists'], ['points', 'Points'],
  ['saves', 'Saves'], ['shots', 'Shots'], ['penalty_corners', 'Penalty corners'],
  ['penalty_strokes', 'Penalty strokes'],
];

export default function Leaderboard() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [rows, setRows] = useState([]);
  const [category, setCategory] = useState('goals');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.getTournaments().then((data) => {
      if (!active) return;
      const list = data || [];
      setTournaments(list);
      if (list.length) setSelectedId(String(list[0].id));
      else setBusy(false);
    }).catch((e) => { if (active) { setError(e.message); setBusy(false); } });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedId) { setRows([]); return; }
    let active = true;
    setBusy(true); setError('');
    api.getPlayerLeaderboard(selectedId).then((data) => { if (active) setRows(data || []); })
      .catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [selectedId]);

  const ranked = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => !term || [row.player?.name, row.team?.name, row.player?.position].some((v) => String(v || '').toLowerCase().includes(term)))
      .sort((a, b) => Number(b[category] || 0) - Number(a[category] || 0) ||
        Number(b.goals || 0) - Number(a.goals || 0) ||
        Number(b.assists || 0) - Number(a.assists || 0) ||
        String(a.player?.name || '').localeCompare(String(b.player?.name || '')));
  }, [rows, category, query]);

  return <div className="page-shell">
    <div className="page-head"><div><span className="eyebrow">PLAYER LEADERBOARD</span><h1>Top performers</h1><p className="muted">Compare player statistics from completed matches in a tournament.</p></div><Link className="btn btn-ghost" to="/tournaments">Manage tournaments →</Link></div>
    <section className="panel">
      <div className="form-row">
        <label className="field-label">Tournament<select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}><option value="">Choose tournament</option>{tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label className="field-label">Rank by<select value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
      </div>
      <input aria-label="Search players or teams" placeholder="Search player, team, or position…" value={query} onChange={(e) => setQuery(e.target.value)} />
    </section>
    {error && <div className="admin-error">Unable to load leaderboard: {error}</div>}
    <section className="panel">
      <div className="section-heading"><div><span className="eyebrow">RANKINGS</span><h2>{categories.find(([value]) => value === category)?.[1]} leaders</h2></div><span className="muted">{ranked.length} players</span></div>
      {busy ? <p className="muted">Loading leaderboard…</p> : ranked.length ? <div className="table-wrap"><table><thead><tr><th>#</th><th>Player</th><th>Team</th><th>MP</th><th>G</th><th>A</th><th>Shots</th><th>Saves</th><th>PC</th><th>PS</th><th>Points</th></tr></thead><tbody>{ranked.map((row, index) => <tr key={row.player_id}><td><b>{index + 1}</b></td><td><Link to={`/players/${row.player_id}`}><b>#{row.player?.jersey_number ?? '—'} {row.player?.name || 'Player'}</b></Link><small className="muted">{row.player?.position || ''}</small></td><td>{row.team?.name || '—'}</td><td>{row.matches ?? 0}</td><td>{row.goals ?? 0}</td><td>{row.assists ?? 0}</td><td>{row.shots ?? 0}</td><td>{row.saves ?? 0}</td><td>{row.penalty_corners ?? 0}</td><td>{row.penalty_strokes ?? 0}</td><td><b>{row.points ?? 0}</b></td></tr>)}</tbody></table></div> : <p className="muted">{tournaments.length ? 'No player stats yet. Complete matches and record events to populate rankings.' : 'No tournaments are available yet.'}</p>}
    </section>
  </div>;
}
