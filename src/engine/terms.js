import { getState, update, getPref } from './storage.js';
import * as L from './ladder.js';
import { TERMS, TERM_BY_ID, withPrerequisites, LEADS_TO, groupOf } from '../data/glossary.js';
import { segment, termFrequency, termUsage, termExamples } from './glossary.js';
import { UNITS } from '../data/index.js';

/**
 * The Terms section: the ladder in ladder.js wired to the dictionary, the
 * saved progress (`state.terms`, one record per term) and the step deck.
 */

export const STATUS_LABEL = {
  locked: 'Locked', new: 'New', learning: 'Learning', learned: 'Learned', mature: 'Mature',
};

// No daily cap by default: new terms come as fast as the learner learns them.
// Prerequisites still gate them, so a word is only new once what it builds on is learned.
export const NO_LIMIT = -1;
export const NEW_PER_DAY_DEFAULT = NO_LIMIT;
export const NEW_PER_DAY_CHOICES = [NO_LIMIT, 5, 10, 15, 20, 30];

const day0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const recordsOf = (state = getState()) => state.terms || {};

/** Terms with a definition can be drilled; the rest only appear in the dictionary. */
let drillable = null;
const DRILL = () => (drillable ||= TERMS.filter((t) => t.short));
/** Every drillable term, in teaching order. */
let ordered = null;
export const orderedTerms = () => (ordered ||= L.teachingOrder(DRILL(), termFrequency));
export const hasTerms = () => DRILL().length >= 4;

export function newPerDay() {
  const n = Number(getPref('termNewPerDay', NEW_PER_DAY_DEFAULT));
  if (!Number.isFinite(n) || n < 0) return Infinity;
  return Math.min(n, 100);
}
/** Label for the daily new-term setting. */
export const perDayLabel = (n = newPerDay()) => (n === Infinity ? 'No daily limit' : `${n} new terms a day`);
export const introducedToday = (state = getState()) => L.introducedSince(recordsOf(state), day0());

/**
 * The terms in a scope, in teaching order. A unit or category filter keeps
 * its terms plus every prerequisite they rest on, so nothing in scope is
 * locked behind a term the filter left out.
 */
export function scopeTerms({ unitId = '', category = '' } = {}) {
  if (!unitId && !category) return orderedTerms();
  const base = orderedTerms().filter((t) => (!category || t.category === category)
    && (!unitId || termUsage(t.id).some((u) => u.unit.id === unitId)));
  const keep = withPrerequisites(base.map((t) => t.id));
  return orderedTerms().filter((t) => keep.has(t.id));
}

/** 'locked', 'new', 'learning', 'learned' or 'mature'. */
export function termStatus(termId, state = getState(), known = L.knownSet(recordsOf(state))) {
  const r = recordsOf(state)[termId];
  const b = L.band(r);
  if (b !== 'new') return b;
  const t = TERM_BY_ID[termId];
  return t && L.isUnlocked(t, known) ? 'new' : 'locked';
}

/** Counts for a scope: due now, new available today, and each status. */
export function termSummary(scope = {}, state = getState(), now = Date.now()) {
  const records = recordsOf(state);
  const known = L.knownSet(records);
  const terms = scopeTerms(scope);
  const out = { total: terms.length, due: 0, locked: 0, new: 0, learning: 0, learned: 0, mature: 0 };
  for (const t of terms) {
    out[termStatus(t.id, state, known)]++;
    if (L.isDue(records[t.id], now)) out.due++;
  }
  out.allowance = Math.max(0, newPerDay() - introducedToday(state));
  out.newToday = Math.min(out.allowance, out.new);
  return out;
}

/** Terms due across every scope, for the garage. */
export const termsDue = (state = getState()) => termSummary({}, state).due;

/** The next term to ask in a scope: { termId, reason } or null. */
export function nextTerm(scope, { answered = 0, lastId = null } = {}, state = getState(), now = Date.now()) {
  return L.pickNext({
    terms: scopeTerms(scope),
    records: recordsOf(state),
    now,
    newLeft: Math.max(0, newPerDay() - introducedToday(state)),
    answered,
    lastId,
  });
}

/**
 * Save one answer. Returns what changed: { justLearned, lost, level, nextIn,
 * unlocked: [terms now available because this one was learned] }.
 */
export function answerTerm(termId, rating, now = Date.now()) {
  let res = null;
  let before = null;
  update((s) => {
    const records = recordsOf(s);
    before = L.knownSet(records);
    res = L.recordAnswer(records[termId], rating, now);
    return { ...s, terms: { ...records, [termId]: res.record } };
  });
  const after = L.knownSet(recordsOf());
  const unlocked = res.justLearned ? L.newlyUnlocked(DRILL(), before, after) : [];
  return { ...res, nextIn: L.gapMs(res.level), unlocked };
}

// ---- sentences and questions

const CONTEXT_MIN = 30;
const CONTEXT_MAX = 240;

/**
 * Real sentences that use a term: its own `example` first, then sentences
 * from the steps, each with the step it came from.
 * [{ text, unit, step, start?, end? }]
 */
export function contextsFor(term) {
  const out = [];
  const seen = new Set();
  const push = (c) => {
    const k = c.text.toLowerCase();
    if (seen.has(k) || c.text.length < CONTEXT_MIN || c.text.length > CONTEXT_MAX) return;
    seen.add(k);
    out.push(c);
  };
  const ex = term.example;
  if (ex?.text) {
    const unit = UNITS.find((u) => u.id === ex.unit) || null;
    const step = unit?.steps.find((s) => s.id === ex.stepId) || null;
    push({ text: ex.text, unit, step });
  }
  for (const e of termExamples(term.id)) push(e);
  return out;
}

/** The question for a term at its current rung. `variant` rotates sentences and prerequisites. */
export function questionFor(termId, state = getState(), rnd = Math.random) {
  const term = TERM_BY_ID[termId];
  if (!term) return null;
  const r = recordsOf(state)[termId];
  return L.buildQuestion(term, L.questionTier(r), {
    pool: DRILL(),
    byId: TERM_BY_ID,
    contexts: contextsFor(term).map((c) => c.text),
    variant: r?.seen || 0,
    rnd,
  });
}

/** One sentence to show after an answer, preferring the unit being drilled. */
export function exampleFor(term, { unitId = '', variant = 0, text = '' } = {}) {
  const all = contextsFor(term).filter((c) => c.step);
  if (!all.length) return null;
  const pref = unitId ? all.filter((c) => c.unit?.id === unitId) : [];
  const list = pref.length ? pref : all;
  const c = (text && all.find((x) => x.text === text)) || list[Math.abs(variant) % list.length];
  const names = [term.term, ...term.aliases];
  // Find where the term sits in the sentence, for highlighting.
  let at = null;
  let pos = 0;
  for (const s of segment(c.text)) {
    if (s.termId === term.id) { at = [pos, pos + s.text.length]; break; }
    pos += s.text.length;
  }
  if (!at) {
    const lower = c.text.toLowerCase();
    for (const n of names.sort((a, b) => b.length - a.length)) {
      const i = lower.indexOf(n.toLowerCase());
      if (i >= 0) { at = [i, i + n.length]; break; }
    }
  }
  return { ...c, at };
}

// ---- progress views

/** Status counts for each concept group and each unit. */
export function termBreakdown(state = getState()) {
  const known = L.knownSet(recordsOf(state));
  const blank = () => ({ total: 0, locked: 0, new: 0, learning: 0, learned: 0, mature: 0 });
  const byGroup = new Map();
  const byUnit = new Map();
  for (const t of orderedTerms()) {
    const st = termStatus(t.id, state, known);
    const g = groupOf(t);
    if (!byGroup.has(g)) byGroup.set(g, blank());
    byGroup.get(g)[st]++;
    byGroup.get(g).total++;
    for (const u of termUsage(t.id)) {
      if (!byUnit.has(u.unit.id)) byUnit.set(u.unit.id, { unit: u.unit, ...blank() });
      byUnit.get(u.unit.id)[st]++;
      byUnit.get(u.unit.id).total++;
    }
  }
  return { byGroup, byUnit };
}

/** The concept map: levels, each with its groups, each with its terms. */
export function conceptLevels() {
  const levels = new Map();
  for (const t of orderedTerms()) {
    if (!levels.has(t.level)) levels.set(t.level, new Map());
    const groups = levels.get(t.level);
    const g = groupOf(t);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(t);
  }
  return [...levels.entries()].sort((a, b) => a[0] - b[0])
    .map(([level, groups]) => ({ level, groups: [...groups.entries()].map(([name, terms]) => ({ name, terms })) }));
}

export { LEADS_TO };

// ---- steps wait for their terms

/** Whether new step cards wait for their terms (Settings; on by default). */
export const gateOn = () => getPref('termsFirst', true) !== false && hasTerms();

const PLAIN = () => new Set(TERMS.filter((t) => t.plainWord === true).map((t) => t.id));
let plain = null;
const stepTermCache = new Map();
/**
 * The terms a step uses, from its title, action and why. Entries flagged
 * plainWord are spelled like everyday English and are not evidence.
 */
export function stepTerms(step) {
  let ids = stepTermCache.get(step);
  if (!ids) {
    plain ||= PLAIN();
    ids = L.termsUsed([step.title, step.action, step.why], segment, plain).filter((id) => TERM_BY_ID[id]?.short);
    stepTermCache.set(step, ids);
  }
  return ids;
}

/**
 * The terms a step transition card uses: everything in the step it asks for,
 * plus the title of the step it starts from.
 */
export function transitionTerms(card) {
  plain ||= PLAIN();
  const ids = [...stepTerms(card.to)];
  for (const id of L.termsUsed([card.from.title], segment, plain)) if (!ids.includes(id) && TERM_BY_ID[id]?.short) ids.push(id);
  return ids;
}

/**
 * Unseen transition cards split into open and held (waiting on terms not yet
 * learned). Seen cards are never held. With the gate off, nothing is held.
 */
export function splitNewCards(cards, state = getState()) {
  const fresh = cards.filter((c) => !state.srs[c.id]);
  if (!gateOn()) return { open: fresh, held: [], terms: new Map() };
  return L.splitByTerms(fresh, transitionTerms, L.knownSet(recordsOf(state)));
}

/** The terms holding the most cards, most first. */
export const holdingTerms = (split, n = 6) => [...split.terms.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([id]) => TERM_BY_ID[id]).filter(Boolean);

let transitionIndex = null;
/** For gradeMany: is this card id a never-seen transition still waiting on its terms? */
export function isHeldNewCard(id, state = getState()) {
  if (state.srs[id] || !gateOn() || !id.includes('>')) return false;
  if (!transitionIndex) {
    transitionIndex = new Map();
    for (const u of UNITS) {
      for (let i = 0; i < u.steps.length - 1; i++) {
        transitionIndex.set(`${u.steps[i].id}>${u.steps[i + 1].id}`, { from: u.steps[i], to: u.steps[i + 1] });
      }
    }
  }
  const card = transitionIndex.get(id);
  if (!card) return false;
  const known = L.knownSet(recordsOf(state));
  return transitionTerms(card).some((t) => !known.has(t));
}
