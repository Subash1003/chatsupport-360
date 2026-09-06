// -----------------------------------------------------------------------------
// otp.service.js
//
// Business rules for one-time codes. Nothing here touches req/res.
//
//   issueOtp(email, purpose)              -> generate + store hash + email it
//   consumeOtp(email, purpose, submitted) -> check + mark consumed (single use)
//   assertEmailVerifiedForSignup(email)   -> was a signup code verified lately?
//   clearOtps(email, purpose)             -> housekeeping after success
//
// Failure paths throw an Error carrying statusCode + code, which the global
// error handler turns into the standard failure envelope.
// -----------------------------------------------------------------------------

import env from '../config/env.js';
import { generateOtp, hashOtp, compareOtp } from '../utils/otp.js';
import { sendOtpEmail } from './email.service.js';
import * as otpModel from '../models/otp.model.js';

function httpError(statusCode, code, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

/**
 * Create a fresh code for (email, purpose), store ONLY its hash, and email the
 * plaintext once. Any earlier un-consumed code for the same pair is removed
 * first, so only the newest code is valid.
 */
export async function issueOtp(email, purpose) {
  const otp = generateOtp();
  const otpHash = await hashOtp(otp);

  await otpModel.deletePendingOtps(email, purpose);
  await otpModel.insertOtp({
    email,
    purpose,
    otpHash,
    expiryMinutes: env.OTP_EXPIRY_MINUTES,
  });

  await sendOtpEmail({ to: email, otp, purpose });
  // `otp` (plaintext) goes out of scope here. Only the hash was persisted.
}

/**
 * Verify a submitted code. On success the row is marked consumed so it cannot
 * be used again. Order of checks matters:
 *   not found -> locked (attempt cap) -> expired -> wrong code -> ok
 */
export async function consumeOtp(email, purpose, submittedOtp) {
  const row = await otpModel.findActiveOtp(email, purpose);

  if (!row) {
    throw httpError(400, 'OTP_NOT_FOUND', 'No active code for this email. Request a new one.');
  }

  if (row.attempts >= env.OTP_MAX_ATTEMPTS) {
    throw httpError(429, 'OTP_LOCKED', 'Too many incorrect attempts. Request a new code.');
  }

  // mysql2 returns the computed boolean as 1/0.
  if (row.is_expired) {
    throw httpError(400, 'OTP_EXPIRED', 'This code has expired. Request a new one.');
  }

  const matches = await compareOtp(submittedOtp, row.otp_hash);
  if (!matches) {
    await otpModel.incrementOtpAttempts(row.otp_id);
    throw httpError(400, 'OTP_INVALID', 'Incorrect code.');
  }

  await otpModel.markOtpConsumed(row.otp_id);
  return true;
}

/**
 * Signup gate: confirm a signup code for this email was verified (consumed)
 * within the grace window, without consuming anything again.
 */
export async function assertEmailVerifiedForSignup(email) {
  const row = await otpModel.findRecentlyVerifiedOtp(
    email,
    'signup',
    env.OTP_SIGNUP_GRACE_MINUTES
  );
  if (!row) {
    throw httpError(
      400,
      'OTP_NOT_VERIFIED',
      'Verify your email with the code before creating an account.'
    );
  }
}

/** Remove every code for (email, purpose). Called after signup / reset succeeds. */
export function clearOtps(email, purpose) {
  return otpModel.deleteOtpsForEmail(email, purpose);
}
