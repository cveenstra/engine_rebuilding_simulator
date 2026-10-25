import { getPref } from './storage.js';
import { pauseMs, DEFAULT_PAUSE } from './autoAdvance.js';

/**
 * Answer feedback: a quiet synthesized tone and a tiny buzz. No audio files:
 * every sound is a couple of Web Audio oscillators through a low-pass, so it
 * is soft, warm and costs nothing to load.
 *
 * Everything here fails silent. No Web Audio, a suspended context, a blocked
 * vibrate: the app carries on without the sound or the buzz.
 */

/** The four feedback settings, with their defaults. Read fresh each time a game screen mounts. */
export function feedbackPrefs() {
  return {
    auto: getPref('autoAdvance', true) !== false,
    pause: pauseMs(getPref('advancePause', DEFAULT_PAUSE)),
    pauseName: getPref('advancePause', DEFAULT_PAUSE),
    sound: getPref('sounds', true) !== false,
    haptics: getPref('haptics', true) !== false,
  };
}

/* ---- sound ---- */

let ctx = null;
let failed = false;

/**
 * The shared AudioContext, created on first use. Only ever called from a tap
 * or key handler, so browsers that need a user gesture let it start.
 */
function audio() {
  if (failed) return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { failed = true; return null; }
      ctx = new AC();
    } catch {
      failed = true;
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume?.().catch(() => {});
  return ctx;
}

/**
 * One rounded note: a sine with a fast attack and an exponential decay,
 * optionally gliding from `from` to `freq` (a soft "tock" rather than a beep).
 */
function note(ac, out, { freq, from = freq, at = 0, peak, attack = 0.006, decay, glide = 0.03, type = 'sine' }) {
  const t = ac.currentTime + 0.01 + at;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(freq, t + glide);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(peak, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + attack + decay + 0.05);
  osc.onended = () => { try { osc.disconnect(); env.disconnect(); } catch { /* already gone */ } };
}

/** A gentle low-pass bus at a low master level, torn down once the sound is over. */
function bus(ac, cutoff, level, lifeMs) {
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = cutoff;
  lp.Q.value = 0.5;
  const master = ac.createGain();
  master.gain.value = level;
  lp.connect(master).connect(ac.destination);
  setTimeout(() => { try { lp.disconnect(); master.disconnect(); } catch { /* already gone */ } }, lifeMs);
  return lp;
}

/*
 * A streak walks up the major pentatonic (D5 E5 F#5 A5 B5), so a run of right
 * answers rises gently instead of repeating one ding. At the top it rocks
 * between the two highest notes. A miss, or a long gap, starts it over.
 */
const SCALE = [587.33, 659.25, 739.99, 880.0, 987.77];
const STREAK_GAP_MS = 90 * 1000;
let streak = 0;
let lastRightAt = 0;

/** Which scale note the next right answer gets. Exported for tests. */
export function streakNote(n) {
  if (n < SCALE.length) return SCALE[n];
  return SCALE[SCALE.length - 2 + ((n - SCALE.length) % 2)];
}

function chime() {
  const ac = audio();
  if (!ac) return;
  try {
    const f = streakNote(streak);
    const out = bus(ac, 2400, 0.5, 900);
    // The body: a sine that settles onto the note from a touch above, like a soft mallet.
    note(ac, out, { freq: f, from: f * 1.015, peak: 0.13, decay: 0.26 });
    // A faint octave for the wooden "tock" on the front edge.
    note(ac, out, { freq: f * 2, peak: 0.025, attack: 0.003, decay: 0.07, glide: 0.01 });
    // The answer note: a perfect fifth up, quieter, a beat later, ringing a little longer.
    note(ac, out, { freq: f * 1.5, at: 0.075, peak: 0.07, decay: 0.32 });
  } catch { /* a context in a bad state: no sound this time */ }
}

function thud() {
  const ac = audio();
  if (!ac) return;
  try {
    // Low, short and dark: a muted knock that drifts down a tone. Never a buzzer.
    const out = bus(ac, 700, 0.5, 900);
    note(ac, out, { freq: 196, from: 220, peak: 0.09, attack: 0.012, decay: 0.3, glide: 0.18 });
  } catch { /* no sound */ }
}

/* ---- the two calls the game screens make ---- */

/** A right answer: the next note of the streak and a 10 ms tap of the motor. */
export function cheer() {
  const p = feedbackPrefs();
  const now = Date.now();
  if (now - lastRightAt > STREAK_GAP_MS) streak = 0;
  lastRightAt = now;
  if (p.sound) chime();
  if (p.haptics) {
    try { navigator.vibrate?.(10); } catch { /* not allowed here */ }
  }
  streak += 1;
}

/** A wrong answer: a soft low tone, and the streak starts over. No buzz. */
export function miss() {
  streak = 0;
  if (feedbackPrefs().sound) thud();
}

/** Play a sample from Settings so the learner can hear the level. */
export function previewSound(kind = 'right') {
  if (kind === 'right') chime(); else thud();
}
