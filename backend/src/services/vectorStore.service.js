// -----------------------------------------------------------------------------
// vectorStore.service.js
//
// A thin wrapper over the Qdrant client so the rest of the app speaks in terms
// of "chunks" and "filters", not raw REST payloads. One collection holds every
// point; public vs private is a payload field, never a separate collection
// (spec §9).
//
//   ensureCollection()        - create it (+ payload indexes) if missing
//   recreateCollection()      - drop and recreate (clean rebuild / dim change)
//   upsertChunks(items)       - add/replace points
//   search({vector,filter,limit})
//   deleteByFilter(filter)
//   countByFilter(filter?)
//   buildFilter({...})        - the ONE place retrieval filters are constructed
// -----------------------------------------------------------------------------

import crypto from 'node:crypto';
import env from '../config/env.js';
import { getQdrantClient } from '../config/qdrant.js';
import { embeddingDim } from './embedding.service.js';

const COLLECTION = () => env.QDRANT_COLLECTION;

/** Deterministic point id: same source+chunk always maps to the same UUID. */
export function pointId(source, chunkIndex) {
  const hex = crypto
    .createHash('sha1')
    .update(`${source}#${chunkIndex}`)
    .digest('hex');
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
  // Keyword indexes make the visibility / customer_id filters fast and exact.
  for (const field of ['visibility', 'customer_id', 'document_type']) {
    await client.createPayloadIndex(name, {
      field_name: field,
      field_schema: 'keyword',
      wait: true,
    });
  }
}

/** Create the collection if it does not exist yet. Safe to call every ingest. */
export async function ensureCollection() {
  const name = COLLECTION();
  if (!(await collectionExists(name))) {
    await createFresh(name);
    return { created: true };
  }
  return { created: false };
}

/** Drop and recreate — used when doing a full rebuild or the vector size changed. */
export async function recreateCollection() {
  const name = COLLECTION();
  if (await collectionExists(name)) {
    await getQdrantClient().deleteCollection(name);
  }
  await createFresh(name);
}

/**
 * @param {Array<{id:string, vector:number[], payload:object}>} items
 */
export async function upsertChunks(items) {
  if (!items.length) return { upserted: 0 };
  await getQdrantClient().upsert(COLLECTION(), { wait: true, points: items });
  return { upserted: items.length };
}

export async function search({ vector, filter, limit = 5 }) {
  // The client's Query API (`search` was removed in recent versions).
  const res = await getQdrantClient().query(COLLECTION(), {
    query: vector,
    filter,
    limit,
    with_payload: true,
  });
  return (res.points || []).map((h) => ({
    id: h.id,
    score: h.score,
    payload: h.payload,
  }));
}

export async function deleteByFilter(filter) {
  await getQdrantClient().delete(COLLECTION(), { wait: true, filter });
}

export async function countByFilter(filter) {
  const { count } = await getQdrantClient().count(COLLECTION(), {
    filter,
    exact: true,
  });
  return count;
}

/**
 * Build a Qdrant filter from an intent. This mirrors what Phase 7 retrieval
 * will do with req.customer — the filter is always assembled server-side,
 * never taken from a request body.
 *
 *   buildFilter({ scope: 'public' })
 *   buildFilter({ scope: 'private', customerId: 'CUST1001' })
 *   buildFilter({ scope: 'customer', customerId })  // that customer's private + all public
 */
export function buildFilter({ scope, customerId, documentType } = {}) {
  const must = [];
  const extra = documentType
    ? [{ key: 'document_type', match: { value: documentType } }]
    : [];

  if (scope === 'public') {
    must.push({ key: 'visibility', match: { value: 'public' } });
  } else if (scope === 'private') {
    if (!customerId) throw new Error('buildFilter: private scope needs customerId');
    must.push({ key: 'visibility', match: { value: 'private' } });
    must.push({ key: 'customer_id', match: { value: customerId } });
  } else if (scope === 'customer') {
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
  } else {
    throw new Error(`buildFilter: unknown scope "${scope}"`);
  }

  return { must: [...must, ...extra] };
}
