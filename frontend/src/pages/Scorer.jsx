import { useEffect,useMemo,useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

const EVENTS=[
 {type:'goal',label:'Goal',hint:'Adds 1 to team score'},
 {type:'penalty_corner',label:'Penalty corner',hint:'PC awarded'},
 {type:'penalty_stroke',label:'Penalty stroke',hint:'PS awarded'},
 {type:'assist',label:'Assist',hint:'Goal assist'},
 {type:'shot',label:'Shot',hint:'Shot attempt'},
 {type:'save',label:'Save',hint:'Goalkeeper save'},
 {type:'card',label:'Card',hint:'Green, yellow or red'},
 {type:'substitution',label:'Substitution',hint:'Player change'}
];

function clockLabel(seconds){const m=Math.floor(seconds/60);const s=seconds%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}

export default function Scorer(){
 const{id}=useParams();const[match,setMatch]=useState(null);const[home,setHome]=useState([]);const[away,setAway]=useState([]);const[events,setEvents]=useState([]);const[period,setPeriod]=useState(1);const[clock,setClock]=useState(0);const[running,setRunning]=useState(false);const[selected,setSelected]=useState(null);const[busy,setBusy]=useState(false);const[message,setMessage]=useState('');
 useEffect(()=>{api.getMatch(id).then(m=>{setMatch(m);setPeriod(m.current_period||1);setClock(m.clock_seconds||0);setRunning(!!m.clock_running);Promise.all([api.getTeam(m.home_team_id),api.getTeam(m.away_team_id),api.getEvents(id)]).then(([h,a,e])=>{setHome(h.roster||[]);setAway(a.roster||[]);setEvents(e);});});},[id]);
 useEffect(()=>{if(!running)return;const t=setInterval(()=>setClock(c=>{if(c>=900){setRunning(false);return 900;}return c+1;}),1000);return()=>clearInterval(t);},[running]);
 const teamName=selected?.teamId===match?.home_team_id?match?.home_team?.name:match?.away_team?.name;
 const saveMatch=(patch)=>api.updateMatch(id,patch).then(m=>{setMatch(m);setPeriod(m.current_period);setClock(m.clock_seconds);setRunning(m.clock_running);});
 async function toggleClock(){const next=!running;setRunning(next);await saveMatch({clock_running:next,status:'live',current_period:period,clock_seconds:clock});}
 async function changePeriod(next){setPeriod(next);setClock(0);setRunning(false);await saveMatch({current_period:next,clock_seconds:0,clock_running:false,status:'live'});}
 async function finish(){setRunning(false);await saveMatch({status:'final',clock_running:false,clock_seconds:clock});setMessage('Match finished. Final score saved.');}
 async function logEvent(type,player,teamId){setBusy(true);setMessage('');try{const extra={};if(type==='card'){extra.card_type=window.prompt('Card type: green, yellow or red','green')||'green';}if(type==='substitution'){extra.substitution_in=true;extra.substitution_out=false;}const e=await api.createEvent(id,{player_id:player.id,team_id:teamId,type,period,game_time:clockLabel(clock),...extra});setEvents(v=>[e,...v]);if(type==='goal'){const m=await api.getMatch(id);setMatch(m);}setSelected(null);}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 async function undo(){const e=events[0];if(!e)return;await api.deleteEvent(e.id);setEvents(v=>v.slice(1));const m=await api.getMatch(id);setMatch(m);}
 if(!match)return <div className="page-loading">Loading scorer console…</div>;
 const renderTeam=(roster,teamId,name)=><section className="scorer-team"><div className="team-header"><div><span className="eyebrow">{teamId===match.home_team_id?'HOME':'AWAY'}</span><h2>{name}</h2></div><span className="team-score">{teamId===match.home_team_id?match.home_score:match.away_score}</span></div><div className="scorer-player-grid">{roster.map(p=><button key={p.id} className={selected?.player?.id===p.id?'player-select selected':'player-select'} onClick={()=>setSelected({player:p,teamId})}><b>#{p.jersey_number??'—'}</b><span>{p.name}<small>{p.position||'Player'}</small></span></button>)}</div></section>;
 return <div className="scorer-page">
  <div className="scorer-help"><b>Live scoring</b><span>Select a player, then choose the hockey event. Goals update the score automatically.</span></div>
  <div className="scorer-topbar"><div><span className="eyebrow">MATCH CONTROL</span><h1>{match.home_team?.name} <span>vs</span> {match.away_team?.name}</h1></div><div className="clock-panel"><small>PERIOD {period} / 4</small><strong>{clockLabel(clock)}</strong><span>{running?'CLOCK RUNNING':'CLOCK PAUSED'}</span></div></div>
  <section className="operator-score"><div><span>{match.home_team?.name}</span><strong>{match.home_score??0}</strong></div><div className="operator-vs">P{period}</div><div><span>{match.away_team?.name}</span><strong>{match.away_score??0}</strong></div></section>
  <div className="match-controls"><button className="btn btn-primary" onClick={toggleClock}>{running?'Pause clock':'Start clock'}</button><button className="btn btn-ghost" onClick={()=>changePeriod(Math.min(4,period+1))} disabled={period===4}>End period →</button><button className="btn btn-ghost" onClick={undo} disabled={!events.length}>↶ Undo last</button><button className="btn btn-danger" onClick={finish} disabled={match.status==='final'}>Finish match</button></div>
  {selected&&<section className="event-dock"><div><span className="eyebrow">SELECTED PLAYER</span><h2>#{selected.player.jersey_number??'—'} {selected.player.name}</h2><p className="muted">{teamName} · {selected.player.position||'Player'}</p></div><div className="event-actions">{EVENTS.map(e=><button disabled={busy||match.status==='final'} key={e.type} onClick={()=>logEvent(e.type,selected.player,selected.teamId)}><b>{e.label}</b><small>{e.hint}</small></button>)}</div></section>}
  {!selected&&<div className="select-prompt">Choose a player below to record a match event.</div>}
  {message&&<div className="admin-success">{message}</div>}
  <div className="scorer-grid">{renderTeam(home,match.home_team_id,match.home_team?.name)}{renderTeam(away,match.away_team_id,match.away_team?.name)}</div>
  <section className="scorer-timeline"><div className="section-heading"><div><span className="eyebrow">LIVE LOG</span><h2>Match events</h2></div><span className="event-count">{events.length} events</span></div>{events.length?<div className="mini-events">{events.map(e=><div key={e.id}><span>P{e.period} · {e.game_time}</span><strong>{String(e.type).replaceAll('_',' ')}</strong><small>{e.player?.name||'Team event'}</small></div>)}</div>:<p className="muted">No events recorded yet.</p>}</section>
 </div>;
}