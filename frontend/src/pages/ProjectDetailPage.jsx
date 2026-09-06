// -----------------------------------------------------------------------------
// ProjectDetailPage.jsx
//
// GET /api/customer/projects/:id -> { project, tasks }.
// A project id that does not exist OR belongs to another customer returns 404
// PROJECT_NOT_FOUND — we show the same "not found" for both (spec §2, Phase 4).
// -----------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import Icon from '../components/Icon.jsx';
import { SkeletonLines } from '../components/Skeleton.jsx';
import { fetchProject } from '../services/customerApi.js';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [state, setState] = useState('loading'); // loading | ready | notfound | error
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    (async () => {
      try {
        const result = await fetchProject(id);
        if (cancelled) return;
        setData(result);
        setState('ready');
      } catch (err) {
        if (cancelled) return;
        if (
          err.status === 404 ||
          err.code === 'PROJECT_NOT_FOUND' ||
          err.code === 'VALIDATION_ERROR'
        ) {
          setState('notfound');
        } else {
          setError(err.message || 'Could not load this project.');
          setState('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state === 'loading') {
    return (
      <div className="page">
        <SkeletonLines count={4} />
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
  if (state === 'notfound') {
    return (
      <div className="page">
        <div className="card card-muted" style={{ textAlign: 'center', padding: 36 }}>
          <p className="muted" style={{ marginTop: 0 }}>That project was not found.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/projects" className="btn btn-subtle btn-sm">
              <Icon name="arrow-left" size={13} /> All projects
            </Link>
            <Link to="/account" className="btn btn-ghost btn-sm">
              Back to account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { project, tasks } = data;

  return (
    <div className="page stagger">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Link to="/projects" className="btn btn-subtle btn-sm">
          <Icon name="arrow-left" size={13} /> All projects
        </Link>
        <Link to="/account" className="btn btn-ghost btn-sm">
          Back to account
        </Link>
      </div>

      <div className="page-intro">
        <h1>{project.project_name}</h1>
        <p className="muted" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={`pill pill-${project.status}`}>{project.status.replace(/_/g, ' ')}</span>
          {project.technology && <span className="faint">{project.technology}</span>}
        </p>
      </div>

      <section className="card">
        <h2 className="card-title" style={{ marginBottom: 14 }}>Details</h2>
        <dl className="detail-list">
          <div><dt>Start</dt><dd>{project.start_date || '—'}</dd></div>
          <div><dt>Expected end</dt><dd>{project.expected_end_date || '—'}</dd></div>
        </dl>
        {project.description && (
          <p className="muted" style={{ marginBottom: 0, fontSize: 13.5 }}>{project.description}</p>
        )}
      </section>

      <section className="card">
        <h2 className="card-title" style={{ marginBottom: 14 }}>
          Tasks <span className="faint" style={{ fontWeight: 400 }}>({tasks.length})</span>
        </h2>
        {tasks.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No tasks yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Task</th><th>Status</th><th>Completed</th></tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.task_id}>
                    <td>{t.title}</td>
                    <td><span className={`pill pill-${t.status}`}>{t.status.replace(/_/g, ' ')}</span></td>
                    <td className="faint">
                      {t.completed_at ? String(t.completed_at).slice(0, 10) : '—'}
                    </td>
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
