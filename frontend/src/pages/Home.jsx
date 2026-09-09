import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function Home() {
  const [live, setLive] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getMatches('?status=live').then(setLive).catch((e) => setError(e.message));
    api.getMatches('?status=scheduled').then(setUpcoming).catch((e) => setError(e.message));
  }, []);

  const featured = live[0] || upcoming[0];

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">🏑 LIVE HOCKEY HUB</span>
          <h1>Every match.<br /><span>Every moment.</span></h1>
          <p>Follow live scores, match events, teams and player performances from one fast, focused dashboard.</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/matches">Explore matches <span>→</span></Link>
            <Link className="btn btn-ghost" to="/teams">Browse teams</Link>
          </div>
        </div>
        <div className="hero-score">
          <div className="score-glow" />
          <span className="live-pill">{live.length ? '● LIVE NOW' : 'NEXT UP'}</span>
          {featured ? (
            <>
              <p className="match-label">{featured.home_team?.name} vs {featured.away_team?.name}</p>
              <div className="hero-scoreline">
                <strong>{featured.home_score ?? 0}</strong><span>—</span><strong>{featured.away_score ?? 0}</strong>
              </div>
              <p className="muted">{featured.status === 'live' ? 'Live match' : new Date(featured.scheduled_at).toLocaleString()}</p>
              <Link to={"/matches/" + featured.id} className="score-link">View match →</Link>
            </>
          ) : (
            <>
              <h2>No match scheduled</h2>
              <p className="muted">Your next hockey moment will appear here.</p>
            </>
          )}
        </div>
      </section>

      {error && <div className="alert error">Couldn't load matches: {error}</div>}

      <section className="quick-start"><div><span className="eyebrow">NEW HERE?</span><h2>Follow a game in 3 simple steps</h2></div><div className="quick-steps"><div><b>1</b><span><strong>Find a match</strong><small>Choose live, upcoming or finished.</small></span></div><div><b>2</b><span><strong>Open the match</strong><small>See the score and match timeline.</small></span></div><div><b>3</b><span><strong>Follow the action</strong><small>Watch hockey events update live.</small></span></div></div></section><section className="section-block">
        <div className="section-heading">
          <div><span className="eyebrow">MATCH CENTRE</span><h2>Live now</h2></div>
          <Link to="/matches">See all →</Link>
        </div>
        {live.length === 0 ? (
          <div className="empty-card"><span>🏑</span><div><strong>No live matches right now</strong><p className="muted">Check back when the action starts.</p></div></div>
        ) : (
          <div className="match-grid">
            {live.map((m) => (
              <Link className="match-card live-card" key={m.id} to={"/matches/" + m.id}>
                <div className="card-top"><span className="live-pill small">● LIVE</span><span>View →</span></div>
                <div className="teams-score">
                  <div><span>{m.home_team?.name}</span><strong>{m.home_score ?? 0}</strong></div>
                  <div><span>{m.away_team?.name}</span><strong>{m.away_score ?? 0}</strong></div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><span className="eyebrow">UP NEXT</span><h2>Upcoming matches</h2></div>
          <Link to="/matches">View schedule →</Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="empty-card"><span>📅</span><div><strong>No upcoming matches</strong><p className="muted">Schedule the next game from Admin.</p></div></div>
        ) : (
          <div className="match-grid">
            {upcoming.map((m) => (
              <Link className="match-card" key={m.id} to={"/matches/" + m.id}>
                <div className="card-top"><span className="status status-scheduled">SCHEDULED</span><span>→</span></div>
                <div className="fixture"><strong>{m.home_team?.name}</strong><span>VS</span><strong>{m.away_team?.name}</strong></div>
                <p className="muted">{new Date(m.scheduled_at).toLocaleString()}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
