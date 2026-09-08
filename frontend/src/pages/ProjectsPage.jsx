// GET /api/customer/projects — the caller's own projects only.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Icon from '../components/Icon.jsx';
import { SkeletonCards } from '../components/Skeleton.jsx';
import { fetchProjects } from '../services/customerApi.js';

export default function ProjectsPage() {
  const [state, setState] = useState('loading');
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchProjects();
        if (cancelled) return;
        setProjects(rows);
        setState('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'Could not load your projects.');
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <Link to="/account" className="btn btn-ghost btn-sm">
          <Icon name="arrow-left" size={13} /> Back to account
        </Link>
      </div>

      <div className="page-intro">
        <h1>Your projects</h1>
      </div>

      {state === 'loading' && <SkeletonCards count={2} />}
      {state === 'error' && <p className="form-error">{error}</p>}

      {state === 'ready' &&
        (projects.length === 0 ? (
          <p className="muted">No projects on file.</p>
        ) : (
          <div className="project-list stagger">
            {projects.map((p) => (
              <Link
                key={p.project_id}
                to={`/projects/${p.project_id}`}
                className="card card-interactive project-row"
              >
                <div>
                  <h2 className="card-title">{p.project_name}</h2>
                  <p className="faint" style={{ margin: 0, fontSize: 12.5 }}>
                    {p.technology || '—'}
                  </p>
                </div>
                <div className="project-row-meta">
                  <span className={`pill pill-${p.status}`}>{p.status.replace(/_/g, ' ')}</span>
                  <span>due {p.expected_end_date || '—'}</span>
                  <Icon name="arrow-right" size={14} />
                </div>
              </Link>
            ))}
          </div>
        ))}
    </div>
  );
}
