// -----------------------------------------------------------------------------
// apiClient.js
//
// ONE shared axios instance for the whole app.
//
// Phase 3/12 additions:
//   - request interceptor attaches `Authorization: Bearer <token>` when we have one
//   - response interceptor normalises every failure to { status, code, message }
//     and, when the server rejects OUR token (TOKEN_EXPIRED / TOKEN_INVALID),
//     clears storage and fires an `auth:logout` event that AuthContext listens for.
// -----------------------------------------------------------------------------

import axios from 'axios';

import { getToken, clearAuthStorage } from '../utils/token.js';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Request interceptor — attach the JWT
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Codes that mean "the token the browser sent is no good" — as opposed to
// INVALID_CREDENTIALS (a failed login attempt, which must NOT log anyone out).
const TOKEN_REJECTED = new Set(['TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_MISSING']);

// ---------------------------------------------------------------------------
// Response interceptor — normalise failures + auto-logout on a dead token
// ---------------------------------------------------------------------------
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const code =
      error.response?.data?.error?.code || error.code || 'NETWORK_ERROR';

    if (error.response?.status === 401 && TOKEN_REJECTED.has(code) && getToken()) {
      clearAuthStorage();
      window.dispatchEvent(new Event('auth:logout'));
    }

    return Promise.reject({
      status: error.response?.status ?? 0,
      code,
      message:
        error.response?.data?.error?.message ||
        error.message ||
        'Unable to reach the server.',
    });
  }
);

export default apiClient;
