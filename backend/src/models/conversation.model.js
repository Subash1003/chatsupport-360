// -----------------------------------------------------------------------------
// conversation.model.js
//
// SQL for `conversations` and `messages` (spec §6, Phase 10). No req/res here.
//
// Scoping rule that matters:
//   - a signed-in customer's conversation row has customer_id = 'CUST...'
//   - an anonymous visitor's conversation row has customer_id IS NULL
// Every lookup pins one or the other, so an anonymous caller can never address
// a customer's conversation by guessing its session_id, and a customer never
// sees a NULL/other conversation.
// -----------------------------------------------------------------------------

import { query, queryOne, withTransaction } from '../config/db.js';

/**
 * Most recent conversation for this identity + browser session, or null.
 * customerId null  -> match the anonymous (customer_id IS NULL) row.
 * customerId set   -> match that customer's row only.
 */
export function findConversation({ customerId = null, sessionId }) {
  if (customerId) {
    return queryOne(
      `SELECT conversation_id, customer_id, session_id, created_at, updated_at
         FROM conversations
        WHERE customer_id = ? AND session_id = ?
        ORDER BY conversation_id DESC
        LIMIT 1`,
      [customerId, sessionId]
    );
  }
  return queryOne(
    `SELECT conversation_id, customer_id, session_id, created_at, updated_at
       FROM conversations
      WHERE customer_id IS NULL AND session_id = ?
      ORDER BY conversation_id DESC
      LIMIT 1`,
    [sessionId]
  );
}

/** Insert a fresh conversation row and return its id. */
export async function createConversation({ customerId = null, sessionId }) {
  const rows = await query(
    `INSERT INTO conversations (customer_id, session_id) VALUES (?, ?)`,
    [customerId, sessionId]
  );
  return rows.insertId;
}

/**
 * The last `limit` user/bot messages of a conversation, returned OLDEST-FIRST
 * so they can be replayed to the model in order. `limit` is coerced to a small
 * integer and inlined (mysql2 `execute` rejects a bound LIMIT on some servers).
 */
export async function listRecentMessages(conversationId, limit) {
  const n = Math.min(Math.max(parseInt(limit, 10) || 0, 0), 100);
  if (n === 0) return [];
  const rows = await query(
    `SELECT message_id, sender, message, created_at
       FROM messages
      WHERE conversation_id = ? AND sender IN ('user','bot')
      ORDER BY message_id DESC
      LIMIT ${n}`,
    [conversationId]
  );
  return rows.reverse();
}

/** A conversation's messages oldest-first, for GET /api/chat/history. */
export async function listMessages(conversationId, limit) {
  const n = Math.min(Math.max(parseInt(limit, 10) || 0, 1), 200);
  return query(
    `SELECT message_id, sender, message, created_at
       FROM messages
      WHERE conversation_id = ? AND sender IN ('user','bot')
      ORDER BY message_id ASC
      LIMIT ${n}`,
    [conversationId]
  );
}

/**
 * Persist one user turn + the bot's reply as an all-or-nothing unit, and bump
 * the conversation's updated_at so "most recent conversation" ordering holds.
 */
export function recordExchange(conversationId, userMessage, botMessage) {
  return withTransaction(async (conn) => {
    await conn.execute(
      `INSERT INTO messages (conversation_id, sender, message) VALUES (?, 'user', ?)`,
      [conversationId, userMessage]
    );
    await conn.execute(
      `INSERT INTO messages (conversation_id, sender, message) VALUES (?, 'bot', ?)`,
      [conversationId, botMessage]
    );
    await conn.execute(
      `UPDATE conversations SET updated_at = NOW() WHERE conversation_id = ?`,
      [conversationId]
    );
  });
}
