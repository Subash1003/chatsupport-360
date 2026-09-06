// -----------------------------------------------------------------------------
// qdrant.js
//
// The single Qdrant connection point, mirroring how db.js wraps MySQL.
//
//   - getQdrantClient()  -> a lazily-created QdrantClient singleton.
//                           Throws a 503 error if QDRANT_URL is not configured,
//                           so callers surface a clean envelope instead of a
//                           confusing "undefined url" crash.
//   - testQdrant()       -> { ok, ... }. Never throws. Used by the non-fatal
//                           startup check in server.js.
//
// Qdrant being down or unconfigured must NOT stop the server: Phases 1-4 keep
// working, and /api/health still answers.
// -----------------------------------------------------------------------------

import { QdrantClient } from '@qdrant/js-client-rest';
import env from './env.js';

let client = null;

/**
 * @returns {import('@qdrant/js-client-rest').QdrantClient}
 */
export function getQdrantClient() {
  if (!env.QDRANT_URL) {
    const err = new Error(
      'QDRANT_URL is not set. Add the Phase 5 values to backend/.env.'
    );
    err.statusCode = 503;
    err.code = 'VECTOR_STORE_NOT_CONFIGURED';
    throw err;
  }

  if (!client) {
    client = new QdrantClient({
      url: env.QDRANT_URL,
      apiKey: env.QDRANT_API_KEY || undefined,
      // The client otherwise pings /telemetry to compare server/client versions
      // and logs a noisy warning on a version mismatch. We don't need it.
      checkCompatibility: false,
    });
  }

  return client;
}

/**
 * Verify at startup that Qdrant is reachable. Returns a plain object rather than
 * throwing, so the caller decides what to do (server.js just logs it).
 */
export async function testQdrant() {
  try {
    if (!env.QDRANT_URL) {
      return { ok: false, code: 'NOT_CONFIGURED', message: 'QDRANT_URL is empty' };
    }
    const { collections } = await getQdrantClient().getCollections();
    return { ok: true, collections: collections.map((c) => c.name) };
  } catch (error) {
    return {
      ok: false,
      code: error.code || 'QDRANT_UNREACHABLE',
      message: error.message,
    };
  }
}
