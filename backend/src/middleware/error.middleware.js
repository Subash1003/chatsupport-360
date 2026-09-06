// -----------------------------------------------------------------------------
// error.middleware.js
//
// Two pieces of middleware that every Express app should have:
//
//   1. notFoundHandler  - runs when no route matched the request (404).
//   2. errorHandler     - runs when any route/middleware throws or calls next(err).
//
// Why build this in Phase 1, before there is anything to fail?
// Because later phases (MySQL down, Qdrant unreachable, LLM API timeout) will
// throw, and we want ONE consistent place that decides what the user sees.
// Rule 20 of the spec: never leak raw database/stack errors to the client.
// -----------------------------------------------------------------------------

import env from '../config/env.js';
import logger from '../config/logger.js';

/**
 * Catches any request that did not match a registered route.
 * Must be registered AFTER all real routes in server.js.
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
}

/**
 * The final safety net.
 *
 * Express recognises this as an error handler ONLY because it takes four
 * arguments (err, req, res, next). Do not remove the unused `next` parameter.
 *
 * Usage from anywhere in the app:
 *   const err = new Error('Something specific went wrong');
 *   err.statusCode = 400;
 *   err.code = 'VALIDATION_ERROR';
 *   next(err);
 */
export function errorHandler(err, req, res, next) {
  // ---------------------------------------------------------------------------
  // Phase 9: normalise a few errors that arrive here without a statusCode/code.
  // Left alone they would all surface as a generic 500.
  // ---------------------------------------------------------------------------
  if (err.type === 'entity.parse.failed') {
    err.statusCode = 400;
    err.code = 'INVALID_JSON';
    err.message = 'Request body is not valid JSON.';
  } else if (err.type === 'entity.too.large') {
    err.statusCode = 413;
    err.code = 'PAYLOAD_TOO_LARGE';
    err.message = 'Request body is too large.';
  } else if (typeof err.message === 'string' && err.message.startsWith('Blocked by CORS')) {
    err.statusCode = 403;
    err.code = 'CORS_BLOCKED';
    err.message = 'This origin is not allowed to call the API.';
  }

  const statusCode = err.statusCode || 500;

  // Always log the full error on the server, where only you can see it.
  logger.error(
    { err, reqId: req.id, method: req.method, url: req.originalUrl },
    `[error] ${req.method} ${req.originalUrl}`
  );

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      // For a 500 we deliberately send a generic message. Internal details
      // (SQL text, connection strings, stack traces) must never reach the client.
      message:
        statusCode === 500
          ? 'Something went wrong. Please try again later.'
          : err.message,
      // The stack is included only in development, purely to help you debug.
      ...(env.isProduction ? {} : { stack: err.stack }),
    },
  });
}
