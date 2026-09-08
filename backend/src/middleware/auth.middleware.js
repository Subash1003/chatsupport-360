// Gate for protected routes. On success sets req.customer = { customer_id, email }
// and nothing else — every controller and service reads the id from there, never
// from the body/query/params or a client header.
//
// Distinct failure codes so the frontend can react:
//   TOKEN_MISSING  – no Bearer token
//   TOKEN_EXPIRED  – well-formed token, past its exp
//   TOKEN_INVALID  – malformed / bad signature / anything else

import { verifyToken } from '../utils/jwt.js';

function authError(code, message) {
  const err = new Error(message);
  err.statusCode = 401;
  err.code = code;
  return err;
}

export function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(authError('TOKEN_MISSING', 'Authentication required.'));
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(authError('TOKEN_EXPIRED', 'Your session has expired. Please log in again.'));
    }
    return next(authError('TOKEN_INVALID', 'Invalid authentication token.'));
  }

  // Pin to exactly the two trusted claims.
  req.customer = { customer_id: decoded.customer_id, email: decoded.email };
  next();
}

export default requireAuth;
