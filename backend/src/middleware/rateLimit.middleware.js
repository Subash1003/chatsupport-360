// -----------------------------------------------------------------------------
// rateLimit.middleware.js
//
// Phase 9: per-IP request throttling (express-rate-limit).
//
// Four buckets, one shared window (RATE_LIMIT_WINDOW_MS):
//   globalLimiter - broad safety net, mounted on /api (health is skipped)
//   authLimiter   - tight, on /api/auth: OTP + password brute-force defence
//   chatLimiter   - on /api/chat: caps LLM cost and message spam
//   leadsLimiter  - tight, on /api/leads: a public write, spam target (Phase 11)
//
// A throttled request gets the standard failure envelope with code
// RATE_LIMITED and HTTP 429 (spec §13). Limits are read from env so they can
// be tightened in production without a code change.
// -----------------------------------------------------------------------------

import { rateLimit } from 'express-rate-limit';
import env from '../config/env.js';

function makeLimiter(limit, message) {
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit,
    standardHeaders: 'draft-7', // RateLimit / RateLimit-Policy headers
    legacyHeaders: false, // no X-RateLimit-*
    handler(req, res) {
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message },
      });
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
