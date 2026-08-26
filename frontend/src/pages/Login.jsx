import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div>
      <h1>Scorer login</h1>
      {sent ? (
        <p>Check your email for a magic link.</p>
      ) : (
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit">Send magic link</button>
        </form>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
