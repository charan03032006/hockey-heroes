import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/AuthContext.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && user) navigate(location.state?.from || '/matches', { replace: true });
  }, [loading, user, location.state, navigate]);

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setSent(false);
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin + '/login' } });
      if (error) setError(error.message);
      else setSent(true);
    } catch (e) {
      setError(e.message || 'Unable to send the login link.');
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="page-loading">Checking your login…</div>;
  if (user) return <div className="page-loading">Opening your scorer area…</div>;

  return (
    <div className="login-page">
      <section className="login-card">
        <span className="eyebrow">SCORER ACCESS</span>
        <h1>Sign in securely</h1>
        <p className="muted">No password is needed. We will send a one-time magic link to your email.</p>
        <div className="login-steps"><div><b>1</b><span>Enter your email</span></div><div><b>2</b><span>Open the link in your email</span></div><div><b>3</b><span>Return here automatically</span></div></div>
        {sent && <div className="admin-success">✓ Link sent. Check your inbox and open the link on this device.</div>}
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={handleLogin}>
          <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <button type="submit" disabled={sending}>{sending ? 'Sending…' : 'Email me a login link →'}</button>
        </form>
        <Link to="/matches" className="login-back">← Continue without signing in</Link>
      </section>
    </div>
  );
}
