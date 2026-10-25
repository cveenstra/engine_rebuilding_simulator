import { ChoiceButton, StepCard, CriticalBadge } from './bench.jsx';

/**
 * "What comes after this step?" Controlled: the parent owns which choice was
 * picked so it can drive the action bar and grading. Choices are titles only,
 * and every title is 2 to 7 words, so length gives nothing away.
 */
export default function NextQuestion({ unit, q, picked, onPick, showUnit = false }) {
  const answered = picked != null;
  const right = answered && picked === q.answer.id;
  const phase = unit.phaseById[q.step.phase];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-sunken p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
          {showUnit ? `${unit.name}, ` : ''}you just finished step {q.step.order}{phase ? ` (${phase.name})` : ''}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-lg font-semibold leading-snug text-ink">
          {q.step.title} {q.step.critical && <CriticalBadge />}
        </p>
      </div>

      <div>
        <p className="mb-2 text-base font-semibold text-ink">What comes next?</p>
        <ul className="space-y-2">
          {q.choices.map((c) => {
            let state = 'idle';
            if (answered) {
              if (c.id === q.answer.id) state = 'right';
              else if (c.id === picked) state = 'wrong';
              else state = 'dim';
            }
            return (
              <li key={c.id}>
                <ChoiceButton state={state} disabled={answered} onClick={() => onPick(c.id)}>{c.title}</ChoiceButton>
              </li>
            );
          })}
        </ul>
      </div>

      {answered && (
        <div className="pop-in space-y-2">
          <p className={`text-base font-semibold ${right ? 'text-ok-text' : 'text-bad-text'}`}>
            {right ? 'Right.' : `Not quite. Step ${q.answer.order} is next:`}
          </p>
          <StepCard unit={unit} step={q.answer} compact />
        </div>
      )}
    </div>
  );
}
