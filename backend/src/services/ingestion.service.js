// -----------------------------------------------------------------------------
// ingestion.service.js
//
// The pipeline: read -> clean -> chunk -> embed -> upsert with metadata.
//
// A "document" is { source, document_type, visibility, customer_id?, text }.
// Documents come from three places:
//   - markdown files in backend/data/knowledge/   (company, faq, technology,
//     pricing, policy; and private/<CUST>.md customer documents)
//   - the services and offers tables               (public, already structured)
//   - the projects/tasks and support_tickets tables (private, per customer)
//
// Each ingest function first DELETES the points it owns (by payload filter),
// then re-adds them, so re-running is idempotent and never duplicates.
// -----------------------------------------------------------------------------

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chunkText } from '../utils/chunk.js';
import { embedTexts } from './embedding.service.js';
import {
  ensureCollection,
  upsertChunks,
  deleteByFilter,
  countByFilter,
  buildFilter,
  pointId,
} from './vectorStore.service.js';
import * as knowledge from '../models/knowledge.model.js';

const KNOWLEDGE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../data/knowledge'
);

// ---- document builders ----------------------------------------------------

const PUBLIC_FILES = [
  { file: 'company.md', document_type: 'company' },
  { file: 'faqs.md', document_type: 'faq' },
  { file: 'technologies.md', document_type: 'technology' },
  { file: 'pricing.md', document_type: 'pricing' },
  { file: 'policies.md', document_type: 'policy' },
];

async function readIfPresent(absPath) {
  try {
    return await readFile(absPath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function publicFileDocs() {
  const docs = [];
  for (const { file, document_type } of PUBLIC_FILES) {
    const text = await readIfPresent(path.join(KNOWLEDGE_DIR, file));
    if (text && text.trim()) {
      docs.push({
        source: `file:${file}`,
        document_type,
        visibility: 'public',
        text,
      });
    }
  }
  return docs;
}

function serviceDocs(rows) {
  return rows.map((s) => ({
    source: `mysql:service:${s.service_id}`,
    document_type: 'service',
    visibility: 'public',
    text:
      `Service: ${s.name}\n\n${s.description || ''}\n\n` +
      (s.price == null
        ? 'Pricing: quote only.'
        : `Starting price: ${Number(s.price).toLocaleString('en-IN')} INR.`),
  }));
}

function offerDocs(rows) {
  return rows.map((o) => ({
    source: `mysql:offer:${o.offer_id}`,
    document_type: 'offer',
    visibility: 'public',
    text:
      `Offer: ${o.title}\n\n${o.description || ''}\n\n` +
      `Discount: ${Number(o.discount || 0)}%. ` +
      `Valid ${o.valid_from} to ${o.valid_until}.`,
  }));
}

function projectDocs(customerId, projects) {
  return projects.map((p) => {
    const tasks = p.tasks
      .map(
        (t) =>
          `- [${t.status}] ${t.title}` +
          (t.description ? `: ${t.description}` : '') +
          (t.completed_at ? ` (completed ${t.completed_at})` : '')
      )
      .join('\n');
    return {
      source: `mysql:project:${p.project_id}`,
      document_type: 'project',
      visibility: 'private',
      customer_id: customerId,
      text:
        `Project: ${p.project_name}\n` +
        `Status: ${p.status}\n` +
        `Technology: ${p.technology || 'n/a'}\n` +
        `Start: ${p.start_date || 'n/a'}  Expected end: ${p.expected_end_date || 'n/a'}\n\n` +
        `${p.description || ''}\n\n` +
        (tasks ? `Tasks:\n${tasks}` : 'No tasks recorded yet.'),
    };
  });
}

function ticketDocs(customerId, tickets) {
  return tickets.map((t) => ({
    source: `mysql:ticket:${t.ticket_id}`,
    document_type: 'support',
    visibility: 'private',
    customer_id: customerId,
    text:
      `Support ticket #${t.ticket_id}: ${t.subject}\n` +
      `Status: ${t.status}  Priority: ${t.priority}  Opened: ${t.created_at}\n\n` +
      `${t.description || ''}`,
  }));
}

async function privateFileDoc(customerId) {
  const rel = `private/${customerId}.md`;
  const text = await readIfPresent(path.join(KNOWLEDGE_DIR, rel));
  if (!text || !text.trim()) return [];
  return [
    {
      source: `file:${rel}`,
      document_type: 'policy',
      visibility: 'private',
      customer_id: customerId,
      text,
    },
  ];
}

// ---- the pipeline core ---------------------------------------------------

async function embedAndUpsert(docs) {
  const chunkTexts = [];
  const owner = []; // parallel to chunkTexts: { doc, index }

  for (const doc of docs) {
    const chunks = chunkText(doc.text);
    chunks.forEach((text, index) => {
      chunkTexts.push(text);
      owner.push({ doc, index });
    });
  }

  if (chunkTexts.length === 0) {
    return { documents: docs.length, chunks: 0, points: 0 };
  }

  const vectors = await embedTexts(chunkTexts);
  const now = new Date().toISOString();

  const items = chunkTexts.map((text, k) => {
    const { doc, index } = owner[k];
    const payload = {
      text,
      visibility: doc.visibility,
      document_type: doc.document_type,
      source: doc.source,
      created_at: now,
    };
    if (doc.visibility === 'private') payload.customer_id = doc.customer_id;
    return { id: pointId(doc.source, index), vector: vectors[k], payload };
  });

  await upsertChunks(items);
  return { documents: docs.length, chunks: chunkTexts.length, points: items.length };
}

// ---- public API --------------------------------------------------------

/** Company files + services + offers. Replaces every public point. */
export async function ingestPublic() {
  await ensureCollection();
  await deleteByFilter(buildFilter({ scope: 'public' }));

  const [services, offers] = await Promise.all([
    knowledge.getActiveServices(),
    knowledge.getActiveOffers(),
  ]);

  const docs = [
    ...(await publicFileDocs()),
    ...serviceDocs(services),
    ...offerDocs(offers),
  ];
  return embedAndUpsert(docs);
}

/** Fast path: re-ingest only offer points (for when offers change). */
export async function ingestOffers() {
  await ensureCollection();
  await deleteByFilter({
    must: [{ key: 'document_type', match: { value: 'offer' } }],
  });
  const offers = await knowledge.getActiveOffers();
  return embedAndUpsert(offerDocs(offers));
}

/** One customer's private documents. Replaces every private point for them. */
export async function ingestCustomer(customerId) {
  await ensureCollection();
  await deleteByFilter(buildFilter({ scope: 'private', customerId }));

  const [projects, tickets, fileDoc] = await Promise.all([
    knowledge.getProjectsWithTasks(customerId),
    knowledge.getTickets(customerId),
    privateFileDoc(customerId),
  ]);

  const docs = [
    ...fileDoc,
    ...projectDocs(customerId, projects),
    ...ticketDocs(customerId, tickets),
  ];
  const result = await embedAndUpsert(docs);
  return { customer_id: customerId, ...result };
}

/** Everything: public knowledge + every active customer's private docs. */
export async function ingestAll() {
  await ensureCollection();
  const publicResult = await ingestPublic();

  const customerIds = await knowledge.getActiveCustomerIds();
  const perCustomer = [];
  for (const id of customerIds) {
    perCustomer.push(await ingestCustomer(id));
  }

  const totals = perCustomer.reduce(
    (acc, r) => ({
      documents: acc.documents + r.documents,
      chunks: acc.chunks + r.chunks,
      points: acc.points + r.points,
    }),
    { ...publicResult }
  );

  return {
    total: totals,
    public: publicResult,
    customers: perCustomer,
    pointsInStore: await countByFilter(undefined),
  };
}
