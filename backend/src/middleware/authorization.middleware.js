// -----------------------------------------------------------------------------
// authorization.middleware.js
//
// Phase 9: a runtime backstop for spec rule 1 —
//
//   customer_id comes ONLY from the verified JWT (req.customer.customer_id).
//   Never from req.body, req.query, req.params, or a client header.
//
// The controllers and services already honour this. This middleware makes a
// violation impossible to introduce silently later: any request that carries a
// customer / account identifier in its body or query string is refused with
// 400 CLIENT_ID_NOT_ALLOWED before it reaches a controller.
//
// Mounted on the authenticated, identity-scoped surfaces (/api/customer,
// /api/chat). NOT on /api/ingest — those are dev-only tools (404 in production)
// that legitimately take a customer_id because they run without a JWT.
// -----------------------------------------------------------------------------

// customer_id, customerId, cust-id, cid, account_id, client_id, ...
const CLIENT_ID_KEY = /^(customer|cust|account|client)[_-]?id$|^cid$/i;

function offendingKey(obj) {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of Object.keys(obj)) {
    if (CLIENT_ID_KEY.test(key)) return key;
  }
  return null;
}

export function rejectClientCustomerId(req, res, next) {
  const hit = offendingKey(req.body) || offendingKey(req.query);
  if (hit) {
    const err = new Error(
      `"${hit}" is not accepted here. Your identity is taken from your login token, not the request.`
    );
    err.statusCode = 400;
    err.code = 'CLIENT_ID_NOT_ALLOWED';
    return next(err);
  }
  next();
}

export default rejectClientCustomerId;
