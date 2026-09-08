// Signup / login / password-reset logic.
//
// Signup is a single step: completeSignup() creates the account directly.
// Email-OTP verification is intentionally skipped — the deployment host blocks
// outbound SMTP, so an OTP email can't be delivered and signup would otherwise
// be impossible. Trade-off: a user can register with an email they don't own.
// requestSignupOtp / verifyOtp are kept for API compatibility.
//
// Password reset stays 2-step: forgot-password issues the code, reset-password
// verifies AND consumes it in one call — don't pre-call /verify-otp for it.

import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import * as customerModel from '../models/customer.model.js';
import * as otpService from './otp.service.js';

function httpError(statusCode, code, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

// One message for both "no such email" and "wrong password" so the client can't
// probe which accounts exist.
const GENERIC_LOGIN_FAIL = 'Invalid email or password.';

// --- signup ---

export async function requestSignupOtp(email) {
  if (await customerModel.emailExists(email)) {
    throw httpError(409, 'EMAIL_EXISTS', 'That email is already registered.');
  }
  await otpService.issueOtp(email, 'signup');
}

// Also serves /verify-otp for either purpose. Consumes the code.
export async function verifyOtp(email, otp, purpose) {
  await otpService.consumeOtp(email, purpose, otp);
}

export async function completeSignup({ name, email, password }) {
  // Check first so a repeat attempt for a taken email always returns EMAIL_EXISTS.
  if (await customerModel.emailExists(email)) {
    throw httpError(409, 'EMAIL_EXISTS', 'That email is already registered.');
  }

  const passwordHash = await hashPassword(password);

  let customerId;
  try {
    customerId = await customerModel.createCustomer({ name, email, passwordHash });
  } catch (err) {
    // The UNIQUE index on customers.email is the final backstop against a race.
    if (err.code === 'ER_DUP_ENTRY') {
      throw httpError(409, 'EMAIL_EXISTS', 'That email is already registered.');
    }
    throw err;
  }

  const token = signToken({ customer_id: customerId, email });
  return { customer_id: customerId, email, name, token };
}

// --- login ---

export async function login(email, password) {
  const customer = await customerModel.findCustomerByEmail(email);
  if (!customer) throw httpError(401, 'INVALID_CREDENTIALS', GENERIC_LOGIN_FAIL);

  const matches = await comparePassword(password, customer.password_hash);
  if (!matches) throw httpError(401, 'INVALID_CREDENTIALS', GENERIC_LOGIN_FAIL);

  if (!customer.is_active) {
    throw httpError(403, 'ACCOUNT_DISABLED', 'This account has been disabled.');
  }

  const token = signToken({ customer_id: customer.customer_id, email: customer.email });
  return {
    customer_id: customer.customer_id,
    email: customer.email,
    name: customer.name,
    token,
  };
}

// --- forgot / reset password ---

// Always resolves, whether or not the email exists, so the response can't be used
// to discover registered emails. A code is only sent when the account exists.
export async function requestPasswordReset(email) {
  if (await customerModel.emailExists(email)) {
    await otpService.issueOtp(email, 'password_reset');
  }
}

export async function resetPassword({ email, otp, newPassword }) {
  await otpService.consumeOtp(email, 'password_reset', otp);

  if (!(await customerModel.emailExists(email))) {
    // Code checked out but the account is gone — nothing to reset.
    throw httpError(400, 'OTP_NOT_FOUND', 'No active code for this email. Request a new one.');
  }

  const passwordHash = await hashPassword(newPassword);
  await customerModel.updateCustomerPassword(email, passwordHash);
  await otpService.clearOtps(email, 'password_reset');
}
