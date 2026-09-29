import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/AuthContext.jsx';

const portals = {
  admin: { title: 'Admin', description: 'Sign in to review manager approvals and administer Hockey Heroes.', destination: '/admin' },
  'tournament-manager': { title: 'Tournament Manager', description: 'Manage tournaments, fixtures, officials and competition settings.', destination: '/tournaments' },
  'team-manager': { title: 'Team Manager', description: 'Access your team area to manage team details and squad information.', destination: '/teams' },
  player: { title: 'Player', description: 'Sign in to access your player area and follow your match activity.', destination: '/matches' },
  scorer: { title: 'Scorer', description: 'Sign in to manage live match scoring and match events.', destination: '/matches' },
};

export default function Login({ role: routeRole }) {
  const location = useLocation();
  const role = routeRole || location.pathname.split('/').filter(Boolean).at(-1) || 'scorer';
  const portal = portals[role] || portals.scorer;
  const [loginId, setLoginId] = useState(role === 'admin' ? 'charanvwork@gmail.com' : '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const destination = useMemo(() => location.state?.from || portal.destination, [location.state, portal.destination]);

  useEffect(() => {
    if (!loading && user && !resetMode) navigate(destination, { replace: true });
  }, [loading, user, destination, navigate, resetMode]);

  async function handleLogin(event) {
    event.preventDefault();
    setError('');
    setNotice('');
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

  async function handlePasswordRecovery(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const email = loginId.trim();
      if (!email) throw new Error('Enter your account email address first.');
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (recoveryError) throw recoveryError;
      setNotice('If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.');
    } catch (err) {
      setError(err.message || 'Unable to send the password reset email. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (loading && !resetMode) return <div className="page-loading">Checking your login…</div>;
  if (user && !resetMode) return <div className="page-loading">Opening your workspace…</div>;

  return (
    <div className="login-page">
      <section className="login-card">
        <span className="eyebrow">HOCKEY HEROES · SECURE ACCESS</span>
        <h1>{resetMode ? 'Reset your password' : `${portal.title} login`}</h1>
        <p className="muted">{resetMode ? 'Enter your registered email and we’ll send you a secure password reset link.' : portal.description}</p>
        {!resetMode && (
          <div className="portal-links">
            <Link className={role === 'tournament-manager' ? 'active' : ''} to="/login/tournament-manager">Tournament Manager</Link>
            <Link className={role === 'team-manager' ? 'active' : ''} to="/login/team-manager">Team Manager</Link>
            <Link className={role === 'player' ? 'active' : ''} to="/login/player">Player</Link>
            <Link className={role === 'scorer' ? 'active' : ''} to="/login/scorer">Scorer</Link>
            <Link className={role === 'admin' ? 'active' : ''} to="/login/admin">Admin</Link>
          </div>
        )}
        {error && <div className="alert error" role="alert">{error}</div>}
        {notice && <div className="alert success" role="status">{notice}</div>}
        {resetMode ? (
          <form onSubmit={handlePasswordRecovery}>
            <label className="login-label" htmlFor="recovery-email">Account email</label>
            <input id="recovery-email" type="email" placeholder="Enter your registered email" value={loginId} onChange={(e) => setLoginId(e.target.value)} required autoComplete="email" />
            <button type="submit" disabled={busy}>{busy ? 'Sending link…' : 'Send password reset link'}</button>
            <button type="button" className="secondary-button" onClick={() => { setResetMode(false); setError(''); setNotice(''); }}>Back to sign in</button>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            <label className="login-label" htmlFor="login-id">Login ID (email)</label>
            <input id="login-id" type="email" placeholder="Enter your registered login email" value={loginId} onChange={(e) => setLoginId(e.target.value)} required autoComplete="username" />
            <label className="login-label" htmlFor="login-password">Password</label>
            <input id="login-password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in →'}</button>
            {role === 'admin' && <button type="button" className="text-button" onClick={() => { setResetMode(true); setError(''); setNotice(''); }}>Forgot password?</button>}
          </form>
        )}
        {!resetMode && <p className="login-note">Use the email/login ID and password registered for your account. Access permissions must be assigned to your account by an administrator.</p>}
        <Link to="/matches" className="login-back">← Continue to public match centre</Link>
      </section>
    </div>
  );
}
