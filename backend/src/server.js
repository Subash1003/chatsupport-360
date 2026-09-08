// Backend entry point: create the app, register global middleware, mount routes,
// start listening. Everything else lives under config / routes / controllers /
// middleware / services / models.

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
import adminRoutes from './routes/admin.routes.js';
import {
  globalLimiter,
  authLimiter,
  chatLimiter,
  leadsLimiter,
} from './middleware/rateLimit.middleware.js';
import { rejectClientCustomerId } from './middleware/authorization.middleware.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';

const app = express();

// Behind a reverse proxy in production — trust the first hop so
// express-rate-limit keys on the real client IP.
if (env.isProduction) app.set('trust proxy', 1);

// CSP/COEP are for HTML documents, not a JSON API.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// Allow only our own frontend origin. `origin` is undefined for non-browser
// clients (curl, health probes) — those pass. credentials:true so cookie auth
// would work if we ever moved off header tokens.
const allowedOrigins = [env.FRONTEND_URL, 'http://127.0.0.1:5173'];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Blocked by CORS: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// One structured line per request + x-request-id tracing. After body parsing,
// before the routes.
app.use(requestLog);

// globalLimiter on everything under /api except /api/health, which probes poll
// and must never be throttled.
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/health')) return next();
  return globalLimiter(req, res, next);
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/customer', rejectClientCustomerId, customerRoutes);
app.use('/api/ingest', ingestRoutes);
app.use('/api/chat', chatLimiter, rejectClientCustomerId, chatRoutes);
app.use('/api/leads', leadsLimiter, leadRoutes);
app.use('/api/admin', adminRoutes);

// So hitting http://localhost:5000/ isn't a 404.
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
      admin: '/api/admin',
    },
  });
});

// Must be last.
app.use(notFoundHandler);
app.use(errorHandler);

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

  // Startup checks: report but don't exit on failure, so /api/health still
  // answers and the frontend can show a useful error.
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

  const qdrant = await testQdrant();
  if (qdrant.ok) {
    console.log(`  Qdrant      : connected (${qdrant.collections.length} collection(s))`);
    logger.info({ collections: qdrant.collections.length }, 'Qdrant connected');
  } else if (qdrant.code === 'NOT_CONFIGURED') {
    console.log('  Qdrant      : not configured (set QDRANT_* in backend/.env)');
    logger.warn('Qdrant not configured — set QDRANT_* in backend/.env');
  } else {
    console.error(`  Qdrant      : NOT CONNECTED [${qdrant.code}]`);
    console.error(`                ${qdrant.message}`);
    logger.error({ code: qdrant.code, message: qdrant.message }, 'Qdrant NOT connected');
  }
  console.log('');
});

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

process.on('SIGINT', () => {
  logger.info('SIGINT received — shutting down');
  server.close(async () => {
    await closePool().catch(() => {});
    process.exit(0);
  });
});

export default app;
