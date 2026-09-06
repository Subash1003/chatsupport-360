// -----------------------------------------------------------------------------
// customerApi.js
//
// Wraps GET /api/customer/*. All require a valid JWT — apiClient attaches it.
// Returns the `data` payload from the response envelope.
// -----------------------------------------------------------------------------

import apiClient from './apiClient.js';

export async function fetchProfile() {
  const { data } = await apiClient.get('/customer/profile');
  return data.data;
}

export async function fetchProjects() {
  const { data } = await apiClient.get('/customer/projects');
  return data.data.projects;
}

export async function fetchProject(projectId) {
  const { data } = await apiClient.get(`/customer/projects/${projectId}`);
  return data.data; // { project, tasks }
}

export async function fetchSubscriptions() {
  const { data } = await apiClient.get('/customer/subscription');
  return data.data.subscriptions;
}

export async function fetchTickets() {
  const { data } = await apiClient.get('/customer/tickets');
  return data.data.tickets;
}

// Raise a new support ticket (e.g. a new project requirement).
export async function createTicket({ subject, description, priority }) {
  const { data } = await apiClient.post('/customer/tickets', {
    subject,
    description,
    priority,
  });
  return data.data.ticket;
}
