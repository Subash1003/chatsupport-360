// The only place the app reads/writes the JWT and the cached user. A wrapper
// (rather than scattered localStorage calls) keeps the key names in one place
// and the try/catch for private-mode browsers in one place.

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
    // storage unavailable (private mode) — the app still works this session
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
    // ignore
  }
}

export function clearAuthStorage() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}
