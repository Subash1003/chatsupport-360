// -----------------------------------------------------------------------------
// health.controller.js
//
// A controller's job is: read the request -> call whatever service is needed ->
// send a response. Nothing else. No SQL, no business rules.
//
// For Phase 1 there is no service layer yet, so this controller just reports
// that the server is alive. In later phases we will add real controllers
// (auth, chat, leads) that follow this same shape.
// -----------------------------------------------------------------------------

import env from '../config/env.js';
import { query, testConnection } from '../config/db.js';

// Remember the moment the process started so we can report uptime.
const startedAt = new Date();

/**
 * GET /api/health
 *
 * Used by:
 *  - you, from the browser or curl, to confirm the backend is running
 *  - the React frontend, to prove the frontend -> backend connection works
 *  - hosting platforms later on (Render etc.) as a health probe
 */
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

/**
 * GET /api/health/ping
 *
 * The smallest possible endpoint. Handy when you want to check connectivity
 * without reading through a JSON object.
 */
export function ping(req, res) {
  res.status(200).json({ success: true, message: 'pong' });
}

/**
 * GET /api/health/db      (Phase 2)
 *
 * Proves three things at once:
 *   1. Node can reach MySQL with the credentials in .env
 *   2. The cs_chatbot database exists
 *   3. schema.sql and seed.sql actually ran
 *
 * Returns 503 (Service Unavailable) rather than 500 when the database is
 * unreachable, because the API itself is fine - its dependency is not.
 *
 * Note: this endpoint reports ROW COUNTS only. It deliberately exposes no
 * customer data, because it is a public endpoint.
 */
export async function getDbHealth(req, res, next) {
  const connection = await testConnection();

  if (!connection.ok) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Could not connect to MySQL.',
        // The MySQL error code (ER_ACCESS_DENIED_ERROR, ECONNREFUSED,
        // ER_BAD_DB_ERROR...) is genuinely useful while developing and is not
        // sensitive on its own.
        mysqlCode: connection.code,
      },
    });
  }

  try {
    // One query, one row: a count per table. Cheap and easy to read.
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
    // Reaching here usually means the connection works but the tables are
    // missing, i.e. schema.sql has not been run yet.
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
    next(error); // anything unexpected goes to the global error handler
  }
}
