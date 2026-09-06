// -----------------------------------------------------------------------------
// server.js
//
// The entry point of the backend. It does four things and nothing more:
//   1. Create the Express app
//   2. Register global middleware (CORS, JSON parsing, request logging)
//   3. Mount routes
//   4. Start listening on a port
//
// Everything else lives in its own folder (config / routes / controllers /
// middleware / services / models). Keeping server.js thin is what makes the
// project stay readable once we add auth, MySQL, Qdrant and the RAG pipeline.
// -----------------------------------------------------------------------------

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import env from './config/env.js';
import logger from './config/logger.js';
import { requestLog } from './middleware/requestLog.middleware.js';
import { testConnection, closePool } from './config/db.js';
import { testQdrant } from './config/qdrant.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import customerRoutes from './routes/customer.routes.js';
import ingestRoutes from './routes/ingest.routes.js';
import chatRoutes from './routes/chat.routes.js';
import leadRoutes from './routes/lead.routes.js';
import {
  globalLimiter,
  authLimiter,
  chatLimiter,
  leadsLimiter,
} from './middleware/rateLimit.middleware.js';
import { rejectClientCustomerId } from './middleware/authorization.middleware.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';

const app = express();

// Phase 9: behind a reverse proxy in production (Render/Nginx), trust the first
// proxy hop so express-rate-limit keys on the real client IP, not the proxy's.
if (env.isProduction) app.set('trust proxy', 1);

// ---------------------------------------------------------------------------
// 0. Security headers  (Phase 9)
// ---------------------------------------------------------------------------
// helmet sets HSTS, X-Content-Type-Options, frameguard, Referrer-Policy, etc.
// CSP and COEP are for HTML documents, not a JSON API, so they are turned off
// to avoid surprising the browser client.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// ---------------------------------------------------------------------------
// 1. CORS
// ---------------------------------------------------------------------------
// The browser blocks a page served from http://localhost:5173 (Vite) from
// calling http://localhost:5000 (Express) unless the server explicitly says
// "this origin is allowed". That permission is CORS.
//
// We allow ONLY our frontend origin, not "*". Later we will send the JWT in an
// Authorization header, and being strict about origins from day one is good
// habit. `credentials: true` is there so cookies would also work if we ever
// switch from header-based tokens.
// ---------------------------------------------------------------------------
const allowedOrigins = [
  env.FRONTEND_URL,          // e.g. http://localhost:5173
  'http://127.0.0.1:5173',   // same thing, different hostname spelling
];

app.use(
  cors({
    origin(origin, callback) {
      // `origin` is undefined for non-browser clients (curl, Postman, health
      // probes). Those are allowed through.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Blocked by CORS: ${origin}`));
    },
    credentials: true,
  })
);

// ---------------------------------------------------------------------------
// 2. Body parsing
// ---------------------------------------------------------------------------
// Turns an incoming JSON request body into req.body. Without this, req.body is
// undefined. The 1mb limit is a cheap first line of defence against someone
// posting a huge payload.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// 3. Request logging + tracing
// ---------------------------------------------------------------------------
// One structured line per completed request (method, path, status, durationMs,
// request id, customerId). Also attaches req.id and echoes it back as the
// `x-request-id` response header so a request can be traced end to end.
// Mounted after body parsing, before the routes. Health probes log at debug.
app.use(requestLog);

// ---------------------------------------------------------------------------
// 4. Routes
// ---------------------------------------------------------------------------
// Everything is namespaced under /api so the API never collides with frontend
// routes if we ever serve both from one domain.
//
// Phase 9 rate limiting:
//   - globalLimiter on everything under /api EXCEPT /api/health (probes/cards
//     poll it and must never be throttled).
//   - authLimiter (tight)  on /api/auth  — OTP + password brute force.
//   - chatLimiter          on /api/chat  — LLM cost + message spam.
// Phase 9 authorization:
//   - rejectClientCustomerId on the identity-scoped surfaces: a customer_id in
//     the body/query is refused (identity comes only from the JWT, rule 1).
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/health')) return next();
  return globalLimiter(req, res, next);
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/customer', rejectClientCustomerId, customerRoutes);
app.use('/api/ingest', ingestRoutes);
app.use('/api/chat', chatLimiter, rejectClientCustomerId, chatRoutes);
app.use('/api/leads', leadsLimiter, leadRoutes); // Phase 11: public lead capture

// A friendly root response, so hitting http://localhost:5000/ is not a 404.
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Customer Service AI Chatbot API',
    docs: {
      health: '/api/health',
      ping: '/api/health/ping',
      auth: '/api/auth',
      customer: '/api/customer',
      ingest: '/api/ingest',
      chat: '/api/chat',
      leads: '/api/leads',
    },
  });
});

// ---------------------------------------------------------------------------
// 5. Error handling  (must be registered LAST)
// ---------------------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

// ---------------------------------------------------------------------------
// 6. Start the server
// ---------------------------------------------------------------------------
const server = app.listen(env.PORT, async () => {
  console.log('');
  console.log('  Customer Service AI Chatbot - Backend');
  console.log(`  Environment : ${env.NODE_ENV}`);
  console.log(`  Listening   : http://localhost:${env.PORT}`);
  console.log(`  Health check: http://localhost:${env.PORT}/api/health`);
  console.log(`  DB check    : http://localhost:${env.PORT}/api/health/db`);
  console.log(`  CORS allows : ${allowedOrigins.join(', ')}`);
  console.log(
    `  Security    : helmet on · rate limit ${env.RATE_LIMIT_MAX}/${
      env.RATE_LIMIT_WINDOW_MS / 60000
    }m (auth ${env.AUTH_RATE_LIMIT_MAX}, chat ${env.CHAT_RATE_LIMIT_MAX})`
  );

  // -------------------------------------------------------------------------
  // Phase 2: check MySQL once at startup.
  //
  // We report the result but do NOT exit on failure. Keeping the API up means
  // /api/health still answers and the frontend can show you a useful error,
  // instead of you staring at a dead port wondering what broke.
  // -------------------------------------------------------------------------
  const db = await testConnection();
  if (db.ok) {
    console.log(`  MySQL       : connected to "${db.db}" (${db.version})`);
    logger.info({ db: db.db, version: db.version }, 'MySQL connected');
  } else {
    console.error(`  MySQL       : NOT CONNECTED [${db.code}]`);
    console.error(`                ${db.message}`);
    console.error('                Check the MYSQL_* values in backend/.env');
    logger.error(
      { code: db.code, message: db.message },
      'MySQL NOT connected — check MYSQL_* in backend/.env'
    );
  }

  // -------------------------------------------------------------------------
  // Phase 5: check Qdrant once at startup. Also non-fatal — Phases 1-4 keep
  // working without it, and the ingest endpoints return a clean 503.
  // -------------------------------------------------------------------------
  const qdrant = await testQdrant();
  if (qdrant.ok) {
    console.log(
      `  Qdrant      : connected (${qdrant.collections.length} collection(s))`
    );
    logger.info(
      { collections: qdrant.collections.length },
      'Qdrant connected'
    );
  } else if (qdrant.code === 'NOT_CONFIGURED') {
    console.log('  Qdrant      : not configured (set QDRANT_* in backend/.env for Phase 5)');
    logger.warn('Qdrant not configured — set QDRANT_* in backend/.env for Phase 5');
  } else {
    console.error(`  Qdrant      : NOT CONNECTED [${qdrant.code}]`);
    console.error(`                ${qdrant.message}`);
    logger.error(
      { code: qdrant.code, message: qdrant.message },
      'Qdrant NOT connected'
    );
  }
  console.log('');
});

// Catch the two most common startup failures with a clear message instead of a
// wall of stack trace.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(
      { port: env.PORT },
      `Port ${env.PORT} is already in use. Stop the other process or change PORT in backend/.env`
    );
    process.exit(1);
  }
  throw err;
});

// Graceful shutdown, so Ctrl+C closes connections cleanly.
process.on('SIGINT', () => {
  logger.info('SIGINT received — shutting down');
  server.close(async () => {
    // Close the MySQL pool too, otherwise the process can hang on exit
    // holding open connections.
    await closePool().catch(() => {});
    process.exit(0);
  });
});

export default app;
