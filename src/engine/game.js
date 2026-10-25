/**
 * Question builders for the game modes. Pure functions over a normalized unit
 * (see data/index.js), so they are easy to reason about and test.
 */

export function shuffle(arr, rnd = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const randInt = (lo, hi, rnd = Math.random) => lo + Math.floor(rnd() * (hi - lo + 1));

/**
 * Pick `n` distractor steps near `center`, nearest first, from indices that
 * pass `allowed`. The radius grows until there are enough or the unit runs out.
 */
function nearby(steps, center, n, allowed, rnd = Math.random) {
  const picked = [];
  const seen = new Set();
  for (let radius = 6; picked.length < n && radius <= steps.length + 6; radius += 4) {
    const pool = [];
    for (let i = Math.max(0, center - radius); i <= Math.min(steps.length - 1, center + radius); i++) {
      if (!seen.has(i) && allowed(i)) pool.push(i);
    }
    for (const i of shuffle(pool, rnd)) {
      if (picked.length >= n) break;
      seen.add(i);
      picked.push(steps[i]);
    }
  }
  return picked;
}

/**
 * "What's next": the true next step plus 3 distractors from nearby steps.
 * Never offers the shown step itself or the step before it.
 */
export function nextQuestion(unit, index, rnd = Math.random) {
  const { steps } = unit;
  const answer = steps[index + 1];
  const distractors = nearby(steps, index + 1, 3, (i) => i !== index && i !== index - 1 && i !== index + 1, rnd);
  return { step: steps[index], answer, choices: shuffle([answer, ...distractors], rnd) };
}

/** A random step that has a next step, optionally inside one phase. */
export function randomQuestionIndex(unit, phaseId, avoid = -1, rnd = Math.random) {
  const last = unit.steps.length - 2;
  const candidates = unit.steps
    .filter((s) => s.index <= last && (!phaseId || s.phase === phaseId))
    .map((s) => s.index);
  if (!candidates.length) return -1;
  const pool = candidates.length > 1 ? candidates.filter((i) => i !== avoid) : candidates;
  return pool[Math.floor(rnd() * pool.length)];
}

/**
 * Full rebuild run: the user has completed steps[0..pos-1] and picks steps[pos].
 * Distractors come from steps not yet done (the next few after pos). Only at
 * the very end, when too few remain, are earlier finished steps borrowed.
 */
export function runChoices(unit, pos, count = 4, rnd = Math.random) {
  const { steps } = unit;
  const answer = steps[pos];
  const remaining = steps.length - pos - 1;
  const want = Math.min(count - 1, steps.length - 2);
  const distractors = nearby(steps, pos + 1, Math.min(want, remaining), (i) => i > pos, rnd);
  // Near the end there are too few steps left, so borrow finished ones (never
  // the step just done) rather than let the last picks become a one-option gimme.
  if (distractors.length < want) {
    distractors.push(...nearby(steps, pos - 1, want - distractors.length, (i) => i < pos - 1, rnd));
  }
  return { answer, choices: shuffle([answer, ...distractors], rnd) };
}

/**
 * Order drill: a window of 5 to 8 consecutive steps, from a random spot or
 * from inside one phase (spilling into the next phase if that phase is short).
 * Returned shuffled, never already in order.
 */
export function orderWindow(unit, phaseId, rnd = Math.random) {
  const { steps } = unit;
  if (steps.length < 2) return { seq: steps, shuffled: steps };
  const size = Math.min(steps.length, randInt(5, 8, rnd));
  let lo = 0;
  let hi = steps.length - size;
  if (phaseId) {
    const inPhase = steps.filter((s) => s.phase === phaseId);
    if (inPhase.length) {
      const first = inPhase[0].index;
      const lastStart = inPhase[inPhase.length - 1].index - size + 1;
      lo = Math.min(first, steps.length - size);
      hi = Math.max(lo, Math.min(lastStart, steps.length - size));
    }
  }
  const start = randInt(lo, hi, rnd);
  const seq = steps.slice(start, start + size);
  let shuffled = shuffle(seq, rnd);
  for (let tries = 0; tries < 10 && shuffled.every((s, i) => s === seq[i]); tries++) shuffled = shuffle(seq, rnd);
  return { seq, shuffled };
}
