import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { Pill, Empty, Button } from './ui.jsx';
import { SPEC_KIND_LABEL } from '../data/index.js';

export function UnitMissing() {
  return (
    <Empty
      title="That unit is not loaded"
      action={<Button to="/" variant="ghost">Back to the garage</Button>}
    >
      Its content may still be on the way. Units appear here automatically once their data file lands.
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
export function SpecBlock({ unit, spec }) {
  if (!spec) return null;
  return (
    <div className="rounded-lg border border-heat-line bg-heat-soft/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-heat-text">
        {SPEC_KIND_LABEL[spec.kind] || 'Spec'}
      </p>
      <p className="mt-0.5 text-lg"><SpecValue spec={spec} /></p>
      {spec.note && <p className="mt-0.5 text-sm text-ink-2">{spec.note}</p>}
      <div className="mt-2"><VerifyTag /></div>
      <SourceLinks unit={unit} ids={spec.sourceIds} className="mt-2" />
    </div>
  );
}

/** Everything about one step. Used by the walkthrough and the after-answer explanations. */
export function StepCard({ unit, step, compact = false }) {
  const phase = unit.phaseById[step.phase];
  return (
    <article className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="tabnum text-sm font-semibold text-brand-text">Step {step.order}</span>
        {phase && <span className="text-sm text-ink-3">{phase.name}</span>}
        {step.critical && <CriticalBadge />}
      </div>
      <h2 className="text-xl font-semibold leading-snug text-ink">{step.title}</h2>
      {step.action && <p className="mt-2 text-base leading-relaxed text-ink-2">{step.action}</p>}

      {step.why && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Why here</p>
          <p className="mt-0.5 text-base leading-relaxed text-ink-2">{step.why}</p>
        </div>
      )}

      {!compact && step.tools.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Tools</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {step.tools.map((t) => <li key={t}><Pill>{t}</Pill></li>)}
          </ul>
        </div>
      )}

      {step.spec && <div className="mt-3"><SpecBlock unit={unit} spec={step.spec} /></div>}

      {step.mistake && (
        <div className="mt-3 rounded-lg border border-bad-line bg-bad-soft/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-bad-text">Common mistake</p>
          <p className="mt-0.5 text-sm leading-relaxed text-ink">{step.mistake}</p>
        </div>
      )}

      {!compact && step.sourceIds.length > 0 && (
        <details className="mt-3">
          <summary className="min-h-8 cursor-pointer text-sm text-ink-3">Sources for this step</summary>
          <SourceLinks unit={unit} ids={step.sourceIds} className="mt-1" />
        </details>
      )}
    </article>
  );
}

/** A big tappable answer. state: idle | right | wrong | dim */
export function ChoiceButton({ state = 'idle', onClick, disabled, children, lead }) {
  const tone = {
    idle: 'border-line bg-surface text-ink hover:border-brand-line hover:bg-brand-soft/40 active:bg-brand-soft/70',
    right: 'border-ok bg-ok-soft text-ok-text',
    wrong: 'border-bad bg-bad-soft text-bad-text',
    dim: 'border-line bg-surface text-ink-3 opacity-70',
  }[state];
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      className={`flex min-h-14 w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-base font-medium leading-snug transition-colors ${tone}`}
    >
      {lead != null && <span className="tabnum grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-sunken text-sm text-ink-2">{lead}</span>}
      <span className="min-w-0 flex-1">{children}</span>
      {state === 'right' && <Icon name="check" size={20} strokeWidth={2.4} />}
      {state === 'wrong' && <Icon name="x" size={20} strokeWidth={2.4} />}
    </button>
  );
}

/** Fixed bottom bar for game screens, where the thumb is. */
export function ActionBar({ children }) {
  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/90">
      <div className="mx-auto flex max-w-2xl gap-2 px-4 py-3">{children}</div>
    </div>
  );
}
