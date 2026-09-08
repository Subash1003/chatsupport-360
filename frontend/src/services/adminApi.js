// The admin console talks to /api/admin/* with its own axios instance so it
// never picks up the customer JWT (or vice versa). On a 401 the admin token is
// cleared so the guard bounces back to /admin/login.

import axios from 'axios';

import { getAdminToken, clearAdminToken } from '../utils/adminToken.js';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const client = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && getAdminToken()) clearAdminToken();
    return Promise.reject({
      status: error.response?.status ?? 0,
      code: error.response?.data?.error?.code || error.code || 'NETWORK_ERROR',
      message: error.response?.data?.error?.message || error.message || 'Request failed.',
    });
  }
);

export async function adminLogin({ email, password }) {
  const { data } = await client.post('/admin/login', { email, password });
  return data.data; // { token, email }
}

export async function fetchAllTickets() {
  const { data } = await client.get('/admin/tickets');
  return data.data.tickets;
}

export async function resolveTicket(ticketId) {
  const { data } = await client.patch(`/admin/tickets/${ticketId}/resolve`);
  return data.data; // { ticket_id, status }
}
