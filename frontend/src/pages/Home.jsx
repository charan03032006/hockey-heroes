import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function Home() {
  const [live, setLive] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [recent, setRecent] = useState([]);
  const [tournaments, setTournaments] = useState([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.getMatches('?status=live').catch(() => []),
      api.getMatches('?status=scheduled').catch(() => []),
      api.getMatches('?status=final').catch(() => []),
      api.getTournaments().catch(() => []),
    ]).then(([liveMatches, scheduledMatches, finishedMatches, tournamentList]) => {
      if (!active) return;
      setLive(Array.isArray(liveMatches) ? liveMatches : []);
      setUpcoming(Array.isArray(scheduledMatches) ? scheduledMatches : []);
      setRecent(Array.isArray(finishedMatches) ? finishedMatches.slice(0, 4) : []);
      setTournaments(Array.isArray(tournamentList) ? tournamentList.slice(0, 4) : []);
    });
    return () => { active = false; };
  }, []);

  const featured = live[0] || upcoming[0];

  function MatchScore({ match }) {
    return (
      <div className="teams-score">
        <div><span>{match.home_team?.name || 'Home team'}</span><strong>{match.home_score ?? 0}</strong></div>
        <div><span>{match.away_team?.name || 'Away team'}</span><strong>{match.away_score ?? 0}</strong></div>
      </div>
    );
  }

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
              <p className="match-label">{featured.home_team?.name || 'Home team'} vs {featured.away_team?.name || 'Away team'}</p>
              <div className="hero-scoreline">
                <strong>{featured.home_score ?? 0}</strong><span>—</span><strong>{featured.away_score ?? 0}</strong>
              </div>
              <p className="muted">{featured.status === 'live' ? 'Live match' : featured.scheduled_at ? new Date(featured.scheduled_at).toLocaleString() : 'Upcoming match'}</p>
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

      <section className="quick-start">
        <div><span className="eyebrow">NEW HERE?</span><h2>Follow a game in 3 simple steps</h2></div>
        <div className="quick-steps">
          <div><b>1</b><span><strong>Find a match</strong><small>Choose live, upcoming or finished.</small></span></div>
          <div><b>2</b><span><strong>Open the match</strong><small>See the score and match timeline.</small></span></div>
          <div><b>3</b><span><strong>Follow the action</strong><small>Watch hockey events update live.</small></span></div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><span className="eyebrow">MATCH CENTRE</span><h2>Live now</h2></div>
          <Link to="/matches">See all →</Link>
        </div>
        {live.length === 0 ? (
          <div className="empty-card"><span>🏑</span><div><strong>No live matches right now</strong><p className="muted">Check back when the action starts.</p></div></div>
        ) : (
          <div className="match-grid">
            {live.slice(0, 4).map((m) => (
              <Link className="match-card live-card" key={m.id} to={"/matches/" + m.id}>
                <div className="card-top"><span className="live-pill small">● LIVE</span><span>View →</span></div>
                <MatchScore match={m} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><span className="eyebrow">UP NEXT</span><h2>Upcoming fixtures</h2></div>
          <Link to="/matches">View schedule →</Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="empty-card"><span>📅</span><div><strong>No upcoming matches</strong><p className="muted">New fixtures will appear here once scheduled.</p></div></div>
        ) : (
          <div className="match-grid">
            {upcoming.slice(0, 4).map((m) => (
              <Link className="match-card" key={m.id} to={"/matches/" + m.id}>
                <div className="card-top"><span className="status status-scheduled">SCHEDULED</span><span>→</span></div>
                <div className="fixture"><strong>{m.home_team?.name || 'Home team'}</strong><span>VS</span><strong>{m.away_team?.name || 'Away team'}</strong></div>
                <p className="muted">{m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : 'Time to be announced'}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><span className="eyebrow">FINAL WHISTLE</span><h2>Recent results</h2></div>
          <Link to="/matches">All results →</Link>
        </div>
        {recent.length === 0 ? (
          <div className="empty-card"><span>🏁</span><div><strong>No completed matches yet</strong><p className="muted">Finished match results will appear here.</p></div></div>
        ) : (
          <div className="match-grid">
            {recent.map((m) => (
              <Link className="match-card" key={m.id} to={"/matches/" + m.id}>
                <div className="card-top"><span className="status">FULL TIME</span><span>Scorecard →</span></div>
                <MatchScore match={m} />
                {m.scheduled_at && <p className="muted">{new Date(m.scheduled_at).toLocaleDateString()}</p>}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><span className="eyebrow">COMPETITIONS</span><h2>Tournaments</h2></div>
          <Link to="/tournaments">Manage tournaments →</Link>
        </div>
        {tournaments.length === 0 ? (
          <div className="empty-card"><span>🏆</span><div><strong>No tournaments published yet</strong><p className="muted">Tournaments will appear here when they are created.</p></div></div>
        ) : (
          <div className="match-grid">
            {tournaments.map((t) => (
              <Link className="match-card tournament-home-card" key={t.id} to="/tournaments">
                <div className="card-top"><span className="status">TOURNAMENT</span><span>Open →</span></div>
                <h3>{t.name || 'Hockey tournament'}</h3>
                <p className="muted">{t.rule_profile ? `${t.rule_profile} rules` : 'Competition overview and fixtures'}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
