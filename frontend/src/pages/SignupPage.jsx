// -----------------------------------------------------------------------------
// SignupPage.jsx
//
// Single-step signup:
//   name + email + password -> POST /api/auth/signup -> { token, ... } -> logged in
//
// The email-OTP steps from spec §8 are skipped: the backend deployment host
// blocks outbound SMTP, so verification codes cannot be delivered.
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import FormField from '../components/FormField.jsx';
import BrandMark from '../components/BrandMark.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { signup } from '../services/authApi.js';

export default function SignupPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    (async () => {
      try {
        const res = await signup({ name, email, password });
        login(res.data);
        navigate('/chat', { replace: true });
      } catch (err) {
        setError(err.message || 'Something went wrong.');
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <div className="page auth-page">
      <div className="card auth-card">
        <div className="auth-head">
          <BrandMark size="md" />
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-sub">It only takes a moment</p>
        </div>

        <form onSubmit={submit}>
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
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
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

        <p className="auth-alt">
          <Link to="/login">Already have an account? Sign in</Link>
        </p>
        <p className="auth-alt" style={{ marginTop: 8 }}>
          <Link to="/admin/login" className="btn btn-ghost btn-sm">
            Admin login
          </Link>
        </p>
      </div>
    </div>
  );
}
