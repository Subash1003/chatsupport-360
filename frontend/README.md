# Frontend — React + Vite

## Setup

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev
```

Opens on **http://localhost:5173**.

The port is pinned with `strictPort: true` in `vite.config.js`. If 5173 is
busy, Vite will fail instead of silently switching to 5174 — which would break
the backend's CORS allow-list.

## Folder structure

```
src/
├── main.jsx             entry point, mounts <App/> inside the router
├── App.jsx              layout + route table
├── index.css            all styling (plain CSS, no framework)
├── components/          reusable UI pieces
│   ├── Navbar.jsx
│   └── BackendStatus.jsx    calls GET /api/health
├── pages/               one file per route
│   └── HomePage.jsx
├── services/            all HTTP calls live here
│   ├── apiClient.js         shared axios instance
│   └── healthApi.js
├── context/             React context      (Phase 3+: AuthContext)
└── utils/               helpers            (Phase 3+: token storage)
```

## Environment variables

Vite exposes only variables prefixed with `VITE_`, and they are compiled into
the browser bundle. **Never put an API key, JWT secret or database password
here** — anything in this file is public.

| Variable            | Purpose               | Default                     |
| ------------------- | --------------------- | --------------------------- |
| `VITE_API_BASE_URL` | Base URL of the API   | `http://localhost:5000/api` |

After editing `.env`, restart `npm run dev` — Vite reads it at startup only.

## Note on duplicate requests

In development, React StrictMode intentionally runs effects twice, so you will
see two `GET /api/health` lines in the backend log. This does not happen in a
production build.
