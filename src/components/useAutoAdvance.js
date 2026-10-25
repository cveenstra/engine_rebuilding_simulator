import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  beatStart, beatTick, beatProgress, beatDue, beatFire, beatStop, oncePerToken,
} from '../engine/autoAdvance.js';
import { feedbackPrefs } from '../engine/feedback.js';

// What counts as a control of its own: a tap there does that control's job, not "go on".
// Answered choices are aria-disabled, so a tap on one counts as a tap on the page.
const CONTROL = 'a[href], button:not([aria-disabled="true"]):not(:disabled), summary, input, select, textarea, label, [role="button"], dialog';
const ADVANCE_KEYS = new Set(['Enter', ' ', 'ArrowRight']);

const dialogOpen = () => !!document.querySelector('dialog[open]');
const controlAt = (el) => (el instanceof Element ? el.closest(CONTROL) : null);

/**
 * The calm beat after a right answer, then on to the next question by itself.
 *
 * `onAdvance` is exactly what the screen's Next button does. Use the returned
 * `go` for that button (and any key that means Next) so the timer, a tap, a
 * key and the button share one guard and the screen advances once per
 * `token`. `token` must change with each question.
 *
 * While `active` (a right answer is showing) and auto-advance is on in
 * Settings, a beat runs:
 *   - it fills `bar` (a callback ref for the hairline in the action bar) as it goes;
 *   - a tap on the page, or Enter, Space or Right, goes on at once;
 *   - a held finger or mouse button, an open sheet or dialog, a hidden tab,
 *     or the mouse over the explanation (`pauseProps`) pauses it;
 *   - scrolling, or using a control on the page that does not open a sheet
 *     (a "ways to go wrong" toggle, say), means the learner is reading: the
 *     beat stops and waits for Next;
 *   - unmounting or a route change cancels it.
 */
export function useAutoAdvance({ token, active, onAdvance }) {
  const [prefs] = useState(feedbackPrefs);
  const [guard] = useState(oncePerToken);
  // The full location, not just its key: HashRouter gives state-less entries the same key "default".
  const where = useLocation();
  const loc = `${where.key}|${where.pathname}|${where.search}`;
  const running = !!active && prefs.auto;

  const onAdvanceRef = useRef(onAdvance);
  const tokenRef = useRef(token);
  useEffect(() => { onAdvanceRef.current = onAdvance; });
  useEffect(() => { tokenRef.current = token; guard.reset(); }, [token, guard]);

  const go = useCallback(() => {
    if (!guard.take(tokenRef.current)) return;
    onAdvanceRef.current?.();
    // The learner may have scrolled down to read: start the next question at the top.
    // Same task as the state update, so the jump lands in the same paint as the new question.
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [guard]);

  const barRef = useRef(null);
  const bar = useCallback((el) => { barRef.current = el; }, []);
  const hover = useRef(false);
  const hold = useRef(false);
  const armed = useRef(null); // { token, loc } of the beat in progress

  useEffect(() => {
    if (!running) { armed.current = null; return undefined; }
    if (!armed.current || armed.current.token !== token) armed.current = { token, loc };
    // The route changed during the beat (a link, Back): stay put, Next still works.
    if (armed.current.loc !== loc) return undefined;

    let b = beatStart(prefs.pause);
    let raf = 0;
    const t0 = performance.now();
    let last = t0;
    // React can run this effect while the tap that answered is still bubbling: ignore that tap.
    const stale = (e) => e.timeStamp > 0 && e.timeStamp <= t0;
    hover.current = false;
    hold.current = false;

    const paint = (paused) => {
      const el = barRef.current;
      if (!el) return;
      el.style.transform = `scaleX(${beatProgress(b)})`;
      el.dataset.state = b.stopped ? 'stopped' : paused ? 'paused' : 'running';
    };
    const fire = () => {
      if (b.fired) return;
      b = beatFire(b);
      cancelAnimationFrame(raf);
      go();
    };
    const stop = () => {
      if (b.fired || b.stopped) return;
      b = beatStop(b);
      cancelAnimationFrame(raf);
      paint(false);
    };
    const frame = (now) => {
      const dt = now - last;
      last = now;
      const paused = hover.current || hold.current || dialogOpen() || document.hidden;
      b = beatTick(b, dt, paused);
      paint(paused);
      if (beatDue(b)) { fire(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onClick = (e) => {
      if (stale(e) || b.fired || b.stopped || e.defaultPrevented || e.button !== 0 || dialogOpen()) return;
      // Inside a sheet, including the tap that just closed it (or a node it removed): not ours.
      if (!(e.target instanceof Element) || !e.target.isConnected || e.target.closest('dialog')) return;
      const control = controlAt(e.target);
      if (!control) { fire(); return; }
      if (control.closest('[data-action-bar]')) return; // Next and Stop do their own thing
      // A control on the page. If it opened a sheet, the sheet pauses the beat
      // until it closes; anything else means the learner is reading: stay.
      requestAnimationFrame(() => requestAnimationFrame(() => { if (!dialogOpen()) stop(); }));
    };
    const onKey = (e) => {
      if (stale(e) || b.fired || e.repeat || e.metaKey || e.ctrlKey || e.altKey || !ADVANCE_KEYS.has(e.key) || dialogOpen()) return;
      // A focused control handles its own Enter and Space; Right is ours unless typing.
      const control = controlAt(e.target);
      if (control && (e.key !== 'ArrowRight' || /^(INPUT|SELECT|TEXTAREA)$/.test(control.tagName))) return;
      e.preventDefault();
      fire();
    };
    const onDown = (e) => { if (!stale(e)) hold.current = true; };
    const onUp = () => { hold.current = false; };
    // A finger that drags more than a nudge is scrolling to read: stay.
    let touchY = null;
    const onTouchStart = (e) => { touchY = e.touches[0]?.clientY ?? null; };
    const onTouchMove = (e) => {
      const y = e.touches[0]?.clientY;
      if (touchY != null && y != null && Math.abs(y - touchY) > 12) stop();
    };

    document.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onUp, true);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('wheel', stop, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('wheel', stop);
    };
  }, [running, token, loc, prefs.pause, go]);

  // Spread on the explanation: the mouse moved onto it holds the beat. A real
  // move only: the explanation appearing under a still cursor does not count.
  const pauseProps = {
    onPointerMove: (e) => { if (e.pointerType === 'mouse' && (e.movementX || e.movementY)) hover.current = true; },
    onPointerLeave: (e) => { if (e.pointerType === 'mouse') hover.current = false; },
  };

  return { go, running, bar, pauseProps };
}
