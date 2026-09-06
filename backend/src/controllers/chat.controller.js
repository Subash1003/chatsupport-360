// -----------------------------------------------------------------------------
// chat.controller.js
//
// message -> resolve the caller's conversation -> load a bounded history window
// -> classify -> retrieve identity-scoped context -> build the RAG prompt
// (history + context + delimited message) -> call the LLM -> persist the
// exchange -> return the answer, its sources, and the session/conversation ids.
//
// Identity comes only from req.customer (set by optionalAuth from the verified
// JWT). session_id is the visitor's own browser key: it groups a visitor's
// turns, it never carries identity (spec §11, rule 1).
// -----------------------------------------------------------------------------

import { randomUUID } from 'node:crypto';

import env from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  requireBody,
  validateChatMessage,
  validateSessionId,
} from '../utils/validation.js';
import { sanitizeUserMessage } from '../utils/sanitize.js';
import { buildChatMessages } from '../utils/prompt.js';
import { classifyQuery } from '../services/classifier.service.js';
import { retrieveContext } from '../services/retrieval.service.js';
import { generateChatReply } from '../services/llm.service.js';
import {
  getOrCreateConversation,
  loadHistoryTurns,
  recordExchange,
  getHistory,
} from '../services/conversation.service.js';

const MAX_MESSAGE_CHARS = 4000;

const NOT_SIGNED_IN_HINT =
  'The user is asking about their own account but is not signed in. ' +
  'Tell them this information requires signing in; do not fabricate any account details.';

// Split the model's "FOLLOWUPS: a | b | c" trailer off the reply. Whatever the
// model does, the customer only ever sees the clean text; parsing failures just
// yield an empty list.
function splitFollowups(text) {
  const src = String(text || '');
  const m = src.match(/\n+[ \t]*FOLLOW[- ]?UPS?\s*:(.*)$/is);
  if (!m) return { reply: src.trim(), followups: [] };
  const reply = src.slice(0, m.index).trimEnd();
  const followups = m[1]
    .replace(/\s+/g, ' ')
    .split('|')
    .map((s) => s.replace(/^[\s\-*••\d.)]+/, '').trim())
    .filter((s) => s.length >= 5 && s.length <= 140)
    .slice(0, 3);
  return { reply: reply || src.trim(), followups };
}

// POST /api/chat   body: { message, session_id? }
export const postChat = asyncHandler(async (req, res) => {
  requireBody(req.body, ['message']);

  // Validate shape/length, then scrub for prompt-injection hygiene (Phase 9):
  // control chars removed, forged <user_message> delimiters neutralised.
  const clean = validateChatMessage(req.body.message, MAX_MESSAGE_CHARS);
  const message = sanitizeUserMessage(clean);
  if (!message) {
    const err = new Error('"message" is required.');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  // session_id is optional: a stateless client (curl) omits it and we mint one,
  // returning it so the caller can keep the thread going on the next request.
  const sessionId = req.body.session_id
    ? validateSessionId(req.body.session_id)
    : randomUUID();

  const customerId = req.customer?.customer_id ?? null;

  // Phase 10: one conversation per (identity, session_id); load a bounded window.
  const conversationId = await getOrCreateConversation({ customerId, sessionId });
  const history = await loadHistoryTurns(conversationId);

  // Phase 8: classify the query, then route retrieval on the class.
  // This is routing only — it never widens what a caller may access.
  const { class: queryClass, method: classMethod } = await classifyQuery(message);

  const { contextBlocks, sources, grounded } = await retrieveContext({
    query: message,
    customerId,
    classification: queryClass,
  });

  const hint =
    queryClass === 'CUSTOMER_SPECIFIC' && !customerId ? NOT_SIGNED_IN_HINT : '';

  const wantFollowups = env.CHAT_FOLLOWUPS;
  const messages = buildChatMessages({
    userMessage: message,
    contextBlocks,
    hint,
    history,
    wantFollowups,
  });
  const { reply: rawReply, model, usage } = await generateChatReply(messages);

  // Strip the "FOLLOWUPS:" trailer into a separate list of clickable questions.
  const { reply, followups } = splitFollowups(rawReply);

  // Persist AFTER a successful reply — the CLEAN text, not the FOLLOWUPS line.
  await recordExchange(conversationId, message, reply);

  res.status(200).json({
    success: true,
    message: 'OK',
    data: {
      reply,
      model,
      authenticated: Boolean(req.customer),
      session_id: sessionId,
      conversation_id: conversationId,
      history_turns: history.length,
      classification: { class: queryClass, method: classMethod },
      grounded, // false => the answer came from the "no information" path
      sources, // what the context was built from (labels only, no raw text)
      followups, // up to 3 suggested next questions (clickable in the UI)
      usage,
    },
  });
});

// GET /api/chat/history?session_id=...&limit=...
// Scoped to the caller: a signed-in customer sees only their own conversation,
// a visitor sees only the anonymous conversation for that session_id.
export const getChatHistory = asyncHandler(async (req, res) => {
  if (!req.query.session_id) {
    const err = new Error('"session_id" query parameter is required.');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const sessionId = validateSessionId(req.query.session_id);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const customerId = req.customer?.customer_id ?? null;

  const result = await getHistory({ customerId, sessionId }, limit);

  res.status(200).json({
    success: true,
    message: 'OK',
    data: {
      authenticated: Boolean(req.customer),
      session_id: sessionId,
      conversation_id: result?.conversation_id ?? null,
      messages: result?.messages ?? [],
    },
  });
});
