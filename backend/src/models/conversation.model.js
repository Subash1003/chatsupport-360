// SQL for `conversations` and `messages`.
//
// Scoping rule: a signed-in customer's conversation row has customer_id set, an
// anonymous visitor's has customer_id IS NULL. Every lookup pins one or the
// other, so a visitor can't reach a customer's conversation by guessing its
// session_id, and vice versa.

import { query, queryOne, withTransaction } from '../config/db.js';

// Most recent conversation for this identity + browser session, or null.
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

export async function createConversation({ customerId = null, sessionId }) {
  const rows = await query(
    `INSERT INTO conversations (customer_id, session_id) VALUES (?, ?)`,
    [customerId, sessionId]
  );
  return rows.insertId;
}

// Last `limit` user/bot messages, oldest-first for replay to the model. `limit`
// is clamped and inlined — mysql2 execute() rejects a bound LIMIT on some servers.
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

// Oldest-first, for GET /api/chat/history.
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

// One user turn + the bot reply as an all-or-nothing unit; bump updated_at so
// "most recent conversation" ordering holds.
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
