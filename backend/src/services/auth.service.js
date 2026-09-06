// -----------------------------------------------------------------------------
// auth.service.js
//
// Signup / login / password-reset business logic. No req/res in here.
//
// Signup is a single step: completeSignup({...}) -> POST /api/auth/signup.
// The spec.md §8 email-OTP steps are bypassed because the deployment host
// blocks outbound SMTP (see completeSignup below). requestSignupOtp /
// verifyOtp are kept for API compatibility but are no longer on the path.
//
// Password reset is 2 steps (spec §8): forgot-password issues the code,
// reset-password verifies AND consumes it in one call. Do NOT pre-call
// /verify-otp for the reset flow or the code will already be consumed.
// -----------------------------------------------------------------------------

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

// One message for both "no such email" and "wrong password" (spec §8): the
// client must not be able to tell which accounts exist.
const GENERIC_LOGIN_FAIL = 'Invalid email or password.';

// --- signup ----------------------------------------------------------------

/** Step 1: send a signup code, refusing if the email is already registered. */
export async function requestSignupOtp(email) {
  if (await customerModel.emailExists(email)) {
    throw httpError(409, 'EMAIL_EXISTS', 'That email is already registered.');
  }
  await otpService.issueOtp(email, 'signup');
}

/** Step 2 (also serves /verify-otp for either purpose). Consumes the code. */
export async function verifyOtp(email, otp, purpose) {
  await otpService.consumeOtp(email, purpose, otp);
}

/**
 * Create the account directly from name + email + password.
 *
 * NOTE: email-ownership verification (the send-otp / verify-otp steps) is
 * intentionally NOT enforced here. The deployment host blocks outbound SMTP,
 * so OTP email cannot be delivered; signup would otherwise be impossible.
 * Trade-off: a user can register with an email they do not control.
 * (Deviates from spec.md §8 - see the note there.)
 */
export async function completeSignup({ name, email, password }) {
  // Duplicate check first, so a second signup attempt for a taken email always
  // returns EMAIL_EXISTS. Consistent with /send-otp, which also 409s here.
  if (await customerModel.emailExists(email)) {
    throw httpError(409, 'EMAIL_EXISTS', 'That email is already registered.');
  }

  const passwordHash = await hashPassword(password);

  let customerId;
  try {
    customerId = await customerModel.createCustomer({ name, email, passwordHash });
  } catch (err) {
    // The UNIQUE index on customers.email is the final backstop.
    if (err.code === 'ER_DUP_ENTRY') {
      throw httpError(409, 'EMAIL_EXISTS', 'That email is already registered.');
    }
    throw err;
  }

  const token = signToken({ customer_id: customerId, email });
  return { customer_id: customerId, email, name, token };
}

// --- login ---------------------------------------------------------------

export async function login(email, password) {
  const customer = await customerModel.findCustomerByEmail(email);

  if (!customer) {
    throw httpError(401, 'INVALID_CREDENTIALS', GENERIC_LOGIN_FAIL);
  }

  const matches = await comparePassword(password, customer.password_hash);
  if (!matches) {
    throw httpError(401, 'INVALID_CREDENTIALS', GENERIC_LOGIN_FAIL);
  }

  if (!customer.is_active) {
    throw httpError(403, 'ACCOUNT_DISABLED', 'This account has been disabled.');
  }

  const token = signToken({
    customer_id: customer.customer_id,
    email: customer.email,
  });
  return {
    customer_id: customer.customer_id,
    email: customer.email,
    name: customer.name,
    token,
  };
}

// --- forgot / reset password -------------------------------------------------

/**
 * Always resolves, whether or not the email exists, so the response cannot be
 * used to discover which emails are registered. A code is only actually sent
 * when the account exists.
 */
export async function requestPasswordReset(email) {
  if (await customerModel.emailExists(email)) {
    await otpService.issueOtp(email, 'password_reset');
  }
}

export async function resetPassword({ email, otp, newPassword }) {
  // Verify + consume the reset code in one step.
  await otpService.consumeOtp(email, 'password_reset', otp);

  if (!(await customerModel.emailExists(email))) {
    // Code checked out but the account is gone — nothing to reset.
    throw httpError(400, 'OTP_NOT_FOUND', 'No active code for this email. Request a new one.');
  }

  const passwordHash = await hashPassword(newPassword);
  await customerModel.updateCustomerPassword(email, passwordHash);
  await otpService.clearOtps(email, 'password_reset');
}
