// A stable per-browser chat session id. The backend groups a visitor's turns by
// session_id and scopes it to identity, so anon and signed-in threads never mix.
// We still reset the id on login/logout so a shared computer doesn't carry one
// person's thread into the next.

const SESSION_KEY = 'cs_chatbot_session';

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = makeId();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return makeId();
  }
}

export function resetSessionId() {
  try {
    const id = makeId();
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return makeId();
  }
}
