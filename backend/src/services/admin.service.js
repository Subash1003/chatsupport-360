// The admin console: one hard-coded operator (ADMIN_EMAIL / ADMIN_PASSWORD) who
// can see every ticket and mark tickets resolved.

import env from '../config/env.js';
import { signAdminToken } from '../utils/jwt.js';
import * as ticketModel from '../models/ticket.model.js';

function httpError(statusCode, code, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

export function login(email, password) {
  const ok =
    String(email || '').trim().toLowerCase() === env.ADMIN_EMAIL.toLowerCase() &&
    String(password || '') === env.ADMIN_PASSWORD;
  if (!ok) {
    throw httpError(401, 'INVALID_CREDENTIALS', 'Invalid admin email or password.');
  }
  return { token: signAdminToken(env.ADMIN_EMAIL), email: env.ADMIN_EMAIL };
}

export function listTickets() {
  return ticketModel.listAllTickets();
}

export async function resolveTicket(ticketId) {
  const changed = await ticketModel.markTicketResolved(ticketId);
  if (!changed) throw httpError(404, 'TICKET_NOT_FOUND', 'Ticket not found.');
  return { ticket_id: ticketId, status: 'resolved' };
}
