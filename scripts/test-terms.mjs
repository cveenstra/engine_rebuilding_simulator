#!/usr/bin/env node
// Tests for the Terms ladder, prerequisite gating, the term matcher and the
// step dependencies derived from it. Ported from MD/PhD's test.js (vocab
// engine and card-deps sections). No framework: node scripts/test-terms.mjs.
// Exits 1 on any failure. Content checks on src/data/glossary.json print
// warnings only, so a content edit in progress never fails the run.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as L from '../src/engine/ladder.js';
import { createMatcher } from '../src/engine/termMatch.js';
import * as MQ from '../src/engine/mistakeQuiz.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0;
const failures = [];
const ok = (name, cond, extra) => { if (cond) pass++; else failures.push(name + (extra ? `  [${extra}]` : '')); };
const eq = (name, a, b) => ok(name, a === b, `got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

// A seeded random source, so shuffles are repeatable.
function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

// ===========================================================================
// The ladder: every answer moves one rung, either way
// ===========================================================================
eq('an unpractised term is rung 0', L.level({ correct: 0, wrong: 0 }), 0);
eq('a missing record is rung 0', L.level(undefined), 0);
eq('rung is correct minus wrong', L.level({ correct: 5, wrong: 2 }), 3);
eq('rung never goes below zero', L.level({ correct: 1, wrong: 4 }), 0);

eq('never answered is new', L.band(undefined), 'new');
eq('one correct is still learning', L.band({ seen: 1, correct: 1, wrong: 0 }), 'learning');
eq('two clear is learned', L.band({ seen: 2, correct: L.LEARNED_AT, wrong: 0 }), 'learned');
eq('two right and one wrong is NOT learned', L.band({ seen: 3, correct: 2, wrong: 1 }), 'learning');
eq('five clear is still learned, not mature', L.band({ seen: 5, correct: L.MATURE_AT - 1, wrong: 0 }), 'learned');
eq('six clear is mature', L.band({ seen: 6, correct: L.MATURE_AT, wrong: 0 }), 'mature');
eq('a mature term that lapses drops to learned', L.band({ seen: 7, correct: L.MATURE_AT, wrong: 1 }), 'learned');

// ---- the question follows the rung
eq('rungs 0-1 ask which word', L.questionTier({ correct: 1, wrong: 0 }), 1);
eq('rungs 2-3 ask to spot it in a step', L.questionTier({ correct: 3, wrong: 0 }), 2);
eq('rungs 4-5 ask what it means', L.questionTier({ correct: 4, wrong: 0 }), 3);
eq('mature asks what must come first', L.questionTier({ correct: 6, wrong: 0, seen: 6 }), 4);
eq('mature alternates back to the step sentence', L.questionTier({ correct: 7, wrong: 0, seen: 7 }), 2);

// ---- intervals: minutes while learning, then days that stretch
eq('rung 0 comes back in a minute', L.gapMs(0), MIN);
eq('rung 1 comes back in ten', L.gapMs(1), 10 * MIN);
eq('learned comes back tomorrow', L.gapMs(2), DAY);
eq('rung 3 is three days', L.gapMs(3), 3 * DAY);
eq('rung 4 is a week', L.gapMs(4), 7 * DAY);
eq('rung 5 is two weeks', L.gapMs(5), 14 * DAY);
ok('the gap never shrinks as the rung climbs', Array.from({ length: 13 }, (_, i) => i).every((l) => l === 0 || L.gapMs(l - 1) <= L.gapMs(l)));
ok('mature means the gap has reached 21 days', L.gapMs(L.MATURE_AT) >= 21 * DAY && L.gapMs(L.MATURE_AT - 1) < 21 * DAY);
eq('the gap caps rather than growing forever', L.gapMs(50), L.gapMs(20));
eq('the cap is 90 days', L.gapMs(50), 90 * DAY);

{
  const now = 1_000_000_000_000;
  ok('a never-seen term is not due (it is new, not overdue)', !L.isDue({ seen: 0, correct: 0, wrong: 0 }, now));
  const justRight = { seen: 1, correct: 1, wrong: 0, lastAt: now };
  ok('a term answered a moment ago is not due yet', !L.isDue(justRight, now + 1000));
  ok('...and is due once its step has passed', L.isDue(justRight, now + L.gapMs(1) + 1));
  ok('a record with no timestamps is simply due', L.isDue({ seen: 2, correct: 2, wrong: 0 }, now));
  eq('a wrong answer pulls the next due in', L.dueAt({ seen: 4, correct: 3, wrong: 1, lastAt: now }), now + L.gapMs(2));
}

eq('a minute-scale gap reads in minutes', L.formatGap(L.gapMs(1)), '10 min');
eq('a day-scale gap reads in days', L.formatGap(L.gapMs(3)), '3 days');
eq('one day is singular', L.formatGap(L.gapMs(2)), '1 day');

// ---- recording answers
{
  const t0 = 5000;
  let r = L.recordAnswer(undefined, true, t0);
  eq('first right answer: rung 1', r.level, 1);
  eq('first answer stamps firstAt', r.record.firstAt, t0);
  ok('one right answer is not learned yet', !r.justLearned);
  r = L.recordAnswer(r.record, true, t0 + MIN);
  ok('the second right answer learns it', r.justLearned && r.level === 2);
  eq('learnedAt is stamped once', r.record.learnedAt, t0 + MIN);
  eq('firstAt does not move', r.record.firstAt, t0);
  const lost = L.recordAnswer(r.record, false, t0 + DAY);
  ok('a wrong answer at rung 2 drops it back to learning', lost.lost && lost.level === 1);
  eq('learnedAt survives a lapse', lost.record.learnedAt, t0 + MIN);
  eq('hard keeps the rung', L.recordAnswer(r.record, 'hard', t0).level, 2);
  eq('easy climbs two rungs', L.recordAnswer(r.record, 'easy', t0).level, 4);
  eq('again drops one rung', L.recordAnswer(r.record, 'again', t0).level, 1);
  eq('good climbs one rung', L.recordAnswer(r.record, 'good', t0).level, 3);
}

// ===========================================================================
// Prerequisites: nothing before what it rests on
// ===========================================================================
const T = (id, requires = [], extra = {}) => ({ id, term: id, aliases: [], requires, level: 0, short: `${id} meaning`, category: 'general', ...extra });
const learned = (...ids) => Object.fromEntries(ids.map((id) => [id, { seen: 2, correct: 2, wrong: 0, lastAt: 1 }]));

{
  const terms = [T('a'), T('b', ['a'], { level: 1 }), T('c', ['a'], { level: 1 }), T('d', ['b', 'c'], { level: 2 })];
  const ids = (list) => list.map((t) => t.id).join('');
  eq('with nothing known, only roots are available', ids(L.frontier(terms, {})), 'a');
  eq('learning a opens both b and c', ids(L.frontier(terms, learned('a'))), 'bc');
  eq('d stays locked until BOTH parents are known', ids(L.frontier(terms, learned('a', 'b'))), 'c');
  eq('and opens once they are', ids(L.frontier(terms, learned('a', 'b', 'c'))), 'd');
  eq('a known term leaves the frontier', L.frontier(terms, learned('a', 'b', 'c', 'd')).length, 0);
  eq('a prerequisite answered once but not learned does not unlock', ids(L.frontier(terms, { a: { seen: 1, correct: 1, wrong: 0 } })), '');
  eq('unlocks lists direct dependents', ids(L.unlocks(terms, 'a')), 'bc');
  eq('a leaf unlocks nothing', L.unlocks(terms, 'd').length, 0);
  eq('newlyUnlocked reports what learning c opened', ids(L.newlyUnlocked(terms, new Set(['a', 'b']), new Set(['a', 'b', 'c']))), 'd');
  const byId = Object.fromEntries(terms.map((t) => [t.id, t]));
  ok('ancestors reaches indirect prerequisites', L.ancestors('d', byId).has('a'));
  eq('a root has no ancestors', L.ancestors('a', byId).size, 0);
}

// ---- teaching order: level first, then how often the steps use it
{
  const terms = [T('deep', ['mid'], { level: 2 }), T('rare'), T('common'), T('mid', ['rare'], { level: 1 })];
  const freq = { common: 50, rare: 2, mid: 99, deep: 99 };
  const ids = L.teachingOrder(terms, (id) => freq[id] || 0).map((t) => t.id);
  eq('roots first, the most used root first, then by level', ids.join(','), 'common,rare,mid,deep');
  const lv = L.teachingOrder(terms, (id) => freq[id] || 0).map((t) => t.level);
  ok('level never decreases along the order', lv.every((v, i) => i === 0 || lv[i - 1] <= v), lv.join(','));
}

// ---- what to ask next
{
  const terms = [T('a'), T('b', ['a'], { level: 1 })];
  const now = 10 * DAY;
  eq('nothing answered: the root comes up as new', L.pickNext({ terms, records: {}, now })?.termId, 'a');
  eq('no allowance left: no new term', L.pickNext({ terms, records: {}, now, newLeft: 0 }), null);
  const learningDue = { a: { seen: 1, correct: 1, wrong: 0, lastAt: now - 11 * MIN } };
  eq('a learning term that is due comes first', L.pickNext({ terms, records: learningDue, now })?.reason, 'learning');
  const stepping = { a: { seen: 1, correct: 0, wrong: 1, lastAt: now - 10 * 1000 } };
  const early = L.pickNext({ terms, records: stepping, now });
  ok('a missed term still on its minute step comes back before the session ends', early?.termId === 'a' && early.reason === 'early');
  const two = [T('a'), T('b'), T('c')];
  const recs = { a: { seen: 2, correct: 2, wrong: 0, lastAt: now - 2 * DAY }, b: { seen: 2, correct: 2, wrong: 0, lastAt: now - 3 * DAY } };
  eq('the oldest review comes first', L.pickNext({ terms: two, records: recs, now })?.termId, 'b');
  eq('every NEW_EVERY-th pick is new when both wait', L.pickNext({ terms: two, records: recs, now, answered: L.NEW_EVERY - 1 })?.termId, 'c');
  ok('never the same term twice in a row when another waits', L.pickNext({ terms: two, records: recs, now, lastId: 'b' })?.termId !== 'b');
}

// ---- the promise: a simulated learner never meets a term before its prerequisites
{
  const graph = [
    T('bolt'), T('torque'), T('thread'), T('gasket'),
    T('torque-to-yield', ['bolt', 'torque'], { level: 1 }),
    T('head-bolt', ['bolt', 'thread'], { level: 1 }),
    T('head-gasket', ['gasket', 'head-bolt'], { level: 2 }),
    T('angle-torque', ['torque-to-yield'], { level: 2 }),
    T('head-sequence', ['head-gasket', 'angle-torque'], { level: 3 }),
  ];
  for (const [label, wrongRate, seed] of [['a perfect learner', 0, 1], ['a learner who misses a third', 0.33, 7]]) {
    const rnd = rng(seed);
    const order = L.teachingOrder(graph);
    const records = {};
    let now = 1_000_000;
    const violations = [];
    for (let i = 0; i < 2000; i++) {
      const pick = L.pickNext({ terms: order, records, now, newLeft: 3 });
      if (!pick) { now += DAY; continue; }
      const term = graph.find((t) => t.id === pick.termId);
      if (!records[term.id]?.seen) {
        const known = L.knownSet(records);
        const missing = term.requires.filter((d) => !known.has(d));
        if (missing.length) violations.push(`${term.id} before ${missing.join('+')}`);
      }
      records[term.id] = L.recordAnswer(records[term.id], rnd() >= wrongRate, now).record;
      now += 30 * 1000;
      if (Object.keys(records).length === graph.length && graph.every((t) => L.level(records[t.id]) >= L.MATURE_AT)) break;
    }
    eq(`${label}: no term introduced before its prerequisites are learned`, violations.length, 0);
    eq(`${label}: every term is eventually introduced`, Object.keys(records).length, graph.length);
  }
}

// ===========================================================================
// Questions
// ===========================================================================
{
  const b = L.blankOut('A gasket seals the joint; gaskets are crushed. Gasketed is fine.', ['Gasket', 'gaskets']);
  eq('every whole-word mention is blanked', b.hits, 2);
  ok('a longer word containing the name is left alone', /Gasketed/.test(b.text));
  eq('a sentence without the name is untouched', L.blankOut('No mention here.', ['bolt']).hits, 0);
  ok('mentions is whole-word and case-insensitive', L.mentions('The BOLT is tight', ['bolt']) && !L.mentions('thunderbolts', ['bolt']));
  eq('sentences split on end punctuation and a capital', L.sentences('One thing. Another (thing). A third! Done?').length, 4);
  eq('a decimal does not end a sentence', L.sentences('Torque to 3.5 N·m now. Yes.').length, 2);
}

{
  const pool = [
    T('bolt', [], { short: 'A threaded fastener with a head, tightened with a wrench.', group: 'Fasteners' }),
    T('stud', [], { short: 'A rod threaded at both ends, with a nut on the free end.', group: 'Fasteners' }),
    T('nut', [], { short: 'A threaded block that runs onto a bolt or stud.', group: 'Fasteners' }),
    T('washer', [], { short: 'A flat ring under a nut or bolt head that spreads the load.', group: 'Fasteners' }),
    T('torque', [], { short: 'Twisting force, the measure of how tight a fastener is.', group: 'Measuring' }),
    T('torque-to-yield', ['bolt', 'torque'], { term: 'torque-to-yield bolt', level: 1, short: 'A bolt tightened past its elastic limit, used once.', group: 'Fasteners' }),
    T('angle-torque', ['torque-to-yield'], { term: 'angle tightening', level: 2, short: 'Turning a fastener a set number of degrees after a base torque.', group: 'Measuring' }),
    T('thread-pitch', [], { term: 'thread pitch', short: 'The distance between neighbouring threads on a fastener.', group: 'Fasteners' }),
  ];
  const byId = Object.fromEntries(pool.map((t) => [t.id, t]));
  const contexts = {
    bolt: ['Remove the bolt and set the bracket aside on the bench.', 'Tighten each bolt in the sequence shown in the manual.'],
    'torque-to-yield': ['Replace every torque-to-yield bolt; they stretch on first use.'],
  };
  const built = [];
  for (const t of pool) {
    for (const tier of [1, 2, 3, 4]) {
      const q = L.buildQuestion(t, tier, { pool, byId, contexts: contexts[t.id] || [], variant: 0, rnd: rng(3) });
      if (q) built.push({ t, tier, q });
    }
  }
  eq('every term yields a question at every tier', built.length, pool.length * 4);
  ok('four distinct options, exactly one correct', built.every(({ q }) => q.options.length === 4
    && q.options.filter((o) => o.correct).length === 1
    && new Set(q.options.map((o) => o.text.toLowerCase())).size === 4));
  const ctx = built.filter(({ q }) => q.kind === 'context');
  ok('step sentences are used where they exist', ctx.length > 0);
  ok('every in-context stem carries a blank', ctx.every(({ q }) => /_____/.test(q.stem)));
  ok('the answer never survives in the stem', ctx.every(({ t, q }) => !L.mentions(q.stem, [t.term, ...t.aliases])));
  ok('the sentence is real step text', ctx.every(({ t, q }) => (contexts[t.id] || []).includes(q.sentence)));
  ok('with no step sentence, tier 2 falls back to the meaning', built.filter(({ t, tier }) => tier === 2 && !contexts[t.id]).every(({ q }) => q.kind === 'definition'));
  const rec = built.filter(({ q }) => q.kind === 'recognition');
  ok('a definition shown as a question never names its own term', rec.every(({ t, q }) => !L.mentions(q.stem, [t.term])));
  const dep = built.filter(({ q }) => q.kind === 'dependency');
  ok('terms with prerequisites get the dependency question', dep.length === 2, String(dep.length));
  ok('the right answer really is a declared prerequisite', dep.every(({ t, q }) => t.requires.includes(q.options.find((o) => o.correct).id)));
  ok('no wrong answer is a hidden (indirect) prerequisite', dep.every(({ t, q }) => q.options.filter((o) => !o.correct).every((o) => !L.ancestors(t.id, byId).has(o.id))));
  ok('nor a term that depends on the one asked about', dep.every(({ t, q }) => q.options.filter((o) => !o.correct).every((o) => !L.ancestors(o.id, byId).has(t.id))));
  ok('a root asked the dependency question falls back', built.filter(({ t, tier }) => tier === 4 && !t.requires.length).every(({ q }) => q.kind !== 'dependency'));
  eq('a term with too few neighbours yields no question', L.buildQuestion(pool[0], 1, { pool: pool.slice(0, 2), byId }), null);
}

// ===========================================================================
// The matcher and the step dependencies derived from it
// ===========================================================================
{
  const terms = [
    { id: 'bearing', term: 'Bearing', aliases: ['bearings'] },
    { id: 'main-bearing', term: 'Main bearing', aliases: ['main bearings'] },
    { id: 'tdc', term: 'Top dead center', aliases: ['TDC'] },
    { id: 'rh', term: 'Right hand', aliases: ['RH'] },
    { id: 'lh', term: 'Left hand', aliases: ['LH'] },
    { id: 'nm', term: 'Newton meter', aliases: ['N·m'] },
    { id: 'o-ring', term: 'O-ring', aliases: ['O-rings'] },
    { id: 'ring', term: 'Ring', aliases: ['rings'] },
    { id: 'head', term: 'Head', aliases: [], plainWord: true },
    { id: 'cylinder-head', term: 'Cylinder head', aliases: ['cylinder heads'] },
  ];
  const m = createMatcher(terms);
  const hits = (text) => m.segment(text).filter((s) => s.termId).map((s) => `${s.termId}=${s.text}`).join(' ');
  eq('longest match wins', hits('Fit the main bearings, then the bearing caps.'), 'main-bearing=main bearings bearing=bearing');
  eq('case-insensitive for ordinary names', hits('BEARINGS and Bearing'), 'bearing=BEARINGS bearing=Bearing');
  eq('capital abbreviations match only in capitals', hits('Set TDC, not tdc.'), 'tdc=TDC');
  eq('slashes separate words', hits('RH/LH banks'), 'rh=RH lh=LH');
  eq('a hyphen joins a word: ring does not match inside O-ring', hits('Replace the O-ring and the piston rings.'), 'o-ring=O-ring ring=rings');
  const dot = String.fromCharCode(0x22c5);
  eq('middle dot units match, any dot style', hits(`Torque to 45 N·m or 45 N${dot}m.`), `nm=N·m nm=N${dot}m`);
  eq('runs of spaces fold to one', hits('the main   bearing'), 'main-bearing=main   bearing');
  eq('no match inside a longer word', hits('Bearingless designs'), '');
  eq('segments rebuild the original text', m.segment('A main bearing, a bearing.').map((s) => s.text).join(''), 'A main bearing, a bearing.');
  ok('segmentation is memoized per string', m.segment('Fit the bearing.') === m.segment('Fit the bearing.'));
  eq('an alias claimed twice is reported', createMatcher([{ id: 'a', term: 'Pump', aliases: [] }, { id: 'b', term: 'pump', aliases: [] }]).collisions.length, 1);

  // Steps wait for their terms.
  const plain = new Set(terms.filter((t) => t.plainWord).map((t) => t.id));
  const steps = [
    { id: 's1', title: 'Remove the cylinder heads', action: 'Loosen the head bolts in order.' },
    { id: 's2', title: 'Rotate to TDC', action: 'Turn the crank until cylinder 1 is at TDC on the RH bank.' },
    { id: 's3', title: 'Drain the oil', action: 'Open the drain plug and let it run.' },
    { id: 's4', title: 'Fit the main bearings', action: 'Oil each main bearing shell.' },
  ];
  const termsOf = (s) => L.termsUsed([s.title, s.action], m.segment, plain);
  eq('a step uses the terms in its text', termsOf(steps[1]).join(','), 'tdc,rh');
  eq('plainWord entries are not evidence', termsOf(steps[0]).join(','), 'cylinder-head');
  eq('a longer term is credited, not the shorter inside it', termsOf(steps[3]).join(','), 'main-bearing');
  const split = L.splitByTerms(steps, termsOf, new Set(['tdc']));
  eq('steps whose terms are all learned (or use none) are open', split.open.map((s) => s.id).join(','), 's3');
  eq('the rest are held', split.held.map((s) => s.id).join(','), 's1,s2,s4');
  eq('held counts say what to learn', [...split.terms.entries()].map(([k, v]) => `${k}:${v}`).join(','), 'cylinder-head:1,rh:1,main-bearing:1');
  eq('learning the terms opens them', L.splitByTerms(steps, termsOf, new Set(['tdc', 'rh', 'cylinder-head', 'main-bearing'])).held.length, 0);
}

// ===========================================================================
// Content (warnings only)
// ===========================================================================
const warnings = [];
const GLOSSARY = join(ROOT, 'src', 'data', 'glossary.json');
if (existsSync(GLOSSARY)) {
  try {
    const list = JSON.parse(readFileSync(GLOSSARY, 'utf8'));
    const byId = Object.fromEntries(list.map((t) => [t.id, t]));
    const m = createMatcher(list.map((t) => ({ id: t.id, term: t.term, aliases: t.aliases || [] })));
    for (const c of m.collisions) warnings.push(`alias "${c.form}" is claimed by ${c.ids.join(' and ')}`);
    for (const t of list) for (const d of t.requires || []) if (!byId[d]) warnings.push(`${t.id} requires unknown term ${d}`);
    const state = {};
    const cyc = (id, path) => {
      if (state[id] === 2) return null;
      if (state[id] === 1) return [...path, id];
      state[id] = 1;
      for (const d of byId[id]?.requires || []) { const c = cyc(d, [...path, id]); if (c) return c; }
      state[id] = 2;
      return null;
    };
    for (const t of list) { const c = cyc(t.id, []); if (c) { warnings.push(`requires cycle: ${c.join(' -> ')}`); break; } }
    console.log(`  glossary: ${list.length} terms, ${m.forms} surface forms`);
  } catch (e) {
    warnings.push(`glossary.json could not be read: ${e.message}`);
  }
}

// ===========================================================================
// Mistake drill questions (mistakeQuiz.js): fair options, real text only
// ===========================================================================
{
  const mk = (n, step, extra = {}) => ({
    id: `m${n}`, stepId: `s${step}`, title: `Mistake title number ${n}`,
    what: `Doing thing ${n} wrong at step ${step}.`,
    consequence: `Consequence ${n}: ${'x'.repeat(n * 3)}`,
    prevent: `Prevent ${n}: ${'y'.repeat(n * 2)}`,
    severity: 'costly', ...extra,
  });
  const pool = [mk(1, 1), mk(2, 1), mk(3, 2), mk(4, 6), mk(5, 9), mk(6, 12), mk(7, 15), mk(8, 20)];
  const orderOf = (id) => Number(id.slice(1));
  const rnd = rng(7);
  for (const kind of MQ.KINDS) {
    for (const m of pool) {
      const q = MQ.buildOne(m, kind, pool, { orderOf, rnd });
      if (!q) continue;
      ok(`${kind} ${m.id}: four options`, q.options.length === 4);
      ok(`${kind} ${m.id}: exactly one correct`, q.options.filter((o) => o.correct).length === 1);
      ok(`${kind} ${m.id}: options are distinct`, new Set(q.options.map((o) => o.text.toLowerCase())).size === 4);
      const right = q.options.find((o) => o.correct);
      const want = kind === 'step' ? m.title : m[kind];
      eq(`${kind} ${m.id}: the right option is its own text`, right.text, want);
      const wrongFrom = q.options.filter((o) => !o.correct).map((o) => pool.find((p) => p.id === o.id));
      ok(`${kind} ${m.id}: wrong options never come from the same step`, wrongFrom.every((p) => p && p.stepId !== m.stepId));
      if (kind === 'step') {
        ok(`step ${m.id}: wrong options come from steps more than ${MQ.STEP_GAP} away`,
          wrongFrom.every((p) => Math.abs(orderOf(p.stepId) - orderOf(m.stepId)) > MQ.STEP_GAP));
      }
    }
  }
  ok('a mistake without a consequence is not drillable', !MQ.isDrillable({ ...mk(1, 1), consequence: '' }));
  ok('a legacy one-line mistake is not drillable', !MQ.isDrillable({ ...mk(1, 1), legacy: true }));
  ok('a full mistake is drillable', MQ.isDrillable(mk(1, 1)));
  eq('too small a pool gives no question', MQ.buildOne(pool[0], 'consequence', pool.slice(0, 3), { orderOf, rnd }), null);
  const any = MQ.buildMistakeQuestion(pool[3], pool, { orderOf, rnd });
  ok('buildMistakeQuestion finds some kind', !!any && MQ.KINDS.includes(any.kind));
  // Distractors are the ones closest in length to the answer.
  const target = { text: 'a'.repeat(50) };
  const cands = [10, 48, 52, 49, 90, 5].map((n, i) => ({ id: i, text: String(i) + 'b'.repeat(n) }));
  const near = MQ.nearestByLength(target.text, cands, 3, rng(3));
  ok('wrong answers are the nearest in length', near.every((c) => Math.abs(c.text.length - 50) <= 4));
}

for (const w of warnings.slice(0, 20)) console.log(`  warn: ${w}`);
if (warnings.length > 20) console.log(`  warn: ...and ${warnings.length - 20} more`);
console.log(`\n  ${pass} passed, ${failures.length} failed`);
for (const f of failures) console.log(`  FAIL: ${f}`);
process.exit(failures.length ? 1 : 0);
