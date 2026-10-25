import { useEffect, useState } from 'react';
import { Button, Chip, ChipRow, Card } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { ModeHeader, UnitMissing, ActionBar, ChoiceButton, CriticalBadge, CorrectFlourish } from '../components/bench.jsx';
import { useAutoAdvance } from '../components/useAutoAdvance.js';
import { cheer, miss } from '../engine/feedback.js';
import { PartStrip } from '../components/parts.jsx';
import { Glossed } from '../components/glossary.jsx';
import { useUnit } from '../engine/unit.js';
import { orderWindow } from '../engine/game.js';
import { gradeMany, transitionId } from '../engine/srs.js';
import { logSession, touchMode } from '../engine/progress.js';

function Drill({ unit }) {
  const [phase, setPhase] = useState('');
  const [drill, setDrill] = useState(() => orderWindow(unit, ''));
  const [placed, setPlaced] = useState([]); // step ids in the order tapped
  const [checked, setChecked] = useState(false);
  const [tally, setTally] = useState({ drills: 0, perfect: 0 });

  useEffect(() => { touchMode(unit.id, 'order'); }, [unit.id]);

  const fresh = (ph = phase) => {
    setDrill(orderWindow(unit, ph));
    setPlaced([]);
    setChecked(false);
  };

  const pickPhase = (ph) => { setPhase(ph); fresh(ph); };

  const { seq, shuffled } = drill;
  const size = seq.length;
  const pool = shuffled.filter((s) => !placed.includes(s.id));
  const byId = Object.fromEntries(seq.map((s) => [s.id, s]));
  const positionOf = Object.fromEntries(placed.map((id, i) => [id, i]));
  const rightSpot = seq.filter((s, i) => positionOf[s.id] === i).length;

  const check = () => {
    setChecked(true);
    // Each adjacent pair in the true order is a transition card: right if the
    // learner put B directly after A.
    const results = [];
    for (let i = 0; i < size - 1; i++) {
      const a = seq[i];
      const b = seq[i + 1];
      results.push({ id: transitionId(a, b), ok: positionOf[b.id] === positionOf[a.id] + 1 });
    }
    if (rightSpot === size) cheer(); else miss();
    gradeMany(results);
    logSession('order', unit.id, rightSpot, size);
    setTally((t) => ({ drills: t.drills + 1, perfect: t.perfect + (rightSpot === size ? 1 : 0) }));
  };

  const perfect = checked && rightSpot === size;
  const beat = useAutoAdvance({ token: drill, active: perfect, onAdvance: () => fresh() });

  const first = seq[0];
  const firstPhase = first ? unit.phaseById[first.phase] : null;

  return (
    <div>
      <ModeHeader unit={unit} title="Order drill">
        {tally.drills > 0 && (
          <span className="tabnum mt-11 flex-shrink-0 text-sm text-ink-3">{tally.perfect}/{tally.drills} perfect</span>
        )}
      </ModeHeader>

      <ChipRow className="mb-4">
        <Chip active={!phase} onClick={() => pickPhase('')}>Anywhere</Chip>
        {unit.phases.map((p) => (
          <Chip key={p.id} active={phase === p.id} onClick={() => pickPhase(p.id)}>{p.name}</Chip>
        ))}
      </ChipRow>

      <p className="mb-3 text-base text-ink-2">
        Tap these {size} steps in the order you would do them
        {firstPhase ? <>, starting in <strong className="font-semibold text-ink">{firstPhase.name}</strong></> : null}.
        Tap a placed step to send it back.
      </p>

      {!checked && (
        <div key={size + shuffled.map((s) => s.id).join()} className="rise-in">
          <ol className="mb-4 space-y-2">
            {placed.map((id, i) => (
              <li key={id}>
                <ChoiceButton lead={i + 1} onClick={() => setPlaced(placed.filter((x) => x !== id))}>
                  {byId[id].title}
                </ChoiceButton>
              </li>
            ))}
            {Array.from({ length: size - placed.length }).map((_, i) => (
              <li key={`empty-${i}`} className="flex min-h-14 items-center gap-3 rounded-xl border-2 border-dashed border-line px-4 text-ink-3">
                <span className="tabnum grid h-7 w-7 place-items-center rounded-full bg-sunken text-sm">{placed.length + i + 1}</span>
                <span className="text-sm">Empty</span>
              </li>
            ))}
          </ol>

          {pool.length > 0 && (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">Steps to place</p>
              <ul className="space-y-2">
                {pool.map((s) => (
                  <li key={s.id}>
                    <ChoiceButton onClick={() => setPlaced([...placed, s.id])}>{s.title}</ChoiceButton>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {checked && (
        <div className="space-y-3">
          {perfect ? (
            <CorrectFlourish>Perfect order. All {size} in the right spot.</CorrectFlourish>
          ) : (
            <Card className="pop-in p-4">
              <p className="text-lg font-semibold text-ink">{rightSpot} of {size} in the right spot</p>
              <p className="text-sm text-ink-3">Here is the real order. Misplaced steps show why they go where they do.</p>
            </Card>
          )}
          <ol className="space-y-2" {...beat.pauseProps}>
            {seq.map((s, i) => {
              const ok = positionOf[s.id] === i;
              return (
                <li key={s.id} className={`rounded-xl border-2 p-3 ${ok ? 'border-ok-line bg-surface' : 'border-bad-line bg-bad-soft/40'}`}>
                  <div className="flex items-start gap-3">
                    <span className={`tabnum grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-sm font-semibold ${ok ? 'bg-ok-soft text-ok-text' : 'bg-bad-soft text-bad-text'}`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-base font-medium text-ink">
                        {s.title} {s.critical && <CriticalBadge />}
                      </p>
                      {!ok && (
                        <>
                          <p className="text-sm text-bad-text">You put it at {positionOf[s.id] + 1}. Step {s.order} of the rebuild.</p>
                          <p className="mt-1 text-sm leading-relaxed text-ink-2"><Glossed text={s.why || s.action} /></p>
                        </>
                      )}
                      <PartStrip unit={unit} step={s} small className="mt-2" />
                    </div>
                    {ok && <Icon name="check" size={20} strokeWidth={2.4} className="text-ok-text" />}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <ActionBar beat={beat}>
        {!checked ? (
          <>
            <Button variant="ghost" className="flex-1" onClick={() => setPlaced([])} disabled={!placed.length}>
              <Icon name="undo" size={18} /> Clear
            </Button>
            <Button className="flex-[2]" onClick={check} disabled={placed.length !== size}>Check order</Button>
          </>
        ) : (
          <Button className="flex-1" onClick={beat.go}>New drill <Icon name="right" size={18} /></Button>
        )}
      </ActionBar>
    </div>
  );
}

export default function OrderDrill() {
  const unit = useUnit();
  if (!unit) return <UnitMissing />;
  return <Drill key={unit.id} unit={unit} />;
}
