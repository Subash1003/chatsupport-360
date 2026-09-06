// -----------------------------------------------------------------------------
// FormField.jsx
//
// A labelled input row used by every auth form and the lead form. Pass
// `as="textarea"` for a multi-line field. `error` renders an inline message and
// a red border. Password fields (`type="password"`) get a show/hide eye toggle
// automatically.
// -----------------------------------------------------------------------------

import { useState } from 'react';

import Icon from './Icon.jsx';

export default function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  required = false,
  autoComplete,
  placeholder,
  as = 'input',
  rows = 4,
  hint,
  error,
  disabled = false,
  autoFocus = false,
}) {
  const Control = as;
  const isPassword = as === 'input' && type === 'password';
  const [reveal, setReveal] = useState(false);
  const effectiveType = isPassword ? (reveal ? 'text' : 'password') : type;

  const control = (
    <Control
      className="field-control"
      name={name}
      {...(as === 'input' ? { type: effectiveType } : { rows })}
      value={value}
      onChange={onChange}
      required={required}
      autoComplete={autoComplete}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      aria-invalid={error ? 'true' : undefined}
      style={{
        ...(error ? { borderColor: 'rgba(255,107,107,0.55)' } : null),
        ...(isPassword ? { paddingRight: 42 } : null),
      }}
    />
  );

  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <span className="field-req"> *</span>}
      </span>

      {isPassword ? (
        <span className="field-control-wrap">
          {control}
          <button
            type="button"
            className="field-reveal"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            <Icon name={reveal ? 'eye-off' : 'eye'} size={16} />
          </button>
        </span>
      ) : (
        control
      )}

      {error ? (
        <span className="field-hint" style={{ color: 'var(--danger)' }}>
          {error}
        </span>
      ) : (
        hint && <span className="field-hint">{hint}</span>
      )}
    </label>
  );
}
