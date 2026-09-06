// -----------------------------------------------------------------------------
// subscription.model.js
//
// SQL for `subscriptions`. Joined to `services` (public data) so the response
// carries the service name / description / price, not just a numeric id.
// -----------------------------------------------------------------------------

import { query } from '../config/db.js';

/** A customer's subscriptions with the service they point at, newest first. */
export function listSubscriptionsByCustomer(customerId) {
  return query(
    `SELECT sub.subscription_id, sub.status, sub.start_date, sub.end_date,
            sub.created_at,
            svc.service_id,
            svc.name        AS service_name,
            svc.description AS service_description,
            svc.price       AS service_price
       FROM subscriptions sub
       JOIN services svc ON svc.service_id = sub.service_id
      WHERE sub.customer_id = ?
      ORDER BY sub.start_date DESC, sub.subscription_id DESC`,
    [customerId]
  );
}
