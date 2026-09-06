// -----------------------------------------------------------------------------
// llm.service.js
//
// Calls the chat model and returns a plain answer string. Pluggable, like
// embedding.service.js and email.service.js.
//
// The only provider shape implemented is "OpenAI-compatible chat completions"
// (POST {base}/chat/completions). Groq, OpenAI, Together, etc. all speak it;
// switching is just LLM_BASE_URL + LLM_MODEL in .env.
//
// Failure handling (spec rule 9 — never leak a provider error body):
//   missing key      -> 500 LLM_NOT_CONFIGURED
//   timeout          -> 504 LLM_TIMEOUT
//   429 from provider -> 429 LLM_RATE_LIMITED
//   any other error  -> 502 LLM_FAILED
// The real detail is logged server-side only.
// -----------------------------------------------------------------------------

import env from '../config/env.js';
import logger from '../config/logger.js';

function httpError(statusCode, code, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

const openAICompatibleChat = {
  async complete({ messages, maxTokens, timeoutMs }) {
    if (!env.LLM_API_KEY) {
      throw httpError(
        500,
        'LLM_NOT_CONFIGURED',
        'LLM_API_KEY is not set. Add the Phase 6 values to backend/.env.'
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res;
    try {
      res = await fetch(`${env.LLM_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.LLM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.LLM_MODEL,
          messages,
          max_tokens: maxTokens,
          temperature: 0.3,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw httpError(504, 'LLM_TIMEOUT', 'The assistant took too long to respond.');
      }
      logger.error({ err, module: 'llm' }, '[llm] fetch failed');
      throw httpError(502, 'LLM_FAILED', 'The assistant is currently unavailable.');
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logger.error(
        { module: 'llm', status: res.status, detail: detail.slice(0, 500) },
        `[llm] ${res.status}`
      );
      if (res.status === 429) {
        throw httpError(429, 'LLM_RATE_LIMITED', 'The assistant is busy. Please try again shortly.');
      }
      throw httpError(502, 'LLM_FAILED', 'The assistant could not process that request.');
    }

    const json = await res.json();
    const reply = json.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      logger.error(
        { module: 'llm', json: JSON.stringify(json).slice(0, 500) },
        '[llm] empty completion'
      );
      throw httpError(502, 'LLM_FAILED', 'The assistant returned an empty response.');
    }

    return { reply, model: json.model || env.LLM_MODEL, usage: json.usage || null };
  },
};

// All of these speak the OpenAI "chat/completions" shape — only LLM_BASE_URL,
// LLM_MODEL and LLM_API_KEY change between them.
const PROVIDERS = {
  groq: openAICompatibleChat,
  openai: openAICompatibleChat,
  deepseek: openAICompatibleChat,
  together: openAICompatibleChat,
  openrouter: openAICompatibleChat,
};

function activeProvider() {
  const provider = PROVIDERS[env.LLM_PROVIDER];
  if (!provider) {
    throw httpError(
      500,
      'LLM_PROVIDER_UNKNOWN',
      `Unknown LLM_PROVIDER "${env.LLM_PROVIDER}". Known: ${Object.keys(PROVIDERS).join(', ')}.`
    );
  }
  return provider;
}

/**
 * @param {{role:string, content:string}[]} messages  built by utils/prompt.js
 * @returns {Promise<{reply:string, model:string, usage:object|null}>}
 */
export function generateChatReply(messages) {
  return activeProvider().complete({
    messages,
    maxTokens: env.LLM_MAX_TOKENS,
    timeoutMs: env.LLM_TIMEOUT_MS,
  });
}

export default { generateChatReply };
