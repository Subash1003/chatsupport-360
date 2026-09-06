# Customer Service AI Chatbot

A customer-aware support chatbot for a software development company.
Authenticated customers get answers from their own private data; visitors get
public company information only. Built with React + Vite, Node.js + Express,
MySQL, Qdrant and a RAG pipeline.

**Current state: Phase 2 complete — project setup + MySQL schema and sample data.**
No authentication, no Qdrant, no AI yet.

---

## Repository layout

```
cs-ai-chatbot/
├── backend/     Node.js + Express API
├── frontend/    React + Vite client
└── README.md
```

---

## Running locally (two terminals)

### Step 0 — database (once)

Run `backend/database/schema.sql` then `backend/database/seed.sql` in
MySQL Workbench. See `backend/README.md` for the click-by-click steps.

### Terminal 1 — backend

```bash
cd backend
npm install
cp .env.example .env      # Windows: copy .env.example .env
# edit .env and set MYSQL_USER / MYSQL_PASSWORD
npm run dev
```

Runs on <http://localhost:5000>. Verify: <http://localhost:5000/api/health>

### Terminal 2 — frontend

```bash
cd frontend
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev
```

Runs on <http://localhost:5173>. Open it — the card should say **Connected**.

---

## Phase checklist

- [x] **Phase 1** — project setup, folder structure, env vars, health check, CORS
- [x] **Phase 2** — MySQL schema + sample data + connection pool
- [ ] Phase 3 — signup, email OTP, login, JWT, password reset
- [ ] Phase 4 — customer APIs (profile, projects, tickets, subscriptions)
- [ ] Phase 5 — Qdrant collection, embeddings, ingestion pipeline
- [ ] Phase 6 — basic chat API + LLM integration
- [ ] Phase 7 — full RAG pipeline
- [ ] Phase 8 — query classification
- [ ] Phase 9 — security and customer data isolation
- [ ] Phase 10 — conversation memory
- [ ] Phase 11 — lead generation
- [ ] Phase 12 — full frontend
- [ ] Phase 13 — testing
- [ ] Phase 14 — deployment

---

## Architectural rules (do not break these later)

1. `customer_id` is read from the verified JWT, never from the request body.
2. Authorization happens in the backend, before retrieval — never in the LLM prompt.
3. MySQL is the source of truth for structured data; Qdrant holds semantic documents.
4. Qdrant private documents are always filtered by `customer_id`.
5. Unauthenticated users can retrieve public documents only.
6. Secrets live in `.env` and are never committed or exposed to React.
