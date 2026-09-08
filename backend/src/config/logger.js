// One pino instance for the backend. Everything logs through it so output shape
// is consistent, secrets are redacted in one place, and prod emits plain JSON
// to stdout while dev gets a colourised stream.
//
//   logger.info({ customerId }, 'did a thing');
//   const log = child({ module: 'retrieval' });

import pino from 'pino';
import env from './env.js';

// 'debug' in dev keeps health-check lines and diagnostics visible; 'info' in prod.
const level = env.LOG_LEVEL || (env.isProduction ? 'info' : 'debug');

// Hidden wherever they appear in a logged object. Paths use pino's syntax:
// `*.name` means "any key called name at depth 1".
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

const logger = pino({
  level,
  redact,
  base: undefined, // drop default pid/hostname bindings — noise for this app
  ...(env.isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
      }),
});

// Namespaced child, e.g. child({ module: 'llm' }); bindings still run through redact.
export function child(bindings = {}) {
  return logger.child(bindings);
}

export default logger;
