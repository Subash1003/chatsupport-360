import env from '../config/env.js';
import { query, testConnection } from '../config/db.js';

const startedAt = new Date();

// GET /api/health — used by curl, the frontend's connection check, and host probes.
export function getHealth(req, res) {
  res.status(200).json({
    success: true,
    message: 'Backend is running',
    data: {
      service: 'cs-ai-chatbot-backend',
      environment: env.NODE_ENV,
      startedAt: startedAt.toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
}

// GET /api/health/ping
export function ping(req, res) {
  res.status(200).json({ success: true, message: 'pong' });
}

// GET /api/health/db — proves MySQL is reachable, the database exists, and the
// schema/seed ran. 503 (not 500) when the DB is down: the API is fine, its
// dependency isn't. Reports row counts only — no customer data.
export async function getDbHealth(req, res, next) {
  const connection = await testConnection();

  if (!connection.ok) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Could not connect to MySQL.',
        mysqlCode: connection.code,
      },
    });
  }

  try {
    const [counts] = await query(`
      SELECT
        (SELECT COUNT(*) FROM customers)       AS customers,
        (SELECT COUNT(*) FROM projects)        AS projects,
        (SELECT COUNT(*) FROM project_tasks)   AS project_tasks,
        (SELECT COUNT(*) FROM services)        AS services,
        (SELECT COUNT(*) FROM subscriptions)   AS subscriptions,
        (SELECT COUNT(*) FROM support_tickets) AS support_tickets,
        (SELECT COUNT(*) FROM offers)          AS offers,
        (SELECT COUNT(*) FROM leads)           AS leads,
        (SELECT COUNT(*) FROM conversations)   AS conversations,
        (SELECT COUNT(*) FROM messages)        AS messages
    `);

    res.status(200).json({
      success: true,
      message: 'Database connection healthy',
      data: {
        database: connection.db,
        mysqlVersion: connection.version,
        tableCounts: counts,
      },
    });
  } catch (error) {
    // Connection works but tables are missing — schema.sql hasn't been run.
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SCHEMA_NOT_INITIALISED',
          message:
            'Connected to MySQL, but the tables do not exist. ' +
            'Run backend/database/schema.sql and seed.sql.',
        },
      });
    }
    next(error);
  }
}
