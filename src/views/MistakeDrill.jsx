import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Card, Chip, ChipRow, Empty, Pill } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { ActionBar, ChoiceButton, ModeHeader, UnitMissing } from '../components/bench.jsx';
import { MistakeCard, SeverityBadge, SeverityBars } from '../components/mistakes.jsx';
import { useUnit } from '../engine/unit.js';
import {
  SEVERITIES, DEFAULT_SEVERITIES, NEW_PER_SESSION, severityMeta, drillable, scopeCards, nextMistake,
  questionForMistake, answerMistake, recordsOf, nextBackMs,
} from '../engine/mistakes.js';
import { formatGap } from '../engine/ladder.js';
import { logSession } from '../engine/progress.js';

const REASON = { new: ['New', 'heat'], learning: ['Still learning', 'slate'], early: ['Still learning', 'slate'], review: ['Review', 'brand'] };

// The session in progress, so following a step link and coming back resumes it.
let saved = null;

/** The next card and its question, skipping any card the unit cannot build a fair question for. */
function upNext(unit, severities, answered, lastId, newLeft) {
  const tried = new Set();
  let last = lastId;
  for (let i = 0; i < 25; i++) {
    const pick = nextMistake(unit, { severities, answered, lastId: last, newLeft });
    if (!pick || tried.has(pick.id)) return null;
    tried.add(pick.id);
    const q = questionForMistake(unit, pick.m);
    if (q) return { ...pick, q, picked: null, res: null };
    last = pick.id;
  }
  return null;
}

/** The step a question is about, as plain text: never glossed before the answer. */
function StepStem({ step, withAction }) {
  if (!step) return null;
  return (
    <div>
      <p className="tabnum text-sm font-semibold text-brand-text">Step {step.order}</p>
      <p className="text-lg font-semibold leading-snug text-ink">{step.title}</p>
      {withAction && step.action && <p className="mt-1 text-base leading-relaxed text-ink-2">{step.action}</p>}
    </div>
  );
}

function Stem({ unit, q }) {
  const step = unit.stepById[q.stepId];
  return (
    <div className="space-y-3 rounded-xl border border-line bg-sunken p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">{q.prompt}</p>
      {q.kind === 'consequence' && (
        <>
          <StepStem step={step} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-bad-text">If you</p>
            <p className="mt-0.5 text-lg leading-snug text-ink">{q.what}</p>
          </div>
        </>
      )}
      {q.kind === 'prevent' && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-bad-text">The mistake</p>
          <p className="mt-0.5 text-lg leading-snug text-ink">{q.what}</p>
          {step && <p className="mt-1 text-sm text-ink-3">At step {step.order}: {step.title}</p>}
        </div>
      )}
      {q.kind === 'step' && <StepStem step={step} withAction />}
    </div>
  );
}

function Drill({ unit, severities, skey }) {
  const [s, setS] = useState(() => (saved?.key === skey ? saved.s : {
    answered: 0, right: 0, newSeen: 0, missed: [], done: false,
    cur: upNext(unit, severities, 0, null, NEW_PER_SESSION),
  }));
  const cur = s.cur;
  const done = s.done || !cur;

  useEffect(() => { saved = done ? null : { key: skey, s }; }, [s, skey, done]);

  const logged = useRef(false);
  useEffect(() => {
    if (done && s.answered > 0 && !logged.current) {
      logged.current = true;
      logSession('mistakes', unit.id, s.right, s.answered);
    }
  }, [done, s.answered, s.right, unit.id]);

  const pick = (opt) => {
    if (!cur || cur.picked) return;
    const wasNew = !recordsOf()[cur.id]?.seen;
    const res = answerMistake(cur.id, opt.correct);
    setS({
      ...s,
      right: s.right + (opt.correct ? 1 : 0),
      newSeen: s.newSeen + (wasNew ? 1 : 0),
      missed: !opt.correct && !s.missed.includes(cur.id) ? [...s.missed, cur.id] : s.missed,
      cur: { ...cur, picked: opt.id, res },
    });
  };

  const next = () => {
    const answered = s.answered + 1;
    setS({ ...s, answered, cur: upNext(unit, severities, answered, cur.id, Math.max(0, NEW_PER_SESSION - s.newSeen)) });
  };

  // Number keys pick a choice, Enter moves on, for desktop study.
  const keyRef = useRef(null);
  useEffect(() => {
    keyRef.current = (k) => {
      if (!cur) return;
      if (!cur.picked && /^[1-4]$/.test(k) && cur.q.options[Number(k) - 1]) pick(cur.q.options[Number(k) - 1]);
      else if (cur.picked && k === 'Enter') next();
    };
  });
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || document.querySelector('dialog[open]')) return;
      if (e.target instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(e.target.tagName) && e.key === 'Enter') return;
      keyRef.current?.(e.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (done) {
    const missed = s.missed.map((id) => scopeCards(unit, []).find((c) => c.id === id)?.m).filter(Boolean);
    const later = nextBackMs(unit, severities);
    return (
      <div className="space-y-4">
        <Card className="border-ok-line bg-ok-soft p-4">
          <p className="text-lg font-semibold text-ink">
            {s.answered ? `Session done: ${s.right} of ${s.answered} right` : 'Nothing waiting right now'}
          </p>
          <p className="mt-1 text-sm text-ink-2">
            {s.cur
              ? 'Stopped. Everything you answered is saved.'
              : s.answered
                ? `Misses come back in minutes, the rest over the coming days.${later != null ? ` Next one in ${formatGap(later)}.` : ''}`
                : `Every mistake in this filter is learned for now.${later != null ? ` Next one back in ${formatGap(later)}.` : ''} Pick another severity to keep going.`}
          </p>
        </Card>
        {missed.length > 0 && (
          <section>
            <h2 className="mb-2 text-base font-semibold text-ink">Missed this session</h2>
            <ul className="space-y-1.5">
              {missed.map((m) => (
                <li key={m.id} className="flex items-start gap-2 text-base text-ink-2">
                  <SeverityBadge severity={m.severity} className="mt-0.5" />
                  <span className="min-w-0">{m.title}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <ActionBar>
          <Button variant="ghost" className="flex-1" to={`/unit/${unit.id}/mistakes`}>All mistakes</Button>
          <Button className="flex-1" to={`/unit/${unit.id}`}>Back to unit</Button>
        </ActionBar>
      </div>
    );
  }

  const { q } = cur;
  const pickedOpt = cur.picked ? q.options.find((o) => o.id === cur.picked) : null;
  const [reason, tone] = REASON[cur.reason] || REASON.review;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Pill tone={tone}>{reason}</Pill>
        <SeverityBadge severity={cur.m.severity} />
        {s.answered > 0 && <span className="tabnum ml-auto text-sm text-ink-3">{s.right}/{s.answered} right</span>}
      </div>

      <div key={`q-${s.answered}`} className="pop-in space-y-4">
        <Stem unit={unit} q={q} />
        <ul className="space-y-2">
          {q.options.map((o, i) => {
            let state = 'idle';
            if (cur.picked) state = o.correct ? 'right' : o.id === cur.picked ? 'wrong' : 'dim';
            return (
              <li key={o.id}>
                <ChoiceButton state={state} disabled={!!cur.picked} onClick={() => pick(o)} lead={i + 1}>{o.text}</ChoiceButton>
              </li>
            );
          })}
        </ul>

        {pickedOpt && cur.res && (
          <div className="pop-in space-y-3">
            <p className={`text-base font-semibold ${pickedOpt.correct ? 'text-ok-text' : 'text-bad-text'}`} role="status">
              {pickedOpt.correct ? 'Right.' : 'Not quite. The right answer is marked.'}{' '}
              <span className="font-normal text-ink-2">Back in {formatGap(cur.res.nextIn)}.</span>
            </p>
            <MistakeCard unit={unit} m={cur.m} />
          </div>
        )}
      </div>

      <ActionBar>
        {!cur.picked && <Button variant="ghost" className="flex-1" onClick={() => setS({ ...s, done: true })}>Stop and save</Button>}
        {cur.picked && <Button className="flex-1" onClick={next}>Next <Icon name="right" size={18} /></Button>}
      </ActionBar>
    </div>
  );
}

export default function MistakeDrill() {
  const unit = useUnit();
  const [params, setParams] = useSearchParams();
  if (!unit) return <UnitMissing />;

  const pool = drillable(unit);
  const count = (sev) => pool.filter((m) => m.severity === sev).length;
  const present = SEVERITIES.filter((sev) => count(sev) > 0);
  const raw = params.get('sev');
  let severities;
  if (raw === 'all') severities = [];
  else if (raw) severities = raw.split(',').filter((x) => present.includes(x));
  else severities = DEFAULT_SEVERITIES.filter((x) => present.includes(x));
  // The default filter matches nothing in this unit: drill everything.
  if (!scopeCards(unit, severities).length) severities = [];
  const skey = `${unit.id}|${severities.join(',')}`;

  const setSev = (list) => {
    const next = new URLSearchParams(params);
    next.set('sev', list.length ? list.join(',') : 'all');
    setParams(next, { replace: true });
  };
  const toggle = (sev) => setSev(severities.includes(sev) ? severities.filter((x) => x !== sev) : SEVERITIES.filter((x) => x === sev || severities.includes(x)));

  return (
    <div>
      <ModeHeader unit={unit} title="Mistake drill" />
      {pool.length < 4 ? (
        <Empty title="Not enough mistakes to drill yet" action={<Button to={`/unit/${unit.id}`} variant="ghost">Back to {unit.name}</Button>}>
          The drill needs at least four mistakes with a consequence and a prevent line. They are on their way for this unit.
        </Empty>
      ) : (
        <>
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-3">Drill these</p>
            <ChipRow>
              <Chip active={!severities.length} onClick={() => setSev([])}>All</Chip>
              {present.map((sev) => (
                <Chip key={sev} active={severities.includes(sev)} onClick={() => toggle(sev)}>
                  <span className="inline-flex items-center gap-1.5">
                    <SeverityBars n={severityMeta(sev).bars} />
                    {severityMeta(sev).short}
                    <span className="tabnum opacity-75">{count(sev)}</span>
                  </span>
                </Chip>
              ))}
            </ChipRow>
          </div>
          <Drill key={skey} unit={unit} severities={severities} skey={skey} />
        </>
      )}
    </div>
  );
}
