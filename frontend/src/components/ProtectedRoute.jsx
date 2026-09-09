import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p>Checking authentication…</p>;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
