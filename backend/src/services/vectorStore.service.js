// Thin wrapper over the Qdrant client so the rest of the app talks in "chunks"
// and "filters", not raw REST payloads. One collection holds every point;
// public vs private is a payload field, never a separate collection.
//
//   ensureCollection()   – create it (+ payload indexes) if missing
//   recreateCollection() – drop and recreate (clean rebuild / dim change)
//   upsertChunks(items)  – add/replace points
//   search / deleteByFilter / countByFilter
//   buildFilter({...})   – the one place retrieval filters are constructed

import crypto from 'node:crypto';
import env from '../config/env.js';
import { getQdrantClient } from '../config/qdrant.js';
import { embeddingDim } from './embedding.service.js';

const COLLECTION = () => env.QDRANT_COLLECTION;

// Deterministic: the same source + chunk always maps to the same UUID.
export function pointId(source, chunkIndex) {
  const hex = crypto.createHash('sha1').update(`${source}#${chunkIndex}`).digest('hex');
  return (
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-` +
    `${hex.slice(16, 20)}-${hex.slice(20, 32)}`
  );
}

async function collectionExists(name) {
  const { collections } = await getQdrantClient().getCollections();
  return collections.some((c) => c.name === name);
}

async function createFresh(name) {
  const client = getQdrantClient();
  await client.createCollection(name, {
    vectors: { size: embeddingDim(), distance: 'Cosine' },
  });
  // Keyword indexes keep the visibility / customer_id filters fast and exact.
  for (const field of ['visibility', 'customer_id', 'document_type']) {
    await client.createPayloadIndex(name, {
      field_name: field,
      field_schema: 'keyword',
      wait: true,
    });
  }
}

// Safe to call on every ingest.
export async function ensureCollection() {
  const name = COLLECTION();
  if (!(await collectionExists(name))) {
    await createFresh(name);
    return { created: true };
  }
  return { created: false };
}

// For a full rebuild or a vector-size change.
export async function recreateCollection() {
  const name = COLLECTION();
  if (await collectionExists(name)) {
    await getQdrantClient().deleteCollection(name);
  }
  await createFresh(name);
}

export async function upsertChunks(items) {
  if (!items.length) return { upserted: 0 };
  await getQdrantClient().upsert(COLLECTION(), { wait: true, points: items });
  return { upserted: items.length };
}

export async function search({ vector, filter, limit = 5 }) {
  // Query API — `search` was removed in recent client versions.
  const res = await getQdrantClient().query(COLLECTION(), {
    query: vector,
    filter,
    limit,
    with_payload: true,
  });
  return (res.points || []).map((h) => ({ id: h.id, score: h.score, payload: h.payload }));
}

export async function deleteByFilter(filter) {
  await getQdrantClient().delete(COLLECTION(), { wait: true, filter });
}

export async function countByFilter(filter) {
  const { count } = await getQdrantClient().count(COLLECTION(), { filter, exact: true });
  return count;
}

// Always assembled server-side, never taken from a request body.
//   buildFilter({ scope: 'public' })
//   buildFilter({ scope: 'private', customerId })   // that customer's private only
//   buildFilter({ scope: 'customer', customerId })  // that customer's private + all public
export function buildFilter({ scope, customerId, documentType } = {}) {
  const extra = documentType ? [{ key: 'document_type', match: { value: documentType } }] : [];

  if (scope === 'public') {
    return { must: [{ key: 'visibility', match: { value: 'public' } }, ...extra] };
  }

  if (scope === 'private') {
    if (!customerId) throw new Error('buildFilter: private scope needs customerId');
    return {
      must: [
        { key: 'visibility', match: { value: 'private' } },
        { key: 'customer_id', match: { value: customerId } },
        ...extra,
      ],
    };
  }

  if (scope === 'customer') {
    if (!customerId) throw new Error('buildFilter: customer scope needs customerId');
    return {
      should: [
        { must: [{ key: 'visibility', match: { value: 'public' } }, ...extra] },
        {
          must: [
            { key: 'visibility', match: { value: 'private' } },
            { key: 'customer_id', match: { value: customerId } },
            ...extra,
          ],
        },
      ],
    };
  }

  throw new Error(`buildFilter: unknown scope "${scope}"`);
}
