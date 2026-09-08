// Read the request → call admin.service → respond.

import { asyncHandler } from '../utils/asyncHandler.js';
import * as adminService from '../services/admin.service.js';
import { requireBody, validateNumericId } from '../utils/validation.js';

// POST /api/admin/login   { email, password }
export const adminLogin = asyncHandler(async (req, res) => {
  requireBody(req.body, ['email', 'password']);
  const data = adminService.login(req.body.email, req.body.password);
  res.status(200).json({ success: true, message: 'Admin logged in.', data });
});

// GET /api/admin/tickets   (requireAdmin)
export const adminListTickets = asyncHandler(async (req, res) => {
  const tickets = await adminService.listTickets();
  res.status(200).json({ success: true, message: 'OK', data: { tickets } });
});

// PATCH /api/admin/tickets/:id/resolve   (requireAdmin)
export const adminResolveTicket = asyncHandler(async (req, res) => {
  const id = validateNumericId(req.params.id, 'ticket id');
  const data = await adminService.resolveTicket(id);
  res.status(200).json({ success: true, message: 'Ticket resolved.', data });
});
