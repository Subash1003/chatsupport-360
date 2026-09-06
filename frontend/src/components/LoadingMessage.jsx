// -----------------------------------------------------------------------------
// LoadingMessage.jsx
//
// The "assistant is typing" bubble, shown while POST /api/chat is in flight.
// -----------------------------------------------------------------------------

import BrandMark from './BrandMark.jsx';

export default function LoadingMessage() {
  return (
    <div className="msg-row msg-row-bot">
      <BrandMark size="sm" label="360°" />
      <div
        className="msg-bubble msg-bubble-bot msg-bubble-typing"
        aria-label="Assistant is typing"
      >
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  );
}
