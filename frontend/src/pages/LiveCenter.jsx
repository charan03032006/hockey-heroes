import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { supabase } from '../lib/supabase.js';

export default function LiveCenter() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [live, upcoming] = await Promise.all([
        api.getMatches('?status=live'),
        api.getMatches('?status=scheduled'),
      ]);
      setMatches([...(Array.isArray(live) ? live : []), ...(Array.isArray(upcoming) ? upcoming : [])]);
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load matches.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel('public-live-center')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match' }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event' }, load)
      .subscribe();
    const refresh = () => load();
    window.addEventListener('focus', refresh);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const live = matches.filter((m) => m.status === 'live');
  const upcoming = matches.filter((m) => m.status === 'scheduled');

  function MatchCard({ match }) {
    const isLive = match.status === 'live';
    return <Link className="match-card public-live-card" to={`/matches/${match.id}`}>
      <div className="card-top"><span className={isLive ? 'live-pill small' : 'status status-scheduled'}>{isLive ? '● LIVE NOW' : 'UPCOMING'}</span><span>Match centre →</span></div>
      <div className="teams-score"><div><span>{match.home_team?.name || 'Home team'}</span><strong>{match.home_score ?? 0}</strong></div><div><span>{match.away_team?.name || 'Away team'}</span><strong>{match.away_score ?? 0}</strong></div></div>
      <p className="muted">{isLive ? `Period ${match.current_period || 1} of 4 · Follow live events` : match.scheduled_at ? new Date(match.scheduled_at).toLocaleString() : 'Time to be announced'}</p>
      <span className="score-link">{isLive ? 'Follow live score and timeline →' : 'View fixture →'}</span>
    </Link>;
  }

  return <div className="live-center-page">
    <div className="page-head"><div><span className="eyebrow">PUBLIC MATCH CENTRE</span><h1>Follow the action.</h1><p className="muted">Live scores, upcoming fixtures, and match timelines—open to everyone, no sign-in required.</p></div><button className="btn btn-ghost" onClick={load}>↻ Refresh</button></div>
    {error && <div className="info-callout">{error}</div>}
    {loading ? <div className="empty-card"><span>🏑</span><div><strong>Loading match centre…</strong><p className="muted">Fetching live scores and fixtures.</p></div></div> : <>
      <section className="section-block"><div className="section-heading"><div><span className="eyebrow">LIVE NOW</span><h2>Matches in progress <span className="live-count">{live.length}</span></h2></div></div>
        {live.length ? <div className="match-grid">{live.map((m) => <MatchCard key={m.id} match={m} />)}</div> : <div className="empty-card"><span>📡</span><div><strong>No live matches right now</strong><p className="muted">Upcoming games are listed below. This page refreshes when match updates arrive.</p></div></div>}
      </section>
      <section className="section-block"><div className="section-heading"><div><span className="eyebrow">UP NEXT</span><h2>Upcoming fixtures <span className="live-count">{upcoming.length}</span></h2></div><Link to="/matches">All matches →</Link></div>
        {upcoming.length ? <div className="match-grid">{upcoming.map((m) => <MatchCard key={m.id} match={m} />)}</div> : <div className="empty-card"><span>📅</span><div><strong>No upcoming fixtures</strong><p className="muted">New scheduled matches will appear here.</p></div></div>}
      </section>
    </>}
  </div>;
}
