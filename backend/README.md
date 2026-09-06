# Backend — Node.js + Express

## Setup

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev               # nodemon, restarts on file change
# or
npm start                 # plain node, no auto-restart
```

Default port: **5000** (change `PORT` in `.env`).

## Database setup (Phase 2 — do this before `npm run dev`)

In MySQL Workbench:

1. Open your local connection.
2. **File → Open SQL Script…** → `backend/database/schema.sql` → click ⚡ (Execute).
3. **File → Open SQL Script…** → `backend/database/seed.sql` → click ⚡ (Execute).
4. Click the refresh icon in the **Schemas** panel — `cs_chatbot` appears with 12 tables.

Or from a terminal:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

Then fill in the `MYSQL_*` values in `.env`.

**Sample logins** (used from Phase 3): password `Password123!` for
`aarav@meridianretail.com` (CUST1001), `sneha@northwindlogistics.com`
(CUST1002), `rahul@zenithclinics.com` (CUST1003).

## Endpoints

| Method | Path               | Auth | Description                       |
| ------ | ------------------ | ---- | --------------------------------- |
| GET    | `/`                | no   | API index                         |
| GET    | `/api/health`      | no   | Service status, uptime, timestamp |
| GET    | `/api/health/ping` | no   | Minimal liveness check            |
| GET    | `/api/health/db`   | no   | MySQL connectivity + row counts   |

### Test with curl

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/health/ping
curl http://localhost:5000/api/health/db
curl -i http://localhost:5000/api/does-not-exist    # expect 404 JSON
```

Expected `/api/health` response:

```json
{
  "success": true,
  "message": "Backend is running",
  "data": {
    "service": "cs-ai-chatbot-backend",
    "environment": "development",
    "startedAt": "2026-01-01T00:00:00.000Z",
    "uptimeSeconds": 12,
    "timestamp": "2026-01-01T00:00:12.000Z"
  }
}
```

## Folder structure

```
database/
├── schema.sql           creates cs_chatbot + 12 tables
└── seed.sql             sample customers, projects, services, offers...
src/
├── server.js            entry point: middleware, routes, listen
├── config/
│   ├── env.js           the only file that reads process.env
│   └── db.js            MySQL pool + query/queryOne/withTransaction helpers
├── routes/              URL -> controller mapping, no logic
├── controllers/         read request, call service, send response
├── middleware/          cross-cutting concerns (errors, auth later)
├── services/            business logic          (Phase 3+)
├── models/              database access         (Phase 4+)
└── utils/               small helpers           (Phase 3+)
```

## Querying rules

Always pass values as parameters — never build SQL with string concatenation:

```js
import { query, queryOne, withTransaction } from './config/db.js';

// GOOD
await query('SELECT * FROM projects WHERE customer_id = ?', [customerId]);

// NEVER
await query(`SELECT * FROM projects WHERE customer_id = '${customerId}'`);
```

`query()` uses `pool.execute` (prepared statements). Two known limits: it
cannot parameterise table/column names, and `IN (?)` does not expand an array.
For those use `pool.query` with values escaped by mysql2, or build the
placeholder list yourself (`IN (?, ?, ?)`).

## Response conventions

Success:

```json
{ "success": true, "message": "...", "data": { } }
```

Failure:

```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "..." } }
```

Every route sticks to this shape, so the frontend can handle responses uniformly.

## Notes

- This project uses **ES modules** (`"type": "module"` in package.json).
  Use `import`/`export`, not `require`. Local imports need the `.js`
  extension: `import env from './config/env.js'`.
- 500-level errors deliberately return a generic message. Raw SQL / stack
  details stay in the server log only.
