// -----------------------------------------------------------------------------
// AuthContext.jsx
//
// Phase 12: one source of truth for "who is signed in".
//
//   const { user, isAuthenticated, login, logout, ready } = useAuth();
//
//   user            -> { customer_id, email, name } | null
//   isAuthenticated -> boolean
//   login(data)     -> persist { token, customer_id, email, name } and set state
//   logout()        -> clear storage + state, rotate the chat session id
//   ready           -> false until the initial read from storage is done
//                      (ProtectedRoute waits on this to avoid a redirect flash)
//
// apiClient fires `auth:logout` when the API rejects our token; we listen for it
// so an expired session drops the user everywhere at once.
// -----------------------------------------------------------------------------

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  getToken,
  setToken,
  getStoredUser,
  setStoredUser,
  clearAuthStorage,
} from '../utils/token.js';
import { resetSessionId } from '../utils/session.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Initial hydrate from localStorage.
  useEffect(() => {
    const token = getToken();
    const storedUser = getStoredUser();
    if (token && storedUser) setUser(storedUser);
    setReady(true);
  }, []);

  const login = useCallback((data) => {
    const nextUser = {
      customer_id: data.customer_id,
      email: data.email,
      name: data.name,
    };
    setToken(data.token);
    setStoredUser(nextUser);
    resetSessionId(); // fresh chat thread for the signed-in identity
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    clearAuthStorage();
    resetSessionId();
    setUser(null);
  }, []);

  // Token rejected by the API (expired / tampered) -> drop the session.
  useEffect(() => {
    const onForcedLogout = () => {
      resetSessionId();
      setUser(null);
    };
    window.addEventListener('auth:logout', onForcedLogout);
    return () => window.removeEventListener('auth:logout', onForcedLogout);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), login, logout, ready }),
    [user, login, logout, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
