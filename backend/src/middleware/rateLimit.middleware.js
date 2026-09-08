// Per-IP throttling (express-rate-limit). Four buckets, one shared window:
//   globalLimiter – broad safety net on /api (health skipped)
//   authLimiter   – tight, on /api/auth: OTP + password brute-force
//   chatLimiter   – on /api/chat: caps LLM cost and spam
//   leadsLimiter  – tight, on /api/leads: a public write and spam target
// A throttled request gets { code: 'RATE_LIMITED' } with HTTP 429.

import { rateLimit } from 'express-rate-limit';
import env from '../config/env.js';

function makeLimiter(limit, message) {
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler(req, res) {
      res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message } });
    },
  });
}

export const globalLimiter = makeLimiter(
  env.RATE_LIMIT_MAX,
  'Too many requests. Please slow down and try again shortly.'
);

export const authLimiter = makeLimiter(
  env.AUTH_RATE_LIMIT_MAX,
  'Too many authentication attempts. Please wait a few minutes and try again.'
);

export const chatLimiter = makeLimiter(
  env.CHAT_RATE_LIMIT_MAX,
  'Too many messages in a short time. Please wait a moment before sending more.'
);

export const leadsLimiter = makeLimiter(
  env.LEADS_RATE_LIMIT_MAX,
  'Too many submissions. Please wait a few minutes and try again.'
);
