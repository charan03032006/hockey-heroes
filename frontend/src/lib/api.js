const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getMatches: (params = '') => request(`/matches${params}`),
  getMatch: (id) => request(`/matches/${id}`),
  createMatch: (body) => request('/matches', { method: 'POST', body: JSON.stringify(body) }),
  updateMatch: (id, body) => request(`/matches/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  getEvents: (matchId) => request(`/matches/${matchId}/events`),
  createEvent: (matchId, body) => request(`/matches/${matchId}/events`, { method: 'POST', body: JSON.stringify(body) }),
  deleteEvent: (id) => request(`/events/${id}`, { method: 'DELETE' }),

  getTeams: () => request('/teams'),
  getTournaments: () => request('/tournaments'),
  createTournament: (body) => request('/tournaments', { method:'POST', body:JSON.stringify(body) }),
  addTournamentTeam: (id, team_id) => request(`/tournaments/${id}/teams`, { method:'POST', body:JSON.stringify({team_id}) }),
  getTeam: (id) => request(`/teams/${id}`),
  createTeam: (body) => request('/teams', { method: 'POST', body: JSON.stringify(body) }),

  getPlayer: (id) => request(`/players/${id}`),
  createPlayer: (body) => request('/players', { method: 'POST', body: JSON.stringify(body) }),
};
