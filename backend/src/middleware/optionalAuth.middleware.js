// Like requireAuth, but never rejects: a valid token sets req.customer, anything
// else leaves it undefined and the caller is treated as anonymous (public
// knowledge only). For endpoints that serve both visitors and customers (chat).

import { verifyToken } from '../utils/jwt.js';

export function optionalAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme === 'Bearer' && token) {
    try {
      const decoded = verifyToken(token);
      req.customer = { customer_id: decoded.customer_id, email: decoded.email };
    } catch {
      // Bad/expired token → treated as anonymous. Routes that must reject one
      // use requireAuth.
    }
  }

  next();
}

export default optionalAuth;
