/**
 * Pure: no imports, so node tests and benchmarks can load it directly.
 *
 * The term matcher. Every dictionary term and alias is compiled once into a
 * character trie, then text is scanned left to right:
 *
 * - Longest match wins at each start, so "main bearing" beats "bearing", and
 *   the scan resumes after a match, so terms never overlap.
 * - Whole words only. A match may not touch a letter or digit on either side,
 *   and a hyphen that joins it to another word counts as part of that word:
 *   "ring" does not match inside "O-ring" and "torque" does not match inside
 *   "re-torque". Slashes and apostrophes separate words, so "RH/LH" gives two
 *   matches and "bearing's" links "bearing".
 * - Case-insensitive, except aliases written in capitals (two or more letters,
 *   none lower case, such as "TDC", "RH" or "ATF"), which match only in
 *   capitals so "AT" or "ID" never fire on the words "at" or "id".
 * - Typography is folded: any run of spaces equals one space, every dash
 *   equals a hyphen, every middle dot equals "·" (so "N·m" and "N⋅m" agree),
 *   and curly apostrophes equal straight ones.
 *
 * segment(text) is memoized per string, so a step re-rendered a hundred times
 * is scanned once.
 */

const SPACE = /\s/u;
const chars = (...codes) => new Set(codes.map((n) => String.fromCharCode(n)));
const DASHES = chars(0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0x2212);
const DOTS = chars(0x00b7, 0x22c5, 0x2219, 0x2027, 0x30fb);
const MIDDOT = String.fromCharCode(0x00b7);
const QUOTES = chars(0x2018, 0x2019, 0x02bc);
const WORD = /[\p{L}\p{N}]/u;

function isWord(c) {
  if (c === undefined) return false;
  const n = c.charCodeAt(0);
  if (n < 128) return (n >= 48 && n <= 57) || (n >= 65 && n <= 90) || (n >= 97 && n <= 122);
  return WORD.test(c);
}

/** One character folded for comparison, keeping case. Always one character long. */
function fold(c) {
  if (SPACE.test(c)) return ' ';
  if (DASHES.has(c)) return '-';
  if (DOTS.has(c)) return MIDDOT;
  if (QUOTES.has(c)) return "'";
  return c;
}
function lower(c) {
  const l = c.toLowerCase();
  return l.length === 1 ? l : c;
}

/** Fold a whole surface form: trimmed, single spaces. */
export const foldForm = (s) => Array.from(s.trim(), fold).join('').replace(/ +/g, ' ');
const isCaps = (s) => !/\p{Ll}/u.test(s) && (s.match(/\p{Lu}/gu) || []).length >= 2;

/** Is position i a legal start of a match (the character before is not part of a word)? */
function startOk(text, i) {
  if (i === 0) return true;
  const p = text[i - 1];
  if (isWord(p)) return false;
  if ((p === '-' || DASHES.has(p)) && isWord(text[i - 2])) return false;
  return true;
}
/** Is position j (exclusive end) a legal end of a match? */
function endOk(text, j) {
  if (j >= text.length) return true;
  const n = text[j];
  if (isWord(n)) return false;
  if ((n === '-' || DASHES.has(n)) && isWord(text[j + 1])) return false;
  return true;
}

/**
 * Build a matcher over a list of terms ({ id, term, aliases }). Exported for
 * tests and benchmarks; the app uses the shared instance below.
 */
export function createMatcher(terms) {
  const root = { next: new Map(), ci: null, cs: null };
  const owners = new Map(); // folded key -> term id, to report collisions
  const collisions = [];
  let forms = 0;

  const add = (form, id) => {
    const folded = foldForm(form);
    if (!folded) return;
    const caps = isCaps(folded);
    const key = caps ? `=${folded}` : folded.toLowerCase();
    const owner = owners.get(key);
    if (owner) {
      if (owner !== id) collisions.push({ form, ids: [owner, id] });
      return;
    }
    owners.set(key, id);
    forms++;
    let node = root;
    for (const ch of folded.toLowerCase()) {
      let nx = node.next.get(ch);
      if (!nx) { nx = { next: new Map(), ci: null, cs: null }; node.next.set(ch, nx); }
      node = nx;
    }
    if (caps) {
      if (!node.cs) node.cs = new Map();
      node.cs.set(folded, id);
    } else {
      node.ci = id;
    }
  };
  for (const t of terms) {
    add(t.term, t.id);
    for (const a of t.aliases || []) add(a, t.id);
  }

  /** The longest match starting at i, as [end, termId], or null. */
  const longestAt = (text, i) => {
    let node = root;
    let k = i;
    let best = null;
    while (k < text.length) {
      let ch = lower(fold(text[k]));
      let step = 1;
      if (ch === ' ') { while (k + step < text.length && fold(text[k + step]) === ' ') step++; }
      node = node.next.get(ch);
      if (!node) break;
      k += step;
      if ((node.ci || node.cs) && endOk(text, k)) {
        let id = null;
        if (node.cs) id = node.cs.get(foldForm(text.slice(i, k))) || null;
        if (!id) id = node.ci;
        if (id) best = [k, id];
      }
    }
    return best;
  };

  const cache = new Map();
  const segment = (text) => {
    if (typeof text !== 'string' || !text) return [];
    const hit = cache.get(text);
    if (hit) return hit;
    const out = [];
    let plainFrom = 0;
    let i = 0;
    while (i < text.length) {
      if (!startOk(text, i) || !root.next.has(lower(fold(text[i])))) { i++; continue; }
      const m = longestAt(text, i);
      if (!m) { i++; continue; }
      if (i > plainFrom) out.push({ text: text.slice(plainFrom, i) });
      out.push({ text: text.slice(i, m[0]), termId: m[1] });
      i = m[0];
      plainFrom = i;
    }
    if (plainFrom < text.length) out.push({ text: text.slice(plainFrom) });
    cache.set(text, out);
    return out;
  };

  return { segment, collisions, forms, cacheSize: () => cache.size };
}
