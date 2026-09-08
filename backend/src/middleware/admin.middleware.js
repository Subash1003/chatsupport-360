// Gate for /api/admin/*. Verifies a Bearer token issued by POST /api/admin/login
// (payload { role: 'admin', email }). A customer token has no `role` and is 403'd.

import { verifyToken } from '../utils/jwt.js';

function err(code, message, statusCode = 401) {
  const e = new Error(message);
  e.statusCode = statusCode;
  e.code = code;
  return e;
}

export function requireAdmin(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(err('TOKEN_MISSING', 'Admin authentication required.'));
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (e) {
    if (e.name === 'TokenExpiredError') {
      return next(err('TOKEN_EXPIRED', 'Your admin session has expired. Please log in again.'));
    }
    return next(err('TOKEN_INVALID', 'Invalid admin token.'));
  }

  if (decoded.role !== 'admin') {
    return next(err('FORBIDDEN', 'Admin access only.', 403));
  }

  req.admin = { email: decoded.email };
  next();
}

export default requireAdmin;
