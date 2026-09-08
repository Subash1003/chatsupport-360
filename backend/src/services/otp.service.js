// Business rules for one-time codes. Failure paths throw an Error carrying
// statusCode + code for the global error handler.

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

// Fresh code for (email, purpose): store only its hash, email the plaintext once.
// Any earlier un-consumed code for the pair is removed first.
export async function issueOtp(email, purpose) {
  const otp = generateOtp();
  const otpHash = await hashOtp(otp);

  await otpModel.deletePendingOtps(email, purpose);
  await otpModel.insertOtp({ email, purpose, otpHash, expiryMinutes: env.OTP_EXPIRY_MINUTES });

  await sendOtpEmail({ to: email, otp, purpose });
}

// Verify a submitted code and mark it consumed. Check order matters:
// not found → locked → expired → wrong → ok.
export async function consumeOtp(email, purpose, submittedOtp) {
  const row = await otpModel.findActiveOtp(email, purpose);

  if (!row) {
    throw httpError(400, 'OTP_NOT_FOUND', 'No active code for this email. Request a new one.');
  }
  if (row.attempts >= env.OTP_MAX_ATTEMPTS) {
    throw httpError(429, 'OTP_LOCKED', 'Too many incorrect attempts. Request a new code.');
  }
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

// Signup gate: confirm a signup code for this email was verified within the grace
// window, without consuming anything again.
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

// Called after signup / reset succeeds.
export function clearOtps(email, purpose) {
  return otpModel.deleteOtpsForEmail(email, purpose);
}
