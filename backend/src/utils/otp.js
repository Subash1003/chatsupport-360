// -----------------------------------------------------------------------------
// otp.js
//
// Generate and check 6-digit one-time codes.
//
// The plaintext code is created here, emailed once, then forgotten. Only its
// bcrypt hash is ever stored (otp_verifications.otp_hash), so a database dump
// does not hand an attacker working codes.
// -----------------------------------------------------------------------------

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const OTP_SALT_ROUNDS = 10;

/**
 * A cryptographically-random 6-digit code, leading zeros kept
 * (e.g. "004217"). randomInt is unbiased, unlike Math.random() % 1000000.
 */
export function generateOtp() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** Hash a code for storage. */
export function hashOtp(otp) {
  return bcrypt.hash(otp, OTP_SALT_ROUNDS);
}

/** Constant-time compare of a submitted code against the stored hash. */
export function compareOtp(otp, hash) {
  return bcrypt.compare(otp, hash);
}
