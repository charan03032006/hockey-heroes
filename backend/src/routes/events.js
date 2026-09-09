import { Router } from 'express';
import { supabase } from '../db/supabase.js';
const router = Router();
const TYPES = ['goal','assist','penalty_corner','penalty_stroke','card','substitution','shot','save'];

router.get('/matches/:matchId/events', async (req,res)=>{
  const {data,error}=await supabase.from('event').select('*, player:player_id(name, jersey_number), related_player:related_player_id(name, jersey_number)').eq('match_id',req.params.matchId).order('created_at',{ascending:false});
  if(error)return res.status(500).json({error:error.message}); res.json(data);
});

router.post('/matches/:matchId/events', async (req,res)=>{
  const {player_id,team_id,type,period,game_time,x,y,penalty_minutes,outcome,related_player_id,card_type,substitution_in,substitution_out}=req.body;
  if(!TYPES.includes(type))return res.status(400).json({error:`type must be one of ${TYPES.join(', ')}`});
  if(!Number.isInteger(Number(period))||Number(period)<1||Number(period)>4)return res.status(400).json({error:'period must be 1, 2, 3 or 4'});
  const {data:match}=await supabase.from('match').select('*').eq('id',req.params.matchId).single();
  if(!match)return res.status(404).json({error:'Match not found'});
  if(['match_end'].includes(type))return res.status(400).json({error:'Use the match controls to finish a match.'});
  const {data:event,error}=await supabase.from('event').insert({match_id:req.params.matchId,player_id,team_id,type,period:Number(period),game_time,x,y,penalty_minutes,outcome,related_player_id,card_type,substitution_in,substitution_out}).select().single();
  if(error)return res.status(500).json({error:error.message});
  if(type==='goal'){
    const field=team_id===match.home_team_id?'home_score':'away_score';
    await supabase.from('match').update({[field]:(match[field]||0)+1}).eq('id',req.params.matchId);
  }
  res.status(201).json(event);
});

router.delete('/events/:id', async(req,res)=>{
  const {data:event}=await supabase.from('event').select('*').eq('id',req.params.id).single();
  if(!event)return res.status(404).json({error:'Event not found'});
  const {error}=await supabase.from('event').delete().eq('id',req.params.id);
  if(error)return res.status(500).json({error:error.message});
  if(event.type==='goal'){
    const {data:match}=await supabase.from('match').select('*').eq('id',event.match_id).single();
    if(match){const field=event.team_id===match.home_team_id?'home_score':'away_score';await supabase.from('match').update({[field]:Math.max(0,(match[field]||0)-1)}).eq('id',event.match_id);}
  }
  res.status(204).send();
});
export default router;