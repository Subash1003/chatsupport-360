// -----------------------------------------------------------------------------
// ticket.model.js
//
// SQL for `support_tickets`. No req/res here.
// -----------------------------------------------------------------------------

import { query, queryOne } from '../config/db.js';

/** A customer's support tickets, newest first. */
export function listTicketsByCustomer(customerId) {
  return query(
    `SELECT ticket_id, subject, description, status, priority,
            created_at, updated_at
       FROM support_tickets
      WHERE customer_id = ?
      ORDER BY created_at DESC, ticket_id DESC`,
    [customerId]
  );
}

/** One ticket, but only if it belongs to this customer (else null). */
export function findTicketForCustomer(ticketId, customerId) {
  return queryOne(
    `SELECT ticket_id, subject, description, status, priority,
            created_at, updated_at
       FROM support_tickets
      WHERE ticket_id = ? AND customer_id = ?`,
    [ticketId, customerId]
  );
}

/**
 * Raise a new ticket. `status` is left to the column default ('open') so a
 * customer can only ever open a ticket, never set its state.
 * @returns {Promise<number>} the new ticket_id
 */
export async function createTicket(customerId, { subject, description, priority }) {
  const result = await query(
    `INSERT INTO support_tickets (customer_id, subject, description, priority)
     VALUES (?, ?, ?, ?)`,
    [customerId, subject, description, priority]
  );
  return result.insertId;
}
