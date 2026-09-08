// The one place process.env is read. dotenv loads once here, before anything
// else needs it; everything else imports named values from this module so a
// rename only happens in one spot and required vars fail fast at startup.

import dotenv from 'dotenv';

dotenv.config();

function readEnv(key, { required = false, fallback } = {}) {
  const value = process.env[key];

  if (value === undefined || value === '') {
    if (required) {
      throw new Error(
        `Missing required environment variable: ${key}. Copy .env.example to .env and fill it in.`
      );
    }
    return fallback;
  }

  return value;
}

export const env = {
  PORT: Number(readEnv('PORT', { fallback: 5000 })),
  NODE_ENV: readEnv('NODE_ENV', { fallback: 'development' }),
  FRONTEND_URL: readEnv('FRONTEND_URL', { fallback: 'http://localhost:5173' }),

  // Blank falls back to 'debug' in dev, 'info' in prod (see logger.js).
  LOG_LEVEL: readEnv('LOG_LEVEL', { fallback: '' }),

  // MYSQL_PASSWORD is intentionally optional — a local root account often has
  // none. The rest are required so a typo stops the server with a clear message
  // instead of a confusing error on the first request.
  MYSQL_HOST: readEnv('MYSQL_HOST', { required: true }),
  MYSQL_PORT: Number(readEnv('MYSQL_PORT', { fallback: 3306 })),
  MYSQL_USER: readEnv('MYSQL_USER', { required: true }),
  MYSQL_PASSWORD: readEnv('MYSQL_PASSWORD', { fallback: '' }),
  MYSQL_DATABASE: readEnv('MYSQL_DATABASE', { required: true }),

  // JWT_EXPIRES_IN accepts the vercel/ms syntax ('7d', '12h') or seconds.
  JWT_SECRET: readEnv('JWT_SECRET', { required: true }),
  JWT_EXPIRES_IN: readEnv('JWT_EXPIRES_IN', { fallback: '7d' }),

  OTP_EXPIRY_MINUTES: Number(readEnv('OTP_EXPIRY_MINUTES', { fallback: 10 })),
  OTP_MAX_ATTEMPTS: Number(readEnv('OTP_MAX_ATTEMPTS', { fallback: 5 })),
  // Grace period after email verification in which signup may still complete.
  OTP_SIGNUP_GRACE_MINUTES: Number(readEnv('OTP_SIGNUP_GRACE_MINUTES', { fallback: 30 })),

  // EMAIL_TRANSPORT: 'console' | 'smtp' | 'resend'.
  EMAIL_TRANSPORT: readEnv('EMAIL_TRANSPORT', { fallback: 'console' }),
  EMAIL_FROM: readEnv('EMAIL_FROM', { fallback: 'no-reply@cs-ai-chatbot.local' }),
  EMAIL_API_KEY: readEnv('EMAIL_API_KEY', { fallback: '' }), // legacy, unused

  // Gmail SMTP: host smtp.gmail.com, port 587, secure false, pass = a 16-char
  // Google "App Password".
  SMTP_HOST: readEnv('SMTP_HOST', { fallback: '' }),
  SMTP_PORT: Number(readEnv('SMTP_PORT', { fallback: 587 })),
  SMTP_SECURE: readEnv('SMTP_SECURE', { fallback: 'false' }) === 'true',
  SMTP_USER: readEnv('SMTP_USER', { fallback: '' }),
  SMTP_PASS: readEnv('SMTP_PASS', { fallback: '' }),

  // Resend: EMAIL_FROM must be a verified sender.
  RESEND_API_KEY: readEnv('RESEND_API_KEY', { fallback: '' }),

  // Optional — the server still boots without Qdrant; ingest/search return 503.
  QDRANT_URL: readEnv('QDRANT_URL', { fallback: '' }),
  QDRANT_API_KEY: readEnv('QDRANT_API_KEY', { fallback: '' }),
  QDRANT_COLLECTION: readEnv('QDRANT_COLLECTION', { fallback: 'cs_chatbot_kb' }),

  // Vector dimension is a per-provider code constant (embedding.service.js),
  // never read from env, so collection size and provider can't drift apart.
  EMBEDDING_PROVIDER: readEnv('EMBEDDING_PROVIDER', { fallback: 'gemini' }),
  EMBEDDING_MODEL: readEnv('EMBEDDING_MODEL', { fallback: 'gemini-embedding-001' }),
  GEMINI_API_KEY: readEnv('GEMINI_API_KEY', { fallback: '' }),

  // Any OpenAI-compatible chat endpoint; defaults target Groq.
  LLM_PROVIDER: readEnv('LLM_PROVIDER', { fallback: 'groq' }),
  LLM_BASE_URL: readEnv('LLM_BASE_URL', { fallback: 'https://api.groq.com/openai/v1' }),
  LLM_MODEL: readEnv('LLM_MODEL', { fallback: 'openai/gpt-oss-120b' }),
  LLM_API_KEY: readEnv('LLM_API_KEY', { fallback: '' }),
  LLM_TIMEOUT_MS: Number(readEnv('LLM_TIMEOUT_MS', { fallback: 30000 })),
  LLM_MAX_TOKENS: Number(readEnv('LLM_MAX_TOKENS', { fallback: 1024 })),

  // How many vector hits to pull, and the minimum cosine score to keep one.
  // (gemini-embedding-001 @768: relevant hits score ~0.55-0.80 in testing.)
  RAG_TOP_K: Number(readEnv('RAG_TOP_K', { fallback: 6 })),
  RAG_MIN_SCORE: Number(readEnv('RAG_MIN_SCORE', { fallback: 0.55 })),

  CLASSIFIER_LLM_FALLBACK:
    readEnv('CLASSIFIER_LLM_FALLBACK', { fallback: 'true' }) !== 'false',

  // Ask the chat model to also emit 3 follow-up questions, parsed off the reply
  // and shown as chips. No extra API call. 'false' turns the chips off.
  CHAT_FOLLOWUPS: readEnv('CHAT_FOLLOWUPS', { fallback: 'true' }) !== 'false',

  // Single hard-coded admin-console operator account.
  ADMIN_EMAIL: readEnv('ADMIN_EMAIL', { fallback: 'Admin360@gmail.com' }),
  ADMIN_PASSWORD: readEnv('ADMIN_PASSWORD', { fallback: 'Admin@360' }),

  // How many prior messages to replay to the LLM (10 ~= 5 turns), and a
  // per-message character cap to keep tokens bounded.
  HISTORY_MAX_MESSAGES: Number(readEnv('HISTORY_MAX_MESSAGES', { fallback: 10 })),
  HISTORY_MAX_CHARS: Number(readEnv('HISTORY_MAX_CHARS', { fallback: 1500 })),

  // One shared time window, a separate request ceiling per bucket.
  RATE_LIMIT_WINDOW_MS: Number(readEnv('RATE_LIMIT_WINDOW_MS', { fallback: 15 * 60 * 1000 })),
  RATE_LIMIT_MAX: Number(readEnv('RATE_LIMIT_MAX', { fallback: 300 })),
  AUTH_RATE_LIMIT_MAX: Number(readEnv('AUTH_RATE_LIMIT_MAX', { fallback: 20 })),
  CHAT_RATE_LIMIT_MAX: Number(readEnv('CHAT_RATE_LIMIT_MAX', { fallback: 40 })),
  LEADS_RATE_LIMIT_MAX: Number(readEnv('LEADS_RATE_LIMIT_MAX', { fallback: 5 })),

  get isProduction() {
    return this.NODE_ENV === 'production';
  },
};

export default env;
