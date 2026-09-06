// -----------------------------------------------------------------------------
// ProtectedRoute.jsx
//
// Wrap a route element that needs a signed-in customer:
//
//   <Route path="/account" element={<ProtectedRoute><AccountPage/></ProtectedRoute>} />
//
// While AuthContext is still reading storage (`ready === false`) we render
// nothing, so a logged-in user refreshing the page does not flash the login
// screen. After that: authenticated -> children, otherwise -> /login (with the
// attempted path remembered so we can send them back).
// -----------------------------------------------------------------------------

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
