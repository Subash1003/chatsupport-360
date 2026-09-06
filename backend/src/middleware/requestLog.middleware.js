// -----------------------------------------------------------------------------
// requestLog.middleware.js
//
// One structured log line per completed HTTP request, plus a request id that is
// attached to req.id and echoed back as the `x-request-id` response header so a
// single request can be traced end to end (client -> logs -> error handler).
//
// Built on pino-http. It intentionally logs only:
//   method, path (+ query string), status, durationMs, request id, customerId
// It NEVER logs request/response bodies, the Authorization header, cookies,
// passwords, OTP codes or tokens (see config/logger.js `redact`, and the
// minimal serializers below).
//
// Log level per response:
//   /api/health*        -> debug  (probes poll it; keep it out of the info feed)
//   5xx                 -> error
//   4xx                 -> warn
//   everything else      -> info
// -----------------------------------------------------------------------------

import { randomUUID } from 'node:crypto';
import pinoHttp from 'pino-http';
import logger from '../config/logger.js';

// A client-supplied x-request-id is only trusted as an opaque correlation tag:
// accept a short, plain token and ignore anything weird.
const SAFE_REQUEST_ID = /^[\w.-]{1,128}$/;

function resolveReqId(req, res) {
  const incoming = req.headers['x-request-id'];
  const id =
    typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming)
      ? incoming
      : randomUUID();
  res.setHeader('x-request-id', id);
  return id;
}

// Express rewrites req.url to the mount-relative path inside a router (so a
// health hit looks like '/' by the time the response finishes). req.originalUrl
// keeps the full path — use it for routing decisions and the log message.
function fullUrl(req) {
  return req.originalUrl || req.url || '';
}

function isHealthPath(req) {
  return fullUrl(req).startsWith('/api/health');
}

export const requestLog = pinoHttp({
  logger,

  // req.id + the x-request-id response header.
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

  // Keep the serialized req/res tiny — method, url, status only. No headers, no
  // body, no socket details. (customerId is added by customProps below, which is
  // evaluated at response time when req.customer has been set by auth.)
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.originalUrl || req.url,
      };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },

  // Fold the useful bits onto the top level of the line so it reads well in both
  // pretty and JSON mode: status, durationMs, reqId, customerId.
  customProps(req, res) {
    return {
      reqId: req.id,
      status: res.statusCode,
      customerId: req.customer?.customer_id || 'anon',
      durationMs:
        typeof res.responseTime === 'number' ? res.responseTime : undefined,
    };
  },
});

export default requestLog;
