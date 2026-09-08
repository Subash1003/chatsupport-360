// SQL for `otp_verifications`. Expiry and grace-window comparisons use the
// database's own NOW(), never a JS timestamp, so they hold regardless of the
// MySQL session time zone.
//
// The INTERVAL values below are interpolated, not bound: MySQL prepared
// statements reject a placeholder inside `INTERVAL ? MINUTE`. They're coerced to
// an int and never come from user input (they're env values).

import { query, queryOne } from '../config/db.js';

// Drop any earlier still-usable code for this (email, purpose) so only the newest
// one can verify. Called right before inserting a fresh code.
export function deletePendingOtps(email, purpose) {
  return query(
    `DELETE FROM otp_verifications
      WHERE email = ? AND purpose = ? AND consumed_at IS NULL`,
    [email, purpose]
  );
}

export function insertOtp({ email, purpose, otpHash, expiryMinutes }) {
  const minutes = Math.max(1, Math.trunc(Number(expiryMinutes) || 10));
  return query(
    `INSERT INTO otp_verifications (email, purpose, otp_hash, expires_at)
     VALUES (?, ?, ?, (NOW() + INTERVAL ${minutes} MINUTE))`,
    [email, purpose, otpHash]
  );
}

// Newest un-consumed code for this (email, purpose), with a DB-computed
// is_expired flag. null when there is none.
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

export function markOtpConsumed(otpId) {
  return query(
    'UPDATE otp_verifications SET consumed_at = NOW() WHERE otp_id = ?',
    [otpId]
  );
}

// Was a code for this (email, purpose) verified within the last `graceMinutes`?
// Signup uses this to confirm the email was proven without consuming anything.
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

export function deleteOtpsForEmail(email, purpose) {
  return query('DELETE FROM otp_verifications WHERE email = ? AND purpose = ?', [
    email,
    purpose,
  ]);
}
