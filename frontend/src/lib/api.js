const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
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
  createTournament: (body) => request('/tournaments', { method: 'POST', body: JSON.stringify(body) }),
  getTournamentTeams: (id) => request(`/tournaments/${id}/teams`),
  addTournamentTeam: (id, team_id) => request(`/tournaments/${id}/teams`, { method: 'POST', body: JSON.stringify({ team_id }) }),
  getTournamentFixtures: (id) => request(`/tournaments/${id}/fixtures`),
  createTournamentFixture: (id, body) => request(`/tournaments/${id}/fixtures`, { method: 'POST', body: JSON.stringify(body) }),
  getTeam: (id) => request(`/teams/${id}`),
  createTeam: (body) => request('/teams', { method: 'POST', body: JSON.stringify(body) }),

  getPlayer: (id) => request(`/players/${id}`),
  createPlayer: (body) => request('/players', { method: 'POST', body: JSON.stringify(body) }),
};
