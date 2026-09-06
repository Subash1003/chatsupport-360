// -----------------------------------------------------------------------------
// ForgotPasswordPage.jsx
//
//   1. email                 -> POST /api/auth/forgot-password  (always 200)
//   2. code + new password   -> POST /api/auth/reset-password
//
// Do NOT call /verify-otp for a reset — reset-password verifies AND consumes the
// code in one call (spec §8). On success, send the user to /login.
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import FormField from '../components/FormField.jsx';
import BrandMark from '../components/BrandMark.jsx';
import { forgotPassword, resetPassword } from '../services/authApi.js';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(fn) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const submitEmail = (e) => {
    e.preventDefault();
    run(async () => {
      await forgotPassword(email);
      setNotice('If that email is registered, a reset code has been sent (check the backend terminal in dev).');
      setStep(2);
    });
  };

  const submitReset = (e) => {
    e.preventDefault();
    run(async () => {
      await resetPassword({ email, otp, newPassword });
      navigate('/login', {
        replace: true,
        state: { flash: 'Password updated. Sign in with your new password.' },
      });
    });
  };

  return (
    <div className="page auth-page">
      <div className="card auth-card">
        <div className="auth-head">
          <BrandMark size="md" />
          <h1 className="auth-title">Reset your password</h1>
          <p className="auth-sub">
            {step === 1 ? 'Enter your account email' : 'Enter the code and a new password'}
          </p>
        </div>

        {step === 1 && (
          <form onSubmit={submitEmail}>
            <FormField
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn-block" disabled={busy}>
              {busy ? <><span className="spinner" /> Sending…</> : 'Send reset code'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={submitReset}>
            {notice && <p className="auth-hint">{notice}</p>}
            <FormField
              label="Reset code"
              name="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              placeholder="123456"
              autoFocus
            />
            <FormField
              label="New password"
              name="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              hint="At least 8 characters, with a letter and a number."
            />
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn-block" disabled={busy}>
              {busy ? <><span className="spinner" /> Updating…</> : 'Update password'}
            </button>
          </form>
        )}

        <p className="auth-alt">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
