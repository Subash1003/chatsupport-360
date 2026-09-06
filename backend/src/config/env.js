// -----------------------------------------------------------------------------
// env.js
// The ONE place where process.env is read.
//
// Why a file just for this?
//  - dotenv is loaded exactly once, at the top, before anything else needs it.
//  - Every other file imports named values from here instead of touching
//    process.env directly. That means if a variable is renamed later, there is
//    a single place to change it.
//  - We can fail fast at startup if a required variable is missing, instead of
//    discovering it at 2am when some request crashes.
// -----------------------------------------------------------------------------

import dotenv from 'dotenv';

// Reads the .env file sitting in the backend/ folder and copies its values
// into process.env.
dotenv.config();

/**
 * Small helper: read a variable, fall back to a default, and throw if the
 * variable is required but missing.
 */
function readEnv(key, { required = false, fallback = undefined } = {}) {
  const value = process.env[key];

  if (value === undefined || value === '') {
    if (required) {
      throw new Error(
        `Missing required environment variable: ${key}. ` +
          `Copy .env.example to .env and fill it in.`
      );
    }
    return fallback;
  }

  return value;
}

export const env = {
  // Phase 1 values
  PORT: Number(readEnv('PORT', { fallback: 5000 })),
  NODE_ENV: readEnv('NODE_ENV', { fallback: 'development' }),
  FRONTEND_URL: readEnv('FRONTEND_URL', { fallback: 'http://localhost:5173' }),

  // Structured logging (pino). Standard pino levels: trace|debug|info|warn|error|fatal.
  // Blank falls back to 'debug' in development and 'info' in production (see
  // src/config/logger.js).
  LOG_LEVEL: readEnv('LOG_LEVEL', { fallback: '' }),

  // Phase 2 values - MySQL
  // Note MYSQL_PASSWORD is NOT required: a local XAMPP/WAMP root account
  // often has an empty password. The others are required, because a typo
  // there should stop the server immediately with a clear message rather
  // than surface as a confusing error on the first request.
  MYSQL_HOST: readEnv('MYSQL_HOST', { required: true }),
  MYSQL_PORT: Number(readEnv('MYSQL_PORT', { fallback: 3306 })),
  MYSQL_USER: readEnv('MYSQL_USER', { required: true }),
  MYSQL_PASSWORD: readEnv('MYSQL_PASSWORD', { fallback: '' }),
  MYSQL_DATABASE: readEnv('MYSQL_DATABASE', { required: true }),

  // Phase 3 values - Auth (JWT)
  // JWT_SECRET is required: the server should refuse to start rather than sign
  // tokens with an empty/undefined key. JWT_EXPIRES_IN accepts the vercel/ms
  // syntax ('7d', '12h', '30m') or a number of seconds.
  JWT_SECRET: readEnv('JWT_SECRET', { required: true }),
  JWT_EXPIRES_IN: readEnv('JWT_EXPIRES_IN', { fallback: '7d' }),

  // Phase 3 values - OTP behaviour
  OTP_EXPIRY_MINUTES: Number(readEnv('OTP_EXPIRY_MINUTES', { fallback: 10 })),
  OTP_MAX_ATTEMPTS: Number(readEnv('OTP_MAX_ATTEMPTS', { fallback: 5 })),
  // How long after verifying an email the signup call may still complete.
  OTP_SIGNUP_GRACE_MINUTES: Number(
    readEnv('OTP_SIGNUP_GRACE_MINUTES', { fallback: 30 })
  ),

  // Phase 3 values - Email (OTP delivery)
  // EMAIL_TRANSPORT: 'console' (print to terminal) | 'smtp' | 'resend'.
  EMAIL_TRANSPORT: readEnv('EMAIL_TRANSPORT', { fallback: 'console' }),
  EMAIL_FROM: readEnv('EMAIL_FROM', { fallback: 'no-reply@cs-ai-chatbot.local' }),
  EMAIL_API_KEY: readEnv('EMAIL_API_KEY', { fallback: '' }), // legacy, unused

  // EMAIL_TRANSPORT=smtp (nodemailer). Gmail: host smtp.gmail.com, port 587,
  // secure false, user = your gmail, pass = a Google "App Password" (16 chars).
  SMTP_HOST: readEnv('SMTP_HOST', { fallback: '' }),
  SMTP_PORT: Number(readEnv('SMTP_PORT', { fallback: 587 })),
  SMTP_SECURE: readEnv('SMTP_SECURE', { fallback: 'false' }) === 'true',
  SMTP_USER: readEnv('SMTP_USER', { fallback: '' }),
  SMTP_PASS: readEnv('SMTP_PASS', { fallback: '' }),

  // EMAIL_TRANSPORT=resend (https://resend.com). Set EMAIL_FROM to a verified
  // sender; without a verified domain you may only send to your own address.
  RESEND_API_KEY: readEnv('RESEND_API_KEY', { fallback: '' }),

  // Phase 5 values - Qdrant vector store
  // Not required: the server still boots for Phases 1-4 without it. The ingest
  // and search endpoints return a clean 503 when QDRANT_URL is empty.
  QDRANT_URL: readEnv('QDRANT_URL', { fallback: '' }),
  QDRANT_API_KEY: readEnv('QDRANT_API_KEY', { fallback: '' }),
  QDRANT_COLLECTION: readEnv('QDRANT_COLLECTION', { fallback: 'cs_chatbot_kb' }),

  // Phase 5 values - Embeddings
  // The vector DIMENSION is a code constant per provider (embedding.service.js),
  // never read from env, so the collection size and the provider cannot drift.
  EMBEDDING_PROVIDER: readEnv('EMBEDDING_PROVIDER', { fallback: 'gemini' }),
  EMBEDDING_MODEL: readEnv('EMBEDDING_MODEL', { fallback: 'gemini-embedding-001' }),
  GEMINI_API_KEY: readEnv('GEMINI_API_KEY', { fallback: '' }),

  // Phase 6 values - LLM (chat answer generation)
  // LLM_API_KEY is an OpenAI-compatible chat key. Default wiring targets Groq;
  // point LLM_BASE_URL / LLM_MODEL elsewhere for another OpenAI-compatible API.
  LLM_PROVIDER: readEnv('LLM_PROVIDER', { fallback: 'groq' }),
  LLM_BASE_URL: readEnv('LLM_BASE_URL', {
    fallback: 'https://api.groq.com/openai/v1',
  }),
  LLM_MODEL: readEnv('LLM_MODEL', { fallback: 'openai/gpt-oss-120b' }),
  LLM_API_KEY: readEnv('LLM_API_KEY', { fallback: '' }),
  LLM_TIMEOUT_MS: Number(readEnv('LLM_TIMEOUT_MS', { fallback: 30000 })),
  LLM_MAX_TOKENS: Number(readEnv('LLM_MAX_TOKENS', { fallback: 1024 })),

  // Phase 7 values - RAG retrieval
  // How many vector hits to pull, and the minimum cosine score to keep one.
  // (gemini-embedding-001 @768: relevant hits score ~0.55-0.80 in testing.)
  RAG_TOP_K: Number(readEnv('RAG_TOP_K', { fallback: 6 })),
  RAG_MIN_SCORE: Number(readEnv('RAG_MIN_SCORE', { fallback: 0.55 })),

  // Phase 8 values - query classification
  // When the rules do not match, ask the LLM once to pick a class.
  CLASSIFIER_LLM_FALLBACK:
    readEnv('CLASSIFIER_LLM_FALLBACK', { fallback: 'true' }) !== 'false',

  // Ask the chat model to also emit 3 suggested follow-up questions (parsed off
  // the reply, shown as clickable chips in the UI). Adds ~1 line to the prompt,
  // no extra API call. Set to 'false' to turn the chips off.
  CHAT_FOLLOWUPS: readEnv('CHAT_FOLLOWUPS', { fallback: 'true' }) !== 'false',

  // Admin console login (single hard-coded operator account). Change in .env.
  ADMIN_EMAIL: readEnv('ADMIN_EMAIL', { fallback: 'Admin360@gmail.com' }),
  ADMIN_PASSWORD: readEnv('ADMIN_PASSWORD', { fallback: 'Admin@360' }),

  // Phase 10 values - conversation memory
  // HISTORY_MAX_MESSAGES: how many prior user/bot messages to replay to the LLM
  // (10 ~= 5 turns). HISTORY_MAX_CHARS: per-message truncation, keeps tokens bounded.
  HISTORY_MAX_MESSAGES: Number(readEnv('HISTORY_MAX_MESSAGES', { fallback: 10 })),
  HISTORY_MAX_CHARS: Number(readEnv('HISTORY_MAX_CHARS', { fallback: 1500 })),

  // Phase 9 values - rate limiting
  // One shared time window; a separate request ceiling per bucket. AUTH guards
  // OTP / password brute force; CHAT guards LLM cost and spam. All optional.
  RATE_LIMIT_WINDOW_MS: Number(
    readEnv('RATE_LIMIT_WINDOW_MS', { fallback: 15 * 60 * 1000 })
  ),
  RATE_LIMIT_MAX: Number(readEnv('RATE_LIMIT_MAX', { fallback: 300 })),
  AUTH_RATE_LIMIT_MAX: Number(readEnv('AUTH_RATE_LIMIT_MAX', { fallback: 20 })),
  CHAT_RATE_LIMIT_MAX: Number(readEnv('CHAT_RATE_LIMIT_MAX', { fallback: 40 })),
  // Phase 11: public lead submissions per window per IP.
  LEADS_RATE_LIMIT_MAX: Number(readEnv('LEADS_RATE_LIMIT_MAX', { fallback: 5 })),

  // Convenience flag used for error responses later on
  get isProduction() {
    return this.NODE_ENV === 'production';
  },
};

export default env;
