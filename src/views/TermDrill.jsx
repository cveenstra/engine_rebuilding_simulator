import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Card, Pill } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { ActionBar, ChoiceButton } from '../components/bench.jsx';
import { TermBody } from '../components/glossary.jsx';
import { TermChips, StatusDot } from '../components/terms.jsx';
import { useDefine } from '../components/glossaryContext.js';
import { TERM_BY_ID, groupOf, GLOSSARY_CATEGORIES } from '../data/glossary.js';
import { UNIT_BY_ID } from '../data/index.js';
import {
  nextTerm, answerTerm, questionFor, exampleFor, recordsOf, termStatus, hasTerms,
} from '../engine/terms.js';
import { formatGap } from '../engine/ladder.js';
import { logSession } from '../engine/progress.js';

const REASON = { new: 'New word', learning: 'Still learning', review: 'Review', early: 'Still learning' };
const RATINGS = [
  ['again', 'Again', 'danger', 'One rung down, back in minutes'],
  ['hard', 'Hard', 'ghost', 'Stays on its rung'],
  ['good', 'Good', 'primary', 'One rung up'],
  ['easy', 'Easy', 'soft', 'Two rungs up'],
];

// The session in progress, so following a step link and coming back resumes it.
let saved = null;

/** The next thing to show, or null when nothing in scope is waiting. */
function upNext(scope, mode, answered, lastId) {
  const pick = nextTerm(scope, { answered, lastId });
  if (!pick) return null;
  const isNew = !recordsOf()[pick.termId]?.seen;
  const cur = { termId: pick.termId, reason: pick.reason, phase: 'teach', q: null, picked: null, res: null };
  return isNew ? cur : toCheck(cur, mode);
}

/** Leave the teaching card for the check: a question, or a flip card when no fair question exists. */
function toCheck(cur, mode) {
  const q = mode === 'ask' ? questionFor(cur.termId) : null;
  return { ...cur, phase: q ? 'ask' : 'front', q };
}

/** A real step sentence with the term marked, and a link to that step. */
function Example({ ex, label = 'In the steps' }) {
  if (!ex) return null;
  const [a, b] = ex.at || [0, 0];
  return (
    <figure className="rounded-lg border-l-4 border-heat bg-heat-soft/40 px-3 py-2">
      <figcaption className="text-xs font-semibold uppercase tracking-wide text-heat-text">{label}</figcaption>
      <blockquote className="mt-1 text-base leading-relaxed text-ink">
        {ex.at ? <>{ex.text.slice(0, a)}<mark className="rounded bg-heat-soft px-0.5 font-semibold text-ink">{ex.text.slice(a, b)}</mark>{ex.text.slice(b)}</> : ex.text}
      </blockquote>
      {ex.step && ex.unit && (
        <Link
          to={`/unit/${ex.unit.id}/walk?step=${ex.step.order}`}
          className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-text underline decoration-brand-line underline-offset-2"
        >
          {ex.unit.name}, step {ex.step.order}: {ex.step.title} <Icon name="chevron" size={14} />
        </Link>
      )}
    </figure>
  );
}

/** The term in full: what it means, a picture, a real sentence and its neighbours. */
function TermCard({ term, unitId, sentence, children }) {
  const define = useDefine();
  const ex = exampleFor(term, { unitId, text: sentence });
  return (
    <Card className="space-y-4 p-4">
      <div>
        <h2 className="text-2xl font-semibold leading-tight text-ink">{term.term}</h2>
        <p className="mt-0.5 text-sm text-ink-3">{groupOf(term)}, level {term.level}</p>
      </div>
      {children}
      <Example ex={ex} />
      <TermBody term={term} size="inline" onPick={define || undefined} headingLevel={2} />
    </Card>
  );
}

function Unlocked({ ids }) {
  if (!ids.length) return null;
  return (
    <div className="rounded-xl border border-ok-line bg-ok-soft p-3" role="status">
      <p className="text-sm font-semibold text-ok-text">Unlocked: {ids.map((id) => TERM_BY_ID[id]?.term).filter(Boolean).join(', ')}</p>
      <p className="text-sm text-ink-2">Everything they build on is learned, so they can come up as new words.</p>
    </div>
  );
}

function Drill({ scope, mode, skey }) {
  const [s, setS] = useState(() => (saved?.key === skey ? saved.s : {
    answered: 0, right: 0, learned: [], unlocked: [], last: null, done: false,
    cur: upNext(scope, mode, 0, null),
  }));
  const cur = s.cur;
  const term = cur ? TERM_BY_ID[cur.termId] : null;
  const done = s.done || !cur || !term;

  useEffect(() => { saved = done ? null : { key: skey, s }; }, [s, skey, done]);

  // Log the session once when it ends, for the study streak.
  const logged = useRef(false);
  useEffect(() => {
    if (done && s.answered > 0 && !logged.current) {
      logged.current = true;
      logSession('terms', scope.unitId || 'all', s.right, s.answered);
    }
  }, [done, s.answered, s.right, scope.unitId]);

  const record = (rating) => {
    const res = answerTerm(cur.termId, rating);
    const ok = rating === true || rating === 'good' || rating === 'easy' || rating === 'hard';
    return {
      res,
      patch: {
        right: s.right + (ok ? 1 : 0),
        learned: res.justLearned && !s.learned.includes(cur.termId) ? [...s.learned, cur.termId] : s.learned,
        unlocked: [...s.unlocked, ...res.unlocked.map((t) => t.id).filter((id) => !s.unlocked.includes(id))],
      },
    };
  };

  const advance = (patch, last) => {
    const answered = s.answered + 1;
    setS({ ...s, ...patch, answered, last, cur: upNext(scope, mode, answered, cur.termId) });
  };

  const pick = (opt) => {
    if (cur.picked) return;
    const { res, patch } = record(opt.correct);
    setS({ ...s, ...patch, cur: { ...cur, phase: 'answered', picked: opt.id, res } });
  };

  const rate = (r) => {
    const { res, patch } = record(r);
    advance(patch, { termId: cur.termId, res });
  };

  // Number keys pick a choice or a rating, for desktop study.
  const keyRef = useRef(null);
  useEffect(() => {
    keyRef.current = (n) => {
      if (!cur) return;
      if (cur.phase === 'ask' && cur.q?.options[n]) pick(cur.q.options[n]);
      else if (cur.phase === 'back' && RATINGS[n]) rate(RATINGS[n][0]);
    };
  });
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || document.querySelector('dialog[open]')) return;
      if (e.target instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4) keyRef.current?.(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const header = (
    <div className="mb-4 flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <Link to="/terms" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-brand-text hover:bg-brand-soft">
          <Icon name="back" size={18} /> Terms
        </Link>
        <h1 className="text-xl font-semibold leading-tight text-ink">
          Terms drill{scope.unitId && UNIT_BY_ID[scope.unitId] ? `: ${UNIT_BY_ID[scope.unitId].name}` : ''}
        </h1>
      </div>
      {s.answered > 0 && <span className="tabnum mt-11 flex-shrink-0 text-sm text-ink-3">{s.right}/{s.answered} right</span>}
    </div>
  );

  if (done) {
    const learned = s.learned.map((id) => TERM_BY_ID[id]).filter(Boolean);
    const unlocked = s.unlocked.map((id) => TERM_BY_ID[id]).filter(Boolean);
    return (
      <div>
        {header}
        <Card className="border-ok-line bg-ok-soft p-4">
          <p className="text-lg font-semibold text-ink">
            {s.answered ? `Session done: ${s.right} of ${s.answered} right` : 'Nothing waiting right now'}
          </p>
          <p className="mt-1 text-sm text-ink-2">
            {s.cur ? 'Stopped. Everything you answered is saved.' : 'Every term in this filter is either learned for now or waiting for today’s new allowance to reset.'}
          </p>
        </Card>
        {learned.length > 0 && (
          <section className="mt-4">
            <h2 className="mb-2 text-base font-semibold text-ink">Learned this session</h2>
            <TermChips terms={learned} />
          </section>
        )}
        {unlocked.length > 0 && (
          <section className="mt-4">
            <h2 className="mb-2 text-base font-semibold text-ink">Unlocked</h2>
            <TermChips terms={unlocked} />
          </section>
        )}
        <ActionBar>
          <Button variant="ghost" className="flex-1" to="/terms/map">Concept map</Button>
          <Button className="flex-1" to="/terms">Back to Terms</Button>
        </ActionBar>
      </div>
    );
  }

  const status = termStatus(term.id);
  const lastRes = s.last?.res;
  const lastTerm = s.last ? TERM_BY_ID[s.last.termId] : null;

  return (
    <div>
      {header}

      {/* What the last flip card did, and anything it unlocked. */}
      {lastRes && lastTerm && cur.phase !== 'answered' && (
        <div className="mb-3 space-y-2">
          <p className="text-sm text-ink-3" role="status">
            {lastTerm.term}: {lastRes.justLearned ? 'learned. ' : lastRes.lost ? 'back to learning. ' : ''}Back in {formatGap(lastRes.nextIn)}.
          </p>
          <Unlocked ids={lastRes.unlocked.map((t) => t.id)} />
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Pill tone={cur.reason === 'new' ? 'heat' : cur.reason === 'review' ? 'brand' : 'slate'}>{REASON[cur.reason]}</Pill>
        {cur.phase !== 'ask' && <StatusDot status={status} showLabel />}
      </div>

      {cur.phase === 'teach' && (
        <div key={`t-${s.answered}`} className="pop-in space-y-3">
          <p className="text-base text-ink-2">A new word. Read it, then check you have it.</p>
          <TermCard term={term} unitId={scope.unitId} />
        </div>
      )}

      {(cur.phase === 'ask' || cur.phase === 'answered') && cur.q && (
        <div key={`q-${s.answered}`} className="pop-in space-y-4">
          <div className="rounded-xl border border-line bg-sunken p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">{cur.q.prompt}</p>
            <p className={`mt-1 leading-snug text-ink ${cur.q.kind === 'definition' || cur.q.kind === 'dependency' ? 'text-2xl font-semibold' : 'text-lg'}`}>
              {cur.q.stem}
            </p>
          </div>
          <ul className="space-y-2">
            {cur.q.options.map((o, i) => {
              let state = 'idle';
              if (cur.picked) state = o.correct ? 'right' : o.id === cur.picked ? 'wrong' : 'dim';
              return (
                <li key={o.id}>
                  <ChoiceButton state={state} disabled={!!cur.picked} onClick={() => pick(o)} lead={i + 1}>{o.text}</ChoiceButton>
                </li>
              );
            })}
          </ul>

          {cur.phase === 'answered' && cur.res && (
            <div className="pop-in space-y-3">
              <p className={`text-base font-semibold ${cur.q.options.find((o) => o.id === cur.picked)?.correct ? 'text-ok-text' : 'text-bad-text'}`} role="status">
                {cur.q.options.find((o) => o.id === cur.picked)?.correct ? 'Right.' : `Not quite. The answer: ${cur.q.answerText}${/[.!?]$/.test(cur.q.answerText) ? '' : '.'}`}
                {' '}
                <span className="font-normal text-ink-2">
                  {cur.res.justLearned ? 'Learned. ' : cur.res.lost ? 'Back to learning. ' : ''}Back in {formatGap(cur.res.nextIn)}.
                </span>
              </p>
              <Unlocked ids={cur.res.unlocked.map((t) => t.id)} />
              <TermCard term={term} unitId={scope.unitId} sentence={cur.q.sentence} />
            </div>
          )}
        </div>
      )}

      {cur.phase === 'front' && (
        <div key={`f-${s.answered}`} className="pop-in">
          <div className="grid min-h-48 place-items-center rounded-xl border border-line bg-surface p-6 text-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">What does it mean?</p>
              <p className="mt-2 text-3xl font-semibold leading-tight text-ink">{term.term}</p>
              <p className="mt-3 text-sm text-ink-3">Say it out loud, then show the meaning.</p>
            </div>
          </div>
        </div>
      )}

      {cur.phase === 'back' && (
        <div key={`b-${s.answered}`} className="pop-in space-y-3">
          <TermCard term={term} unitId={scope.unitId} />
          <p className="text-sm text-ink-3">How well did you know it?</p>
        </div>
      )}

      <ActionBar>
        {cur.phase === 'teach' && (
          <>
            <Button variant="ghost" className="flex-1" onClick={() => setS({ ...s, done: true })}>Stop</Button>
            <Button className="flex-[2]" onClick={() => setS({ ...s, last: null, cur: toCheck(cur, mode) })}>
              Check I have it <Icon name="right" size={18} />
            </Button>
          </>
        )}
        {cur.phase === 'ask' && (
          <Button variant="ghost" className="flex-1" onClick={() => setS({ ...s, done: true })}>Stop and save</Button>
        )}
        {cur.phase === 'answered' && (
          <Button className="flex-1" onClick={() => advance({}, null)}>Next <Icon name="right" size={18} /></Button>
        )}
        {cur.phase === 'front' && (
          <>
            <Button variant="ghost" className="flex-1" onClick={() => setS({ ...s, done: true })}>Stop</Button>
            <Button className="flex-[2]" onClick={() => setS({ ...s, last: null, cur: { ...cur, phase: 'back' } })}>Show meaning</Button>
          </>
        )}
        {cur.phase === 'back' && RATINGS.map(([r, label, variant, note]) => (
          <Button key={r} variant={variant} className="flex-1 px-2" onClick={() => rate(r)} aria-label={`${label}: ${note}`}>{label}</Button>
        ))}
      </ActionBar>
    </div>
  );
}

export default function TermDrill() {
  const [params] = useSearchParams();
  const unitId = UNIT_BY_ID[params.get('unit')] ? params.get('unit') : '';
  const category = GLOSSARY_CATEGORIES.some(([c]) => c === params.get('cat')) ? params.get('cat') : '';
  const mode = params.get('mode') === 'flip' ? 'flip' : 'ask';
  const skey = `${unitId}|${category}|${mode}`;
  if (!hasTerms()) {
    return (
      <div className="py-6 text-center text-base text-ink-2">
        The dictionary is not loaded yet. <Link to="/terms" className="font-medium text-brand-text underline">Back to Terms</Link>.
      </div>
    );
  }
  return <Drill key={skey} scope={{ unitId, category }} mode={mode} skey={skey} />;
}
