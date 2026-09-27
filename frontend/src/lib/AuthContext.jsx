import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const syncSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (mounted) {
          setSession(session);
          setLoading(false);
        }
      } catch (error) {
        console.error('Unable to sync authentication session:', error);
        if (mounted) setLoading(false);
      }
    };

    syncSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (mounted) {
          setSession(nextSession);
          setLoading(false);
        }
      }
    );

    // When a user verifies their email in another tab, refresh the session
    // as soon as they return to this tab. Supabase also synchronizes auth
    // storage across tabs; these listeners provide a reliable foreground sync.
    const handleForeground = () => {
      if (document.visibilityState === 'visible') syncSession();
    };

    window.addEventListener('focus', handleForeground);
    window.addEventListener('pageshow', handleForeground);
    document.addEventListener('visibilitychange', handleForeground);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('focus', handleForeground);
      window.removeEventListener('pageshow', handleForeground);
      document.removeEventListener('visibilitychange', handleForeground);
    };
  }, []);

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
