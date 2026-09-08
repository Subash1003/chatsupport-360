// Gather the trusted context for a chat answer:
//   1. embed the query
//   2. vector-search Qdrant with an identity-scoped filter built server-side —
//      anonymous → public only; authenticated → public OR that customer's private
//   3. for an authenticated caller, also pull a live MySQL snapshot so answers
//      about their own projects/tickets/subs are fresh even if Qdrant is behind
//   4. drop weak hits (below RAG_MIN_SCORE)
//
// Retrieval failures degrade to "no context" — the chat still answers via the
// honest "I don't have that information" path rather than 500ing.

import env from '../config/env.js';
import logger from '../config/logger.js';
import { embedQuery } from './embedding.service.js';
import { search, buildFilter } from './vectorStore.service.js';
import { getProfileById } from '../models/customer.model.js';
import { listProjectsByCustomer } from '../models/project.model.js';
import { listSubscriptionsByCustomer } from '../models/subscription.model.js';
import { listTicketsByCustomer } from '../models/ticket.model.js';

function filterForIdentity(customerId) {
  return customerId
    ? buildFilter({ scope: 'customer', customerId }) // public + this customer's private
    : buildFilter({ scope: 'public' });
}

async function vectorContext(query, customerId, { boostOffers = false } = {}) {
  let vector;
  try {
    vector = await embedQuery(query);
  } catch (err) {
    logger.warn({ module: 'retrieval', reason: err.code || err.message }, '[retrieval] embed failed');
    return { blocks: [], sources: [] };
  }

  let hits;
  try {
    hits = await search({ vector, filter: filterForIdentity(customerId), limit: env.RAG_TOP_K });

    // An OFFER_OR_PROMOTION query also pulls offer docs directly, so live offers
    // surface even when generic scoring buries them.
    if (boostOffers) {
      const scope = customerId ? 'customer' : 'public';
      const offerHits = await search({
        vector,
        filter: buildFilter({ scope, customerId, documentType: 'offer' }),
        limit: 4,
      });
      const seen = new Set(hits.map((h) => h.id));
      for (const h of offerHits) if (!seen.has(h.id)) hits.push(h);
    }
  } catch (err) {
    logger.warn({ module: 'retrieval', reason: err.code || err.message }, '[retrieval] qdrant search failed');
    return { blocks: [], sources: [] };
  }

  const kept = hits
    .filter((h) => typeof h.score === 'number' && h.score >= env.RAG_MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, env.RAG_TOP_K + 2);

  const blocks = kept.map((h) => {
    const tag =
      h.payload.visibility === 'private'
        ? `${h.payload.document_type}, your account`
        : h.payload.document_type;
    return `[${tag}]\n${h.payload.text}`;
  });

  const sources = kept.map((h) => ({
    document_type: h.payload.document_type,
    visibility: h.payload.visibility,
    source: h.payload.source,
    score: Number(h.score.toFixed(3)),
  }));

  return { blocks, sources };
}

async function accountSnapshot(customerId) {
  try {
    const [profile, projects, subs, tickets] = await Promise.all([
      getProfileById(customerId),
      listProjectsByCustomer(customerId),
      listSubscriptionsByCustomer(customerId),
      listTicketsByCustomer(customerId),
    ]);

    // Token valid but the row is gone — no snapshot.
    if (!profile && !projects.length && !subs.length && !tickets.length) return null;

    const lines = [];

    if (profile) {
      lines.push('Account holder:');
      lines.push(`- Name: ${profile.name}`);
      lines.push(`- Email: ${profile.email}`);
      lines.push(`- Customer ID: ${profile.customer_id}`);
    }

    if (projects.length) {
      lines.push('Projects:');
      for (const p of projects) {
        lines.push(
          `- ${p.project_name} — status ${p.status}` +
            (p.expected_end_date ? `, expected end ${p.expected_end_date}` : '')
        );
      }
    }

    if (subs.length) {
      lines.push('Subscriptions:');
      for (const s of subs) {
        lines.push(`- ${s.service_name} — ${s.status}` + (s.end_date ? `, ends ${s.end_date}` : ''));
      }
    }

    if (tickets.length) {
      const open = tickets.filter((t) => !['resolved', 'closed'].includes(t.status));
      lines.push(`Support tickets: ${tickets.length} total, ${open.length} open.`);
      for (const t of open.slice(0, 5)) {
        lines.push(`- #${t.ticket_id} ${t.subject} — ${t.status}/${t.priority}`);
      }
    }

    return `[your account, live from our records]\n${lines.join('\n')}`;
  } catch (err) {
    logger.warn({ module: 'retrieval', reason: err.message }, '[retrieval] account snapshot failed');
    return null;
  }
}

export async function retrieveContext({ query, customerId, classification }) {
  const boostOffers = classification === 'OFFER_OR_PROMOTION';
  const wantAccount =
    Boolean(customerId) &&
    (classification === 'CUSTOMER_SPECIFIC' || classification === 'UNKNOWN');

  const { blocks, sources } = await vectorContext(query, customerId, { boostOffers });
  const contextBlocks = [...blocks];
  const allSources = [...sources];

  if (wantAccount) {
    const snapshot = await accountSnapshot(customerId);
    if (snapshot) {
      contextBlocks.unshift(snapshot);
      allSources.unshift({
        document_type: 'account',
        visibility: 'private',
        source: 'mysql:account_snapshot',
        score: null,
      });
    }
  }

  return {
    contextBlocks,
    sources: allSources,
    grounded: contextBlocks.length > 0,
  };
}
