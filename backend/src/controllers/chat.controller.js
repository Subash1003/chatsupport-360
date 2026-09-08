// message → resolve the caller's conversation → load a bounded history window →
// classify → retrieve identity-scoped context → build the RAG prompt → call the
// LLM → persist the exchange → return the answer, its sources and the ids.
//
// Identity comes only from req.customer (set by optionalAuth from the JWT).
// session_id is the visitor's own browser key — it groups turns, never carries
// identity.

import { randomUUID } from 'node:crypto';

import env from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireBody, validateChatMessage, validateSessionId } from '../utils/validation.js';
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

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  err.code = 'VALIDATION_ERROR';
  return err;
}

// Split the model's "FOLLOWUPS: a | b | c" trailer off the reply. The customer
// only ever sees the clean text; a parse failure just yields an empty list.
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

  // Validate shape/length, then scrub: control chars removed, forged
  // <user_message> delimiters neutralised.
  const message = sanitizeUserMessage(validateChatMessage(req.body.message, MAX_MESSAGE_CHARS));
  if (!message) throw badRequest('"message" is required.');

  // Optional: a stateless client (curl) omits session_id and we mint one,
  // returning it so the caller can keep the thread going.
  const sessionId = req.body.session_id
    ? validateSessionId(req.body.session_id)
    : randomUUID();

  const customerId = req.customer?.customer_id ?? null;

  const conversationId = await getOrCreateConversation({ customerId, sessionId });
  const history = await loadHistoryTurns(conversationId);

  // Routing only — the class never widens what a caller may access.
  const { class: queryClass, method: classMethod } = await classifyQuery(message);

  const { contextBlocks, sources, grounded } = await retrieveContext({
    query: message,
    customerId,
    classification: queryClass,
  });

  const hint = queryClass === 'CUSTOMER_SPECIFIC' && !customerId ? NOT_SIGNED_IN_HINT : '';

  const messages = buildChatMessages({
    userMessage: message,
    contextBlocks,
    hint,
    history,
    wantFollowups: env.CHAT_FOLLOWUPS,
  });
  const { reply: rawReply, model, usage } = await generateChatReply(messages);

  const { reply, followups } = splitFollowups(rawReply);

  // Persist AFTER a successful reply — the clean text, not the FOLLOWUPS line.
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
      grounded, // false => answer came from the "no information" path
      sources, // labels only, no raw text
      followups,
      usage,
    },
  });
});

// GET /api/chat/history?session_id=...&limit=...
// Scoped to the caller: a customer sees only their own conversation, a visitor
// only the anonymous one for that session_id.
export const getChatHistory = asyncHandler(async (req, res) => {
  if (!req.query.session_id) throw badRequest('"session_id" query parameter is required.');
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
