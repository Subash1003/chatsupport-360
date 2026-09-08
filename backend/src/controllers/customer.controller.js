// Read the request → call customer.service → respond. The only identity input is
// req.customer.customer_id (set by requireAuth); req.params.id is a project id,
// still scoped to the caller in the service.

import { asyncHandler } from '../utils/asyncHandler.js';
import * as customerService from '../services/customer.service.js';
import {
  requireBody,
  validateNumericId,
  validateText,
  validatePriority,
} from '../utils/validation.js';

function sendOk(res, message, data) {
  res.status(200).json({ success: true, message, data });
}

// GET /api/customer/profile
export const getProfile = asyncHandler(async (req, res) => {
  const data = await customerService.getProfile(req.customer.customer_id);
  sendOk(res, 'Profile retrieved.', data);
});

// GET /api/customer/projects
export const listProjects = asyncHandler(async (req, res) => {
  const projects = await customerService.listProjects(req.customer.customer_id);
  sendOk(res, 'Projects retrieved.', { projects });
});

// GET /api/customer/projects/:id
export const getProject = asyncHandler(async (req, res) => {
  const projectId = validateNumericId(req.params.id, 'project id');
  const data = await customerService.getProjectDetail(req.customer.customer_id, projectId);
  sendOk(res, 'Project retrieved.', data);
});

// GET /api/customer/subscription
export const listSubscriptions = asyncHandler(async (req, res) => {
  const subscriptions = await customerService.listSubscriptions(req.customer.customer_id);
  sendOk(res, 'Subscriptions retrieved.', { subscriptions });
});

// GET /api/customer/tickets
export const listTickets = asyncHandler(async (req, res) => {
  const tickets = await customerService.listTickets(req.customer.customer_id);
  sendOk(res, 'Tickets retrieved.', { tickets });
});

// POST /api/customer/tickets   body: { subject, description, priority? }
export const raiseTicket = asyncHandler(async (req, res) => {
  requireBody(req.body, ['subject', 'description']);
  const subject = validateText(req.body.subject, { label: 'subject', min: 5, max: 200 });
  const description = validateText(req.body.description, {
    label: 'description',
    min: 10,
    max: 5000,
  });
  const priority = validatePriority(req.body.priority);

  const ticket = await customerService.raiseTicket(req.customer.customer_id, {
    subject,
    description,
    priority,
  });
  res.status(201).json({ success: true, message: 'Ticket raised.', data: { ticket } });
});
