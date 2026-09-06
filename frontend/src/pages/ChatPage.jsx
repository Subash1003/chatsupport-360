// -----------------------------------------------------------------------------
// ChatPage.jsx
//
// The assistant.
//   - visitor   -> public knowledge. A BRAND-NEW session id every page load and
//                  no transcript replay, so a reload clears the chat. (Turns are
//                  still grouped server-side within one page load so follow-ups
//                  like "when will it ship?" keep context.)
//   - signed in -> a stable per-browser session; the JWT rides along and the
//                  stored transcript is replayed on mount.
//
// Identity is never sent in the body — only the browser session_id, which the
// backend scopes to the caller.
// -----------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react';

import ChatWindow from '../components/ChatWindow.jsx';
import ChatInput from '../components/ChatInput.jsx';
import BrandMark from '../components/BrandMark.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getSessionId } from '../utils/session.js';
import { sendChatMessage, fetchChatHistory } from '../services/chatApi.js';
import { fetchProjects, fetchTickets } from '../services/customerApi.js';

let localId = 0;
const nextId = () => `m${++localId}`;

// A throwaway session id for a visitor — not persisted, so it dies on reload.
function ephemeralSession() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

// Build a personalised empty-state (greeting + example chips) from the signed-in
// customer's own data. Returns null for a customer with no data yet (brand-new
// signup) so the generic empty-state is used instead.
function buildAccountHint({ name, projects, tickets }) {
  if (!projects.length && !tickets.length) return null;

  const first = projects.find((p) => p.status === 'in_progress') || projects[0];
  const openTickets = tickets.filter((t) => !['resolved', 'closed'].includes(t.status));

  const chips = [];
  if (first) chips.push(`What is the status of my ${first.project_name}?`);
  if (first?.expected_end_date) chips.push(`When will my ${first.project_name} be completed?`);
  if (openTickets.length) chips.push('What is the status of my support tickets?');
  chips.push('What subscriptions or plans am I on?');

  const firstName = String(name || '').trim().split(/\s+/)[0];
  return {
    greeting:
      (firstName ? `Hi ${firstName} — ` : '') +
      'I can help with your projects, subscriptions and support tickets, or anything about our services and current offers.',
    suggestions: chips.slice(0, 4),
  };
}

function initials(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'You'
  );
}

export default function ChatPage() {
  const { isAuthenticated, ready, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [accountHint, setAccountHint] = useState(null);
  const sessionRef = useRef(ephemeralSession());

  // Runs on mount and whenever auth state settles/flips.
  //   visitor    -> fresh ephemeral session, empty transcript (reset on reload)
  //   signed in  -> stable session, replay the transcript, and personalise the
  //                 empty-state from the customer's own projects / tickets
  useEffect(() => {
    if (!ready) return;
    setError('');
    setAccountHint(null);

    if (!isAuthenticated) {
      sessionRef.current = ephemeralSession();
      setMessages([]);
      return;
    }

    sessionRef.current = getSessionId();
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchChatHistory(sessionRef.current);
        if (cancelled) return;
        setMessages(
          (data.messages || []).map((m) => ({
            id: nextId(),
            sender: m.sender === 'bot' ? 'bot' : 'user',
            text: m.message,
          }))
        );
      } catch {
        if (!cancelled) setMessages([]);
      }
    })();

    (async () => {
      try {
        const [projects, tickets] = await Promise.all([fetchProjects(), fetchTickets()]);
        if (cancelled) return;
        setAccountHint(buildAccountHint({ name: user?.name, projects, tickets }));
      } catch {
        if (!cancelled) setAccountHint(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, isAuthenticated, user?.name]);

  const handleSend = useCallback(async (text) => {
    setError('');
    setDraft('');
    setMessages((prev) => [...prev, { id: nextId(), sender: 'user', text }]);
    setPending(true);
    try {
      const data = await sendChatMessage({
        message: text,
        sessionId: sessionRef.current,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          sender: 'bot',
          text: data.reply,
          sources: data.sources,
          followups: data.followups || [],
        },
      ]);
    } catch (err) {
      setError(err.message || 'The assistant is unavailable right now.');
    } finally {
      setPending(false);
    }
  }, []);

  return (
    <div className="page chat-page">
      <div className="chat-shell">
        <div className="chat-topbar">
          <BrandMark size="md" />
          <div className="chat-topbar-txt">
            <b>360 Degree Info assistant</b>
            <span>
              {isAuthenticated
                ? `Signed in as ${user?.name || user?.email}`
                : 'Public knowledge · sign in for your account'}
            </span>
          </div>
          <span className="chat-status-dot" title="Online" />
        </div>

        <ChatWindow
          messages={messages}
          pending={pending}
          authed={isAuthenticated}
          userInitials={initials(user?.name)}
          greeting={accountHint?.greeting}
          suggestions={accountHint?.suggestions}
          onSuggestion={(s) => handleSend(s)}
          onFollowup={(q) => handleSend(q)}
        />

        {error && <p className="chat-error">{error}</p>}

        <ChatInput value={draft} onChange={setDraft} onSend={handleSend} disabled={pending} />
      </div>
    </div>
  );
}
