// SQL for `support_tickets`.

import { query, queryOne } from '../config/db.js';

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

// null if the ticket doesn't belong to this customer.
export function findTicketForCustomer(ticketId, customerId) {
  return queryOne(
    `SELECT ticket_id, subject, description, status, priority,
            created_at, updated_at
       FROM support_tickets
      WHERE ticket_id = ? AND customer_id = ?`,
    [ticketId, customerId]
  );
}

// status is left to its column default ('open') so a customer can only open a
// ticket, never set its state. Returns the new ticket_id.
export async function createTicket(customerId, { subject, description, priority }) {
  const result = await query(
    `INSERT INTO support_tickets (customer_id, subject, description, priority)
     VALUES (?, ?, ?, ?)`,
    [customerId, subject, description, priority]
  );
  return result.insertId;
}

// --- admin ---

// Every ticket across all customers, open ones first, newest first.
export function listAllTickets() {
  return query(
    `SELECT t.ticket_id, t.subject, t.description, t.status, t.priority,
            t.created_at, t.updated_at,
            t.customer_id, c.name AS customer_name, c.email AS customer_email
       FROM support_tickets t
       JOIN customers c ON c.customer_id = t.customer_id
      ORDER BY (t.status IN ('resolved', 'closed')) ASC,
               t.created_at DESC, t.ticket_id DESC`
  );
}

// true if a row changed.
export async function markTicketResolved(ticketId) {
  const r = await query(
    `UPDATE support_tickets SET status = 'resolved' WHERE ticket_id = ?`,
    [ticketId]
  );
  return r.affectedRows > 0;
}
