// Text → vectors. Pluggable like email.service.js: callers use embedTexts() /
// embedQuery(). A provider's `dim` is declared in code, never read from env, so
// the Qdrant collection size and the provider can't drift apart.
//
// Default: gemini (gemini-embedding-001, pinned to 768 dims).

import env from '../config/env.js';
import logger from '../config/logger.js';

function httpError(statusCode, code, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

// Gemini batchEmbedContents accepts up to 100 requests per call.
const GEMINI_BATCH = 96;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const geminiProvider = {
  name: 'gemini',
  // gemini-embedding-001 defaults to 3072 dims; outputDimensionality pins every
  // request to 768. Qdrant uses cosine, so the un-normalised sub-3072 vectors
  // still rank fine.
  dim: 768,

  async embed(texts, taskType) {
    if (!env.GEMINI_API_KEY) {
      throw httpError(500, 'EMBEDDING_NOT_CONFIGURED', 'GEMINI_API_KEY is not set.');
    }

    const model = env.EMBEDDING_MODEL || 'gemini-embedding-001';
    const dim = this.dim;
    const url =
      `${GEMINI_BASE}/models/${model}:batchEmbedContents` +
      `?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;

    const out = [];
    for (let i = 0; i < texts.length; i += GEMINI_BATCH) {
      const slice = texts.slice(i, i + GEMINI_BATCH);
      const body = {
        requests: slice.map((text) => ({
          model: `models/${model}`,
          content: { parts: [{ text }] },
          taskType,
          outputDimensionality: dim,
        })),
      };

      let res;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch (cause) {
        logger.error({ err: cause, module: 'embedding' }, '[embedding] gemini fetch failed');
        throw httpError(502, 'EMBEDDING_FAILED', 'The embedding service is unavailable.');
      }

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        logger.error(
          { module: 'embedding', status: res.status, detail: detail.slice(0, 500) },
          `[embedding] gemini ${res.status}`
        );
        // Surface a 429 as-is so the caller can back off.
        const status = res.status === 429 ? 429 : 502;
        const code = res.status === 429 ? 'EMBEDDING_RATE_LIMITED' : 'EMBEDDING_FAILED';
        throw httpError(status, code, 'The embedding service rejected the request.');
      }

      const json = await res.json();
      const vectors = (json.embeddings || []).map((e) => e.values);
      if (vectors.length !== slice.length || vectors.some((v) => !Array.isArray(v))) {
        logger.error(
          { module: 'embedding', json: JSON.stringify(json).slice(0, 500) },
          '[embedding] gemini unexpected shape'
        );
        throw httpError(502, 'EMBEDDING_FAILED', 'The embedding service returned an unexpected response.');
      }
      out.push(...vectors);
    }
    return out;
  },
};

const PROVIDERS = { gemini: geminiProvider };

function activeProvider() {
  const provider = PROVIDERS[env.EMBEDDING_PROVIDER];
  if (!provider) {
    throw httpError(
      500,
      'EMBEDDING_PROVIDER_UNKNOWN',
      `Unknown EMBEDDING_PROVIDER "${env.EMBEDDING_PROVIDER}". Known: ${Object.keys(PROVIDERS).join(', ')}.`
    );
  }
  return provider;
}

// Dimension of the active provider's vectors — used to size the collection.
export function embeddingDim() {
  return activeProvider().dim;
}

export function embedTexts(texts) {
  if (!Array.isArray(texts) || texts.length === 0) return Promise.resolve([]);
  return activeProvider().embed(texts, 'RETRIEVAL_DOCUMENT');
}

// QUERY task type — Gemini optimises it differently from stored documents.
export async function embedQuery(text) {
  const [vector] = await activeProvider().embed([String(text)], 'RETRIEVAL_QUERY');
  return vector;
}

export default { embedTexts, embedQuery, embeddingDim };
