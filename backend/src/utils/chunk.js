// Turn a document into embed-sized pieces. Pure and deterministic: same input,
// same chunks — which, with deterministic point ids, lets re-ingest replace
// points instead of duplicating them.

export function cleanText(raw) {
  return String(raw)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Split on blank lines, then greedily pack blocks into ~maxChars chunks that
// share their last `overlap` chars, so a fact on a boundary stays retrievable.
// An oversized single block is hard-split on whitespace first.
export function chunkText(text, { maxChars = 1200, overlap = 150 } = {}) {
  const clean = cleanText(text);
  if (!clean) return [];

  const blocks = clean.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

  const units = [];
  for (const block of blocks) {
    if (block.length <= maxChars) {
      units.push(block);
      continue;
    }
    let rest = block;
    while (rest.length > maxChars) {
      let cut = rest.lastIndexOf(' ', maxChars);
      if (cut < maxChars * 0.5) cut = maxChars; // no usable space: hard cut
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
