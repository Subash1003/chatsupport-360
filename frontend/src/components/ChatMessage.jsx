// One bubble with an avatar. Bot replies render as Markdown (react-markdown +
// GFM, no raw HTML, so model output is safe); user text stays plain. Up to 3
// follow-up chips under a bot reply send themselves as the next message.

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
