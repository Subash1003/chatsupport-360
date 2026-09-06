// -----------------------------------------------------------------------------
// RaiseTicketForm.jsx
//
// Signed-in customers use this to raise a support ticket (a bug, a question, or
// a NEW PROJECT REQUIREMENT). Posts to POST /api/customer/tickets; the new
// ticket comes back and is handed to the parent via onCreated so the list
// updates immediately.
// -----------------------------------------------------------------------------

import { useState } from 'react';

import FormField from './FormField.jsx';
import Icon from './Icon.jsx';
import { createTicket } from '../services/customerApi.js';

const EMPTY = { subject: '', description: '', priority: 'medium' };

export default function RaiseTicketForm({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState('idle'); // idle | sending | error
  const [error, setError] = useState('');

  function update(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      const ticket = await createTicket(form);
      onCreated?.(ticket);
      setForm(EMPTY);
      setOpen(false);
      setStatus('idle');
    } catch (err) {
      setError(err.message || 'Could not raise the ticket. Please try again.');
      setStatus('error');
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
        <Icon name="chat" size={14} /> Raise a ticket
      </button>
    );
  }

  return (
    <form className="lead-form" onSubmit={onSubmit} style={{ marginTop: 14 }}>
      <div className="lead-form-head">
        <h3>Raise a support ticket</h3>
        <button
          type="button"
          className="lead-form-x"
          onClick={() => {
            setOpen(false);
            setError('');
          }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <FormField
        label="Subject"
        name="subject"
        value={form.subject}
        onChange={update}
        required
        placeholder="e.g. New requirement: add an online booking module"
      />
      <FormField
        label="Details"
        name="description"
        as="textarea"
        value={form.description}
        onChange={update}
        required
        placeholder="Describe the requirement, issue or question."
      />
      <label className="field">
        <span className="field-label">Priority</span>
        <select
          className="field-control"
          name="priority"
          value={form.priority}
          onChange={update}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </label>

      {status === 'error' && <p className="form-error">{error}</p>}

      <button type="submit" className="btn btn-block" disabled={status === 'sending'}>
        {status === 'sending' ? (
          <>
            <span className="spinner" /> Submitting…
          </>
        ) : (
          'Submit ticket'
        )}
      </button>
    </form>
  );
}
