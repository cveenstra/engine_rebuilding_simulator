import { getState, update } from './storage.js';

/**
 * Leitner box scheduling, the same shape as hvac_study's srs.js.
 *
 * The card is a step transition: "after step N comes step N+1". Its id is
 * `${fromStepId}>${toStepId}`, so if content is reordered later the old card
 * simply stops matching and the new pair starts fresh. Spec flashcards use
 * `spec:${stepId}` in the same store.
 *
 * A miss in any game mode (order drill, what's next, full run, review)
 * drops the card to box 0, due now, so it shows up in "Review due" at once. A hit in the review queue always
 * promotes; a hit in a practice mode only promotes when the card was due or new,
 * so cramming one unit for an hour does not push everything out to next month.
 */
export const BOX_INTERVALS_DAYS = [0, 1, 3, 7, 16, 35];
export const MAX_BOX = 5;
export const MATURE_BOX = 4;

const DAY = 86400000;
const BLANK = { box: 0, due: 0, seen: 0, correct: 0, lapses: 0 };

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const transitionId = (from, to) => `${from.id}>${to.id}`;
export const specCardId = (step) => `spec:${step.id}`;

/** Every step transition in a unit, as a card. */
export function transitions(unit) {
  const out = [];
  for (let i = 0; i < unit.steps.length - 1; i++) {
    const from = unit.steps[i];
    const to = unit.steps[i + 1];
    out.push({ id: transitionId(from, to), unitId: unit.id, index: i, from, to });
  }
  return out;
}

export function cardFor(id, state = getState()) {
  return state.srs[id] || BLANK;
}

function nextCard(prev, ok, onlyPromoteDue, now) {
  if (ok && onlyPromoteDue && prev.seen > 0 && prev.due > now) {
    return { ...prev, seen: prev.seen + 1, correct: prev.correct + 1 };
  }
  // A miss goes back to box 0 and is due right away, so "Review due" can drill
  // it today; getting it right there moves it to box 1 (tomorrow) and up the ladder.
  const box = ok ? Math.min(prev.box + 1, MAX_BOX) : 0;
  return {
    box,
    due: ok ? startOfToday() + BOX_INTERVALS_DAYS[box] * DAY : now,
    seen: prev.seen + 1,
    correct: prev.correct + (ok ? 1 : 0),
    lapses: prev.lapses + (ok || prev.seen === 0 ? 0 : 1),
  };
}

/**
 * Grade several cards in one write.
 * results: [{ id, ok }]; onlyPromoteDue: true for practice modes, false for review.
 */
export function gradeMany(results, { onlyPromoteDue = true } = {}) {
  if (!results.length) return getState();
  const now = Date.now();
  return update((s) => {
    const srs = { ...s.srs };
    for (const { id, ok } of results) srs[id] = nextCard(srs[id] || BLANK, !!ok, onlyPromoteDue, now);
    return { ...s, srs };
  });
}

export function grade(id, ok, opts) {
  return gradeMany([{ id, ok }], opts);
}

/** Today's queue: overdue first (oldest, lowest box first), then never-seen, capped at `limit`. */
export function buildQueue(cards, limit = 25, { includeNew = true } = {}, state = getState()) {
  const now = Date.now();
  const due = [];
  const unseen = [];
  for (const c of cards) {
    const r = state.srs[c.id];
    if (!r) unseen.push(c);
    else if (r.due <= now) due.push({ c, due: r.due, box: r.box });
  }
  due.sort((a, b) => a.due - b.due || a.box - b.box);
  return [...due.map((x) => x.c), ...(includeNew ? unseen : [])].slice(0, limit);
}

export function srsSummary(cards, state = getState()) {
  const now = Date.now();
  let due = 0, unseen = 0, learning = 0, mature = 0, boxSum = 0;
  for (const c of cards) {
    const r = state.srs[c.id];
    if (!r) { unseen += 1; continue; }
    if (r.due <= now) due += 1;
    if (r.box >= MATURE_BOX) mature += 1; else learning += 1;
    boxSum += Math.min(r.box, MATURE_BOX);
  }
  const total = cards.length;
  return {
    total, due, unseen, learning, mature,
    studied: total - unseen,
    // Mastery: how far each transition has climbed toward the mature box, averaged.
    mastery: total ? Math.round((boxSum / (total * MATURE_BOX)) * 100) : 0,
  };
}
