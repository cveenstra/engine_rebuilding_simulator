import { TERMS, TERM_BY_ID } from '../data/glossary.js';
import { UNITS } from '../data/index.js';
import { createMatcher, foldForm } from './termMatch.js';

/** The shared matcher, segment() and the indexes built on it. Rules: see termMatch.js. */

// ---- the shared matcher over the dictionary, built on first use
let shared = null;
export function matcher() {
  if (!shared) {
    shared = createMatcher(TERMS);
    if (import.meta.env?.DEV && shared.collisions.length) {
      console.warn('[glossary] aliases claimed by more than one term (first one wins):', shared.collisions);
    }
  }
  return shared;
}

/** Split text into plain runs and term runs: [{ text } | { text, termId }]. */
export const segment = (text) => matcher().segment(text);

/** The term ids in a text, in order of first appearance. */
export function termsIn(text) {
  const ids = [];
  for (const s of segment(text)) if (s.termId && !ids.includes(s.termId)) ids.push(s.termId);
  return ids;
}

/**
 * For texts shown together (a step's action, why and mistake), the terms
 * already linked by the texts before each one, so a term is linked once per
 * card rather than once per paragraph.
 */
export function glossSkips(texts, base) {
  const seen = new Set(base || []);
  return texts.map((t) => {
    const before = new Set(seen);
    for (const id of termsIn(t)) seen.add(id);
    return before;
  });
}

/** The learner-facing texts of one step, for counting where a term appears. */
const stepTexts = (s) => [s.title, s.action, s.why, s.mistake, ...(s.tools || []), s.spec?.note].filter((t) => typeof t === 'string' && t);
const unitTexts = (u) => [u.summary, ...u.notes, ...u.facts.flatMap((f) => [f.label, f.value])].filter((t) => typeof t === 'string' && t);
const EXAMPLE_FIELDS = ['action', 'why', 'mistake'];
const MAX_EXAMPLES = 8;

/** The sentence around [start, end) in text, with the match offsets inside it. */
function sentenceAround(text, start, end) {
  let a = 0;
  const re = /[.!?](?=\s+[A-Z0-9])/g;
  let m;
  while ((m = re.exec(text)) && m.index < start) a = m.index + 1;
  re.lastIndex = end;
  const after = re.exec(text);
  const b = after ? after.index + 1 : text.length;
  const lead = text.slice(a, b).match(/^\s*/)[0].length;
  const sentence = text.slice(a + lead, b);
  return { text: sentence, start: start - a - lead, end: end - a - lead };
}

// ---- where each term appears, built once on first use
let usage = null;
function buildUsage() {
  const real = UNITS.filter((u) => !u.sample);
  const units = real.length ? real : UNITS;
  const perUnit = new Map(); // termId -> Map(unitId -> { unit, steps, first })
  const freq = new Map(); // termId -> occurrences across every unit
  const examples = new Map(); // termId -> [{ unit, step, text, start, end }]
  const count = (text) => {
    for (const sg of segment(text)) if (sg.termId) freq.set(sg.termId, (freq.get(sg.termId) || 0) + 1);
  };
  for (const unit of units) {
    unitTexts(unit).forEach(count);
    for (const step of unit.steps) {
      const ids = new Set();
      for (const t of stepTexts(step)) {
        count(t);
        for (const id of termsIn(t)) ids.add(id);
      }
      for (const id of ids) {
        if (!perUnit.has(id)) perUnit.set(id, new Map());
        const per = perUnit.get(id);
        const row = per.get(unit.id);
        if (row) row.steps++;
        else per.set(unit.id, { unit, steps: 1, first: step.order });
      }
      // One example sentence per term per step, from the prose fields.
      const got = new Set();
      for (const f of EXAMPLE_FIELDS) {
        const text = step[f];
        if (!text) continue;
        let at = 0;
        for (const sg of segment(text)) {
          const id = sg.termId;
          if (id && !got.has(id)) {
            got.add(id);
            if (!examples.has(id)) examples.set(id, []);
            const list = examples.get(id);
            if (list.length < MAX_EXAMPLES) list.push({ unit, step, ...sentenceAround(text, at, at + sg.text.length) });
          }
          at += sg.text.length;
        }
      }
    }
  }
  return { perUnit, freq, examples };
}
const getUsage = () => (usage ||= buildUsage());

/** Per unit: how many steps mention the term, and the first one. */
export function termUsage(termId) {
  return [...(getUsage().perUnit.get(termId)?.values() || [])];
}

/** How many times the term appears across every unit's text. */
export const termFrequency = (termId) => getUsage().freq.get(termId) || 0;

/** Real step sentences that use the term: [{ unit, step, text, start, end }]. */
export const termExamples = (termId) => getUsage().examples.get(termId) || [];

// ---- search for the dictionary page
const norm = (s) => foldForm(s || '').toLowerCase();

/**
 * Terms matching a query, best first: the name starting with it, then an
 * alias starting with it, then either containing it, then the definition.
 * With no query, A to Z.
 */
export function searchTerms(query, category = '') {
  const pool = category ? TERMS.filter((t) => t.category === category) : TERMS;
  const q = norm(query);
  if (!q) return pool;
  const scored = [];
  for (const t of pool) {
    const name = norm(t.term);
    const aliases = t.aliases.map(norm);
    let score = 0;
    if (name === q || aliases.includes(q)) score = 6;
    else if (name.startsWith(q)) score = 5;
    else if (aliases.some((a) => a.startsWith(q))) score = 4;
    else if (name.includes(q)) score = 3;
    else if (aliases.some((a) => a.includes(q))) score = 2;
    else if (norm(t.short).includes(q) || norm(t.long).includes(q)) score = 1;
    if (score) scored.push([score, t]);
  }
  return scored.sort((a, b) => b[0] - a[0]).map(([, t]) => t);
}

export { TERMS, TERM_BY_ID };

/** Terms whose picture is this catalog part, so a part's own page does not link to itself. */
export const termsForPart = (partId) => TERMS.filter((t) => t.part === partId).map((t) => t.id);
