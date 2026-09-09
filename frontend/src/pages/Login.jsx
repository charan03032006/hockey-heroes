import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/AuthContext.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && user) {
      navigate(location.state?.from || '/matches', { replace: true });
    }
  }, [loading, user, location.state, navigate]);

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setSent(false);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin + '/login',
      },
    });

    if (error) setError(error.message);
    else setSent(true);
  }

  if (loading) return <p>Checking authentication…</p>;
  if (user) return <p>Signing you in…</p>;

  return (
    <div>
      <h1>Scorer login</h1>
      <p className="muted">Enter your email and we’ll send you a secure magic link.</p>
      {sent && (
        <p className="success">
          Magic link sent. Check your email and open the link on this device.
        </p>
      )}
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <button type="submit">Send magic link</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
