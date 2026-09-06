// -----------------------------------------------------------------------------
// AdminPage.jsx
//
// Admin-only. Lists every support ticket across all customers. "Resolve" (with
// a confirm) sets a ticket's status to resolved via PATCH /api/admin/tickets/:id/resolve.
// Self-guards on the admin token (no customer AuthContext involved).
// -----------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import Icon from '../components/Icon.jsx';
import { SkeletonLines } from '../components/Skeleton.jsx';
import { fetchAllTickets, resolveTicket } from '../services/adminApi.js';
import { getAdminToken, clearAdminToken } from '../utils/adminToken.js';

const DONE = ['resolved', 'closed'];

export default function AdminPage() {
  const navigate = useNavigate();
  const [state, setState] = useState('loading'); // loading | ready | error
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const hasToken = Boolean(getAdminToken());

  useEffect(() => {
    if (!hasToken) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchAllTickets();
        if (!cancelled) {
          setTickets(rows);
          setState('ready');
        }
      } catch (err) {
        if (cancelled) return;
        if (err.status === 401) {
          navigate('/admin/login', { replace: true });
          return;
        }
        setError(err.message || 'Could not load tickets.');
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasToken, navigate]);

  if (!hasToken) return <Navigate to="/admin/login" replace />;

  async function onResolve(t) {
    if (!window.confirm(`Mark ticket #${t.ticket_id} ("${t.subject}") as resolved?`)) return;
    setBusyId(t.ticket_id);
    try {
      await resolveTicket(t.ticket_id);
      setTickets((prev) =>
        prev.map((x) => (x.ticket_id === t.ticket_id ? { ...x, status: 'resolved' } : x))
      );
    } catch (err) {
      alert(err.message || 'Could not resolve the ticket.');
    } finally {
      setBusyId(null);
    }
  }

  function logout() {
    clearAdminToken();
    navigate('/admin/login', { replace: true });
  }

  const openCount = tickets.filter((t) => !DONE.includes(t.status)).length;

  return (
    <div className="page">
      <div className="page-intro" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 2 }}>Support tickets</h1>
          <p className="faint" style={{ margin: 0, fontSize: 13 }}>
            {tickets.length} total · {openCount} open · admin console
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
          <Icon name="logout" size={13} /> Log out
        </button>
      </div>

      {state === 'loading' && <SkeletonLines count={6} />}
      {state === 'error' && <p className="form-error">{error}</p>}

      {state === 'ready' && (
        <section className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Subject</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.ticket_id}>
                    <td className="faint">{t.ticket_id}</td>
                    <td>
                      {t.customer_name}
                      <br />
                      <span className="faint" style={{ fontSize: 11 }}>{t.customer_email}</span>
                    </td>
                    <td>{t.subject}</td>
                    <td><span className={`pill pill-${t.priority}`}>{t.priority}</span></td>
                    <td><span className={`pill pill-${t.status}`}>{t.status.replace(/_/g, ' ')}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      {DONE.includes(t.status) ? (
                        <span className="faint" style={{ fontSize: 12 }}>—</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={busyId === t.ticket_id}
                          onClick={() => onResolve(t)}
                        >
                          {busyId === t.ticket_id ? <span className="spinner" /> : 'Resolve'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
