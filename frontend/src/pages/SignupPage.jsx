// -----------------------------------------------------------------------------
// SignupPage.jsx
//
// The 3-step signup flow from spec §8, on one page with a step indicator:
//   1. email       -> POST /api/auth/send-otp
//   2. code        -> POST /api/auth/verify-otp   (purpose: 'signup')
//   3. name+pass   -> POST /api/auth/signup       -> { token, ... } -> logged in
//
// The OTP is printed to the BACKEND TERMINAL by the console email transport.
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import FormField from '../components/FormField.jsx';
import BrandMark from '../components/BrandMark.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { sendSignupOtp, verifyOtp, signup } from '../services/authApi.js';

export default function SignupPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
      await sendSignupOtp(email);
      setStep(2);
    });
  };

  const submitOtp = (e) => {
    e.preventDefault();
    run(async () => {
      await verifyOtp({ email, otp, purpose: 'signup' });
      setStep(3);
    });
  };

  const submitDetails = (e) => {
    e.preventDefault();
    run(async () => {
      const res = await signup({ name, email, password });
      login(res.data);
      navigate('/chat', { replace: true });
    });
  };

  return (
    <div className="page auth-page">
      <div className="card auth-card">
        <div className="auth-head">
          <BrandMark size="md" />
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-sub">Step {step} of 3</p>
        </div>

        <div className="auth-steps">
          <i className={step >= 1 ? 'on' : ''} />
          <i className={step >= 2 ? 'on' : ''} />
          <i className={step >= 3 ? 'on' : ''} />
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
              {busy ? <><span className="spinner" /> Sending code…</> : 'Send verification code'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={submitOtp}>
            <p className="auth-hint">
              We sent a 6-digit code to <strong>{email}</strong>. In development it is
              printed in the backend terminal.
            </p>
            <FormField
              label="Verification code"
              name="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              placeholder="123456"
              autoFocus
            />
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn-block" disabled={busy}>
              {busy ? <><span className="spinner" /> Verifying…</> : 'Verify code'}
            </button>
            <button
              type="button"
              className="btn btn-subtle btn-block"
              style={{ marginTop: 8 }}
              disabled={busy}
              onClick={() => run(async () => { await sendSignupOtp(email); })}
            >
              Resend code
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={submitDetails}>
            <FormField
              label="Full name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              autoFocus
            />
            <FormField
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              hint="At least 8 characters, with a letter and a number."
            />
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn-block" disabled={busy}>
              {busy ? <><span className="spinner" /> Creating account…</> : 'Create account'}
            </button>
          </form>
        )}

        <p className="auth-alt">
          <Link to="/login">Already have an account? Sign in</Link>
        </p>
      </div>
    </div>
  );
}
