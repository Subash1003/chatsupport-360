// One structured log line per HTTP request, plus a request id on req.id that is
// echoed as the x-request-id response header so a request can be traced end to
// end. Logs method, path, status, durationMs, request id and customerId only —
// never bodies, the Authorization header, cookies, OTPs or tokens.
//
// Level: /api/health* → debug (probes poll it), 5xx → error, 4xx → warn, else info.

import { randomUUID } from 'node:crypto';
import pinoHttp from 'pino-http';
import logger from '../config/logger.js';

// A client-supplied x-request-id is trusted only as an opaque correlation tag.
const SAFE_REQUEST_ID = /^[\w.-]{1,128}$/;

function resolveReqId(req, res) {
  const incoming = req.headers['x-request-id'];
  const id =
    typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('x-request-id', id);
  return id;
}

// Inside a router Express rewrites req.url to the mount-relative path; originalUrl
// keeps the full one, which is what we want for routing decisions and log text.
function fullUrl(req) {
  return req.originalUrl || req.url || '';
}

const isHealthPath = (req) => fullUrl(req).startsWith('/api/health');

export const requestLog = pinoHttp({
  logger,
  genReqId: resolveReqId,

  customLogLevel(req, res, err) {
    if (isHealthPath(req)) return 'debug';
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },

  customSuccessMessage(req, res) {
    return `${req.method} ${fullUrl(req)} ${res.statusCode}`;
  },
  customErrorMessage(req, res, err) {
    return `${req.method} ${fullUrl(req)} ${res.statusCode} ${err?.code || err?.message || 'error'}`;
  },

  serializers: {
    req(req) {
      return { id: req.id, method: req.method, url: req.originalUrl || req.url };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },

  // Fold the useful bits onto the top level so the line reads well in pretty and
  // JSON mode. Evaluated at response time, after auth has set req.customer.
  customProps(req, res) {
    return {
      reqId: req.id,
      status: res.statusCode,
      customerId: req.customer?.customer_id || 'anon',
      durationMs: typeof res.responseTime === 'number' ? res.responseTime : undefined,
    };
  },
});

export default requestLog;
