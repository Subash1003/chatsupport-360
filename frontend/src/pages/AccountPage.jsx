// -----------------------------------------------------------------------------
// AccountPage.jsx
//
// Profile + subscriptions + a ticket summary for the signed-in customer.
// Every call is GET /api/customer/* with the JWT attached by apiClient; the
// backend filters on req.customer.customer_id, so this only ever shows the
// caller's own data.
// -----------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Icon from '../components/Icon.jsx';
import { SkeletonCards } from '../components/Skeleton.jsx';
import RaiseTicketForm from '../components/RaiseTicketForm.jsx';
import {
  fetchProfile,
  fetchSubscriptions,
  fetchTickets,
} from '../services/customerApi.js';

function initials(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'U'
  );
}

export default function AccountPage() {
  const [state, setState] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [profile, setProfile] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, s, t] = await Promise.all([
          fetchProfile(),
          fetchSubscriptions(),
          fetchTickets(),
        ]);
        if (cancelled) return;
        setProfile(p);
        setSubscriptions(s);
        setTickets(t);
        setState('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'Could not load your account.');
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') {
    return (
      <div className="page">
        <div className="page-intro">
          <h1>Your account</h1>
        </div>
        <SkeletonCards count={3} />
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div className="page">
        <p className="form-error">{error}</p>
      </div>
    );
  }

  const openTickets = tickets.filter((t) => !['resolved', 'closed'].includes(t.status));

  return (
    <div className="page stagger">
      <div className="page-intro" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span className="avatar avatar--bot" style={{ width: 44, height: 44, fontSize: 14 }}>
          {initials(profile.name)}
        </span>
        <div>
          <h1 style={{ marginBottom: 2 }}>{profile.name}</h1>
          <p className="faint" style={{ margin: 0, fontSize: 13 }}>
            {profile.email} · {profile.customer_id}
          </p>
        </div>
      </div>

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">Projects</h2>
          <Link to="/projects" className="link-more">
            View all <Icon name="arrow-right" size={13} />
          </Link>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Open the projects page for status and tasks.
        </p>
      </section>

      <section className="card">
        <h2 className="card-title" style={{ marginBottom: 14 }}>
          Subscriptions
        </h2>
        {subscriptions.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No subscriptions on file.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Service</th><th>Status</th><th>Ends</th></tr>
              </thead>
              <tbody>
                {subscriptions.map((s) => (
                  <tr key={s.subscription_id}>
                    <td>{s.service_name}</td>
                    <td><span className={`pill pill-${s.status}`}>{s.status.replace(/_/g, ' ')}</span></td>
                    <td className="faint">{s.end_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="card-title" style={{ marginBottom: 12 }}>
          Support tickets{' '}
          <span className="faint" style={{ fontWeight: 400 }}>
            ({openTickets.length} open / {tickets.length} total)
          </span>
        </h2>

        <RaiseTicketForm onCreated={(t) => setTickets((prev) => [t, ...prev])} />

        <div style={{ marginTop: 14 }} />
        {tickets.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No tickets yet — raise one for a new project requirement, a question or an issue.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Subject</th><th>Status</th><th>Priority</th></tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.ticket_id}>
                    <td className="faint">{t.ticket_id}</td>
                    <td>{t.subject}</td>
                    <td><span className={`pill pill-${t.status}`}>{t.status.replace(/_/g, ' ')}</span></td>
                    <td><span className={`pill pill-${t.priority}`}>{t.priority}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
