// -----------------------------------------------------------------------------
// email.service.js
//
// A small pluggable email layer. Auth code calls sendOtpEmail() and does not
// know or care which transport delivers it. Interface: send({ to, subject,
// text, html }).
//
// Transports:
//   console  (default) — prints the OTP to the backend terminal. No account
//                        needed. Good for local dev.
//   smtp               — real email over SMTP (nodemailer). Works with Gmail
//                        (using an App Password), Outlook, or any SMTP host.
//   resend             — real email via the Resend HTTP API (no extra package).
//
// Pick one with EMAIL_TRANSPORT in backend/.env and fill the matching keys.
// Secrets and provider error bodies are never returned to the client (spec §2).
// -----------------------------------------------------------------------------

import nodemailer from 'nodemailer';

import env from '../config/env.js';
import logger from '../config/logger.js';

function httpError(statusCode, code, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

// --- console: print to the terminal (default) -------------------------------
const consoleTransport = {
  name: 'console',
  async send({ to, subject, text }) {
    const border = '  +' + '-'.repeat(56);
    console.log('');
    console.log(border);
    console.log('  |  DEV EMAIL  (EMAIL_TRANSPORT=console)');
    console.log(`  |  From    : ${env.EMAIL_FROM}`);
    console.log(`  |  To      : ${to}`);
    console.log(`  |  Subject : ${subject}`);
    console.log('  |');
    for (const line of String(text).split('\n')) {
      console.log(`  |  ${line}`);
    }
    console.log(border);
    console.log('');
    return { delivered: true, transport: 'console' };
  },
};

// --- smtp: real email via nodemailer --------------------------------------
let _smtp; // lazy singleton
function smtpTransporter() {
  if (_smtp) return _smtp;
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    throw httpError(
      500,
      'EMAIL_NOT_CONFIGURED',
      'SMTP_HOST, SMTP_USER and SMTP_PASS must be set for EMAIL_TRANSPORT=smtp.'
    );
  }
  _smtp = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT, // 587 = STARTTLS, 465 = implicit TLS
    secure: env.SMTP_SECURE, // true only for port 465
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return _smtp;
}

const smtpTransport = {
  name: 'smtp',
  async send({ to, subject, text, html }) {
    const transporter = smtpTransporter(); // throws EMAIL_NOT_CONFIGURED (500) if unset
    try {
      const info = await transporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject,
        text,
        html,
      });
      return { delivered: true, transport: 'smtp', id: info.messageId };
    } catch (err) {
      logger.error({ module: 'email', transport: 'smtp', detail: err.message }, 'smtp send failed');
      throw httpError(502, 'EMAIL_SEND_FAILED', 'Could not send the email. Please try again.');
    }
  },
};

// --- resend: real email via the Resend HTTP API (no dependency) -----------
const resendTransport = {
  name: 'resend',
  async send({ to, subject, text, html }) {
    if (!env.RESEND_API_KEY) {
      throw httpError(
        500,
        'EMAIL_NOT_CONFIGURED',
        'RESEND_API_KEY must be set for EMAIL_TRANSPORT=resend.'
      );
    }
    let res;
    try {
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text, html }),
      });
    } catch (err) {
      logger.error({ module: 'email', transport: 'resend', detail: err.message }, 'resend fetch failed');
      throw httpError(502, 'EMAIL_SEND_FAILED', 'Could not send the email. Please try again.');
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logger.error(
        { module: 'email', transport: 'resend', status: res.status, detail: detail.slice(0, 300) },
        'resend rejected the request'
      );
      throw httpError(502, 'EMAIL_SEND_FAILED', 'Could not send the email. Please try again.');
    }
    const json = await res.json().catch(() => ({}));
    return { delivered: true, transport: 'resend', id: json.id };
  },
};

const transports = {
  console: consoleTransport,
  smtp: smtpTransport,
  resend: resendTransport,
};

function activeTransport() {
  const transport = transports[env.EMAIL_TRANSPORT];
  if (!transport) {
    throw httpError(
      500,
      'EMAIL_TRANSPORT_UNKNOWN',
      `Unknown EMAIL_TRANSPORT "${env.EMAIL_TRANSPORT}". Known: ${Object.keys(transports).join(', ')}.`
    );
  }
  return transport;
}

// --- message body --------------------------------------------------------
function otpHtml({ heading, otp }) {
  return `<!doctype html><html><body style="margin:0;background:#f4f6f9;padding:28px;font-family:Arial,Helvetica,sans-serif;color:#16202b">
  <table role="presentation" width="100%" style="max-width:460px;margin:0 auto;background:#fff;border:1px solid #e4e8ec;border-radius:10px">
    <tr><td style="padding:24px 26px">
      <div style="font-weight:700;font-size:15px;color:#1f6feb">360 Degree Info</div>
      <h1 style="font-size:18px;margin:14px 0 6px">${heading}</h1>
      <p style="font-size:13px;color:#55626f;margin:0 0 18px">Use this code to continue. It expires in ${env.OTP_EXPIRY_MINUTES} minutes.</p>
      <div style="font-size:30px;font-weight:800;letter-spacing:8px;color:#16202b;background:#f4f6f9;border:1px solid #e4e8ec;border-radius:8px;padding:14px;text-align:center">${otp}</div>
      <p style="font-size:12px;color:#8b96a2;margin:18px 0 0">If you did not request this, you can ignore this email.</p>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * The only function auth code should call. Builds the OTP message and hands it
 * to the active transport.
 */
export async function sendOtpEmail({ to, otp, purpose }) {
  const isReset = purpose === 'password_reset';
  const subject = isReset ? 'Your password reset code' : 'Your verification code';
  const heading = isReset ? 'Reset your password' : 'Verify your email';

  const text =
    `Your ${isReset ? 'password reset' : 'verification'} code is: ${otp}\n` +
    `This code expires in ${env.OTP_EXPIRY_MINUTES} minutes.\n` +
    `If you did not request this, you can safely ignore this email.`;

  const result = await activeTransport().send({
    to,
    subject,
    text,
    html: otpHtml({ heading, otp }),
  });

  // Trace that an OTP mail went out — WITHOUT the code itself (spec rule 7).
  logger.info(
    { to, purpose: purpose || 'email_verification', transport: env.EMAIL_TRANSPORT },
    'otp email sent'
  );
  return result;
}

export default { sendOtpEmail };
