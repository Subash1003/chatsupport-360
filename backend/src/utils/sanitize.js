// Prompt-injection hygiene for anything going into the model prompt.
//
// The real defence is architectural: unauthorized data is never retrieved, so an
// injection has nothing to exfiltrate. These helpers are defence in depth — keep
// the <user_message> delimiter un-forgeable, and strip control chars / runaway
// whitespace used to pad a prompt or burn tokens.
//
// We deliberately don't try to detect "jailbreak phrases": the user's message is
// data, not instructions, and over-filtering wording only breaks real questions.

const DELIMITER_RE = /<\/?\s*user_message\s*>/gi;

// C0 controls except tab/newline, plus DEL and the Unicode line/paragraph
// separators some clients use to smuggle extra "lines" into a prompt.
const CONTROL_RE = new RegExp(
  '[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F\\u2028\\u2029]',
  'g'
);

export function neutralizeDelimiters(text) {
  return String(text ?? '').replace(DELIMITER_RE, '[user_message]');
}

export function sanitizeUserMessage(raw) {
  let text = String(raw ?? '');
  text = text.replace(CONTROL_RE, '');
  text = neutralizeDelimiters(text);
  text = text.replace(/[ \t]{80,}/g, '  ').replace(/\n{6,}/g, '\n\n\n');
  return text.trim();
}

export default { sanitizeUserMessage, neutralizeDelimiters };
