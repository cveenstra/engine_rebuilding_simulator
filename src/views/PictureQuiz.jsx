import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Empty } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { ModeHeader, UnitMissing, ActionBar, ChoiceButton } from '../components/bench.jsx';
import { PartImage } from '../components/parts.jsx';
import { useUnit } from '../engine/unit.js';
import { useManifest } from '../engine/assets.js';
import { unitParts, photosFor, PART_BY_ID } from '../data/parts.js';
import { Glossed } from '../components/glossary.jsx';
import { glossSkips, termsForPart } from '../engine/glossary.js';
import { useAutoAdvance } from '../components/useAutoAdvance.js';
import { cheer, miss } from '../engine/feedback.js';

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * One question: a part with a picture, plus three other parts from the same
 * unit. Distractors come from the same category first, so the choice is
 * between things that look alike rather than a crankshaft and a sensor.
 */
function makeQuestion(pool, all, avoid) {
  const candidates = pool.length > 1 ? pool.filter((id) => id !== avoid) : pool;
  const answer = candidates[Math.floor(Math.random() * candidates.length)];
  const cat = PART_BY_ID[answer].category;
  const others = all.filter((id) => id !== answer && PART_BY_ID[id].name !== PART_BY_ID[answer].name);
  const same = shuffle(others.filter((id) => PART_BY_ID[id].category === cat));
  const rest = shuffle(others.filter((id) => PART_BY_ID[id].category !== cat));
  const distractors = [...same, ...rest].slice(0, 3);
  return { answer, choices: shuffle([answer, ...distractors]) };
}

function Quiz({ unit }) {
  const manifest = useManifest();
  const all = useMemo(() => unitParts(unit).map((x) => x.part.id), [unit]);
  // Only parts that have something to look at: a photo, or a drawing listed in the manifest.
  const pool = useMemo(
    () => all.filter((id) => photosFor(id).length > 0 || (manifest?.parts.has(id) && PART_BY_ID[id].drawable !== false)),
    [all, manifest],
  );
  const ready = manifest !== undefined && pool.length > 0 && all.length >= 4;
  // A new round re-rolls the question; `last` keeps the same part from coming up twice in a row.
  const [round, setRound] = useState({ n: 0, last: null });
  const q = useMemo(() => (ready ? makeQuestion(pool, all, round.last) : null), [ready, pool, all, round]);
  const [picked, setPicked] = useState(null);
  const [noPic, setNoPic] = useState(false);
  const [tally, setTally] = useState({ right: 0, total: 0 });

  const onSlides = useCallback((count, pending) => setNoPic(!pending && count === 0), []);

  const pick = (id) => {
    if (picked) return;
    if (id === q.answer) cheer(); else miss();
    setPicked(id);
    setTally((t) => ({ right: t.right + (id === q.answer ? 1 : 0), total: t.total + 1 }));
  };

  const next = () => {
    setRound((r) => ({ n: r.n + 1, last: q?.answer ?? null }));
    setPicked(null);
    setNoPic(false);
  };

  const answered = picked != null;
  const answerPart = q ? PART_BY_ID[q.answer] : null;
  const pickedRight = answered && !!q && picked === q.answer;
  const beat = useAutoAdvance({ token: q, active: pickedRight, onAdvance: next });

  return (
    <div>
      <ModeHeader unit={unit} title="Picture quiz">
        {tally.total > 0 && <span className="tabnum mt-11 flex-shrink-0 text-sm text-ink-3">{tally.right}/{tally.total} right</span>}
      </ModeHeader>

      {manifest === undefined ? (
        <div className="aspect-[4/3] w-full animate-pulse rounded-xl bg-line-2" />
      ) : !ready ? (
        <Empty title="Pictures are still on the way" action={<Button to={`/unit/${unit.id}/parts`} variant="ghost">Open the parts gallery</Button>}>
          {all.length < 4
            ? 'This unit needs at least four kinds of part for a quiz.'
            : 'None of this unit’s parts has a photo or drawing yet. Check back once the pictures land.'}
        </Empty>
      ) : q && (
        <div key={round.n} className="rise-in space-y-4">
          <p className="text-base text-ink-2">
            Name this part from the {unit.name}. Just practice: it does not change your review schedule.
            {pool.length < all.length ? ` ${pool.length} of ${all.length} parts have a picture so far.` : ''}
          </p>

          <PartImage key={q.answer} partId={q.answer} hideCaption={!answered} hideAlt={!answered} onSlides={onSlides} />
          {noPic && !answered && (
            <p className="text-sm text-warn-text">This picture did not load. Tap Skip for the next one.</p>
          )}

          <div>
            <p className="mb-2 text-base font-semibold text-ink">What is it?</p>
            <ul className="space-y-2">
              {q.choices.map((id) => {
                let state = 'idle';
                if (answered) state = id === q.answer ? 'right' : id === picked ? 'wrong' : 'dim';
                return (
                  <li key={id}>
                    <ChoiceButton state={state} bloom={pickedRight && state === 'right'} disabled={answered} onClick={() => pick(id)}>{PART_BY_ID[id].name}</ChoiceButton>
                  </li>
                );
              })}
            </ul>
          </div>

          {answered && (
            <div className="pop-in rounded-xl border border-line bg-surface p-4" {...beat.pauseProps}>
              <p className={`text-base font-semibold ${picked === q.answer ? 'text-ok-text' : 'text-bad-text'}`}>
                {picked === q.answer ? `Right: ${answerPart.name}.` : `Not quite. The answer: ${answerPart.name}.`}
              </p>
              {/* Linked only after answering: before, the names would give the picture away. */}
              <p className="mt-1 text-base leading-relaxed text-ink-2"><Glossed text={answerPart.what} exclude={termsForPart(answerPart.id)} /></p>
              <p className="mt-1 text-sm leading-relaxed text-ink-3">
                <Glossed text={answerPart.does} skip={glossSkips([answerPart.what, answerPart.does])[1]} exclude={termsForPart(answerPart.id)} />
              </p>
              <Link to={`/part/${q.answer}?unit=${unit.id}`} className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-text underline underline-offset-2">
                Part page and steps <Icon name="chevron" size={14} />
              </Link>
            </div>
          )}
        </div>
      )}

      <ActionBar beat={beat}>
        <Button className="flex-1" onClick={beat.go} disabled={!q}>
          {answered ? 'Next picture' : 'Skip'} <Icon name="right" size={18} />
        </Button>
      </ActionBar>
    </div>
  );
}

export default function PictureQuiz() {
  const unit = useUnit();
  if (!unit) return <UnitMissing />;
  return <Quiz key={unit.id} unit={unit} />;
}
