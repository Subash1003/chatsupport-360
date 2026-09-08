// Hand-written input checks (no express-validator). Each helper returns a cleaned
// value or throws a 400 VALIDATION_ERROR that the global error handler formats.
// Controllers run these before calling any service, so services can trust their
// inputs.

function fail(message) {
  const err = new Error(message);
  err.statusCode = 400;
  err.code = 'VALIDATION_ERROR';
  throw err;
}

// Good enough for a signup form; not RFC 5322.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requireBody(body, fields) {
  if (!body || typeof body !== 'object') fail('Request body must be JSON.');
  for (const field of fields) {
    const value = body[field];
    if (value === undefined || value === null || String(value).trim() === '') {
      fail(`"${field}" is required.`);
    }
  }
}

export function normaliseEmail(raw) {
  const email = String(raw).trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 190) {
    fail('A valid email address is required.');
  }
  return email;
}

// 8-100 chars, at least one letter and one digit.
export function validatePassword(raw) {
  const pw = String(raw);
  if (pw.length < 8 || pw.length > 100) {
    fail('Password must be between 8 and 100 characters.');
  }
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) {
    fail('Password must contain at least one letter and one number.');
  }
  return pw;
}

export function validateOtpFormat(raw) {
  const otp = String(raw).trim();
  if (!/^[0-9]{6}$/.test(otp)) fail('The code must be 6 digits.');
  return otp;
}

// Positive integer id from a URL param, e.g. /projects/:id.
export function validateNumericId(raw, label = 'id') {
  const value = String(raw).trim();
  const n = Number(value);
  if (!/^[0-9]+$/.test(value) || !Number.isSafeInteger(n) || n < 1) {
    fail(`Invalid ${label}.`);
  }
  return n;
}

export function validateChatMessage(raw, maxChars = 4000) {
  if (typeof raw !== 'string') fail('"message" must be a string.');
  const text = raw.trim();
  if (text === '') fail('"message" is required.');
  if (text.length > maxChars) fail(`"message" must be at most ${maxChars} characters.`);
  return text;
}

// Customer id as issued by id_counters: 'CUST' + 3-10 digits.
export function validateCustomerId(raw, label = 'customer_id') {
  const value = String(raw).trim();
  if (!/^CUST[0-9]{3,10}$/.test(value)) fail(`Invalid ${label}.`);
  return value;
}

const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export function validatePriority(raw, fallback = 'medium') {
  if (raw === undefined || raw === null || String(raw).trim() === '') return fallback;
  const value = String(raw).trim().toLowerCase();
  if (!TICKET_PRIORITIES.includes(value)) {
    fail(`"priority" must be one of: ${TICKET_PRIORITIES.join(', ')}.`);
  }
  return value;
}

// Browser-generated chat session key. Column is VARCHAR(100).
export function validateSessionId(raw, label = 'session_id') {
  const value = String(raw).trim();
  if (value === 'undefined' || value === 'null') fail(`"${label}" is required.`);
  if (!/^[A-Za-z0-9._-]{8,100}$/.test(value)) fail(`Invalid ${label}.`);
  return value;
}

export function validateName(raw) {
  const name = String(raw).trim();
  if (name.length < 2 || name.length > 120) {
    fail('Name must be between 2 and 120 characters.');
  }
  return name;
}

export function validateText(raw, { label = 'text', min = 1, max = 5000 } = {}) {
  const text = String(raw).trim();
  if (text.length < min || text.length > max) {
    fail(`"${label}" must be between ${min} and ${max} characters.`);
  }
  return text;
}

// Optional short free text (budget, timeline …). null when absent/blank.
export function validateOptionalText(raw, { label = 'text', max = 100 } = {}) {
  if (raw === undefined || raw === null) return null;
  const text = String(raw).trim();
  if (text === '') return null;
  if (text.length > max) fail(`"${label}" must be at most ${max} characters.`);
  return text;
}
