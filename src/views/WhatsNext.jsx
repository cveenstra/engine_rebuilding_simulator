import { useEffect, useRef, useState } from 'react';
import { Button, Chip, ChipRow } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { ModeHeader, UnitMissing, ActionBar } from '../components/bench.jsx';
import NextQuestion from '../components/NextQuestion.jsx';
import { useUnit } from '../engine/unit.js';
import { nextQuestion, randomQuestionIndex } from '../engine/game.js';
import { grade, transitionId } from '../engine/srs.js';
import { logSession, touchMode } from '../engine/progress.js';

function makeQ(unit, phase, avoid) {
  const i = randomQuestionIndex(unit, phase, avoid);
  return i < 0 ? null : nextQuestion(unit, i);
}

function Game({ unit }) {
  const [phase, setPhase] = useState('');
  const [q, setQ] = useState(() => makeQ(unit, '', -1));
  const [picked, setPicked] = useState(null);
  const [tally, setTally] = useState({ right: 0, total: 0 });

  useEffect(() => { touchMode(unit.id, 'next'); }, [unit.id]);

  const pickPhase = (ph) => {
    setPhase(ph);
    setQ(makeQ(unit, ph, -1));
    setPicked(null);
  };

  const onPick = (id) => {
    if (picked) return;
    setPicked(id);
    const ok = id === q.answer.id;
    grade(transitionId(q.step, q.answer), ok);
    setTally((t) => ({ right: t.right + (ok ? 1 : 0), total: t.total + 1 }));
  };

  const next = () => {
    setQ(makeQ(unit, phase, q?.step.index ?? -1));
    setPicked(null);
  };

  // Log the session once when the learner leaves, not on every answer.
  const tallyRef = useRef(tally);
  useEffect(() => { tallyRef.current = tally; }, [tally]);
  useEffect(() => () => {
    const t = tallyRef.current;
    if (t.total) logSession('next', unit.id, t.right, t.total);
  }, [unit.id]);

  return (
    <div>
      <ModeHeader unit={unit} title="What's next">
        {tally.total > 0 && <span className="tabnum mt-11 flex-shrink-0 text-sm text-ink-3">{tally.right}/{tally.total} right</span>}
      </ModeHeader>

      <ChipRow className="mb-4">
        <Chip active={!phase} onClick={() => pickPhase('')}>Anywhere</Chip>
        {unit.phases.map((p) => (
          <Chip key={p.id} active={phase === p.id} onClick={() => pickPhase(p.id)}>{p.name}</Chip>
        ))}
      </ChipRow>

      {q ? (
        <NextQuestion key={q.step.id} unit={unit} q={q} picked={picked} onPick={onPick} />
      ) : (
        <p className="text-base text-ink-2">This phase has no step with a step after it. Pick another phase.</p>
      )}

      <ActionBar>
        <Button className="flex-1" onClick={next} disabled={!picked}>
          Next question <Icon name="right" size={18} />
        </Button>
      </ActionBar>
    </div>
  );
}

export default function WhatsNext() {
  const unit = useUnit();
  if (!unit) return <UnitMissing />;
  return <Game key={unit.id} unit={unit} />;
}
