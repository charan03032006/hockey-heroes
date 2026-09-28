import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';

const emptyForm = { name: '', jersey_number: '', position: '', is_goalkeeper: false };

export default function TeamDetail() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState('');
  const [editForm, setEditForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const data = await api.getTeam(id);
    setTeam(data);
  };

  useEffect(() => { load().catch((e) => setError(e.message)); }, [id]);

  const addPlayer = async (event) => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      await api.createPlayer({
        team_id: id,
        name: form.name.trim(),
        jersey_number: form.jersey_number === '' ? null : Number(form.jersey_number),
        position: form.position.trim() || null,
        is_goalkeeper: form.is_goalkeeper,
      });
      setForm(emptyForm);
      await load();
      setMessage('Player added to the roster.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const beginEdit = (player) => {
    setEditing(player.id);
    setEditForm({
      name: player.name || '',
      jersey_number: player.jersey_number ?? '',
      position: player.position || '',
      is_goalkeeper: Boolean(player.is_goalkeeper),
    });
    setError(''); setMessage('');
  };

  const savePlayer = async (event) => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      await api.updatePlayer(editing, {
        name: editForm.name.trim(),
        jersey_number: editForm.jersey_number === '' ? null : Number(editForm.jersey_number),
        position: editForm.position.trim() || null,
        is_goalkeeper: editForm.is_goalkeeper,
      });
      setEditing('');
      await load();
      setMessage('Player details updated.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  if (!team) return <div className="page-loading">{error || 'Loading team…'}</div>;

  return (
    <div className="page-shell">
      <div className="page-head">
        <div><span className="eyebrow">TEAM MANAGEMENT</span><h1>{team.name}</h1><p className="muted">{team.short_name || 'Team roster'} · {(team.roster || []).length} players</p></div>
        <Link className="btn btn-ghost" to="/teams">← All teams</Link>
      </div>

      {error && <div className="error" role="alert">{error}</div>}
      {message && <div className="success" role="status">{message}</div>}

      <section className="panel">
        <div className="section-heading"><div><span className="eyebrow">ROSTER</span><h2>Players & positions</h2></div></div>
        {(team.roster || []).length ? <div className="table-wrap"><table><thead><tr><th>Player</th><th>Jersey</th><th>Position</th><th>Role</th><th>Actions</th></tr></thead><tbody>
          {team.roster.map((player) => <tr key={player.id}>
            {editing === player.id ? <td colSpan="5"><form className="roster-edit-form" onSubmit={savePlayer}>
              <input aria-label="Player name" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Full name" />
              <input aria-label="Jersey number" type="number" min="0" max="99" value={editForm.jersey_number} onChange={(e) => setEditForm({ ...editForm, jersey_number: e.target.value })} placeholder="Jersey #" />
              <input aria-label="Position" value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} placeholder="Position" />
              <label><input type="checkbox" checked={editForm.is_goalkeeper} onChange={(e) => setEditForm({ ...editForm, is_goalkeeper: e.target.checked })} /> Goalkeeper</label>
              <button className="btn btn-primary" disabled={busy}>Save</button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing('')}>Cancel</button>
            </form></td> : <>
              <td><Link to={`/players/${player.id}`}><b>{player.name}</b></Link></td>
              <td>#{player.jersey_number ?? '—'}</td><td>{player.position || '—'}</td>
              <td>{player.is_goalkeeper ? <span className="status">GOALKEEPER</span> : 'Field player'}</td>
              <td><button className="btn btn-ghost" onClick={() => beginEdit(player)}>Edit</button></td>
            </>}
          </tr>)}
        </tbody></table></div> : <p className="muted">No players added yet. Add your first player below.</p>}
      </section>

      <section className="panel">
        <div className="section-heading"><div><span className="eyebrow">ROSTER SETUP</span><h2>Add a player</h2></div></div>
        <form className="roster-add-form" onSubmit={addPlayer}>
          <label>Player name<input required maxLength="100" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" /></label>
          <label>Jersey number<input type="number" min="0" max="99" value={form.jersey_number} onChange={(e) => setForm({ ...form, jersey_number: e.target.value })} placeholder="e.g. 10" /></label>
          <label>Position<input maxLength="60" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="e.g. Forward, Defender" /></label>
          <label className="roster-check"><input type="checkbox" checked={form.is_goalkeeper} onChange={(e) => setForm({ ...form, is_goalkeeper: e.target.checked })} /> Designate as goalkeeper</label>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Add player'}</button>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading"><div><span className="eyebrow">MATCH HISTORY</span><h2>Matches</h2></div></div>
        {(team.matches || []).length ? <div className="mini-events">{team.matches.map((match) => <div key={match.id}><span>{match.scheduled_at ? new Date(match.scheduled_at).toLocaleDateString() : '—'}</span><strong><Link to={`/matches/${match.id}`}>{match.home_score ?? 0} — {match.away_score ?? 0}</Link></strong><small>{String(match.status || '').toUpperCase()}</small></div>)}</div> : <p className="muted">No matches yet.</p>}
      </section>
    </div>
  );
}
