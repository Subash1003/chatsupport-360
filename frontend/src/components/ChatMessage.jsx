// -----------------------------------------------------------------------------
// ChatMessage.jsx
//
// One bubble with an avatar. Bot replies are Markdown (react-markdown + GFM —
// no raw HTML, so safe for model output); user text stays plain. Under every
// bot reply that has them we show up to 3 suggested follow-up questions as
// chips; clicking one sends it as the next message (`onFollowup`). The
// retrieved-source labels are intentionally not shown.
// -----------------------------------------------------------------------------

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import BrandMark from './BrandMark.jsx';

export default function ChatMessage({
  sender,
  text,
  followups,
  onFollowup,
  userInitials = 'You',
}) {
  const isUser = sender === 'user';
  const showFollowups =
    !isUser && typeof onFollowup === 'function' && Array.isArray(followups) && followups.length > 0;

  return (
    <div className={`msg-row ${isUser ? 'msg-row-user' : 'msg-row-bot'}`}>
      {isUser ? (
        <span className="avatar avatar--user">{userInitials}</span>
      ) : (
        <BrandMark size="sm" />
      )}

      <div className="msg-col">
        <div className={`msg-bubble ${isUser ? 'msg-bubble-user' : 'msg-bubble-bot'}`}>
          {isUser ? (
            <p className="msg-text">{text}</p>
          ) : (
            <div className="msg-md">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ node, ...props }) => (
                    <div className="msg-md-tablewrap">
                      <table {...props} />
                    </div>
                  ),
                  a: ({ node, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" />
                  ),
                }}
              >
                {text}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {showFollowups && (
          <div className="msg-followups">
            {followups.slice(0, 3).map((q, i) => (
              <button
                key={i}
                type="button"
                className="msg-followup"
                onClick={() => onFollowup(q)}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
