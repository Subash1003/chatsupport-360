// -----------------------------------------------------------------------------
// jwt.js
//
// Sign and verify the auth token. The payload is deliberately tiny:
//
//     { customer_id, email }
//
// and NOTHING else. Every protected route derives identity from the verified
// token via auth.middleware.js, never from the request body.
// -----------------------------------------------------------------------------

import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/**
 * Sign a token for a customer.
 * `jsonwebtoken` adds `iat` and `exp` itself; the only claims we put in are
 * customer_id and email.
 */
export function signToken({ customer_id, email }) {
  return jwt.sign({ customer_id, email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

/**
 * Verify a token. Throws on a bad or expired token:
 *   - expired  -> error.name === 'TokenExpiredError'
 *   - anything else (bad signature, malformed) -> 'JsonWebTokenError'
 * The middleware maps those to TOKEN_EXPIRED / TOKEN_INVALID.
 */
export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}
