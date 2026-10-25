import { useEffect, useState } from 'react';
import { Button, Empty, Bar, Card } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { ModeHeader, UnitMissing, ActionBar, SpecBlock, CriticalBadge } from '../components/bench.jsx';
import { useUnit } from '../engine/unit.js';
import { SPEC_KIND_LABEL, specSteps } from '../data/index.js';
import { buildQueue, grade, specCardId } from '../engine/srs.js';
import { shuffle } from '../engine/game.js';
import { logSession, touchMode } from '../engine/progress.js';
import { Glossed } from '../components/glossary.jsx';
import { glossSkips } from '../engine/glossary.js';

/** Due and new spec cards first; if none are waiting, the whole deck shuffled. */
function makeDeck(unit) {
  const cards = specSteps(unit).map((s) => ({ id: specCardId(s), step: s }));
  const queue = buildQueue(cards, Infinity);
  return (queue.length ? queue : shuffle(cards)).map((c) => c.step);
}

const QUESTION = {
  torque: 'What is the torque?',
  clearance: 'What is the clearance?',
  angle: 'What is the angle?',
  sequence: 'What is the sequence?',
  fluid: 'How much fluid?',
  other: 'What is the spec?',
};

function Deck({ unit }) {
  const [deck, setDeck] = useState(() => makeDeck(unit));
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tally, setTally] = useState({ got: 0, again: 0 });

  useEffect(() => { touchMode(unit.id, 'specs'); }, [unit.id]);

  if (!deck.length) {
    return (
      <div>
        <ModeHeader unit={unit} title="Spec flashcards" />
        <Empty title="No sourced specs yet" action={<Button to={`/unit/${unit.id}`} variant="ghost">Back to {unit.name}</Button>}>
          Only steps with a cited spec become flashcards. None are in this unit's data yet.
        </Empty>
      </div>
    );
  }

  const done = i >= deck.length;
  const step = deck[Math.min(i, deck.length - 1)];
  const phase = unit.phaseById[step.phase];

  const answer = (ok) => {
    grade(specCardId(step), ok);
    const t = { got: tally.got + (ok ? 1 : 0), again: tally.again + (ok ? 0 : 1) };
    setTally(t);
    setFlipped(false);
    setI(i + 1);
    if (i + 1 >= deck.length) logSession('specs', unit.id, t.got, t.got + t.again);
  };

  const restart = () => {
    setDeck(makeDeck(unit));
    setI(0);
    setFlipped(false);
    setTally({ got: 0, again: 0 });
  };

  return (
    <div>
      <ModeHeader unit={unit} title="Spec flashcards">
        <span className="tabnum mt-11 flex-shrink-0 text-sm text-ink-3">{Math.min(i + 1, deck.length)} / {deck.length}</span>
      </ModeHeader>
      <Bar pct={(i / deck.length) * 100} className="mb-4" label="Deck progress" />

      {done ? (
        <Card className="p-5 text-center">
          <p className="text-lg font-semibold text-ink">Deck done</p>
          <p className="mt-1 text-base text-ink-2">{tally.got} got it, {tally.again} to see again.</p>
          <p className="mt-2 text-sm text-ink-3">Cards you missed stay at the front of this deck until you get them.</p>
        </Card>
      ) : (
        <button
          type="button" onClick={() => setFlipped(!flipped)} aria-label={flipped ? 'Show the question' : 'Show the answer'}
          className="block w-full rounded-xl border border-line bg-surface p-5 text-left"
        >
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink-3">
            <span className="tabnum font-semibold text-brand-text">Step {step.order}</span>
            {phase && <span>{phase.name}</span>}
            {step.critical && <CriticalBadge />}
          </p>
          <p className="mt-1 text-xl font-semibold leading-snug text-ink">{step.title}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-heat-text">{SPEC_KIND_LABEL[step.spec.kind] || 'Spec'}</p>
          <p className="text-base text-ink-2">{QUESTION[step.spec.kind] || QUESTION.other}</p>
          {!flipped && <p className="mt-4 text-sm text-ink-3">Say it out loud, then tap to check.</p>}
        </button>
      )}

      {!done && flipped && (
        <div className="pop-in mt-3 space-y-3">
          {/* Linked only once flipped: the front is the question. */}
          <SpecBlock unit={unit} spec={step.spec} />
          {step.action && <p className="text-sm leading-relaxed text-ink-2"><Glossed text={step.action} skip={glossSkips([step.spec.note, step.action])[1]} /></p>}
        </div>
      )}

      <ActionBar>
        {done ? (
          <Button className="flex-1" onClick={restart}>Go again</Button>
        ) : !flipped ? (
          <Button className="flex-1" onClick={() => setFlipped(true)}>Show answer</Button>
        ) : (
          <>
            <Button variant="danger" className="flex-1" onClick={() => answer(false)}><Icon name="x" size={18} /> Again</Button>
            <Button className="flex-1" onClick={() => answer(true)}><Icon name="check" size={18} /> Got it</Button>
          </>
        )}
      </ActionBar>
    </div>
  );
}

export default function SpecCards() {
  const unit = useUnit();
  if (!unit) return <UnitMissing />;
  return <Deck key={unit.id} unit={unit} />;
}
