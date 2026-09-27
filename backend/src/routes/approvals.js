import { Router } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();

async function authenticatedUser(req, res) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) { res.status(401).json({ error: 'Sign in required.' }); return null; }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) { res.status(401).json({ error: 'Your session is invalid. Please sign in again.' }); return null; }
  return data.user;
}
function isAdmin(user) {
  return user?.app_metadata?.role === 'admin' || user?.app_metadata?.roles?.includes?.('admin');
}
function isTournamentManager(user) {
  return user?.app_metadata?.role === 'tournament-manager' || user?.app_metadata?.roles?.includes?.('tournament-manager');
}

router.get('/mine', async (req, res) => {
  const user = await authenticatedUser(req, res); if (!user) return;
  if (!isTournamentManager(user)) return res.status(403).json({ error: 'This account is not assigned the Tournament Manager role.' });
  const { data, error } = await supabase.from('tournament_manager_approval').select('status,requested_at,reviewed_at,review_note').eq('user_id', user.id).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || { status: 'not_requested' });
});

router.post('/request', async (req, res) => {
  const user = await authenticatedUser(req, res); if (!user) return;
  if (!isTournamentManager(user)) return res.status(403).json({ error: 'Only an assigned Tournament Manager can request approval.' });
  const { data: existing, error: readError } = await supabase.from('tournament_manager_approval').select('status').eq('user_id', user.id).maybeSingle();
  if (readError) return res.status(500).json({ error: readError.message });
  if (existing?.status === 'approved') return res.status(409).json({ error: 'Your tournament-creation access is already approved.' });
  const payload = { user_id: user.id, email: user.email || null, display_name: user.user_metadata?.full_name || user.user_metadata?.name || null, status: 'pending', requested_at: new Date().toISOString(), reviewed_at: null, reviewed_by: null, review_note: null };
  const { data, error } = await supabase.from('tournament_manager_approval').upsert(payload, { onConflict: 'user_id' }).select('status,requested_at').single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.get('/', async (req, res) => {
  const user = await authenticatedUser(req, res); if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: 'Admin access required.' });
  const { data, error } = await supabase.from('tournament_manager_approval').select('*').order('requested_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.patch('/:userId', async (req, res) => {
  const user = await authenticatedUser(req, res); if (!user) return;
  if (!isAdmin(user)) return res.status(403).json({ error: 'Admin access required.' });
  const { status, review_note = null } = req.body || {};
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Status must be approved or rejected.' });
  const { data, error } = await supabase.from('tournament_manager_approval').update({ status, review_note, reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq('user_id', req.params.userId).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
