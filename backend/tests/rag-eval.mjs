// -----------------------------------------------------------------------------
// tests/rag-eval.mjs
//
// RAG evaluation harness. Runs every case in rag-eval-dataset.json against a
// RUNNING backend (real retrieval + real LLM) and scores:
//
//   classification  - does the classifier pick the expected class?
//   groundedness    - does `grounded` match (answered from context vs "no info")?
//   answer recall   - are all expected facts present in the reply?
//   answer precision- is forbidden / hallucinated / leaked text absent?
//   retrieval       - did at least one expected source document_type come back?
//   isolation       - anon/other-customer never sees private / cross-customer data
//
// Usage:
//   cd backend
//   npm run dev                       # in another terminal
//   node tests/rag-eval.mjs           # or: node tests/rag-eval.mjs http://localhost:5000/api
//
// Exit 0 if every case fully passes AND every isolation check passes; else 1.
// Chat calls are paced for the Groq free tier; one retry on LLM_RATE_LIMITED.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = (process.argv[2] || 'http://localhost:5000/api').replace(/\/$/, '');
const HERE = dirname(fileURLToPath(import.meta.url));
const DATASET = JSON.parse(readFileSync(join(HERE, 'rag-eval-dataset.json'), 'utf8'));

const LOGINS = {
  CUST1001: { email: 'aarav@meridianretail.com', password: 'Password123!' },
  CUST1002: { email: 'sneha@northwindlogistics.com', password: 'Password123!' },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Normalise the Unicode the model likes to emit so plain-ASCII assertion
// regexes still match: curly quotes, every dash/hyphen variant (incl. the
// non-breaking hyphen U+2011), and non-breaking / thin spaces.
const norm = (s) =>
  String(s || '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, '-')
    .replace(/[    ]/g, ' ');
const matches = (text, pattern) => new RegExp(pattern, 'i').test(norm(text));

async function api(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function chat({ message, token, sessionId }, attempt = 1) {
  const r = await api('/chat', { method: 'POST', token, body: { message, session_id: sessionId } });
  if ((r.status === 429 || r.json?.error?.code === 'LLM_RATE_LIMITED') && attempt < 3) {
    await sleep(15000);
    return chat({ message, token, sessionId }, attempt + 1);
  }
  return r;
}

async function login(who) {
  const r = await api('/auth/login', { method: 'POST', body: who });
  if (r.status !== 200) throw new Error(`login ${who.email} failed: ${JSON.stringify(r.json)}`);
  return r.json.data.token;
}

// --- metric tallies -----------------------------------------------------------
const M = {
  classification: { ok: 0, n: 0 },
  groundedness: { ok: 0, n: 0 },
  answerRecall: { ok: 0, n: 0 }, // per include-pattern
  answerPrecision: { ok: 0, n: 0 }, // per exclude-pattern
  retrieval: { ok: 0, n: 0 },
  isolation: { ok: 0, n: 0 },
};
const caseResults = [];

function scoreCase(c, data) {
  const e = c.expect || {};
  const reply = data?.reply || '';
  const sources = data?.sources || [];
  const fails = [];

  if (e.class) {
    M.classification.n++;
    if (data?.classification?.class === e.class) M.classification.ok++;
    else fails.push(`class ${data?.classification?.class} != ${e.class}`);
  }

  if (typeof e.grounded === 'boolean') {
    M.groundedness.n++;
    if (data?.grounded === e.grounded) M.groundedness.ok++;
    else fails.push(`grounded ${data?.grounded} != ${e.grounded}`);
  }

  for (const p of e.includes || []) {
    M.answerRecall.n++;
    if (matches(reply, p)) M.answerRecall.ok++;
    else fails.push(`missing /${p}/`);
  }

  for (const p of e.excludes || []) {
    M.answerPrecision.n++;
    if (!matches(reply, p)) M.answerPrecision.ok++;
    else fails.push(`forbidden text present /${p}/`);
  }

  if (e.source_types) {
    M.retrieval.n++;
    const got = sources.map((s) => s.document_type);
    if (got.some((t) => e.source_types.includes(t))) M.retrieval.ok++;
    else fails.push(`no source of type [${e.source_types}] (got [${got}])`);
  }

  if (e.no_private_sources) {
    M.isolation.n++;
    const priv = sources.filter((s) => s.visibility === 'private');
    if (priv.length === 0) M.isolation.ok++;
    else fails.push(`${priv.length} private source(s) leaked`);
  }

  if (e.forbid_source_substr) {
    M.isolation.n++;
    const bad = sources.filter((s) =>
      e.forbid_source_substr.some((sub) => String(s.source || '').includes(sub))
    );
    if (bad.length === 0) M.isolation.ok++;
    else fails.push(`cross-customer source(s): ${bad.map((s) => s.source)}`);
  }

  return { fails, reply };
}

function pct(o, n) {
  return n === 0 ? '  n/a' : `${((100 * o) / n).toFixed(1)}%`.padStart(6);
}

async function run() {
  console.log(`RAG eval — ${BASE}\n${DATASET.cases.length} cases\n`);

  const tokens = {
    CUST1001: await login(LOGINS.CUST1001),
    CUST1002: await login(LOGINS.CUST1002),
  };

  let fullyPassing = 0;
  for (const c of DATASET.cases) {
    const token = c.auth === 'anon' ? undefined : tokens[c.auth];
    const r = await chat({
      message: c.query,
      token,
      sessionId: `rageval-${c.id}`.slice(0, 90),
    });
    const data = r.json?.data;
    if (!data) {
      caseResults.push({ id: c.id, pass: false, fails: [`HTTP ${r.status} ${r.json?.error?.code || ''}`] });
      console.log(`FAIL  ${c.id.padEnd(28)} HTTP ${r.status} ${r.json?.error?.code || ''}`);
      await sleep(3500);
      continue;
    }
    const { fails, reply } = scoreCase(c, data);
    const pass = fails.length === 0;
    if (pass) fullyPassing++;
    caseResults.push({ id: c.id, pass, fails });
    console.log(
      `${pass ? 'PASS' : 'FAIL'}  ${c.id.padEnd(28)} ${data.classification?.class || '-'} ` +
        `grounded=${data.grounded}` +
        (pass ? '' : `\n      ${fails.join('\n      ')}\n      reply: "${norm(reply).slice(0, 140)}"`)
    );
    await sleep(3500);
  }

  console.log('\n──────────────  ACCURACY  ──────────────');
  console.log(`classification    ${pct(M.classification.ok, M.classification.n)}  (${M.classification.ok}/${M.classification.n})`);
  console.log(`groundedness      ${pct(M.groundedness.ok, M.groundedness.n)}  (${M.groundedness.ok}/${M.groundedness.n})`);
  console.log(`answer recall     ${pct(M.answerRecall.ok, M.answerRecall.n)}  (${M.answerRecall.ok}/${M.answerRecall.n} expected facts present)`);
  console.log(`answer precision  ${pct(M.answerPrecision.ok, M.answerPrecision.n)}  (${M.answerPrecision.ok}/${M.answerPrecision.n} forbidden strings absent)`);
  console.log(`retrieval         ${pct(M.retrieval.ok, M.retrieval.n)}  (${M.retrieval.ok}/${M.retrieval.n} right source type retrieved)`);
  console.log(`isolation         ${pct(M.isolation.ok, M.isolation.n)}  (${M.isolation.ok}/${M.isolation.n} — must be 100%)`);
  console.log('────────────────────────────────────────');
  console.log(`cases fully passing  ${fullyPassing}/${DATASET.cases.length}  (${pct(fullyPassing, DATASET.cases.length).trim()})`);

  const isolationClean = M.isolation.ok === M.isolation.n;
  if (!isolationClean) console.log('\n*** ISOLATION FAILURE — investigate before anything else ***');

  process.exit(fullyPassing === DATASET.cases.length && isolationClean ? 0 : 1);
}

run().catch((err) => {
  console.error('\nRUN ERROR:', err.message);
  process.exit(1);
});
