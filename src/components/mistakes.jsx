import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { Glossed } from './glossary.jsx';
import { glossSkips } from '../engine/glossary.js';
import { severityMeta, worstSeverity } from '../engine/mistakes.js';

/** Severity badge classes: solid red, orange, yellow, slate, and a dashed outline when not rated. */
const SEV_CLASS = {
  'ruins-unit': 'border-ruin bg-ruin text-ruin-ink',
  costly: 'border-costly-line bg-costly-soft text-costly-text',
  rework: 'border-rework-line bg-rework-soft text-rework-text',
  minor: 'border-line bg-sunken text-ink-2',
};
const UNRATED_CLASS = 'border-dashed border-line bg-surface text-ink-3';

/** Four rising bars, `n` of them filled: a second cue for severity besides color and the word. */
export function SeverityBars({ n, size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true" focusable="false" className="flex-shrink-0">
      {[0, 1, 2, 3].map((i) => {
        const h = 3 + i * 3;
        return (
          <rect
            key={i} x={i * 3} y={12 - h} width="2" height={h} rx="0.5"
            fill="currentColor" opacity={i < n ? 1 : 0.28}
          />
        );
      })}
    </svg>
  );
}

/** The severity as a badge with the word in it, so it never relies on color alone. */
export function SeverityBadge({ severity, long = false, className = '' }) {
  const meta = severityMeta(severity);
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold ${SEV_CLASS[severity] || UNRATED_CLASS} ${className}`}>
      <SeverityBars n={meta.bars} />
      {long ? meta.label : meta.short}
    </span>
  );
}

const LABEL = 'text-xs font-semibold uppercase tracking-wide';

/** what / consequence / prevent / detect for one mistake, with dictionary words tappable. */
export function MistakeFields({ m, className = '' }) {
  const rows = [
    ['what', 'What goes wrong', m.what, 'text-ink-3'],
    ['consequence', 'What it costs you', m.consequence, 'text-bad-text'],
    ['prevent', 'How to prevent it', m.prevent, 'text-ok-text'],
    ['detect', 'How to catch it', m.detect, 'text-brand-text'],
  ].filter(([, , text]) => text);
  const skips = glossSkips(rows.map(([, , text]) => text));
  return (
    <dl className={`space-y-2.5 ${className}`}>
      {rows.map(([k, label, text, tone], i) => (
        <div key={k}>
          <dt className={`${LABEL} ${tone}`}>{label}</dt>
          <dd className="mt-0.5 text-base leading-relaxed text-ink"><Glossed text={text} skip={skips[i]} /></dd>
        </div>
      ))}
    </dl>
  );
}

/** "Step 12: Pull the converter", linking to that step in the walkthrough with its mistakes open. */
export function StepLink({ unit, stepId, className = '' }) {
  const step = unit.stepById[stepId];
  if (!step) return null;
  return (
    <Link
      to={`/unit/${unit.id}/walk?step=${step.order}&show=mistakes`}
      className={`inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-text underline decoration-brand-line underline-offset-2 hover:decoration-brand ${className}`}
    >
      <span>Step {step.order}: {step.title}</span>
      <Icon name="chevron" size={14} className="flex-shrink-0" />
    </Link>
  );
}

function SourceTitles({ unit, ids }) {
  const list = (ids || []).map((id) => unit.sourceById[id]).filter(Boolean);
  if (!list.length) return null;
  return (
    <p className="text-xs leading-relaxed text-ink-3">
      Source: {list.map((s, i) => (
        <span key={s.id}>
          {i > 0 && '; '}
          {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline decoration-line underline-offset-2">{s.title}</a> : s.title}
        </span>
      ))}
    </p>
  );
}

/**
 * One mistake: severity badge and title, tap to open what / consequence /
 * prevent / detect. An older one-sentence mistake has no title or detail, so
 * it shows its sentence and does not expand.
 */
export function MistakeItem({ unit, m, showStep = false, defaultOpen = false }) {
  if (m.legacy || !m.title) {
    return (
      <div className="px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={m.severity} />
          {showStep && <StepLink unit={unit} stepId={m.stepId} className="min-h-8" />}
        </div>
        <p className="mt-1 text-base leading-relaxed text-ink"><Glossed text={m.what} /></p>
      </div>
    );
  }
  return (
    <details className="group" open={defaultOpen || undefined}>
      <summary className="flex min-h-12 cursor-pointer list-none items-start gap-2 px-3 py-2.5 hover:bg-sunken/60 [&::-webkit-details-marker]:hidden">
        <Icon name="chevron" size={16} className="mt-1 flex-shrink-0 text-ink-3 transition-transform group-open:rotate-90" />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-medium leading-snug text-ink">{m.title}</span>
          <SeverityBadge severity={m.severity} className="mt-1" />
        </span>
      </summary>
      <div className="space-y-2 px-3 pb-3 pl-9">
        {showStep && <StepLink unit={unit} stepId={m.stepId} className="-mt-1" />}
        <MistakeFields m={m} />
        <SourceTitles unit={unit} ids={m.sourceIds} />
      </div>
    </details>
  );
}

/** "3 ways to go wrong" and the worst severity, for a step card's header. */
export function MistakeCount({ step, open, onClick }) {
  const n = step.mistakes.length;
  if (!n) return null;
  const worst = worstSeverity(step.mistakes);
  return (
    <button
      type="button" onClick={onClick} aria-expanded={open}
      className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-2 text-xs font-medium text-ink-2 hover:bg-sunken"
    >
      <Icon name="alert" size={13} strokeWidth={2.2} />
      {n} way{n === 1 ? '' : 's'} to go wrong
      {worst && <span className="sr-only">, worst:</span>}
      {worst && <SeverityBadge severity={worst} className="-mr-1 px-1.5 py-0" />}
    </button>
  );
}

/**
 * The "Ways this goes wrong" block on a step card. Collapsed to a one-line
 * header (count and worst severity) unless `open`; the card controls it so
 * the header chip can open it too.
 */
export function MistakeSection({ unit, step, open, onToggle, id }) {
  const list = step.mistakes;
  if (!list.length) return null;
  const worst = worstSeverity(list);
  return (
    <section id={id} className="mt-3 scroll-mt-20 overflow-hidden rounded-lg border border-bad-line bg-bad-soft/40">
      <h3>
        <button
          type="button" onClick={onToggle} aria-expanded={open} aria-controls={`${id}-list`}
          className="flex min-h-12 w-full items-center gap-2 px-3 py-2 text-left hover:bg-bad-soft/60"
        >
          <Icon name="alert" size={16} strokeWidth={2.1} className="flex-shrink-0 text-bad-text" />
          <span className="min-w-0 flex-1">
            <span className={`${LABEL} text-bad-text`}>Ways this goes wrong</span>
            <span className="tabnum ml-1.5 text-sm font-semibold text-ink-2">{list.length}</span>
          </span>
          {worst && !open && <SeverityBadge severity={worst} />}
          <Icon name="chevron" size={16} className={`flex-shrink-0 text-ink-3 transition-transform ${open ? '-rotate-90' : 'rotate-90'}`} />
        </button>
      </h3>
      {open && (
        <ul id={`${id}-list`} className="divide-y divide-bad-line/60 border-t border-bad-line/60 bg-surface">
          {list.map((m) => (
            <li key={m.id}><MistakeItem unit={unit} m={m} defaultOpen={list.length === 1} /></li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** A mistake in full, after a drill answer: badge, title, step link, every field, sources. */
export function MistakeCard({ unit, m }) {
  return (
    <article className="rounded-xl border border-line bg-surface p-4">
      <SeverityBadge severity={m.severity} long />
      {m.title && <h2 className="mt-2 text-lg font-semibold leading-snug text-ink">{m.title}</h2>}
      <StepLink unit={unit} stepId={m.stepId} />
      <MistakeFields m={m} className="mt-1" />
      <div className="mt-3"><SourceTitles unit={unit} ids={m.sourceIds} /></div>
    </article>
  );
}

/** "How these units die": each failure mode with its cause, symptoms, rebuild angle and steps. */
export function FailureModes({ unit }) {
  if (!unit.failureModes.length) return null;
  return (
    <ul className="space-y-2">
      {unit.failureModes.map((f) => (
        <li key={f.id}>
          <details className="group rounded-xl border border-line bg-surface">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-sunken/60 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1 text-base font-medium leading-snug text-ink">{f.title}</span>
              <Icon name="chevron" size={18} className="flex-shrink-0 text-ink-3 transition-transform group-open:rotate-90" />
            </summary>
            <div className="space-y-3 border-t border-line-2 px-4 pb-4 pt-3">
              {f.cause.length > 0 && (
                <div>
                  <p className={`${LABEL} text-ink-3`}>Cause</p>
                  {f.cause.map((t, i) => <p key={i} className="mt-0.5 text-base leading-relaxed text-ink-2"><Glossed text={t} /></p>)}
                </div>
              )}
              {f.symptoms.length > 0 && (
                <div>
                  <p className={`${LABEL} text-ink-3`}>Symptoms</p>
                  {f.symptoms.length === 1
                    ? <p className="mt-0.5 text-base leading-relaxed text-ink-2"><Glossed text={f.symptoms[0]} /></p>
                    : (
                      <ul className="mt-1 space-y-1">
                        {f.symptoms.map((t, i) => (
                          <li key={i} className="flex gap-2.5 text-base leading-relaxed text-ink-2">
                            <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-bad" />
                            <span className="min-w-0"><Glossed text={t} /></span>
                          </li>
                        ))}
                      </ul>
                    )}
                </div>
              )}
              {f.rebuildAngle.length > 0 && (
                <div className="rounded-lg border border-ok-line bg-ok-soft/50 p-3">
                  <p className={`${LABEL} text-ok-text`}>What the rebuild does about it</p>
                  {f.rebuildAngle.map((t, i) => <p key={i} className="mt-0.5 text-base leading-relaxed text-ink"><Glossed text={t} /></p>)}
                </div>
              )}
              {f.stepIds.length > 0 && (
                <div>
                  <p className={`${LABEL} text-ink-3`}>Related steps</p>
                  <ul>
                    {f.stepIds.map((id) => <li key={id}><StepLink unit={unit} stepId={id} /></li>)}
                  </ul>
                </div>
              )}
              <SourceTitles unit={unit} ids={f.sourceIds} />
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
