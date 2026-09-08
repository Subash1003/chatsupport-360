// 6-digit one-time codes. The plaintext is generated here, emailed once, then
// forgotten — only the bcrypt hash is stored, so a DB dump yields no usable codes.

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// randomInt is unbiased, unlike Math.random() % 1e6. Leading zeros kept.
export function generateOtp() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashOtp(otp) {
  return bcrypt.hash(otp, SALT_ROUNDS);
}

export function compareOtp(otp, hash) {
  return bcrypt.compare(otp, hash);
}
