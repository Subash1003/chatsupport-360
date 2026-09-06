// -----------------------------------------------------------------------------
// ChatPage.jsx
//
// The assistant.
//   - visitor   -> public knowledge. A BRAND-NEW session id every page load and
//                  no transcript replay, so a reload clears the chat.
//   - signed in -> a stable per-browser session; the JWT rides along, the stored
//                  transcript is replayed, and the empty-state is personalised.
//
// Raising a support ticket happens IN THE CONVERSATION: when a signed-in user
// asks to raise a ticket, a small slot-filling flow (subject -> details ->
// priority -> summary -> confirm) takes over WITHOUT calling the LLM. Everything
// else about the chat is unchanged.
// -----------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react';

import ChatWindow from '../components/ChatWindow.jsx';
import ChatInput from '../components/ChatInput.jsx';
import BrandMark from '../components/BrandMark.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getSessionId } from '../utils/session.js';
import { sendChatMessage, fetchChatHistory } from '../services/chatApi.js';
import { fetchProjects, fetchTickets, createTicket } from '../services/customerApi.js';

let localId = 0;
const nextId = () => `m${++localId}`;

function ephemeralSession() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

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
      'I can help with your projects, subscriptions and support tickets, or anything about our services and current offers. To log an issue or a new requirement, just say "raise a ticket".',
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

// "I want to raise a ticket" and friends — NOT "what's the status of my ticket".
const RAISE_TICKET_RE =
  /\b(raise|open|create|submit|file|log|register|start)\b[\s\S]{0,25}\b(ticket|support(?:\s+(?:ticket|request))?|complaint|issue|requirement|request)\b|\bnew\s+(?:support\s+)?ticket\b|\bi\s+(?:want|need|would like|wish|['’]d like)\b[\s\S]{0,30}\b(?:ticket|raise a|report an issue|log a|support)\b|\b(report|log)\s+(?:a|an)\s+(?:issue|bug|problem|complaint)\b/i;

export default function ChatPage() {
  const { isAuthenticated, ready, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [accountHint, setAccountHint] = useState(null);
  const sessionRef = useRef(ephemeralSession());
  const ticketFlowRef = useRef(null); // { step, data } while raising a ticket in-chat

  useEffect(() => {
    if (!ready) return;
    setError('');
    setAccountHint(null);
    ticketFlowRef.current = null;

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

  const pushUser = useCallback((text) => {
    setMessages((prev) => [...prev, { id: nextId(), sender: 'user', text }]);
  }, []);
  const pushBot = useCallback((text, extra = {}) => {
    setMessages((prev) => [...prev, { id: nextId(), sender: 'bot', text, ...extra }]);
  }, []);

  const handleSend = useCallback(
    async (raw) => {
      const text = String(raw).trim();
      if (!text) return;
      setDraft('');

      // -------- 1. A ticket flow is in progress: this message is an answer -----
      const flow = ticketFlowRef.current;
      if (flow) {
        pushUser(text);
        const low = text.toLowerCase();

        if (/^(cancel|stop|never ?mind|abort|quit|exit)\b/i.test(text)) {
          ticketFlowRef.current = null;
          pushBot('No problem — cancelled. No ticket was created.');
          return;
        }

        if (flow.step === 'subject') {
          if (text.length < 5 || text.length > 200) {
            pushBot('The subject should be 5–200 characters. What is the subject of your ticket?');
            return;
          }
          flow.data.subject = text;
          flow.step = 'description';
          pushBot('Got it. Now describe the requirement or issue in a bit more detail.');
          return;
        }

        if (flow.step === 'description') {
          if (text.length < 10) {
            pushBot('Please give a little more detail (at least 10 characters).');
            return;
          }
          flow.data.description = text.slice(0, 5000);
          flow.step = 'priority';
          pushBot('What priority is this — **low**, **medium**, **high** or **urgent**? (or reply "skip" for medium)');
          return;
        }

        if (flow.step === 'priority') {
          let p = null;
          if (/^(low|medium|high|urgent)$/i.test(low)) p = low;
          else if (/^(skip|default|medium|normal)$/i.test(low) || low === '') p = 'medium';
          if (!p) {
            pushBot('Please reply with one of: low, medium, high, urgent — or "skip".');
            return;
          }
          flow.data.priority = p;
          flow.step = 'confirm';
          const d = flow.data;
          pushBot(
            `Please review your ticket:\n\n` +
              `**Subject:** ${d.subject}\n\n` +
              `**Details:** ${d.description}\n\n` +
              `**Priority:** ${d.priority}\n\n` +
              `Reply **confirm** to raise it, or **cancel** to discard.`
          );
          return;
        }

        if (flow.step === 'confirm') {
          if (/^(y|yes|yeah|yep|confirm|ok|okay|create|raise|go ahead|do it)\b/i.test(low)) {
            const d = flow.data;
            ticketFlowRef.current = null;
            setPending(true);
            try {
              const ticket = await createTicket(d);
              pushBot(
                `✅ Ticket raised — your reference number is **#${ticket.ticket_id}**.\n\n` +
                  `Status: ${ticket.status} · priority: ${ticket.priority}.\n` +
                  `You can ask me "what's the status of my tickets?" any time.`
              );
            } catch (err) {
              pushBot(`Sorry — I couldn't raise the ticket (${err.message || 'please try again'}).`);
            } finally {
              setPending(false);
            }
            return;
          }
          if (/^(n|no|nope|cancel|discard|stop)\b/i.test(low)) {
            ticketFlowRef.current = null;
            pushBot('Cancelled — no ticket was created.');
            return;
          }
          pushBot('Please reply **confirm** to raise the ticket, or **cancel** to discard.');
          return;
        }
      }

      // -------- 2. No flow yet: does the user want to raise a ticket? ----------
      if (RAISE_TICKET_RE.test(text)) {
        pushUser(text);
        if (!isAuthenticated) {
          pushBot('To raise a support ticket you need to be signed in. Please sign in and ask again.');
          return;
        }
        ticketFlowRef.current = { step: 'subject', data: {} };
        pushBot(
          'Sure, I can raise a support ticket for you. First — what is the **subject** (a short title)? You can type "cancel" any time to stop.'
        );
        return;
      }

      // -------- 3. Normal chat (unchanged) -----------------------------------
      setError('');
      pushUser(text);
      setPending(true);
      try {
        const data = await sendChatMessage({ message: text, sessionId: sessionRef.current });
        pushBot(data.reply, { sources: data.sources, followups: data.followups || [] });
      } catch (err) {
        setError(err.message || 'The assistant is unavailable right now.');
      } finally {
        setPending(false);
      }
    },
    [isAuthenticated, pushBot, pushUser]
  );

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
