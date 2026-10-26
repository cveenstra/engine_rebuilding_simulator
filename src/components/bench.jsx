import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { Pill, Empty, Button } from './ui.jsx';
import { SPEC_KIND_LABEL } from '../data/index.js';
import { PartStrip } from './parts.jsx';
import { Glossed } from './glossary.jsx';
import { glossSkips } from '../engine/glossary.js';
import { MistakeCount, MistakeSection } from './mistakes.jsx';

export function UnitMissing() {
  return (
    <Empty
      title="We can’t find that unit"
      action={<Button to="/" variant="ghost">Back to the garage</Button>}
    >
      Check the link, or pick a unit from the garage.
    </Empty>
  );
}

/** Compact header for game screens: back to the unit, a title, and an optional right slot. */
export function ModeHeader({ unit, title, children }) {
  return (
    <div className="mb-4 flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <Link to={`/unit/${unit.id}`} className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-brand-text hover:bg-brand-soft">
          <Icon name="back" size={18} /> {unit.name}
        </Link>
        <h1 className="text-xl font-semibold leading-tight text-ink">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function KindIcon({ kind, size = 20 }) {
  return <Icon name={kind === 'transmission' ? 'gears' : 'engine'} size={size} />;
}

export function CriticalBadge() {
  return (
    <Pill tone="bad"><Icon name="alert" size={13} strokeWidth={2.2} /> Critical</Pill>
  );
}

export function VerifyTag() {
  return (
    <Pill tone="warn" className="whitespace-normal">
      <Icon name="info" size={13} strokeWidth={2.2} /> Verify with the factory service manual
    </Pill>
  );
}

/** Source titles for a list of ids, linked when the source has a URL. */
export function SourceLinks({ unit, ids, className = '' }) {
  const list = (ids || []).map((id) => unit.sourceById[id]).filter(Boolean);
  if (!list.length) return null;
  return (
    <ul className={`space-y-1 ${className}`}>
      {list.map((s) => (
        <li key={s.id} className="text-sm leading-relaxed">
          {s.url ? (
            <a href={s.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-8 items-baseline gap-1 text-brand-text underline decoration-brand-line underline-offset-2 hover:decoration-brand">
              <span>{s.title}</span>
              <Icon name="external" size={13} className="relative top-0.5 flex-shrink-0" />
            </a>
          ) : (
            <span className="text-ink-2">{s.title}</span>
          )}
          {s.kind && <span className="ml-1.5 text-xs uppercase tracking-wide text-ink-3">{s.kind}</span>}
        </li>
      ))}
    </ul>
  );
}

export function SpecValue({ spec, className = '' }) {
  return (
    <span className={`tabnum font-semibold text-ink ${className}`}>
      {spec.value}{spec.unit ? <span className="ml-1 font-medium text-ink-2">{spec.unit}</span> : null}
    </span>
  );
}

/** A spec with its kind, value, note, sources and the always-on verify tag. */
export function SpecBlock({ unit, spec, skip }) {
  if (!spec) return null;
  return (
    <div className="rounded-lg border border-heat-line bg-heat-soft/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-heat-text">
        {SPEC_KIND_LABEL[spec.kind] || 'Spec'}
      </p>
      <p className="mt-0.5 text-lg"><SpecValue spec={spec} /></p>
      {spec.note && <p className="mt-0.5 text-sm text-ink-2"><Glossed text={spec.note} skip={skip} /></p>}
      <div className="mt-2"><VerifyTag /></div>
      <SourceLinks unit={unit} ids={spec.sourceIds} className="mt-2" />
    </div>
  );
}

/**
 * Everything about one step. Used by the walkthrough and the after-answer explanations.
 * Its ways to go wrong start collapsed, except on a critical step or when `mistakesOpen`.
 */
export function StepCard({ unit, step, compact = false, mistakesOpen = false }) {
  const phase = unit.phaseById[step.phase];
  // Each term is linked once per card: in the first of these it appears in.
  const [, whySkip, specSkip] = glossSkips([step.action, step.why, step.spec?.note]);
  const initial = mistakesOpen || !!step.critical;
  const [m, setM] = useState({ id: step.id, open: initial });
  if (m.id !== step.id) setM({ id: step.id, open: initial });
  const open = m.id === step.id ? m.open : initial;
  const sectionId = `ways-${step.id}`;
  const toggle = () => setM({ id: step.id, open: !open });
  const fromHeader = () => {
    setM({ id: step.id, open: true });
    requestAnimationFrame(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };
  return (
    <article className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="tabnum text-sm font-semibold text-brand-text">Step {step.order}</span>
        {phase && <span className="text-sm text-ink-3">{phase.name}</span>}
        {step.critical && <CriticalBadge />}
        <MistakeCount step={step} open={open} onClick={fromHeader} />
      </div>
      <h2 className="text-xl font-semibold leading-snug text-ink">{step.title}</h2>
      {step.action && <p className="mt-2 text-base leading-relaxed text-ink-2"><Glossed text={step.action} /></p>}

      <PartStrip unit={unit} step={step} className="mt-3" />

      {step.why && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Why here</p>
          <p className="mt-0.5 text-base leading-relaxed text-ink-2"><Glossed text={step.why} skip={whySkip} /></p>
        </div>
      )}

      {!compact && step.tools.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Tools</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {step.tools.map((t) => <li key={t}><Pill><Glossed text={t} /></Pill></li>)}
          </ul>
        </div>
      )}

      {step.spec && <div className="mt-3"><SpecBlock unit={unit} spec={step.spec} skip={specSkip} /></div>}

      <MistakeSection unit={unit} step={step} open={open} onToggle={toggle} id={sectionId} />

      {!compact && step.sourceIds.length > 0 && (
        <details className="mt-3">
          <summary className="min-h-8 cursor-pointer text-sm text-ink-3">Sources for this step</summary>
          <SourceLinks unit={unit} ids={step.sourceIds} className="mt-1" />
        </details>
      )}
    </article>
  );
}

/** A check mark that draws itself, stroke by stroke. */
export function DrawnCheck({ size = 20, strokeWidth = 2.4, className = '' }) {
  return (
    <svg
      aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`draw-check flex-shrink-0 ${className}`}
    >
      <path d="m5 12.5 4.5 4.5L19 7.5" pathLength="1" />
    </svg>
  );
}

/**
 * The quiet "got it" for answers that are not a choice (a self-graded card, a
 * perfect order): a soft green bloom with a check that draws itself.
 */
export function CorrectFlourish({ children, className = '' }) {
  return (
    <div className={`bloom flex min-h-14 items-center gap-3 rounded-xl border-2 border-ok bg-ok-soft px-4 py-3 text-ok-text ${className}`} role="status">
      <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-surface/70"><DrawnCheck size={20} /></span>
      <span className="min-w-0 flex-1 text-base font-semibold leading-snug">{children}</span>
    </div>
  );
}

/**
 * A big tappable answer. state: idle | right | wrong | dim.
 * `bloom` marks the learner's own right pick: it glows from the inside and draws its check.
 * Once answered (`disabled`) it is aria-disabled rather than disabled, so a tap on it
 * still reaches the page and can skip the pause before the next question.
 */
export function ChoiceButton({ state = 'idle', onClick, disabled, children, lead, bloom = false }) {
  const tone = {
    idle: 'border-line bg-surface text-ink hover:border-brand-line hover:bg-brand-soft/40 active:bg-brand-soft/70',
    right: 'border-ok bg-ok-soft text-ok-text',
    wrong: 'border-bad bg-bad-soft text-bad-text',
    dim: 'border-line bg-surface text-ink-3 opacity-55',
  }[state];
  return (
    <button
      type="button" onClick={disabled ? undefined : onClick} aria-disabled={disabled ? 'true' : undefined}
      className={`choice flex min-h-14 w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-base font-medium leading-snug ${tone} ${bloom ? 'bloom' : ''} ${disabled ? 'cursor-default' : ''}`}
    >
      {lead != null && <span className="tabnum grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-sunken text-sm text-ink-2">{lead}</span>}
      <span className="min-w-0 flex-1">{children}</span>
      {state === 'right' && (bloom ? <DrawnCheck /> : <Icon name="check" size={20} strokeWidth={2.4} />)}
      {state === 'wrong' && <Icon name="x" size={20} strokeWidth={2.4} />}
    </button>
  );
}

/**
 * Fixed bottom bar for game screens, where the thumb is. Pass the screen's
 * `beat` (from useAutoAdvance) and, while a right answer is counting down, a
 * hairline along its top edge fills as the next question approaches.
 */
export function ActionBar({ children, beat }) {
  const hairline = beat?.running ? beat.bar : null;
  return (
    <div data-action-bar="" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/90">
      {hairline && (
        <>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-px h-0.5 overflow-hidden">
            <div ref={hairline} className="beat-bar h-full w-full bg-ok" />
          </div>
          <p className="sr-only" role="status">Next one in a moment. Press Enter to go now.</p>
        </>
      )}
      <div className="mx-auto flex max-w-2xl gap-2 px-4 py-3">{children}</div>
    </div>
  );
}
