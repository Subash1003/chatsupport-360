// -----------------------------------------------------------------------------
// token.js
//
// Phase 12: the only place the app reads/writes the JWT and the cached user.
//
// Storage is localStorage under two keys. A wrapper (not raw localStorage calls
// scattered through components) means: one place to change the key names, one
// place to add try/catch for private-mode browsers, and apiClient + AuthContext
// stay in sync.
// -----------------------------------------------------------------------------

const TOKEN_KEY = 'cs_chatbot_token';
const USER_KEY = 'cs_chatbot_user';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable (private mode) — the app still works for this session */
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
}

export function clearAuthStorage() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}
