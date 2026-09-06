// -----------------------------------------------------------------------------
// logger.js
// The ONE logger instance for the whole backend.
//
// Everything that used to `console.log` / `console.error` goes through this so
// that (a) output has a consistent shape, (b) secrets and PII are redacted in
// one place, and (c) production emits plain JSON to stdout (which the host
// captures) while development gets a readable, colourised stream.
//
// Usage:
//   import logger from '../config/logger.js';
//   logger.info({ customerId }, 'did a thing');
//   logger.error({ err }, 'a thing failed');
//
// Or a namespaced child:
//   import { child } from '../config/logger.js';
//   const log = child({ module: 'retrieval' });
// -----------------------------------------------------------------------------

import pino from 'pino';
import env from './env.js';

// Level: explicit LOG_LEVEL wins; otherwise 'debug' in development, 'info' in
// production. 'debug' in dev keeps the health-check lines (logged at debug) and
// other diagnostics visible while you build; production stays at 'info'.
const level = env.LOG_LEVEL || (env.isProduction ? 'info' : 'debug');

// Fields to hide wherever they appear in a logged object. `censor` replaces the
// matched value with the literal string "[redacted]". Paths use pino's syntax:
// dotted paths for known locations, `*.name` for "any key called name at depth
// 1", `["quoted"]` for keys with odd characters.
const redact = {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.body.password',
    'req.body.newPassword',
    'req.body.otp',
    'req.body.token',
    'res.headers["set-cookie"]',
    'authorization',
    '*.password',
    '*.otp',
    '*.secret',
    '*.token',
    '*.apiKey',
    '*.api_key',
  ],
  censor: '[redacted]',
};

// Pretty, human-readable output in development; plain JSON in production.
const usePretty = !env.isProduction;

const logger = pino({
  level,
  redact,
  base: undefined, // drop the default pid/hostname bindings — noise for this app
  ...(usePretty
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
});

/**
 * A namespaced child logger, e.g. child({ module: 'llm' }). The bindings are
 * added to every line the child writes and are still run through `redact`.
 */
export function child(bindings = {}) {
  return logger.child(bindings);
}

export default logger;
