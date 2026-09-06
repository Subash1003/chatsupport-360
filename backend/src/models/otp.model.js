// -----------------------------------------------------------------------------
// otp.model.js
//
// All SQL that touches `otp_verifications`. No req/res in here.
//
// Time comparisons (expiry, grace window) are done with the database's own
// NOW(), not a JavaScript timestamp, so they are correct regardless of the
// local MySQL session time zone.
// -----------------------------------------------------------------------------

import { query, queryOne } from '../config/db.js';

/**
 * Drop any earlier still-usable code for this (email, purpose) so that only the
 * newest one can ever verify. Called right before inserting a fresh code.
 */
export function deletePendingOtps(email, purpose) {
  return query(
    `DELETE FROM otp_verifications
      WHERE email = ? AND purpose = ? AND consumed_at IS NULL`,
    [email, purpose]
  );
}

export function insertOtp({ email, purpose, otpHash, expiryMinutes }) {
  // expires_at is computed from the DB's own NOW() so it lines up exactly with
  // the NOW()-based expiry check in findActiveOtp, whatever the MySQL session
  // time zone is. expiryMinutes is coerced to an integer and is never user
  // input (env.OTP_EXPIRY_MINUTES) — see the note on findRecentlyVerifiedOtp.
  const minutes = Math.max(1, Math.trunc(Number(expiryMinutes) || 10));
  return query(
    `INSERT INTO otp_verifications (email, purpose, otp_hash, expires_at)
     VALUES (?, ?, ?, (NOW() + INTERVAL ${minutes} MINUTE))`,
    [email, purpose, otpHash]
  );
}

/**
 * Newest un-consumed code for this (email, purpose), plus a DB-computed
 * `is_expired` flag. null when there is none.
 */
export function findActiveOtp(email, purpose) {
  return queryOne(
    `SELECT otp_id,
            otp_hash,
            attempts,
            (expires_at < NOW()) AS is_expired
       FROM otp_verifications
      WHERE email = ? AND purpose = ? AND consumed_at IS NULL
      ORDER BY otp_id DESC
      LIMIT 1`,
    [email, purpose]
  );
}

export function incrementOtpAttempts(otpId) {
  return query(
    'UPDATE otp_verifications SET attempts = attempts + 1 WHERE otp_id = ?',
    [otpId]
  );
}

/** Single-use: stamp consumed_at so this code can never verify again. */
export function markOtpConsumed(otpId) {
  return query(
    'UPDATE otp_verifications SET consumed_at = NOW() WHERE otp_id = ?',
    [otpId]
  );
}

/**
 * Did a code for this (email, purpose) get verified (consumed) within the last
 * `graceMinutes`? Used by signup to confirm the email was proven, without
 * consuming anything again.
 *
 * graceMinutes is coerced to an integer here and interpolated because MySQL
 * prepared statements do not accept a placeholder inside INTERVAL ? MINUTE.
 * It is never user input (it comes from env.OTP_SIGNUP_GRACE_MINUTES).
 */
export function findRecentlyVerifiedOtp(email, purpose, graceMinutes) {
  const minutes = Math.max(1, Math.trunc(Number(graceMinutes) || 30));
  return queryOne(
    `SELECT otp_id
       FROM otp_verifications
      WHERE email = ? AND purpose = ?
        AND consumed_at IS NOT NULL
        AND consumed_at >= (NOW() - INTERVAL ${minutes} MINUTE)
      ORDER BY otp_id DESC
      LIMIT 1`,
    [email, purpose]
  );
}

/** Housekeeping: remove every code for this (email, purpose). */
export function deleteOtpsForEmail(email, purpose) {
  return query(
    'DELETE FROM otp_verifications WHERE email = ? AND purpose = ?',
    [email, purpose]
  );
}
