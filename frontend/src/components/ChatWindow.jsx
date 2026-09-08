// The scrollable transcript. Auto-scrolls to the newest message by scrolling the
// container itself. Pure presentation; state lives in ChatPage, which also
// supplies a personalised `greeting` + `suggestions` for a signed-in customer.
// Clicking a chip sends it straight away.

import { useEffect, useLayoutEffect, useRef } from 'react';

import ChatMessage from './ChatMessage.jsx';
import LoadingMessage from './LoadingMessage.jsx';
import BrandMark from './BrandMark.jsx';

const DEFAULT_SUGGESTIONS = [
  'How much does a website cost?',
  'Do you build e-commerce stores?',
  'What offers are running now?',
  'Do you provide web hosting?',
];

export default function ChatWindow({
  messages,
  pending,
  authed,
  userInitials,
  onSuggestion,
  onFollowup,
  greeting,
  suggestions,
}) {
  const scrollRef = useRef(null);

  const toBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };
  useLayoutEffect(toBottom, []);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, pending]);

  const chips = suggestions?.length ? suggestions : DEFAULT_SUGGESTIONS;
  const text =
    greeting ||
    `Ask me about 360 Degree Info — website design & development, e-commerce, custom software, mobile apps, SEO, hosting, pricing and current offers.` +
      (authed
        ? ' You’re signed in, so I can also help with your own projects and tickets.'
        : ' Sign in and I can also help with your own projects and tickets.');

  return (
    <div className="chat-window" ref={scrollRef}>
      {messages.length === 0 && !pending ? (
        <div className="chat-empty">
          <BrandMark size="lg" />
          <p>{text}</p>
          <div className="chat-suggestions">
            {chips.map((s) => (
              <button key={s} type="button" className="chat-chip" onClick={() => onSuggestion?.(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {messages.map((m) => (
            <ChatMessage
              key={m.id}
              sender={m.sender}
              text={m.text}
              userInitials={userInitials}
              followups={m.followups}
              onFollowup={pending ? undefined : onFollowup}
            />
          ))}
          {pending && <LoadingMessage />}
        </>
      )}
    </div>
  );
}
