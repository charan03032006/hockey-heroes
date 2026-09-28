import { supabase } from './supabase.js';

const API_URL = (import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:4000/api' : '/api')).replace(/\/$/, '');

async function request(path, options = {}) {
  let res;
  const { data: { session } = {} } = await supabase.auth.getSession();
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}), ...(options.headers || {}) },
      ...options,
    });
  } catch (error) {
    throw new Error(`Unable to reach the API at ${API_URL}. Check that the backend is running and VITE_API_URL is configured correctly.`);
  }

  if (res.status === 204) return null;

  const contentType = res.headers.get('content-type') || '';
  const raw = await res.text();
  let data = null;

  if (raw && contentType.includes('application/json')) {
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(`The API returned invalid JSON (HTTP ${res.status}). Check the deployed API route.`);
    }
  } else if (raw) {
    const preview = raw.replace(/\s+/g, ' ').slice(0, 160);
    throw new Error(
      `Expected JSON from ${path}, but received ${contentType || 'an unknown content type'} (HTTP ${res.status}). ${preview.startsWith('<!doctype') || preview.startsWith('<html') ? 'This usually means the request reached the frontend HTML fallback instead of the API.' : preview}`
    );
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  getMatches: (params = '') => request(`/matches${params}`),
  getMatch: (id) => request(`/matches/${id}`),
  createMatch: (body) => request('/matches', { method: 'POST', body: JSON.stringify(body) }),
  updateMatch: (id, body) => request(`/matches/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getMatchLineups: (id) => request(`/matches/${id}/lineups`),
  saveMatchLineups: (id, lineups) => request(`/matches/${id}/lineups`, { method: 'PUT', body: JSON.stringify({ lineups }) }),
  getMatchOfficials: (id) => request(`/matches/${id}/officials`),
  saveMatchOfficials: (id, officials) => request(`/matches/${id}/officials`, { method: 'PUT', body: JSON.stringify({ officials }) }),
  getMatchReadiness: (id) => request(`/matches/${id}/readiness`),
  getEvents: (matchId) => request(`/matches/${matchId}/events`),
  createEvent: (matchId, body) => request(`/matches/${matchId}/events`, { method: 'POST', body: JSON.stringify(body) }),
  deleteEvent: (id) => request(`/events/${id}`, { method: 'DELETE' }),
  getTeams: () => request('/teams'),
  getTournaments: () => request('/tournaments'),
  getMyApproval: () => request('/approvals/mine'),
  requestTournamentApproval: () => request('/approvals/request', { method: 'POST', body: JSON.stringify({}) }),
  getApprovalRequests: () => request('/approvals'),
  reviewApproval: (userId, status, review_note = '') => request(`/approvals/${userId}`, { method: 'PATCH', body: JSON.stringify({ status, review_note }) }),
  createTournament: (body) => request('/tournaments', { method: 'POST', body: JSON.stringify(body) }),
  getTournamentTeams: (id) => request(`/tournaments/${id}/teams`),
  addTournamentTeam: (id, team_id) => request(`/tournaments/${id}/teams`, { method: 'POST', body: JSON.stringify({ team_id }) }),
  getTournamentFixtures: (id) => request(`/tournaments/${id}/fixtures`),
  createTournamentFixture: (id, body) => request(`/tournaments/${id}/fixtures`, { method: 'POST', body: JSON.stringify(body) }),
  getTournamentStandings: (id) => request(`/tournaments/${id}/standings`),
  getPlayerLeaderboard: (id) => request(`/tournaments/${id}/player-leaderboard`),
  getTournamentAnalytics: (id) => request(`/tournaments/${id}/analytics`),
  getTeam: (id) => request(`/teams/${id}`),
  createTeam: (body) => request('/teams', { method: 'POST', body: JSON.stringify(body) }),
  getPlayer: (id) => request(`/players/${id}`),
  createPlayer: (body) => request('/players', { method: 'POST', body: JSON.stringify(body) }),
  updatePlayer: (id, body) => request(`/players/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};
