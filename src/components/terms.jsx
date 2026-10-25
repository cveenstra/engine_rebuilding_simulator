import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useDefine } from './glossaryContext.js';
import { STATUS_LABEL } from '../engine/terms.js';


const STATUS_DOT = {
  locked: 'border border-line bg-transparent',
  new: 'border-2 border-brand bg-transparent',
  learning: 'bg-brand',
  learned: 'bg-ok/60',
  mature: 'bg-ok',
};

/** A small status marker with its name for screen readers (and optionally on screen). */
export function StatusDot({ status, showLabel = false, decorative = false }) {
  return (
    <span className="inline-flex flex-shrink-0 items-center gap-1.5">
      {status === 'locked'
        ? <Icon name="lock" size={14} className="text-ink-3" />
        : <span aria-hidden="true" className={`block h-3 w-3 rounded-full ${STATUS_DOT[status]}`} />}
      {showLabel ? <span className="text-xs text-ink-3">{STATUS_LABEL[status]}</span> : decorative ? null : <span className="sr-only">{STATUS_LABEL[status]}</span>}
    </span>
  );
}

/** Mature, learned, learning, new and locked as one bar, with a text equivalent. */
export function StatusBar({ counts, className = '' }) {
  const total = counts.total || 1;
  const parts = [
    ['mature', 'bg-ok'], ['learned', 'bg-ok/60'], ['learning', 'bg-brand'], ['new', 'bg-brand/25'],
  ];
  const text = ['mature', 'learned', 'learning', 'new', 'locked'].filter((k) => counts[k]).map((k) => `${counts[k]} ${STATUS_LABEL[k].toLowerCase()}`).join(', ');
  return (
    <div className={className}>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-sunken" role="img" aria-label={text || 'No terms'}>
        {parts.map(([k, cls]) => counts[k] ? <span key={k} className={cls} style={{ width: `${(counts[k] / total) * 100}%` }} /> : null)}
      </div>
    </div>
  );
}

export function StatusLegend({ className = '' }) {
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1 ${className}`}>
      {['mature', 'learned', 'learning', 'new', 'locked'].map((k) => (
        <li key={k}><StatusDot status={k} showLabel /></li>
      ))}
    </ul>
  );
}

/** Term names as chips that open the definition sheet. */
export function TermChips({ terms, more = 0, className = '' }) {
  const define = useDefine();
  if (!terms.length) return null;
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {terms.map((t) => (
        <li key={t.id}>
          <button
            type="button" onClick={() => define?.(t.id)} aria-label={`Define ${t.term}`}
            className="inline-flex min-h-11 items-center rounded-full border border-brand-line bg-brand-soft px-4 text-sm font-medium text-brand-text hover:bg-brand-soft/70"
          >
            {t.term}
          </button>
        </li>
      ))}
      {more > 0 && <li className="inline-flex min-h-11 items-center px-2 text-sm text-ink-3">and {more} more</li>}
    </ul>
  );
}

/** "N new step cards wait for M terms": what is held, and on what. */
export function HeldNotice({ split, top, className = '' }) {
  if (!split.held.length) return null;
  const n = split.held.length;
  const t = split.terms.size;
  return (
    <div className={`rounded-xl border border-warn-line bg-warn-soft/60 p-4 ${className}`}>
      <p className="text-base font-semibold text-ink">
        {n} new step card{n === 1 ? '' : 's'} wait{n === 1 ? 's' : ''} for {t} term{t === 1 ? '' : 's'}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">
        A step joins review once every shop word in it is learned in Terms. The walkthrough is always open.
      </p>
      <TermChips terms={top} more={Math.max(0, t - top.length)} className="mt-3" />
      <Link to="/terms" className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-text underline underline-offset-2">
        Learn them in Terms <Icon name="chevron" size={14} />
      </Link>
    </div>
  );
}
