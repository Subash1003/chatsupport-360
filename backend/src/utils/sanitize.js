// -----------------------------------------------------------------------------
// sanitize.js
//
// Phase 9: prompt-injection hygiene for anything that goes INTO the model
// prompt (spec section 12).
//
// The primary defence is architectural: unauthorized data is never retrieved,
// so an injection has nothing to exfiltrate. These helpers are defence in
// depth:
//   - keep the <user_message> delimiter trustworthy - neither the user nor a
//     retrieved document may forge or close it;
//   - strip control characters and clamp runaway whitespace used to pad a
//     prompt or burn tokens.
//
// Note: we do NOT try to detect "jailbreak phrases". The user's message is
// data, not instructions; the system prompt and the never-retrieve boundary
// handle intent. Over-filtering wording would just break legitimate questions.
// -----------------------------------------------------------------------------

const DELIMITER_RE = /<\/?\s*user_message\s*>/gi;

// C0 control chars (U+0000..U+001F) except tab (U+0009) and newline (U+000A),
// plus DEL (U+007F) and the Unicode line/paragraph separators (U+2028/U+2029)
// some clients use to smuggle extra "lines" into a prompt.
const CONTROL_RE =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/g;

/** Neutralise anything that looks like our prompt delimiter tags. */
export function neutralizeDelimiters(text) {
  return String(text ?? '').replace(DELIMITER_RE, '[user_message]');
}

/** Clean a raw user message before it is embedded in the prompt. */
export function sanitizeUserMessage(raw) {
  let text = String(raw ?? '');

  text = text.replace(CONTROL_RE, '');
  text = neutralizeDelimiters(text);

  // Collapse absurd whitespace runs (injection padding / token burning).
  text = text.replace(/[ \t]{80,}/g, '  ').replace(/\n{6,}/g, '\n\n\n');

  return text.trim();
}

export default { sanitizeUserMessage, neutralizeDelimiters };
