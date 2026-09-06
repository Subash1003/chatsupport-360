// -----------------------------------------------------------------------------
// AdminLoginPage.jsx
//
// Separate from the customer login. POST /api/admin/login -> stores the admin
// token -> /admin.
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import FormField from '../components/FormField.jsx';
import BrandMark from '../components/BrandMark.jsx';
import { adminLogin } from '../services/adminApi.js';
import { setAdminToken } from '../utils/adminToken.js';

export default function AdminLoginPage() {
  const navigate = useNavigate();
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
      const { token } = await adminLogin(form);
      setAdminToken(token);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Admin login failed.');
      setBusy(false);
    }
  }

  return (
    <div className="page auth-page">
      <div className="card auth-card">
        <div className="auth-head">
          <BrandMark size="md" />
          <h1 className="auth-title">Admin login</h1>
          <p className="auth-sub">Support console</p>
        </div>

        <form onSubmit={onSubmit}>
          <FormField
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={update}
            required
            autoComplete="username"
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
            {busy ? (
              <>
                <span className="spinner" /> Signing in…
              </>
            ) : (
              'Sign in as admin'
            )}
          </button>
        </form>

        <p className="auth-alt">
          <Link to="/login">Customer sign in</Link>
        </p>
      </div>
    </div>
  );
}
