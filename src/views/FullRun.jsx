import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Chip, Bar, Stat } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { ModeHeader, UnitMissing, ActionBar, ChoiceButton, StepCard } from '../components/bench.jsx';
import { PartStrip } from '../components/parts.jsx';
import { Glossed } from '../components/glossary.jsx';
import { useUnit } from '../engine/unit.js';
import { runChoices } from '../engine/game.js';
import { grade, transitionId } from '../engine/srs.js';
import { getState, getPref, setPref } from '../engine/storage.js';
import { saveActiveRun, recordRun, touchMode, formatMs, unitProgress } from '../engine/progress.js';
import { useAutoAdvance } from '../components/useAutoAdvance.js';
import { cheer, miss, feedbackPrefs } from '../engine/feedback.js';

// Wall clock for the run timer. Only called from event handlers and the ticking effect.
const clock = () => Date.now();

const blankRun = (choiceCount) => ({ pos: 0, mistakes: 0, missed: [], elapsedMs: 0, choiceCount });

function Results({ unit, result, onAgain }) {
  const best = unitProgress(unit).best;
  const isBest = best && best.at === result.at;
  const byId = Object.fromEntries(unit.steps.map((s) => [s.id, s]));
  const pct = Math.round(((result.total - result.mistakes) / result.total) * 100);

  return (
    <div className="space-y-5">
      <Card className={`p-5 ${result.mistakes === 0 ? 'border-ok-line bg-ok-soft' : ''}`}>
        <p className="text-lg font-semibold text-ink">
          {result.mistakes === 0 ? 'Clean rebuild. Every step in order.' : 'Rebuild complete.'}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Stat label="Accuracy" value={`${pct}%`} />
          <Stat label="Mistakes" value={result.mistakes} note={`of ${result.total} steps`} />
          <Stat label="Time" value={formatMs(result.ms)} />
        </div>
        {isBest && <p className="mt-3 text-sm font-medium text-ok-text">New personal best for this unit.</p>}
        {!isBest && best && (
          <p className="mt-3 text-sm text-ink-3">Best so far: {best.mistakes} mistakes in {formatMs(best.ms)}.</p>
        )}
      </Card>

      {result.missed.length > 0 && (
        <section>
          <h2 className="mb-1 text-lg font-semibold text-ink">Transitions you missed</h2>
          <p className="mb-3 text-sm text-ink-3">These are now due for review, so they come back sooner.</p>
          <ol className="space-y-2">
            {result.missed.map((m, i) => {
              const from = byId[m.from];
              const to = byId[m.to];
              if (!to) return null;
              return (
                <li key={`${m.to}-${i}`} className="rounded-xl border border-bad-line bg-surface p-3">
                  <p className="text-sm text-ink-3">{from ? <>After <span className="font-medium text-ink-2">{from.title}</span></> : 'First step'}</p>
                  <p className="text-base font-semibold text-ink">
                    <span className="tabnum text-brand-text">{to.order}.</span> {to.title}
                  </p>
                  {(to.why || to.action) && <p className="mt-1 text-sm leading-relaxed text-ink-2"><Glossed text={to.why || to.action} /></p>}
                  <PartStrip unit={unit} step={to} small className="mt-2" />
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={onAgain}>Run it again</Button>
        {result.missed.length > 0 && <Button variant="ghost" to={`/review?unit=${unit.id}`}>Review missed now</Button>}
      </div>
    </div>
  );
}

function Run({ unit }) {
  const n = unit.steps.length;
  const saved = getState().activeRun[unit.id];
  const [screen, setScreen] = useState('start'); // start | play | done
  const [choiceCount, setChoiceCount] = useState(() => (getPref('runChoices', 4) === 3 ? 3 : 4));
  const [run, setRun] = useState(null);
  const [q, setQ] = useState(null);
  const [wrong, setWrong] = useState(null); // id picked wrongly, waiting for Continue
  // A right pick in its calm beat: { id, out }. The step is already graded and saved; the screen moves on after the beat.
  const [right, setRight] = useState(null);
  const [segStart, setSegStart] = useState(0);
  const [now, setNow] = useState(() => clock());
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { touchMode(unit.id, 'run'); }, [unit.id]);

  useEffect(() => {
    if (screen !== 'play') return undefined;
    const t = setInterval(() => setNow(clock()), 1000);
    return () => clearInterval(t);
  }, [screen]);

  const begin = (r) => {
    const t = clock();
    setRun(r);
    setQ(runChoices(unit, r.pos, r.choiceCount));
    setWrong(null);
    setRight(null);
    setSegStart(t);
    setNow(t);
    setScreen('play');
    saveActiveRun(unit.id, r);
  };

  const startFresh = () => begin(blankRun(choiceCount));
  const resume = () => begin({ ...blankRun(choiceCount), ...saved, pos: Math.min(saved.pos, n - 1) });

  /** Close out the current step at time `t`: save the run one step on, or record it if that was the last. */
  const settle = (r, t) => {
    const elapsedMs = r.elapsedMs + (t - segStart);
    const nextPos = r.pos + 1;
    if (nextPos >= n) {
      const res = { at: t, total: n, mistakes: r.mistakes, ms: elapsedMs, missed: r.missed, choices: r.choiceCount };
      recordRun(unit.id, res);
      return { res };
    }
    const nr = { ...r, pos: nextPos, elapsedMs };
    saveActiveRun(unit.id, nr);
    return { nr };
  };

  /** Show what `settle` decided: the next step (its clock starting now) or the results. */
  const show = (out) => {
    const t = clock();
    setWrong(null);
    setRight(null);
    if (out.res) {
      setResult(out.res);
      setScreen('done');
      return;
    }
    setRun(out.nr);
    setQ(runChoices(unit, out.nr.pos, out.nr.choiceCount));
    setSegStart(t);
    setNow(t);
  };

  const advance = (r) => show(settle(r, clock()));

  const pick = (id) => {
    if (wrong || right || !q) return;
    const ok = id === q.answer.id;
    const prev = unit.steps[run.pos - 1];
    if (prev) grade(transitionId(prev, q.answer), ok);
    if (ok) {
      cheer();
      // The clock stops at the pick: the beat is the app's pause, not the learner's time.
      const out = settle(run, clock());
      if (feedbackPrefs().auto) setRight({ id, out });
      else show(out);
      return;
    }
    miss();
    const nr = {
      ...run,
      mistakes: run.mistakes + 1,
      missed: [...run.missed, { from: prev?.id ?? null, to: q.answer.id }],
    };
    setRun(nr);
    setWrong(id);
    saveActiveRun(unit.id, nr);
  };

  // Continue: after a right pick (when the beat ends, a tap skips it, or the button) or after a miss.
  const beat = useAutoAdvance({ token: q, active: !!right, onAdvance: () => (right ? show(right.out) : advance(run)) });

  const pause = () => {
    saveActiveRun(unit.id, { ...run, elapsedMs: run.elapsedMs + (clock() - segStart) });
    navigate(`/unit/${unit.id}`);
  };

  if (screen === 'start') {
    return (
      <div>
        <ModeHeader unit={unit} title="Full rebuild run" />
        <Card className="space-y-4 p-4">
          <p className="text-base leading-relaxed text-ink-2">
            Rebuild the whole {unit.name}, all {n} steps, by picking the next step each time. A wrong pick shows the
            right step and why, then you carry on. Mistakes and time are tracked, and every miss comes back in review.
          </p>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">Choices per step</p>
            <div className="flex gap-2">
              {[3, 4].map((c) => (
                <Chip key={c} active={choiceCount === c} onClick={() => { setChoiceCount(c); setPref('runChoices', c); }}>
                  {c} choices
                </Chip>
              ))}
            </div>
          </div>
        </Card>
        {saved && (
          <Card className="mt-3 border-brand-line bg-brand-soft/50 p-4">
            <p className="text-base font-semibold text-ink">Run in progress</p>
            <p className="text-sm text-ink-2">
              Step {saved.pos + 1} of {n}, {saved.mistakes} mistake{saved.mistakes === 1 ? '' : 's'}, {formatMs(saved.elapsedMs)} so far.
            </p>
          </Card>
        )}
        <ActionBar>
          {saved ? (
            <>
              <Button variant="ghost" className="flex-1" onClick={startFresh}>Start over</Button>
              <Button className="flex-[2]" onClick={resume}><Icon name="play" size={16} /> Resume</Button>
            </>
          ) : (
            <Button className="flex-1" onClick={startFresh}><Icon name="play" size={16} /> Start the rebuild</Button>
          )}
        </ActionBar>
      </div>
    );
  }

  if (screen === 'done' && result) {
    return (
      <div>
        <ModeHeader unit={unit} title="Run results" />
        <Results unit={unit} result={result} onAgain={() => { setResult(null); setScreen('start'); }} />
      </div>
    );
  }

  const elapsed = right ? (right.out.nr?.elapsedMs ?? right.out.res.ms) : run.elapsedMs + Math.max(0, now - segStart);
  const trail = unit.steps.slice(Math.max(0, run.pos - 3), run.pos);

  return (
    <div>
      <ModeHeader unit={unit} title="Full rebuild run">
        <div className="mt-11 flex flex-shrink-0 items-center gap-3 text-sm">
          <span className="tabnum inline-flex items-center gap-1 text-ink-2"><Icon name="timer" size={16} />{formatMs(elapsed)}</span>
          <span className={`tabnum inline-flex items-center gap-1 ${run.mistakes ? 'text-bad-text' : 'text-ink-2'}`}>
            <Icon name="x" size={16} />{run.mistakes}
          </span>
        </div>
      </ModeHeader>

      <div className="mb-4 flex items-center gap-3">
        <Bar pct={(run.pos / n) * 100} label="Rebuild progress" />
        <span className="tabnum flex-shrink-0 text-sm text-ink-3">{run.pos} / {n}</span>
      </div>

      <div className="mb-4 rounded-xl border border-line bg-sunken p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Done so far</p>
        {trail.length ? (
          <ol className="mt-1 space-y-0.5">
            {trail.map((s) => (
              <li key={s.id} className={`text-sm ${s.index === run.pos - 1 ? 'font-semibold text-ink' : 'text-ink-3'}`}>
                <span className="tabnum">{s.order}.</span> {s.title}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-1 text-sm text-ink-2">Nothing yet. The unit is on the bench.</p>
        )}
      </div>

      <p className="mb-2 text-base font-semibold text-ink">Step {run.pos + 1}: what do you do next?</p>
      <ul key={q.answer.id} className="rise-in space-y-2">
        {q.choices.map((c) => {
          let state = 'idle';
          if (wrong) state = c.id === q.answer.id ? 'right' : c.id === wrong ? 'wrong' : 'dim';
          else if (right) state = c.id === right.id ? 'right' : 'dim';
          return (
            <li key={c.id}>
              <ChoiceButton state={state} bloom={!!right && c.id === right.id} disabled={!!wrong || !!right} onClick={() => pick(c.id)}>{c.title}</ChoiceButton>
            </li>
          );
        })}
      </ul>

      {wrong && (
        <div className="pop-in mt-4 space-y-2">
          <p className="text-base font-semibold text-bad-text">Not that one. Step {q.answer.order} is:</p>
          <StepCard unit={unit} step={q.answer} compact />
        </div>
      )}

      <ActionBar beat={beat}>
        {wrong ? (
          <Button className="flex-1" onClick={beat.go}>Continue <Icon name="right" size={18} /></Button>
        ) : right ? (
          <Button className="flex-1" onClick={beat.go}>{right.out.res ? 'See results' : 'Continue'} <Icon name="right" size={18} /></Button>
        ) : (
          <Button variant="ghost" className="flex-1" onClick={pause}>Pause and leave (saved)</Button>
        )}
      </ActionBar>
    </div>
  );
}

export default function FullRun() {
  const unit = useUnit();
  if (!unit) return <UnitMissing />;
  return <Run key={unit.id} unit={unit} />;
}
