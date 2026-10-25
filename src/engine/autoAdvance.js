/**
 * The beat after a right answer: a short countdown that moves on by itself.
 * Pure functions, no timers and no DOM, so the timing and cancel rules are
 * testable in node. The hook in components/useAutoAdvance.js drives it from
 * requestAnimationFrame.
 *
 * A beat only counts time it is actually shown and not paused, so a hidden
 * tab, an open definition sheet or a finger held on the explanation never
 * eats into it.
 */

/** Pause length choices for Settings: [pref value, milliseconds, label]. */
export const PAUSES = [
  ['quick', 700, 'Quick'],
  ['calm', 1100, 'Calm'],
  ['slow', 1800, 'Slow'],
];
export const DEFAULT_PAUSE = 'calm';

/** Milliseconds for a pause pref, falling back to Calm for anything unknown. */
export function pauseMs(name) {
  const hit = PAUSES.find(([v]) => v === name) || PAUSES.find(([v]) => v === DEFAULT_PAUSE);
  return hit[1];
}

/**
 * The longest single step a frame may add. A frame after a hidden tab or a
 * long main-thread stall reports a huge delta; counting it would end the beat
 * the moment the learner comes back.
 */
export const MAX_FRAME_MS = 50;

/** A fresh beat. `stopped` means the learner took over: it never fires on its own. */
export function beatStart(duration) {
  return { duration: Math.max(0, duration), elapsed: 0, fired: false, stopped: false };
}

/** Advance a beat by one frame of `dt` ms. Paused, stopped or fired beats do not move. */
export function beatTick(b, dt, paused = false) {
  if (b.fired || b.stopped || paused) return b;
  const step = Math.min(MAX_FRAME_MS, Math.max(0, Number.isFinite(dt) ? dt : 0));
  return { ...b, elapsed: Math.min(b.duration, b.elapsed + step) };
}

/** 0 to 1, for the hairline. */
export function beatProgress(b) {
  if (b.duration <= 0) return 1;
  return Math.min(1, b.elapsed / b.duration);
}

/** True once: when the time is up and it has not fired, been skipped or stopped. */
export function beatDue(b) {
  return !b.fired && !b.stopped && b.elapsed >= b.duration;
}

/** Mark the beat used, whether by the timer, a tap or the Next button. */
export function beatFire(b) {
  return b.fired ? b : { ...b, fired: true };
}

/** The learner engaged with the explanation: stay on this question until Next. */
export function beatStop(b) {
  return b.fired || b.stopped ? b : { ...b, stopped: true };
}

/**
 * A guard that lets an action run once per token. Auto-advance, a tap, a key
 * and the Next button all go through one of these, so two of them landing in
 * the same frame still advance once. A new token (the next question) re-arms it.
 */
export function oncePerToken() {
  let firedFor;
  let armed = false;
  return {
    /** Returns true if the caller may run the action for this token now. */
    take(token) {
      if (armed && Object.is(firedFor, token)) return false;
      armed = true;
      firedFor = token;
      return true;
    },
    /** Forget the last token, so the same value can fire again. */
    reset() { armed = false; firedFor = undefined; },
  };
}
