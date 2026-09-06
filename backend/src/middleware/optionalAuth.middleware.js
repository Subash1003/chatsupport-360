// -----------------------------------------------------------------------------
// optionalAuth.middleware.js
//
// Like requireAuth, but it never rejects the request.
//
//   - valid Bearer token present -> req.customer = { customer_id, email }
//   - no token, or a malformed / expired token -> req.customer stays undefined
//
// For endpoints that serve both anonymous visitors and signed-in customers
// (chat). Identity, when present, still comes only from the verified JWT — never
// from the body (spec rule 1). From Phase 7 onward the retrieval layer keys off
// req.customer; when it is undefined the request is treated as anonymous and
// can reach public knowledge only.
// -----------------------------------------------------------------------------

import { verifyToken } from '../utils/jwt.js';

export function optionalAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme === 'Bearer' && token) {
    try {
      const decoded = verifyToken(token);
      req.customer = {
        customer_id: decoded.customer_id,
        email: decoded.email,
      };
    } catch {
      // Ignore a bad/expired token here — the caller is simply treated as
      // anonymous. Endpoints that must reject bad tokens use requireAuth.
    }
  }

  next();
}

export default optionalAuth;
