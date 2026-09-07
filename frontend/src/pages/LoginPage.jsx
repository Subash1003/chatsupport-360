// -----------------------------------------------------------------------------
// LoginPage.jsx
//
// POST /api/auth/login -> { token, customer_id, email, name }. On success we
// hand the payload to AuthContext.login() and go where the user was headed
// (ProtectedRoute stashes that in location.state.from), else /chat.
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

import FormField from '../components/FormField.jsx';
import BrandMark from '../components/BrandMark.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { login as loginRequest } from '../services/authApi.js';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/chat';
  const flash = location.state?.flash;

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function update(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await loginRequest(form);
      login(res.data);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed.');
      setBusy(false);
    }
  }

  return (
    <div className="page auth-page">
      <div className="card auth-card">
        <div className="auth-head">
          <BrandMark size="md" />
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-sub">Sign in to your 360 Degree Info account</p>
        </div>

        {flash && <p className="form-notice">{flash}</p>}

        <div className="demo-note">
          <h2>Demo Version</h2>
          <p>
            This is a demo version of the application. Use the following demo user
            credentials to log in and access the Account page and view projects.
          </p>
          <dl>
            <dt>Email</dt>
            <dd>subashv2003.10@gmail.com</dd>
            <dt>Password</dt>
            <dd>Password123!</dd>
          </dl>
        </div>

        <form onSubmit={onSubmit}>
          <FormField
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={update}
            required
            autoComplete="email"
            autoFocus
          />
          <FormField
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={update}
            required
            autoComplete="current-password"
          />

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn btn-block" disabled={busy}>
            {busy ? <><span className="spinner" /> Signing in…</> : 'Sign in'}
          </button>
        </form>

        <p className="auth-alt">
          <Link to="/forgot-password">Forgot password?</Link>
          <span className="auth-sep">·</span>
          <Link to="/signup">Create an account</Link>
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
