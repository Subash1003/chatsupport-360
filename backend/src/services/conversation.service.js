// -----------------------------------------------------------------------------
// conversation.service.js
//
// Phase 10: chat memory. No req/res here.
//
//   getOrCreateConversation  - one conversation per (identity, session_id)
//   loadHistoryTurns         - bounded, oldest-first window for the LLM prompt
//   recordExchange           - persist the user turn + bot reply
//   getHistory               - full (capped) transcript for GET /api/chat/history
//
// identity = customerId, which the caller took from req.customer.customer_id
// (or null for a visitor). session_id is the visitor's own browser key; it is
// never trusted to carry identity, only to group a visitor's turns.
// -----------------------------------------------------------------------------

import env from '../config/env.js';
import logger from '../config/logger.js';
import * as conversationModel from '../models/conversation.model.js';

function truncate(text, max) {
  const s = String(text ?? '');
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** Find the caller's current conversation, creating one on first contact. */
export async function getOrCreateConversation({ customerId = null, sessionId }) {
  const existing = await conversationModel.findConversation({ customerId, sessionId });
  if (existing) return existing.conversation_id;
  return conversationModel.createConversation({ customerId, sessionId });
}

/**
 * The last N user/bot messages as chat turns for utils/prompt.js:
 *   { role: 'user' | 'assistant', content: string }   (oldest first)
 * Each message is truncated to HISTORY_MAX_CHARS to keep the prompt bounded.
 */
export async function loadHistoryTurns(conversationId) {
  const rows = await conversationModel.listRecentMessages(
    conversationId,
    env.HISTORY_MAX_MESSAGES
  );
  return rows.map((r) => ({
    role: r.sender === 'bot' ? 'assistant' : 'user',
    content: truncate(r.message, env.HISTORY_MAX_CHARS),
  }));
}

/** Persist one exchange. Best-effort: a storage failure must not fail the chat. */
export async function recordExchange(conversationId, userMessage, botMessage) {
  try {
    await conversationModel.recordExchange(conversationId, userMessage, botMessage);
  } catch (err) {
    logger.warn({ module: 'conversation', reason: err.message }, '[conversation] failed to persist exchange');
  }
}

/**
 * Transcript for GET /api/chat/history. Returns null when the caller has no
 * conversation yet (so the controller can answer with an empty list, not 404).
 */
export async function getHistory({ customerId = null, sessionId }, limit) {
  const conversation = await conversationModel.findConversation({ customerId, sessionId });
  if (!conversation) return null;

  const messages = await conversationModel.listMessages(
    conversation.conversation_id,
    limit || 50
  );
  return {
    conversation_id: conversation.conversation_id,
    messages: messages.map((m) => ({
      sender: m.sender,
      message: m.message,
      created_at: m.created_at,
    })),
  };
}
