// -----------------------------------------------------------------------------
// password.js
//
// Two thin wrappers around bcrypt. Keeping them here means the cost factor and
// the library choice live in one place, and the rest of the app just calls
// hashPassword() / comparePassword().
//
// bcryptjs (pure JavaScript) is used instead of bcrypt (native addon) so there
// is nothing to compile on Windows.
// -----------------------------------------------------------------------------

import bcrypt from 'bcryptjs';

// Cost 10 matches the hashes already in seed.sql, so seeded accounts and new
// signups verify the same way.
const SALT_ROUNDS = 10;

/** Hash a plaintext password. Returns a 60-char bcrypt string. */
export function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** Constant-time compare of a plaintext password against a stored hash. */
export function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
