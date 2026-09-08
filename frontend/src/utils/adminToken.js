// The admin console has its own token, separate from the customer JWT.
// Read by services/adminApi.js and AdminPage.

const KEY = 'cs_chatbot_admin_token';

export function getAdminToken() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token) {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    // ignore
  }
}

export function clearAdminToken() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
