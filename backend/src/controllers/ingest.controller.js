// -----------------------------------------------------------------------------
// ingest.controller.js
//
// Read the request -> call ingestion / retrieval services -> respond.
// Every route here is behind devOnly (see ingest.routes.js).
//
// runSearch is a Phase 5 TEST AID: it proves the payload filters isolate
// public from private and one customer from another, before Phase 7 builds the
// real RAG retrieval. The filter is assembled server-side from the request's
// `scope` + `customer_id`, mirroring what Phase 7 will derive from req.customer.
// -----------------------------------------------------------------------------

import { asyncHandler } from '../utils/asyncHandler.js';
import { requireBody, validateCustomerId } from '../utils/validation.js';
import {
  ingestAll,
  ingestPublic,
  ingestOffers,
  ingestCustomer,
} from '../services/ingestion.service.js';
import { embedQuery } from '../services/embedding.service.js';
import { search, buildFilter } from '../services/vectorStore.service.js';

function sendOk(res, message, data) {
  res.status(200).json({ success: true, message, data });
}

// POST /api/ingest?scope=public|all   (default all)
export const runIngest = asyncHandler(async (req, res) => {
  const scope = req.query.scope === 'public' ? 'public' : 'all';
  const data = scope === 'public' ? await ingestPublic() : await ingestAll();
  sendOk(res, `Ingestion complete (${scope}).`, data);
});

// POST /api/ingest/offers
export const runIngestOffers = asyncHandler(async (req, res) => {
  const data = await ingestOffers();
  sendOk(res, 'Offers re-ingested.', data);
});

// POST /api/ingest/customer   body: { customer_id? }  (omitted = all active customers)
export const runIngestCustomer = asyncHandler(async (req, res) => {
  const rawId = req.body?.customer_id;
  if (rawId) {
    const customerId = validateCustomerId(rawId);
    const data = await ingestCustomer(customerId);
    return sendOk(res, `Customer ${customerId} re-ingested.`, data);
  }
  const data = await ingestAll();
  sendOk(res, 'All customers re-ingested (via full ingest).', data);
});

// POST /api/ingest/search   body: { query, scope: 'public'|'customer', customer_id?, limit? }
export const runSearch = asyncHandler(async (req, res) => {
  requireBody(req.body, ['query', 'scope']);
  const { query, scope } = req.body;
  const limit = Math.min(Math.max(Number(req.body.limit) || 5, 1), 20);

  if (scope !== 'public' && scope !== 'customer') {
    const err = new Error('scope must be "public" or "customer".');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  let customerId;
  if (scope === 'customer') {
    if (!req.body.customer_id) {
      const err = new Error('customer_id is required when scope is "customer".');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    customerId = validateCustomerId(req.body.customer_id);
  }

  const vector = await embedQuery(String(query));
  const filter = buildFilter({ scope, customerId });
  const hits = await search({ vector, filter, limit });

  sendOk(res, 'Search complete.', {
    scope,
    customer_id: customerId || null,
    count: hits.length,
    hits,
  });
});
