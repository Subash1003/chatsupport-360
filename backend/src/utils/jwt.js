// Sign and verify the auth token. The payload is deliberately tiny —
// { customer_id, email } and nothing else. Protected routes derive identity from
// the verified token, never from the request body.

import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export function signToken({ customer_id, email }) {
  return jwt.sign({ customer_id, email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

// role:'admin', no customer_id — customer routes reject it, admin routes accept it.
export function signAdminToken(email) {
  return jwt.sign({ role: 'admin', email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

// Throws on a bad/expired token; the middleware maps the error name to
// TOKEN_EXPIRED / TOKEN_INVALID.
export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}
