// -----------------------------------------------------------------------------
// devOnly.middleware.js
//
// Gate for endpoints that should not exist in production. The ingestion routes
// rebuild the vector store — an operator action, not a customer one. For local
// build-out (Phase 5) a dev-only guard is enough; real protection (a token or
// an admin role) is a Phase 14 concern.
//
// When NODE_ENV=production the route responds exactly like an unknown route,
// so its existence is not even disclosed.
// -----------------------------------------------------------------------------

import env from '../config/env.js';

export function devOnly(req, res, next) {
  if (env.isProduction) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route not found: ${req.method} ${req.originalUrl}`,
      },
    });
  }
  next();
}

export default devOnly;
