import { useSyncExternalStore } from 'react';

/**
 * All progress lives in localStorage under keys with one app prefix, so this
 * app never collides with a sibling study app served from the same origin
 * (two GitHub Pages projects under one user share an origin). Every read and
 * write is guarded: a private window, cleared site data or blocked storage
 * must not break the app, it just stops persisting.
 */
export const PREFIX = 'rebuild-bench:';
const KEY = `${PREFIX}progress.v1`;
const PREFS_KEY = `${PREFIX}prefs.v1`;

const clone = (v) => JSON.parse(JSON.stringify(v));

const EMPTY = {
  app: 'rebuild-bench',
  version: 1,
  srs: {},        // cardId -> { box, due, seen, correct, lapses }
  runs: {},       // unitId -> [{ at, total, mistakes, ms, missed: [cardId] }] newest first
  activeRun: {},  // unitId -> an unfinished full rebuild run, so leaving the page does not lose it
  walk: {},       // unitId -> step index last viewed in the walkthrough
  last: {},       // unitId -> { mode, at } for the "continue" button
  sessions: [],   // { at, kind, unit, score, total } newest first
  terms: {},      // termId -> { seen, correct, wrong, firstAt, lastAt, learnedAt }: the Terms ladder, apart from the step deck
  mistakes: {},   // `${unitId}:${mistakeId}` -> the same ladder record as terms: the mistake drill
  savedAt: 0,
};

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);

/** Coerce anything parsed from storage or a backup file into a valid state. */
function sanitize(parsed) {
  const base = clone(EMPTY);
  if (!isObj(parsed)) return base;
  for (const k of ['srs', 'terms', 'mistakes', 'runs', 'activeRun', 'walk', 'last']) {
    if (isObj(parsed[k])) base[k] = parsed[k];
  }
  if (Array.isArray(parsed.sessions)) base.sessions = parsed.sessions.filter(isObj).slice(0, 300);
  if (Number.isFinite(parsed.savedAt)) base.savedAt = parsed.savedAt;
  return base;
}

function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false; // storage unavailable or full: the session still works
  }
}

function read() {
  const raw = safeGet(KEY);
  if (!raw) return clone(EMPTY);
  try {
    return sanitize(JSON.parse(raw));
  } catch {
    return clone(EMPTY);
  }
}

let cache = null;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

export function getState() {
  if (!cache) cache = read();
  return cache;
}

export function update(fn) {
  const next = { ...fn(getState()), savedAt: Date.now() };
  cache = next;
  safeSet(KEY, JSON.stringify(next));
  emit();
  return next;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Another tab wrote progress: pick it up.
try {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) { cache = null; emit(); }
  });
} catch { /* no window (build-time) */ }

/** React hook: re-renders the caller whenever progress changes. */
export function useProgress() {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function resetAll() {
  cache = { ...clone(EMPTY), savedAt: Date.now() };
  safeSet(KEY, JSON.stringify(cache));
  emit();
}

export function exportJSON() {
  return JSON.stringify({ ...getState(), exportedAt: new Date().toISOString() }, null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  if (!isObj(parsed) || parsed.app !== 'rebuild-bench' || !isObj(parsed.srs)) {
    throw new Error('That file isn’t a Rebuild Bench backup.');
  }
  cache = { ...sanitize(parsed), savedAt: Date.now() };
  safeSet(KEY, JSON.stringify(cache));
  emit();
  return cache;
}

/** True when this browser lets us save at all (private modes and some embeds do not). */
export function storageWorks() {
  const probe = `${PREFIX}probe`;
  try {
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/* ---- small per-device preferences (theme, last-used options) ---- */

function readPrefs() {
  try {
    const p = JSON.parse(safeGet(PREFS_KEY) || '{}');
    return isObj(p) ? p : {};
  } catch {
    return {};
  }
}

export function getPref(name, fallback) {
  const v = readPrefs()[name];
  return v === undefined ? fallback : v;
}

export function setPref(name, value) {
  const p = readPrefs();
  p[name] = value;
  safeSet(PREFS_KEY, JSON.stringify(p));
}

/**
 * 'system' | 'light' | 'dark'. Also applied before first paint by the inline script in index.html.
 * 'system' only clears an attribute this app set, never one a host page set.
 */
let appSetTheme = (() => { const t = readPrefs().theme; return t === 'light' || t === 'dark'; })();
export function applyTheme(theme) {
  try {
    const root = document.documentElement;
    if (theme === 'light' || theme === 'dark') { root.setAttribute('data-theme', theme); appSetTheme = true; }
    else if (appSetTheme) { root.removeAttribute('data-theme'); appSetTheme = false; }
  } catch { /* no document */ }
}
