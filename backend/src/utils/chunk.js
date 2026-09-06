// -----------------------------------------------------------------------------
// chunk.js
//
// Turn a document into embed-sized pieces. Pure and deterministic: the same
// input always produces the same chunks, which (together with deterministic
// point ids) means re-ingesting replaces points instead of duplicating them.
//
//   cleanText(raw)          -> normalised text
//   chunkText(text, opts)   -> string[]  (each <= ~maxChars, with overlap)
// -----------------------------------------------------------------------------

/** Normalise line endings and collapse runaway whitespace. */
export function cleanText(raw) {
  return String(raw)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n') // trailing spaces on a line
    .replace(/\n{3,}/g, '\n\n') // at most one blank line
    .trim();
}

/**
 * Split on blank lines (paragraph / markdown-block boundaries) then greedily
 * pack blocks into chunks of about `maxChars`. Consecutive chunks share the
 * last `overlap` characters so a fact sitting on a boundary is still retrievable.
 *
 * A single block longer than maxChars is hard-split on whitespace.
 */
export function chunkText(text, { maxChars = 1200, overlap = 150 } = {}) {
  const clean = cleanText(text);
  if (!clean) return [];

  const blocks = clean.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

  // Pre-split any oversized block.
  const units = [];
  for (const block of blocks) {
    if (block.length <= maxChars) {
      units.push(block);
      continue;
    }
    let rest = block;
    while (rest.length > maxChars) {
      let cut = rest.lastIndexOf(' ', maxChars);
      if (cut < maxChars * 0.5) cut = maxChars; // no good space: hard cut
      units.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) units.push(rest);
  }

  const chunks = [];
  let current = '';
  for (const unit of units) {
    const candidate = current ? `${current}\n\n${unit}` : unit;
    if (candidate.length > maxChars && current) {
      chunks.push(current);
      const tail = overlap > 0 ? current.slice(-overlap) : '';
      current = tail ? `${tail}\n\n${unit}` : unit;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);

  return chunks;
}
