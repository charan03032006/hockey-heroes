import { Link, Outlet } from 'react-router-dom';

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">🏑 Hockey Heroes</Link>
        <nav>
          <Link to="/matches">Matches</Link>
          <Link to="/teams">Teams</Link>
          <Link to="/admin">Admin</Link>
          <Link to="/login">Login</Link>
        </nav>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
