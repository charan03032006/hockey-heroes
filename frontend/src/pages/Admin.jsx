import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function Admin() {
  const [teams,setTeams]=useState([]); const [teamName,setTeamName]=useState(''); const [playerForm,setPlayerForm]=useState({team_id:'',name:'',jersey_number:'',position:''}); const [matchForm,setMatchForm]=useState({home_team_id:'',away_team_id:'',scheduled_at:''}); const [message,setMessage]=useState('');
  function refreshTeams(){api.getTeams().then(setTeams);}
  useEffect(refreshTeams,[]);
  async function createTeam(e){e.preventDefault();await api.createTeam({name:teamName});setMessage(`Team "${teamName}" created.`);setTeamName('');refreshTeams();}
  async function createPlayer(e){e.preventDefault();await api.createPlayer({...playerForm,jersey_number:Number(playerForm.jersey_number)||null});setMessage(`Player "${playerForm.name}" added.`);setPlayerForm({team_id:'',name:'',jersey_number:'',position:''});}
  async function createMatch(e){e.preventDefault();await api.createMatch(matchForm);setMessage('Match scheduled successfully.');setMatchForm({home_team_id:'',away_team_id:'',scheduled_at:''});}
  return <div className="admin-page">
    <div className="page-head"><div><span className="eyebrow">MANAGEMENT</span><h1>Admin dashboard</h1><p className="muted">Set up teams, players and match schedules from one control centre.</p></div><div className="admin-stat"><strong>{teams.length}</strong><span>Teams</span></div></div>
    {message&&<div className="admin-success">✓ {message}</div>}
    <div className="admin-grid">
      <section className="admin-card"><div className="admin-card-head"><div className="admin-icon">＋</div><div><span className="eyebrow">01 · TEAMS</span><h2>Create team</h2></div></div><form onSubmit={createTeam}><input placeholder="Team name" value={teamName} onChange={e=>setTeamName(e.target.value)} required/><button type="submit">Create team →</button></form><div className="team-mini-list">{teams.slice(0,6).map(t=><div key={t.id}><span className="team-badge">{t.name.slice(0,1).toUpperCase()}</span><b>{t.name}</b></div>)}</div></section>
      <section className="admin-card"><div className="admin-card-head"><div className="admin-icon">♟</div><div><span className="eyebrow">02 · ROSTERS</span><h2>Add player</h2></div></div><form onSubmit={createPlayer}><select value={playerForm.team_id} onChange={e=>setPlayerForm({...playerForm,team_id:e.target.value})} required><option value="">Select team</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><input placeholder="Player name" value={playerForm.name} onChange={e=>setPlayerForm({...playerForm,name:e.target.value})} required/><div className="form-row"><input placeholder="Jersey #" type="number" value={playerForm.jersey_number} onChange={e=>setPlayerForm({...playerForm,jersey_number:e.target.value})}/><input placeholder="Position" value={playerForm.position} onChange={e=>setPlayerForm({...playerForm,position:e.target.value})}/></div><button type="submit">Add player →</button></form></section>
      <section className="admin-card admin-wide"><div className="admin-card-head"><div className="admin-icon">◷</div><div><span className="eyebrow">03 · FIXTURES</span><h2>Schedule match</h2></div></div><form onSubmit={createMatch}><select value={matchForm.home_team_id} onChange={e=>setMatchForm({...matchForm,home_team_id:e.target.value})} required><option value="">Home team</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><div className="vs-chip">VS</div><select value={matchForm.away_team_id} onChange={e=>setMatchForm({...matchForm,away_team_id:e.target.value})} required><option value="">Away team</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><input type="datetime-local" value={matchForm.scheduled_at} onChange={e=>setMatchForm({...matchForm,scheduled_at:e.target.value})} required/><button type="submit">Schedule match →</button></form></section>
    </div>
  </div>;
}
