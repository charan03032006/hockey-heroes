import { Router } from 'express';
import { supabase } from '../db/supabase.js';
const router = Router();

router.get('/matches', async(req,res)=>{
 const {status}=req.query; let q=supabase.from('match').select('*,home_team:home_team_id(name),away_team:away_team_id(name)').order('scheduled_at',{ascending:true}); if(status)q=q.eq('status',status); const {data,error}=await q; if(error)return res.status(500).json({error:error.message}); res.json(data);
});
router.get('/matches/:id',async(req,res)=>{const {data,error}=await supabase.from('match').select('*,home_team:home_team_id(name),away_team:away_team_id(name)').eq('id',req.params.id).single();if(error)return res.status(404).json({error:error.message});res.json(data);});
router.post('/matches',async(req,res)=>{const {home_team_id,away_team_id,scheduled_at}=req.body;if(home_team_id===away_team_id)return res.status(400).json({error:'Home and away teams must be different.'});const {data,error}=await supabase.from('match').insert({home_team_id,away_team_id,scheduled_at,status:'scheduled',home_score:0,away_score:0,current_period:1,clock_seconds:0,clock_running:false}).select().single();if(error)return res.status(500).json({error:error.message});res.status(201).json(data);});
router.patch('/matches/:id',async(req,res)=>{
 const allowed=['status','current_period','clock_seconds','clock_running','started_at','ended_at']; const patch={}; for(const k of allowed)if(req.body[k]!==undefined)patch[k]=req.body[k];
 if(patch.current_period!==undefined&&(Number(patch.current_period)<1||Number(patch.current_period)>4))return res.status(400).json({error:'There are four regulation periods.'});
 if(patch.clock_seconds!==undefined&&(Number(patch.clock_seconds)<0||Number(patch.clock_seconds)>900))return res.status(400).json({error:'A regulation period is 15 minutes.'});
 if(patch.status==='live'&&!patch.started_at)patch.started_at=new Date().toISOString();
 if(patch.status==='final'){patch.clock_running=false;patch.ended_at=new Date().toISOString();}
 const {data,error}=await supabase.from('match').update(patch).eq('id',req.params.id).select().single();if(error)return res.status(500).json({error:error.message});res.json(data);
});
export default router;