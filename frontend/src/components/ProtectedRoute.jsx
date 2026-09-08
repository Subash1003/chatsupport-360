// Wraps a route that needs a signed-in customer. While AuthContext is still
// reading storage (ready === false) we render nothing, so a logged-in user who
// refreshes doesn't flash the login screen. Then: authenticated → children,
// otherwise → /login with the attempted path remembered.

import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, ready } = useAuth();
  const location = useLocation();

  if (!ready) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
