// Gate for endpoints that shouldn't exist in production — the ingestion routes
// that rebuild the vector store. In production the route answers exactly like an
// unknown route, so its existence isn't disclosed.

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
