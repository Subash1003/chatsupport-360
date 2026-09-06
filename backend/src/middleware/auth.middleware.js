// -----------------------------------------------------------------------------
// auth.middleware.js
//
// Gate for protected routes. On success it sets:
//
//     req.customer = { customer_id, email }
//
// and NOTHING else. From here on, every controller/service reads the customer
// id from req.customer.customer_id — never from req.body / req.query /
// req.params / a client header (rule 1).
//
// Distinct failure codes so the frontend can react correctly (spec §8):
//   TOKEN_MISSING  - no Bearer token supplied
//   TOKEN_EXPIRED  - well-formed token, past its exp
//   TOKEN_INVALID  - malformed / bad signature / anything else
// -----------------------------------------------------------------------------

import { verifyToken } from '../utils/jwt.js';

function authError(code, message) {
  const err = new Error(message);
  err.statusCode = 401;
  err.code = code;
  return err;
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(authError('TOKEN_MISSING', 'Authentication required.'));
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(
        authError('TOKEN_EXPIRED', 'Your session has expired. Please log in again.')
      );
    }
    return next(authError('TOKEN_INVALID', 'Invalid authentication token.'));
  }

  // Pin req.customer to exactly the two trusted claims.
  req.customer = {
    customer_id: decoded.customer_id,
    email: decoded.email,
  };

  next();
}

export default requireAuth;
