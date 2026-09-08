// Runtime backstop for "customer_id comes only from the verified JWT": any
// request carrying a customer/account identifier in its body or query string is
// refused with 400 before it reaches a controller. Mounted on /api/customer and
// /api/chat — not on /api/ingest, whose dev-only tools legitimately pass a
// customer_id and run without a JWT.

// customer_id, customerId, cust-id, cid, account_id, client_id, ...
const CLIENT_ID_KEY = /^(customer|cust|account|client)[_-]?id$|^cid$/i;

function offendingKey(obj) {
  if (!obj || typeof obj !== 'object') return null;
  return Object.keys(obj).find((key) => CLIENT_ID_KEY.test(key)) || null;
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
