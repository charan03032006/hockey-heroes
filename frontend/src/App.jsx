import { Link, Outlet } from 'react-router-dom';
import { useAuth } from './lib/AuthContext.jsx';

export default function App() {
  const { user, logout } = useAuth();

  async function handleLogout() {
    try { await logout(); } catch (error) { console.error('Logout failed:', error); }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand"><span className="brand-mark">🏑</span><span>Hockey <b>Heroes</b></span></Link>
        <nav>
          <Link to="/matches">Matches</Link>
          <Link to="/teams">Teams</Link>
          {user && <Link to="/admin">Admin</Link>}
          {user ? <button type="button" className="nav-button" onClick={handleLogout}>Logout</button> : <Link className="nav-login" to="/login">Scorer login</Link>}
        </nav>
      </header>
      <main className="content"><Outlet /></main>
      <footer className="site-footer"><span>🏑 Hockey Heroes</span><span>Live scores. Real moments.</span></footer>
    </div>
  );
}
