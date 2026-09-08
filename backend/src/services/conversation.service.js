// Chat memory. identity = customerId (from req.customer, or null for a visitor);
// session_id is the visitor's own browser key, used only to group turns.

import env from '../config/env.js';
import logger from '../config/logger.js';
import * as conversationModel from '../models/conversation.model.js';

function truncate(text, max) {
  const s = String(text ?? '');
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export async function getOrCreateConversation({ customerId = null, sessionId }) {
  const existing = await conversationModel.findConversation({ customerId, sessionId });
  if (existing) return existing.conversation_id;
  return conversationModel.createConversation({ customerId, sessionId });
}

// Last N user/bot messages as prompt turns ({ role, content }, oldest first),
// each truncated to keep the prompt bounded.
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

// Best-effort: a storage failure must not fail the chat.
export async function recordExchange(conversationId, userMessage, botMessage) {
  try {
    await conversationModel.recordExchange(conversationId, userMessage, botMessage);
  } catch (err) {
    logger.warn(
      { module: 'conversation', reason: err.message },
      '[conversation] failed to persist exchange'
    );
  }
}

// Transcript for GET /api/chat/history. null when the caller has no conversation
// yet, so the controller answers with an empty list rather than 404.
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
