// bcrypt wrappers so the cost factor and library choice live in one place.
// bcryptjs (pure JS) avoids a native build on Windows. Cost 10 matches the
// hashes in seed.sql, so seeded accounts and new signups verify identically.

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
