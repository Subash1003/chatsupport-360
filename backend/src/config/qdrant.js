// Single Qdrant entry point, mirroring db.js. Qdrant being down or unconfigured
// must not stop the server — the rest of the API and /api/health keep working.

import { QdrantClient } from '@qdrant/js-client-rest';
import env from './env.js';

let client = null;

// Lazily-created singleton. Throws a 503 if QDRANT_URL is unset so callers
// surface a clean envelope instead of an "undefined url" crash.
export function getQdrantClient() {
  if (!env.QDRANT_URL) {
    const err = new Error('QDRANT_URL is not set. Add the Qdrant values to backend/.env.');
    err.statusCode = 503;
    err.code = 'VECTOR_STORE_NOT_CONFIGURED';
    throw err;
  }

  if (!client) {
    client = new QdrantClient({
      url: env.QDRANT_URL,
      apiKey: env.QDRANT_API_KEY || undefined,
      // Skip the /telemetry version-check ping and its noisy mismatch warning.
      checkCompatibility: false,
    });
  }

  return client;
}

// Startup probe: returns { ok, ... } rather than throwing.
export async function testQdrant() {
  try {
    if (!env.QDRANT_URL) {
      return { ok: false, code: 'NOT_CONFIGURED', message: 'QDRANT_URL is empty' };
    }
    const { collections } = await getQdrantClient().getCollections();
    return { ok: true, collections: collections.map((c) => c.name) };
  } catch (error) {
    return { ok: false, code: error.code || 'QDRANT_UNREACHABLE', message: error.message };
  }
}
