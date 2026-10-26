/**
 * Mistake drill questions. Pure: no imports beyond the shuffle in ladder.js
 * and no clock or storage access, so scripts/test-terms.mjs runs it in node.
 *
 * A mistake is { id, stepId, title, what, consequence, prevent, severity }.
 * `pool` is every drillable mistake in the same unit; `orderOf(stepId)` gives
 * a step's position in the rebuild.
 *
 * Three kinds of question:
 *   consequence  "What happens if you make this mistake?"  the step and the mistake, pick its consequence
 *   prevent      "How do you prevent this mistake?"        the mistake, pick how to prevent it
 *   step         "Which mistake is a real risk at this step?" the step, pick its mistake
 *
 * Wrong answers are real text from other mistakes in the unit, chosen closest
 * in length to the right one so length never gives the answer away. A step
 * question never offers a mistake from a step close to the one asked about,
 * since neighbouring steps often share their risks.
 */
import { shuffle } from './ladder.js';

export const KINDS = ['consequence', 'prevent', 'step'];
export const KIND_PROMPT = {
  consequence: 'What happens if you make this mistake?',
  prevent: 'How do you prevent this mistake?',
  step: 'Which mistake is a real risk at this step?',
};
/** Steps this close to the asked step never supply a wrong answer to a step question. */
export const STEP_GAP = 3;
const OPTIONS = 4;

const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Up to `n` wrong answers: distinct texts, none equal to the answer, closest
 * in length to it, from a slightly wider shortlist (only as wide as stays
 * close in length) so the same three do not always appear.
 */
export function nearestByLength(answer, candidates, n = OPTIONS - 1, rnd = Math.random) {
  const len = answer.length;
  const seen = new Set([norm(answer)]);
  const list = [];
  for (const c of candidates) {
    const k = norm(c.text);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    list.push(c);
  }
  const gap = (c) => Math.abs(c.text.length - len);
  list.sort((a, b) => gap(a) - gap(b));
  // A couple of extras for variety, but only ones about as close as the nth.
  const limit = list.length >= n ? gap(list[n - 1]) * 1.25 + 8 : Infinity;
  const short = list.filter((c, i) => i < n || gap(c) <= limit).slice(0, n + 2);
  return shuffle(short, rnd).slice(0, n);
}

/** The mistakes that can be drilled: structured, with a what, a consequence and a prevent. */
export const isDrillable = (m) => !!(m && !m.legacy && m.what && m.consequence && m.prevent);

function options(right, wrong, rnd) {
  return shuffle([{ ...right, correct: true }, ...wrong.map((w) => ({ ...w, correct: false }))], rnd);
}

/** One question of a given kind, or null when the unit cannot support a fair one. */
export function buildOne(m, kind, pool, { orderOf = () => 0, rnd = Math.random } = {}) {
  const others = pool.filter((o) => o.id !== m.id && o.stepId !== m.stepId);
  if (kind === 'consequence' || kind === 'prevent') {
    const answer = m[kind];
    const wrong = nearestByLength(answer, others.map((o) => ({ id: o.id, text: o[kind] })), OPTIONS - 1, rnd);
    if (wrong.length < OPTIONS - 1) return null;
    return {
      kind, prompt: KIND_PROMPT[kind], mistakeId: m.id, stepId: m.stepId, what: m.what,
      options: options({ id: m.id, text: answer }, wrong, rnd), answerText: answer,
    };
  }
  if (kind === 'step') {
    if (!m.title) return null;
    const here = orderOf(m.stepId);
    const ownTitles = new Set(pool.filter((o) => o.stepId === m.stepId).map((o) => norm(o.title)));
    const far = others.filter((o) => o.title && !ownTitles.has(norm(o.title)) && Math.abs(orderOf(o.stepId) - here) > STEP_GAP);
    const wrong = nearestByLength(m.title, far.map((o) => ({ id: o.id, text: o.title })), OPTIONS - 1, rnd);
    if (wrong.length < OPTIONS - 1) return null;
    return {
      kind, prompt: KIND_PROMPT.step, mistakeId: m.id, stepId: m.stepId,
      options: options({ id: m.id, text: m.title }, wrong, rnd), answerText: m.title,
    };
  }
  return null;
}

/** A question of a random kind that works for this mistake, or null when none does. */
export function buildMistakeQuestion(m, pool, ctx = {}) {
  const rnd = ctx.rnd || Math.random;
  for (const kind of shuffle(ctx.kinds || KINDS, rnd)) {
    const q = buildOne(m, kind, pool, { ...ctx, rnd });
    if (q) return q;
  }
  return null;
}
