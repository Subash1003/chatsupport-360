// -----------------------------------------------------------------------------
// LeadForm.jsx
//
// Shown in the chat UI to visitors (not signed-in users). Posts to
// POST /api/leads. Required: name, email, description.
// Optional: project type, budget, timeline (free text).
// -----------------------------------------------------------------------------

import { useState } from 'react';

import FormField from './FormField.jsx';
import Icon from './Icon.jsx';
import { submitLead } from '../services/leadsApi.js';

const EMPTY = {
  name: '',
  email: '',
  description: '',
  projectType: '',
  budget: '',
  timeline: '',
};

export default function LeadForm({ onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState('idle'); // 'idle' | 'sending' | 'done' | 'error'
  const [error, setError] = useState('');

  function update(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      await submitLead(form);
      setStatus('done');
      setForm(EMPTY);
    } catch (err) {
      setError(err.message || 'Could not submit. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="lead-form">
        <p className="lead-done">
          <Icon name="check" size={16} />
          Thanks — your enquiry has been received. Our team will be in touch.
        </p>
        {onClose && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <form className="lead-form" onSubmit={onSubmit}>
      <div className="lead-form-head">
        <h3>Talk to a human</h3>
        {onClose && (
          <button type="button" className="lead-form-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        )}
      </div>

      <FormField label="Name" name="name" value={form.name} onChange={update} required />
      <FormField
        label="Email"
        name="email"
        type="email"
        value={form.email}
        onChange={update}
        required
        autoComplete="email"
      />
      <FormField
        label="What do you need?"
        name="description"
        as="textarea"
        value={form.description}
        onChange={update}
        required
        placeholder="A short description of the project or question."
      />
      <div className="lead-form-grid">
        <FormField label="Project type" name="projectType" value={form.projectType} onChange={update} placeholder="e.g. Website" />
        <FormField label="Budget" name="budget" value={form.budget} onChange={update} placeholder="e.g. 1-2 lakhs" />
        <FormField label="Timeline" name="timeline" value={form.timeline} onChange={update} placeholder="e.g. ~2 months" />
      </div>

      {status === 'error' && <p className="form-error">{error}</p>}

      <button type="submit" className="btn btn-block" disabled={status === 'sending'}>
        {status === 'sending' ? <><span className="spinner" /> Sending…</> : 'Send enquiry'}
      </button>
    </form>
  );
}
