import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/AuthContext.jsx';

const portals = {
  'tournament-manager': { title: 'Tournament Manager', description: 'Manage tournaments, fixtures, officials and competition settings.', destination: '/tournaments' },
  'team-manager': { title: 'Team Manager', description: 'Access your team area to manage team details and squad information.', destination: '/teams' },
  player: { title: 'Player', description: 'Sign in to access your player area and follow your match activity.', destination: '/matches' },
  scorer: { title: 'Scorer', description: 'Sign in to manage live match scoring and match events.', destination: '/matches' },
};

export default function Login({ role: routeRole }) {
  const location = useLocation();
  const role = routeRole || location.pathname.split('/').filter(Boolean).at(-1) || 'scorer';
  const portal = portals[role] || portals.scorer;
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const destination = useMemo(() => location.state?.from || portal.destination, [location.state, portal.destination]);

  useEffect(() => {
    if (!loading && user) navigate(destination, { replace: true });
  }, [loading, user, destination, navigate]);

  async function handleLogin(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: loginId.trim(),
        password,
      });
      if (authError) throw authError;
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to sign in. Check your login ID and password.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="page-loading">Checking your login…</div>;
  if (user) return <div className="page-loading">Opening your workspace…</div>;

  return (
    <div className="login-page">
      <section className="login-card">
        <span className="eyebrow">HOCKEY HEROES · SECURE ACCESS</span>
        <h1>{portal.title} login</h1>
        <p className="muted">{portal.description}</p>
        <div className="portal-links">
          <Link className={role === 'tournament-manager' ? 'active' : ''} to="/login/tournament-manager">Tournament Manager</Link>
          <Link className={role === 'team-manager' ? 'active' : ''} to="/login/team-manager">Team Manager</Link>
          <Link className={role === 'player' ? 'active' : ''} to="/login/player">Player</Link>
          <Link className={role === 'scorer' ? 'active' : ''} to="/login/scorer">Scorer</Link>
        </div>
        {error && <div className="alert error" role="alert">{error}</div>}
        <form onSubmit={handleLogin}>
          <label className="login-label" htmlFor="login-id">Login ID (email)</label>
          <input id="login-id" type="email" placeholder="Enter your registered login email" value={loginId} onChange={(e) => setLoginId(e.target.value)} required autoComplete="username" />
          <label className="login-label" htmlFor="login-password">Password</label>
          <input id="login-password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in →'}</button>
        </form>
        <p className="login-note">Use the email/login ID and password registered for your account. Access permissions must be assigned to your account by an administrator.</p>
        <Link to="/matches" className="login-back">← Continue to public match centre</Link>
      </section>
    </div>
  );
}
