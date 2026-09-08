// Lists every support ticket across all customers. "View" opens a detail modal;
// "Resolve" (with a confirm) PATCHes the ticket to resolved. Self-guards on the
// admin token — no customer AuthContext involved.

import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import Icon from '../components/Icon.jsx';
import { SkeletonLines } from '../components/Skeleton.jsx';
import { fetchAllTickets, resolveTicket } from '../services/adminApi.js';
import { getAdminToken, clearAdminToken } from '../utils/adminToken.js';

const DONE = ['resolved', 'closed'];

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [state, setState] = useState('loading'); // loading | ready | error
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [viewing, setViewing] = useState(null); // ticket object or null

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

  // Close the modal on Escape.
  useEffect(() => {
    if (!viewing) return;
    function onKey(e) {
      if (e.key === 'Escape') setViewing(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewing]);

  if (!hasToken) return <Navigate to="/admin/login" replace />;

  async function onResolve(t) {
    if (!window.confirm(`Mark ticket #${t.ticket_id} ("${t.subject}") as resolved?`)) return;
    setBusyId(t.ticket_id);
    try {
      await resolveTicket(t.ticket_id);
      setTickets((prev) =>
        prev.map((x) => (x.ticket_id === t.ticket_id ? { ...x, status: 'resolved' } : x))
      );
      setViewing((v) => (v && v.ticket_id === t.ticket_id ? { ...v, status: 'resolved' } : v));
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
                    <td>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setViewing(t)}
                        >
                          View
                        </button>
                        {!DONE.includes(t.status) && (
                          <button
                            type="button"
                            className="btn btn-sm"
                            disabled={busyId === t.ticket_id}
                            onClick={() => onResolve(t)}
                          >
                            {busyId === t.ticket_id ? <span className="spinner" /> : 'Resolve'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {viewing && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewing(null);
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-label={`Ticket ${viewing.ticket_id}`}>
            <div className="modal-head">
              <div>
                <h2>Ticket #{viewing.ticket_id}</h2>
                <span className="faint">Raised {formatDateTime(viewing.created_at)}</span>
              </div>
              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={() => setViewing(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <dl>
                <dt>Customer</dt>
                <dd>
                  {viewing.customer_name}
                  <br />
                  <span className="faint" style={{ fontSize: 12 }}>
                    {viewing.customer_email} · {viewing.customer_id}
                  </span>
                </dd>

                <dt>Status</dt>
                <dd>
                  <span className={`pill pill-${viewing.status}`}>
                    {viewing.status.replace(/_/g, ' ')}
                  </span>
                </dd>

                <dt>Priority</dt>
                <dd>
                  <span className={`pill pill-${viewing.priority}`}>{viewing.priority}</span>
                </dd>

                <dt>Subject</dt>
                <dd>{viewing.subject}</dd>

                <dt>Description</dt>
                <dd className="prewrap">{viewing.description || '—'}</dd>

                <dt>Last updated</dt>
                <dd>{formatDateTime(viewing.updated_at)}</dd>
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
