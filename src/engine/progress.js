import { getState, update } from './storage.js';
import { transitions, srsSummary } from './srs.js';
import { UNITS } from '../data/index.js';

export const MODES = {
  walk: { label: 'Walkthrough', path: 'walk' },
  run: { label: 'Full rebuild run', path: 'run' },
  order: { label: 'Order drill', path: 'order' },
  next: { label: "What's next", path: 'next' },
  specs: { label: 'Spec flashcards', path: 'specs' },
  review: { label: 'Review due', path: 'review' },
};

/** Mastery, due count and run history for one unit. */
export function unitProgress(unit, state = getState()) {
  const cards = transitions(unit);
  const srs = srsSummary(cards, state);
  const runs = Array.isArray(state.runs[unit.id]) ? state.runs[unit.id] : [];
  const best = runs.reduce((b, r) => (!b || r.mistakes < b.mistakes || (r.mistakes === b.mistakes && r.ms < b.ms) ? r : b), null);
  const last = state.last[unit.id] || null;
  const walkIndex = Number.isInteger(state.walk[unit.id]) ? state.walk[unit.id] : 0;
  const active = state.activeRun[unit.id] || null;
  return { cards: cards.length, ...srs, runs, best, last, walkIndex, active };
}

/** Where "continue" should go for a unit. */
export function continuePath(unit, state = getState()) {
  const p = unitProgress(unit, state);
  if (p.active) return `/unit/${unit.id}/run`;
  const mode = p.last?.mode && MODES[p.last.mode] ? p.last.mode : 'walk';
  if (mode === 'review') return `/review?unit=${unit.id}`;
  return `/unit/${unit.id}/${MODES[mode].path}`;
}

export function allTransitions() {
  return UNITS.flatMap((u) => transitions(u));
}

/* ---------------------------------------------------------------- writes */

export function touchMode(unitId, mode) {
  return update((s) => ({ ...s, last: { ...s.last, [unitId]: { mode, at: Date.now() } } }));
}

export function setWalkIndex(unitId, index) {
  return update((s) => (s.walk[unitId] === index ? s : { ...s, walk: { ...s.walk, [unitId]: index } }));
}

export function saveActiveRun(unitId, run) {
  return update((s) => {
    const activeRun = { ...s.activeRun };
    if (run) activeRun[unitId] = run; else delete activeRun[unitId];
    return { ...s, activeRun };
  });
}

export function recordRun(unitId, result) {
  return update((s) => {
    const list = Array.isArray(s.runs[unitId]) ? s.runs[unitId] : [];
    const activeRun = { ...s.activeRun };
    delete activeRun[unitId];
    return {
      ...s,
      activeRun,
      runs: { ...s.runs, [unitId]: [{ at: Date.now(), ...result }, ...list].slice(0, 20) },
      sessions: [{ at: Date.now(), kind: 'run', unit: unitId, score: result.total - result.mistakes, total: result.total }, ...s.sessions].slice(0, 300),
    };
  });
}

export function logSession(kind, unit, score, total) {
  return update((s) => ({
    ...s,
    sessions: [{ at: Date.now(), kind, unit, score, total }, ...s.sessions].slice(0, 300),
  }));
}

/* ----------------------------------------------------------------- reads */

/** Consecutive days (ending today or yesterday) with at least one logged session. */
export function studyStreak(state = getState()) {
  const days = new Set(state.sessions.map((x) => new Date(x.at).toDateString()));
  let streak = 0;
  const d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (days.has(d.toDateString())) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function formatMs(ms) {
  const total = Math.max(0, Math.round((ms || 0) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
