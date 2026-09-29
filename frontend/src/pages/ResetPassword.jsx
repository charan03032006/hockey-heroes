import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' && session) {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      // Recovery links establish a session. The auth event above handles the
      // PASSWORD_RECOVERY event; an existing session can also reset a password.
      if (session) setReady(true);
      else setError('This password reset link is invalid or expired. Request a new reset link from the Admin login page.');
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (password.length < 8) {
      setError('Choose a password with at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setNotice('Your password has been updated. You can now sign in with your new password.');
      setPassword('');
      setConfirmPassword('');
      await supabase.auth.signOut();
    } catch (err) {
      setError(err.message || 'Unable to update your password. Please request a new reset link.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-card">
        <span className="eyebrow">HOCKEY HEROES · ACCOUNT SECURITY</span>
        <h1>Set a new password</h1>
        <p className="muted">Create a new password for your Hockey Heroes account.</p>
        {error && <div className="alert error" role="alert">{error}</div>}
        {notice && <div className="alert success" role="status">{notice}</div>}
        {ready && !notice && (
          <form onSubmit={handleSubmit}>
            <label className="login-label" htmlFor="new-password">New password</label>
            <input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete="new-password" required placeholder="At least 8 characters" />
            <label className="login-label" htmlFor="confirm-password">Confirm new password</label>
            <input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} autoComplete="new-password" required placeholder="Re-enter your new password" />
            <button type="submit" disabled={busy}>{busy ? 'Updating password…' : 'Update password'}</button>
          </form>
        )}
        {notice && <button type="button" onClick={() => navigate('/login/admin', { replace: true })}>Go to Admin login</button>}
        {!ready && !notice && <Link to="/login/admin" className="login-back">← Back to Admin login</Link>}
      </section>
    </div>
  );
}
