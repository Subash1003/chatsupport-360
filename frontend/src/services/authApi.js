// -----------------------------------------------------------------------------
// authApi.js
//
// Wraps POST /api/auth/*. Each function returns the backend's response envelope
// (`{ success, message, data }`); errors are already normalised by apiClient.
// Components never build these URLs themselves.
// -----------------------------------------------------------------------------

import apiClient from './apiClient.js';

export async function sendSignupOtp(email) {
  const { data } = await apiClient.post('/auth/send-otp', { email });
  return data;
}

export async function verifyOtp({ email, otp, purpose = 'signup' }) {
  const { data } = await apiClient.post('/auth/verify-otp', { email, otp, purpose });
  return data;
}

export async function signup({ name, email, password }) {
  const { data } = await apiClient.post('/auth/signup', { name, email, password });
  return data; // data.data = { customer_id, email, name, token }
}

export async function login({ email, password }) {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data; // data.data = { customer_id, email, name, token }
}

export async function forgotPassword(email) {
  const { data } = await apiClient.post('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword({ email, otp, newPassword }) {
  const { data } = await apiClient.post('/auth/reset-password', {
    email,
    otp,
    newPassword,
  });
  return data;
}
