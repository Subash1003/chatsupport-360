// -----------------------------------------------------------------------------
// ChatInput.jsx
//
// The composer. Enter sends, Shift+Enter makes a newline. Auto-grows with the
// text. Disabled while a reply is pending. `value`/`onChange` are controlled by
// ChatPage so an example chip can prefill it.
// -----------------------------------------------------------------------------

import { useEffect, useRef } from 'react';

import Icon from './Icon.jsx';

const MAX_CHARS = 4000;

export default function ChatInput({ value, onChange, onSend, disabled }) {
  const ref = useRef(null);

  // Auto-grow.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form
      className="chat-input"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        ref={ref}
        className="chat-input-box"
        rows={1}
        placeholder="Ask about our services, offers, or your account…"
        value={value}
        maxLength={MAX_CHARS}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
      />
      <button
        type="submit"
        className="btn chat-send"
        disabled={disabled || !value.trim()}
        aria-label="Send message"
      >
        {disabled ? <span className="spinner" /> : <Icon name="send" size={17} />}
      </button>
    </form>
  );
}
