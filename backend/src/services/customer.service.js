// -----------------------------------------------------------------------------
// customer.service.js
//
// Business logic for the authenticated-customer read APIs. No req/res here.
//
// Every function takes `customerId` as its first argument. That value always
// originates from req.customer.customer_id (the verified JWT) — never from the
// URL, query string or body (rule 1).
// -----------------------------------------------------------------------------

import * as customerModel from '../models/customer.model.js';
import * as projectModel from '../models/project.model.js';
import * as subscriptionModel from '../models/subscription.model.js';
import * as ticketModel from '../models/ticket.model.js';

function httpError(statusCode, code, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

export async function getProfile(customerId) {
  const profile = await customerModel.getProfileById(customerId);
  if (!profile) {
    // Token is valid but the account row is gone (deleted since it was issued).
    throw httpError(404, 'CUSTOMER_NOT_FOUND', 'Customer account not found.');
  }
  return profile;
}

export function listProjects(customerId) {
  return projectModel.listProjectsByCustomer(customerId);
}

export async function getProjectDetail(customerId, projectId) {
  const project = await projectModel.findProjectForCustomer(projectId, customerId);
  if (!project) {
    // 404, deliberately NOT 403: a project owned by another customer must look
    // exactly like a project that does not exist (plan.md, Phase 4 acceptance).
    throw httpError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  }
  const tasks = await projectModel.listTasksForProject(projectId, customerId);
  return { project, tasks };
}

export function listSubscriptions(customerId) {
  return subscriptionModel.listSubscriptionsByCustomer(customerId);
}

export function listTickets(customerId) {
  return ticketModel.listTicketsByCustomer(customerId);
}

/** Raise a support ticket for this customer. Returns the created row. */
export async function raiseTicket(customerId, { subject, description, priority }) {
  const ticketId = await ticketModel.createTicket(customerId, {
    subject,
    description,
    priority,
  });
  return ticketModel.findTicketForCustomer(ticketId, customerId);
}
