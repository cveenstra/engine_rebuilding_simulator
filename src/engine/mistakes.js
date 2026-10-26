import { getState, update } from './storage.js';
import * as L from './ladder.js';
import { isDrillable, buildMistakeQuestion } from './mistakeQuiz.js';
import { UNITS, SEVERITIES } from '../data/index.js';

/**
 * The mistakes layer: severity labels, counts, and the mistake drill's
 * spaced repetition. Each drillable mistake is a card on the same ladder as
 * the Terms drill (ladder.js: rungs, minute steps, then days), saved in its
 * own namespace, `state.mistakes`, keyed `${unitId}:${mistakeId}`.
 */

export const SEVERITY = {
  'ruins-unit': { label: 'Ruins the unit', short: 'Ruins unit', bars: 4 },
  costly: { label: 'Costly', short: 'Costly', bars: 3 },
  rework: { label: 'Rework', short: 'Rework', bars: 2 },
  minor: { label: 'Minor', short: 'Minor', bars: 1 },
};
export const UNRATED = { label: 'Not rated', short: 'Not rated', bars: 0 };
export const severityMeta = (sev) => SEVERITY[sev] || UNRATED;
export { SEVERITIES };

const rank = (sev) => (sev ? SEVERITIES.indexOf(sev) : SEVERITIES.length);
export const bySeverity = (a, b) => rank(a.severity) - rank(b.severity);

/** The worst severity in a list, or null when none is rated. */
export function worstSeverity(list) {
  let best = null;
  for (const m of list || []) if (m.severity && (best == null || rank(m.severity) < rank(best))) best = m.severity;
  return best;
}

/** { total, ruins, bySeverity: { sev: n }, unrated } for a unit. */
export function mistakeStats(unit) {
  const out = { total: 0, ruins: 0, unrated: 0, bySeverity: Object.fromEntries(SEVERITIES.map((s) => [s, 0])) };
  for (const m of unit?.mistakes || []) {
    out.total++;
    if (m.severity) out.bySeverity[m.severity]++;
    else out.unrated++;
  }
  out.ruins = out.bySeverity['ruins-unit'];
  return out;
}

/** "12 ways to wreck this unit, 3 of them fatal". */
export function wreckLine(stats, noun = 'this unit') {
  if (!stats.total) return '';
  const ways = `${stats.total} way${stats.total === 1 ? '' : 's'} to wreck ${noun}`;
  if (!stats.ruins) return ways;
  if (stats.total === 1) return `${ways}, and it’s fatal`;
  return `${ways}, ${stats.ruins === stats.total ? 'all' : stats.ruins} of them fatal`;
}

// ---- spaced repetition

export const cardKey = (unit, m) => `${unit.id}:${m.id}`;
export const recordsOf = (state = getState()) => state.mistakes || {};
export const drillable = (unit) => (unit?.mistakes || []).filter(isDrillable);

/** Default drill filter: the expensive mistakes first. */
export const DEFAULT_SEVERITIES = ['ruins-unit', 'costly'];
/** New mistakes a session may introduce before it stops to let them settle. */
export const NEW_PER_SESSION = 12;

/**
 * The cards in a drill scope, in teaching order: worst severity first, then
 * step order. An empty severity list means every severity, unrated included.
 */
export function scopeCards(unit, severities = []) {
  const set = new Set(severities);
  return drillable(unit)
    .filter((m) => !set.size || set.has(m.severity))
    .map((m, i) => ({ id: cardKey(unit, m), m, i }))
    .sort((a, b) => bySeverity(a.m, b.m) || a.i - b.i);
}

/** Counts for a unit's drill scope: due now, never seen, and each ladder band. */
export function mistakeSummary(unit, severities = [], state = getState(), now = Date.now()) {
  const records = recordsOf(state);
  const out = { total: 0, due: 0, new: 0, learning: 0, learned: 0, mature: 0 };
  for (const c of scopeCards(unit, severities)) {
    out.total++;
    const r = records[c.id];
    out[L.band(r)]++;
    if (L.isDue(r, now)) out.due++;
  }
  return out;
}

/** Due mistake cards per unit, for the garage: [{ unit, due }] with due > 0, most first. */
export function mistakesDueByUnit(state = getState(), now = Date.now()) {
  return UNITS.map((unit) => ({ unit, due: mistakeSummary(unit, [], state, now).due }))
    .filter((x) => x.due > 0)
    .sort((a, b) => b.due - a.due);
}

/** When the next card in a scope comes back, in ms from now, or null. */
export function nextBackMs(unit, severities = [], state = getState(), now = Date.now()) {
  const records = recordsOf(state);
  let soonest = Infinity;
  for (const c of scopeCards(unit, severities)) {
    const r = records[c.id];
    if (r?.seen) { const d = L.dueAt(r); if (d > now && d < soonest) soonest = d; }
  }
  return Number.isFinite(soonest) ? soonest - now : null;
}

/**
 * The next card to ask: { id, m, reason } or null. Uses the Terms picker:
 * learning cards on their minute step first, then reviews mixed with new
 * cards, then learning cards not yet due so a session does not stop early.
 */
export function nextMistake(unit, { severities = [], answered = 0, lastId = null, newLeft = NEW_PER_SESSION } = {}, state = getState(), now = Date.now()) {
  const cards = scopeCards(unit, severities);
  const pick = L.pickNext({ terms: cards, records: recordsOf(state), now, newLeft, answered, lastId });
  if (!pick) return null;
  const card = cards.find((c) => c.id === pick.termId);
  return card ? { id: card.id, m: card.m, reason: pick.reason } : null;
}

/** A question for a mistake, of a random kind its unit can support. */
export function questionForMistake(unit, m, rnd = Math.random) {
  const orderOf = (stepId) => unit.stepById[stepId]?.order ?? 0;
  return buildMistakeQuestion(m, drillable(unit), { orderOf, rnd });
}

/** Save one answer. Returns { record, justLearned, lost, level, nextIn }. */
export function answerMistake(id, ok, now = Date.now()) {
  let res = null;
  update((s) => {
    const records = recordsOf(s);
    res = L.recordAnswer(records[id], !!ok, now);
    return { ...s, mistakes: { ...records, [id]: res.record } };
  });
  return { ...res, nextIn: L.gapMs(res.level) };
}
