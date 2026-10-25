/**
 * The Terms ladder. Pure: no imports and no clock or storage access of its
 * own, so scripts/test-terms.mjs runs it in node. Ported from the MD/PhD
 * concept trainer (vocab-engine.js and card-deps.js).
 *
 * THE LADDER. A term's rung is correct answers minus wrong ones, never below
 * zero, so every answer moves it one rung either way. The gap before it comes
 * back stretches with the rung: minutes while it is being acquired, then
 * days.
 *
 *   rung 0   1 min    learning   "Which word is this?"      meaning -> pick the term
 *   rung 1   10 min   learning
 *   rung 2   1 day    learned    "Spot it in a step"        a real step sentence, term blanked
 *   rung 3   3 days   learned
 *   rung 4   7 days   learned    "What does it mean?"       term -> pick the meaning
 *   rung 5   14 days  learned
 *   rung 6   21 days  mature     "What must you know first?" alternating with the step sentence
 *   rung 7+  30, 45, 60, 90 days
 *
 * ORDER. A term is never introduced before every term it `requires` is
 * learned (rung 2). Among the terms that are ready, the shallowest level goes
 * first, then the one used most often in the rebuild steps.
 */

export const LEARNED_AT = 2;
export const MATURE_AT = 6;
export const STEP_MINUTES = [1, 10];
export const GAP_DAYS = [1, 3, 7, 14, 21, 30, 45, 60, 90];
/** In a session with both reviews and new terms waiting, every Nth pick is new. */
export const NEW_EVERY = 4;

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

/** Correct answers minus wrong ones, never below zero. */
export function level(record) {
  if (!record) return 0;
  return Math.max(0, (record.correct || 0) - (record.wrong || 0));
}

export const isLearned = (record) => level(record) >= LEARNED_AT;

/** 'new' (never answered), 'learning' (rung 0 to 1), 'learned' (2 to 5) or 'mature' (6 and up). */
export function band(record) {
  if (!record || !record.seen) return 'new';
  const l = level(record);
  if (l < LEARNED_AT) return 'learning';
  return l >= MATURE_AT ? 'mature' : 'learned';
}

/**
 * Which question a term is due for: 1 which word, 2 spot it in a step,
 * 3 what does it mean, 4 what must you know first. Mature terms alternate
 * between 4 and 2 by answer count so the same question does not repeat.
 */
export function questionTier(record) {
  const l = level(record);
  if (l < 2) return 1;
  if (l < 4) return 2;
  if (l < MATURE_AT) return 3;
  return (record?.seen || 0) % 2 ? 2 : 4;
}

/** Milliseconds until a term at this rung comes back. */
export function gapMs(l) {
  if (l < STEP_MINUTES.length) return STEP_MINUTES[l] * MIN;
  return GAP_DAYS[Math.min(l - STEP_MINUTES.length, GAP_DAYS.length - 1)] * DAY;
}

/** When a term is next due; 0 for a record with no timestamps (simply due). */
export function dueAt(record) {
  if (!record || !record.seen) return 0;
  return (record.lastAt || record.learnedAt || 0) + gapMs(level(record));
}

/** Due now. A never-answered term is new, not due. */
export function isDue(record, now) {
  if (!record || !record.seen) return false;
  return dueAt(record) <= now;
}

/** "1 min", "10 min", "5 h", "1 day", "3 days". */
export function formatGap(ms) {
  if (ms < 45 * MIN) return `${Math.max(1, Math.round(ms / MIN))} min`;
  if (ms < 20 * 60 * MIN) return `${Math.round(ms / (60 * MIN))} h`;
  const d = Math.round(ms / DAY);
  return `${d} day${d === 1 ? '' : 's'}`;
}

const RATING = { again: -1, hard: 0, good: 1, easy: 2 };

/**
 * One answer. `rating` is true or false from a multiple choice question, or a
 * flip card self-grade: 'again' (one rung down), 'hard' (stays, clock resets),
 * 'good' (one up) or 'easy' (two up). Returns the new record and what changed.
 */
export function recordAnswer(prev, rating, now) {
  const r = { seen: 0, correct: 0, wrong: 0, firstAt: null, lastAt: null, learnedAt: null, ...(prev || {}) };
  const was = isLearned(r);
  const step = typeof rating === 'string' ? (RATING[rating] ?? 1) : rating ? 1 : -1;
  r.seen += 1;
  if (step < 0) r.wrong += 1;
  else r.correct += step;
  if (!r.firstAt) r.firstAt = now;
  r.lastAt = now;
  const known = isLearned(r);
  if (known && !r.learnedAt) r.learnedAt = now;
  return { record: r, justLearned: known && !was, lost: was && !known, level: level(r) };
}

/** Ids of every learned term. */
export function knownSet(records) {
  const out = new Set();
  for (const [id, r] of Object.entries(records || {})) if (isLearned(r)) out.add(id);
  return out;
}

/** Every prerequisite of a term is learned. */
export const isUnlocked = (term, known) => (term.requires || []).every((id) => known.has(id));

/**
 * The teaching order: shallowest level first, then the most used, then A to
 * Z. Levels come from the longest prerequisite chain, so this is always a
 * valid topological order.
 */
export function teachingOrder(terms, freqOf = () => 0) {
  return [...terms].sort((a, b) => (a.level || 0) - (b.level || 0) || freqOf(b.id) - freqOf(a.id) || a.term.localeCompare(b.term));
}

/** Terms never answered whose prerequisites are all learned, in the given order. */
export function frontier(ordered, records) {
  const known = knownSet(records);
  return ordered.filter((t) => !records?.[t.id]?.seen && isUnlocked(t, known));
}

/** Terms that list this one in `requires`. */
export const unlocks = (terms, id) => terms.filter((t) => (t.requires || []).includes(id));

/** Terms that became available (all prerequisites learned) between two known sets. */
export function newlyUnlocked(terms, before, after) {
  return terms.filter((t) => (t.requires || []).length && !isUnlocked(t, before) && isUnlocked(t, after));
}

/** Every term this one rests on, directly or indirectly. */
export function ancestors(id, byId, seen = new Set()) {
  for (const d of byId[id]?.requires || []) {
    if (seen.has(d)) continue;
    seen.add(d);
    ancestors(d, byId, seen);
  }
  return seen;
}

/** New terms first answered on or after `since`. */
export function introducedSince(records, since) {
  let n = 0;
  for (const r of Object.values(records || {})) if (r?.firstAt >= since) n++;
  return n;
}

/**
 * What to ask next, or null when nothing is waiting.
 *
 *   1. learning terms that are due (the minute steps), oldest first
 *   2. learned terms that are due, with a new term every NEW_EVERY picks
 *   3. new terms from the frontier, while today's allowance lasts
 *   4. learning terms not yet due, soonest first, so a session does not stop
 *      while a missed term is still on its minute step
 *
 * `terms` is the scope in teaching order; `records` covers every term so a
 * prerequisite learned under another filter still counts. Never repeats
 * `lastId` when anything else is available.
 */
export function pickNext({ terms, records, now, newLeft = Infinity, answered = 0, lastId = null }) {
  const learning = [];
  const review = [];
  const stepping = [];
  for (const t of terms) {
    const r = records[t.id];
    if (!r || !r.seen) continue;
    const due = isDue(r, now);
    if (level(r) < LEARNED_AT) (due ? learning : stepping).push(t);
    else if (due) review.push(t);
  }
  const byDue = (a, b) => dueAt(records[a.id]) - dueAt(records[b.id]);
  learning.sort(byDue);
  review.sort(byDue);
  stepping.sort(byDue);
  const fresh = newLeft > 0 ? frontier(terms, records) : [];

  const tag = (list, reason) => list.map((t) => ({ termId: t.id, reason }));
  let middle;
  if (review.length && fresh.length && answered % NEW_EVERY === NEW_EVERY - 1) {
    middle = [...tag(fresh.slice(0, 1), 'new'), ...tag(review, 'review'), ...tag(fresh.slice(1), 'new')];
  } else {
    middle = [...tag(review, 'review'), ...tag(fresh, 'new')];
  }
  const order = [...tag(learning, 'learning'), ...middle, ...tag(stepping, 'early')];
  return order.find((x) => x.termId !== lastId) || order[0] || null;
}

// ---- questions

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nameList = (t) => [t.term, ...(t.aliases || [])].filter(Boolean);

/** Whole-word, case-insensitive test for any of several names in a text. */
export function mentions(text, names) {
  const s = String(text || '');
  return names.some((n) => {
    n = String(n || '');
    if (n.length < 2) return false;
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(n)}(?=[^\\p{L}\\p{N}]|$)`, 'iu').test(s);
  });
}

/**
 * Blank every whole-word mention of any name, longest name first so an alias
 * that is a prefix of the term does not leave the tail of the real name.
 * Returns { text, hits }.
 */
export function blankOut(text, names, blank = '_____') {
  let out = String(text || '');
  let hits = 0;
  [...names].sort((a, b) => String(b).length - String(a).length).forEach((n) => {
    n = String(n || '');
    if (n.length < 2) return;
    const re = new RegExp(`(^|[^\\p{L}\\p{N}_])${escapeRe(n)}(?=[^\\p{L}\\p{N}]|$)`, 'giu');
    out = out.replace(re, (m, lead) => { hits += 1; return lead + blank; });
  });
  return { text: out, hits };
}

/** Split prose into sentences: end punctuation, space, then a capital or digit. No lookbehind. */
export function sentences(text) {
  return String(text || '')
    .replace(/([.!?])\s+(?=[A-Z0-9("‘“])/g, '$1\n')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function shuffle(arr, rnd = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Near neighbours to offer as wrong answers: the same concept group first,
 * then the same category, then the closest level, then the definition
 * closest in length, so neither topic nor length gives the answer away.
 * The best few, shuffled.
 */
export function nearTerms(term, pool, n = 8, rnd = Math.random) {
  const len = (term.short || '').length;
  const key = (t) => [
    t.group && t.group === term.group ? 0 : 1,
    t.category === term.category ? 0 : 1,
    Math.abs((t.level || 0) - (term.level || 0)),
    Math.abs((t.short || '').length - len),
  ];
  const others = pool.filter((t) => t.id !== term.id && t.short && t.term.toLowerCase() !== term.term.toLowerCase());
  others.sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
    return 0;
  });
  return shuffle(others.slice(0, n), rnd);
}

const distinctBy = (list, f) => {
  const seen = new Set();
  return list.filter((x) => { const k = f(x).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
};

/** A definition with its own term's names blanked, so it never names its answer. */
export const maskedShort = (t) => blankOut(t.short, nameList(t)).text;

/**
 * One question for a term at a tier, or null when the dictionary cannot
 * support a fair one. Falls back to an easier tier when a harder one is not
 * possible (no step sentence, no prerequisite). Every option is a real term
 * or a real definition; every sentence is real step text.
 *
 * ctx: { pool: terms to draw wrong answers from, byId, contexts: sentences
 * using the term, best first, variant: which sentence, rnd }
 *
 * Returns { kind, tier, termId, prompt, stem, sentence?, options: [{ id, text, correct }] }.
 */
export function buildQuestion(term, tier, ctx) {
  const { pool, byId, contexts = [], variant = 0, rnd = Math.random } = ctx;
  const near = nearTerms(term, pool, 9, rnd);
  if (near.length < 3) return null;
  const names = nameList(term);
  const finish = (q, right, wrong, text) => {
    const opts = distinctBy([{ ...right, correct: true }, ...wrong.map((w) => ({ ...w, correct: false }))], (o) => o.text);
    if (opts.length < 4) return null;
    return { ...q, termId: term.id, options: shuffle(opts.slice(0, 4), rnd), answerText: text };
  };

  if (tier === 4) {
    const reqs = (term.requires || []).filter((d) => byId[d]);
    if (!reqs.length) return buildQuestion(term, 2, ctx);
    const answer = byId[reqs[Math.abs(variant) % reqs.length]];
    const required = ancestors(term.id, byId);
    const wrong = near.filter((t) => !required.has(t.id) && t.id !== term.id && !ancestors(t.id, byId).has(term.id));
    if (wrong.length < 3) return buildQuestion(term, 2, ctx);
    return finish(
      { kind: 'dependency', tier: 4, prompt: `Which must you understand before "${term.term}"?`, stem: term.term },
      { id: answer.id, text: answer.term },
      wrong.map((t) => ({ id: t.id, text: t.term })),
      answer.term,
    ) || buildQuestion(term, 2, ctx);
  }

  if (tier === 2) {
    const usable = contexts.filter((s) => mentions(s, names));
    if (!usable.length) return buildQuestion(term, 3, ctx);
    const sentence = usable[Math.abs(variant) % usable.length];
    const blanked = blankOut(sentence, names);
    if (!blanked.hits) return buildQuestion(term, 3, ctx);
    // A wrong answer named in the sentence is ruled out by reading it, and one
    // whose name contains or sits inside the answer is unfair rather than hard.
    const mine = names.map((n) => n.toLowerCase());
    const fair = near.filter((t) => {
      const theirs = nameList(t);
      if (mentions(sentence, theirs)) return false;
      return theirs.every((n) => {
        const l = n.toLowerCase();
        return mine.every((m) => !l.includes(m) && !m.includes(l));
      });
    });
    if (fair.length < 3) return buildQuestion(term, 3, ctx);
    return finish(
      { kind: 'context', tier: 2, prompt: 'Spot it in a step: which term fills the blank?', stem: blanked.text, sentence },
      { id: term.id, text: term.term },
      fair.map((t) => ({ id: t.id, text: t.term })),
      term.term,
    ) || buildQuestion(term, 3, ctx);
  }

  if (tier === 3) {
    return finish(
      { kind: 'definition', tier: 3, prompt: 'What does it mean?', stem: term.term },
      { id: term.id, text: maskedShort(term) },
      near.map((t) => ({ id: t.id, text: maskedShort(t) })),
      term.short,
    );
  }

  return finish(
    { kind: 'recognition', tier: 1, prompt: 'Which word is this?', stem: maskedShort(term) },
    { id: term.id, text: term.term },
    near.map((t) => ({ id: t.id, text: t.term })),
    term.term,
  );
}

// ---- steps wait for their terms (card-deps)

/**
 * The terms a set of texts uses, through a segmenter (see termMatch.js:
 * one pass, longest match first, whole words). Terms in `skip` (entries
 * flagged plainWord, spelled like everyday English) are not evidence.
 */
export function termsUsed(texts, segment, skip = new Set()) {
  const out = [];
  for (const t of texts) {
    for (const s of segment(t || '')) if (s.termId && !skip.has(s.termId) && !out.includes(s.termId)) out.push(s.termId);
  }
  return out;
}

/**
 * Split items into open (every term learned, or none used) and held, and
 * count how many held items wait on each term so the app can say what to
 * learn. { open, held, terms: Map(termId -> held count) }.
 */
export function splitByTerms(items, termsOf, known) {
  const open = [];
  const held = [];
  const terms = new Map();
  for (const it of items) {
    const unmet = termsOf(it).filter((id) => !known.has(id));
    if (!unmet.length) { open.push(it); continue; }
    held.push(it);
    for (const id of unmet) terms.set(id, (terms.get(id) || 0) + 1);
  }
  return { open, held, terms };
}
