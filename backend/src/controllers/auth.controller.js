// -----------------------------------------------------------------------------
// auth.controller.js
//
// Read the request -> validate -> call auth.service -> respond with an envelope.
// No SQL, no business rules here.
// -----------------------------------------------------------------------------

import { asyncHandler } from '../utils/asyncHandler.js';
import * as authService from '../services/auth.service.js';
import {
  requireBody,
  normaliseEmail,
  validatePassword,
  validateOtpFormat,
  validateName,
} from '../utils/validation.js';

/** Standard success envelope (spec §5). */
function sendOk(res, status, message, data = null) {
  res.status(status).json({ success: true, message, data });
}

// POST /api/auth/send-otp    { email }
export const sendOtp = asyncHandler(async (req, res) => {
  requireBody(req.body, ['email']);
  const email = normaliseEmail(req.body.email);
  await authService.requestSignupOtp(email);
  sendOk(res, 200, 'Verification code sent. Check your email (or the backend terminal).');
});

// POST /api/auth/verify-otp  { email, otp, purpose? }   purpose defaults to "signup"
export const verifyOtp = asyncHandler(async (req, res) => {
  requireBody(req.body, ['email', 'otp']);
  const email = normaliseEmail(req.body.email);
  const otp = validateOtpFormat(req.body.otp);
  const purpose =
    req.body.purpose === 'password_reset' ? 'password_reset' : 'signup';
  await authService.verifyOtp(email, otp, purpose);
  sendOk(res, 200, 'Code verified.');
});

// POST /api/auth/signup      { name, email, password }   (after a verified OTP)
export const signup = asyncHandler(async (req, res) => {
  requireBody(req.body, ['name', 'email', 'password']);
  const name = validateName(req.body.name);
  const email = normaliseEmail(req.body.email);
  const password = validatePassword(req.body.password);
  const data = await authService.completeSignup({ name, email, password });
  sendOk(res, 201, 'Account created.', data);
});

// POST /api/auth/login       { email, password }
export const login = asyncHandler(async (req, res) => {
  requireBody(req.body, ['email', 'password']);
  const email = normaliseEmail(req.body.email);
  const password = String(req.body.password);
  const data = await authService.login(email, password);
  sendOk(res, 200, 'Logged in.', data);
});

// POST /api/auth/forgot-password   { email }
export const forgotPassword = asyncHandler(async (req, res) => {
  requireBody(req.body, ['email']);
  const email = normaliseEmail(req.body.email);
  await authService.requestPasswordReset(email);
  // Deliberately the same response whether or not the email is registered.
  sendOk(res, 200, 'If that email is registered, a reset code has been sent.');
});

// POST /api/auth/reset-password    { email, otp, newPassword }
export const resetPassword = asyncHandler(async (req, res) => {
  requireBody(req.body, ['email', 'otp', 'newPassword']);
  const email = normaliseEmail(req.body.email);
  const otp = validateOtpFormat(req.body.otp);
  const newPassword = validatePassword(req.body.newPassword);
  await authService.resetPassword({ email, otp, newPassword });
  sendOk(res, 200, 'Password updated. You can now log in with your new password.');
});

// POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  // JWTs are stateless: logging out means the client discards its token.
  // The endpoint exists for symmetry and future server-side revocation.
  sendOk(res, 200, 'Logged out.');
});
