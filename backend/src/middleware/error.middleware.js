// The app's 404 and error handlers. One consistent place decides what the client
// sees; raw database/stack errors never leak out.

import env from '../config/env.js';
import logger from '../config/logger.js';

// Register AFTER all real routes.
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
}

// Express only treats this as an error handler because it takes four args — keep
// the unused `next`.
export function errorHandler(err, req, res, next) {
  // Body-parser / CORS errors arrive without a statusCode; map them so they
  // don't all surface as a generic 500.
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

  logger.error(
    { err, reqId: req.id, method: req.method, url: req.originalUrl },
    `[error] ${req.method} ${req.originalUrl}`
  );

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      // Generic text for a 500 — no SQL, connection strings or stack traces.
      message:
        statusCode === 500
          ? 'Something went wrong. Please try again later.'
          : err.message,
      ...(env.isProduction ? {} : { stack: err.stack }),
    },
  });
}
