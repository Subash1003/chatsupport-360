// -----------------------------------------------------------------------------
// session.js
//
// Phase 12: a stable per-browser chat session id.
//
// The backend groups a visitor's chat turns by session_id (Phase 10) and scopes
// it to identity, so an anonymous thread and a signed-in thread never mix even
// with the same id. We still reset the id on login/logout so a shared computer
// does not carry one person's thread into the next.
// -----------------------------------------------------------------------------

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
