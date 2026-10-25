import { Fragment, memo, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';
import { PartImage, PartThumb } from './parts.jsx';
import { DefineContext, useDefine } from './glossaryContext.js';
import { segment, termUsage, TERM_BY_ID } from '../engine/glossary.js';
import { termCategoryLabel, LEADS_TO } from '../data/glossary.js';
import { PART_BY_ID } from '../data/parts.js';

// Always a fresh Set: Glossed adds to it while rendering, and must never mutate a prop.
const asSet = (v) => new Set(v == null ? [] : typeof v === 'string' ? [v] : v);

/**
 * Text with its dictionary terms as tappable words. Each term is linked once
 * per block (its first appearance) unless `all` is set. `skip` holds terms an
 * earlier block in the same card already linked; `exclude` holds terms never
 * to link here (the term being defined, or the part on its own page).
 *
 * Do not use it on quiz choices or anything shown before an answer that could
 * give the answer away: those stay plain text.
 */
export const Glossed = memo(function Glossed({ text, all = false, skip, exclude }) {
  const define = useDefine();
  if (!text) return null;
  if (!define) return text;
  const segs = segment(text);
  if (!segs.some((s) => s.termId)) return text;
  const seen = asSet(skip);
  const never = asSet(exclude);
  return segs.map((s, i) => {
    if (!s.termId || never.has(s.termId) || (!all && seen.has(s.termId))) return <Fragment key={i}>{s.text}</Fragment>;
    seen.add(s.termId);
    return (
      <button
        key={i} type="button" className="gloss" aria-label={`Define ${s.text}`}
        onClick={(e) => { e.stopPropagation(); define(s.termId); }}
      >
        {s.text}
      </button>
    );
  });
});

/** Aliases worth showing: not the term itself and not a plain plural of it. */
function shownAliases(term) {
  const base = term.term.toLowerCase();
  return term.aliases.filter((a) => {
    const l = a.toLowerCase();
    return l !== base && l !== `${base}s` && l !== `${base}es` && `${l}s` !== base;
  });
}

const chip = 'inline-flex min-h-11 items-center rounded-full border border-brand-line bg-brand-soft px-4 text-sm font-medium text-brand-text hover:bg-brand-soft/70';

/**
 * Everything about one term. `onPick` switches to another term in place (the
 * sheet); without it, related terms link to their dictionary pages.
 * `size`: "sheet" and "page" show the full picture set, "inline" a thumbnail.
 */
export function TermBody({ term, onPick, onLeave, size = 'page', headingLevel = 2 }) {
  const H = `h${headingLevel + 1}`;
  const part = term.part ? PART_BY_ID[term.part] : null;
  const usage = termUsage(term.id);
  const aliases = shownAliases(term);
  const label = 'text-xs font-semibold uppercase tracking-wide text-ink-3';

  return (
    <div className="space-y-4">
      <div>
        {aliases.length > 0 && (
          <p className="mb-1.5 text-sm text-ink-3">Also written: {aliases.join(', ')}</p>
        )}
        {term.short && (
          <p className={`${size === 'inline' ? 'text-base' : 'text-lg'} leading-relaxed text-ink`}>
            <Glossed text={term.short} exclude={term.id} />
          </p>
        )}
        {term.long && (
          <p className="mt-2 text-base leading-relaxed text-ink-2">
            <Glossed text={term.long} exclude={term.id} />
          </p>
        )}
      </div>

      {part && (
        <div>
          <H className={`${label} mb-1.5`}>What it looks like</H>
          {size === 'inline' ? (
            <Link to={`/part/${part.id}`} onClick={onLeave} className="flex min-h-11 items-center gap-3 rounded-lg hover:bg-sunken">
              <PartThumb partId={part.id} className="w-28 flex-shrink-0" />
              <span className="min-w-0 flex-1 text-base font-medium text-brand-text underline decoration-brand-line underline-offset-2">
                {part.name}: part page
              </span>
              <Icon name="chevron" size={16} className="text-ink-3" />
            </Link>
          ) : (
            <>
              <PartImage key={part.id} partId={part.id} />
              <Link
                to={`/part/${part.id}`} onClick={onLeave}
                className="mt-2 flex min-h-11 items-center justify-center gap-1 rounded-lg border border-line px-4 text-base font-medium text-brand-text hover:bg-sunken"
              >
                {part.name}: full part page <Icon name="chevron" size={16} />
              </Link>
            </>
          )}
        </div>
      )}

      {[
        ['Builds on', term.requires],
        ['Leads to', LEADS_TO[term.id] || []],
        ['See also', term.seeAlso.filter((id) => !term.requires.includes(id) && !(LEADS_TO[term.id] || []).includes(id))],
      ].filter(([, ids]) => ids.length > 0).map(([title, ids]) => (
        <div key={title}>
          <H className={`${label} mb-1.5`}>{title}</H>
          <ul className="flex flex-wrap gap-2">
            {ids.map((id) => {
              const t = TERM_BY_ID[id];
              return (
                <li key={id}>
                  {onPick ? (
                    <button type="button" className={chip} onClick={() => onPick(id)}>{t.term}</button>
                  ) : (
                    <Link to={`/dictionary/${id}`} onClick={onLeave} className={chip}>{t.term}</Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {usage.length > 0 && (
        <div>
          <H className={`${label} mb-1`}>Appears in</H>
          <ul className="divide-y divide-line-2 rounded-lg border border-line">
            {usage.map(({ unit, steps, first }) => (
              <li key={unit.id}>
                <Link
                  to={`/unit/${unit.id}/walk?step=${first}`} onClick={onLeave}
                  className="flex min-h-11 items-center gap-3 px-3 py-2 hover:bg-sunken"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-medium text-ink">{unit.name}</span>
                    <span className="block text-sm text-ink-3">First in step {first}</span>
                  </span>
                  <span className="tabnum flex-shrink-0 text-sm font-semibold text-brand-text">
                    {steps} step{steps === 1 ? '' : 's'}
                  </span>
                  <Icon name="chevron" size={16} className="flex-shrink-0 text-ink-3" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * The definition as a bottom sheet over the current screen, like the part
 * sheet, so a game in progress is never lost. Related terms replace the
 * content in place, with a Back button to retrace.
 */
function TermSheet({ stack, onPick, onBack, onClose }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  const id = stack[stack.length - 1];
  const term = TERM_BY_ID[id];

  useEffect(() => {
    const d = ref.current;
    if (!d) return undefined;
    if (!d.open) d.showModal?.();
    const onClosed = () => closeRef.current();
    d.addEventListener('close', onClosed);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      d.removeEventListener('close', onClosed);
      document.body.style.overflow = prev;
    };
  }, []);

  // A new term starts at the top of the sheet.
  useEffect(() => { ref.current?.scrollTo?.(0, 0); }, [id]);

  if (!term) return null;
  const close = () => ref.current?.close();
  const prevTerm = stack.length > 1 ? TERM_BY_ID[stack[stack.length - 2]] : null;

  return (
    <dialog
      ref={ref} data-noswipe aria-labelledby="term-sheet-title"
      onClick={(e) => { if (e.target === ref.current) close(); }}
      className="sheet m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border-0 bg-surface p-0 text-ink shadow-xl backdrop:bg-black/55 sm:m-auto sm:max-w-lg sm:rounded-2xl"
    >
      <div className="sticky top-0 z-10 flex items-center gap-1 border-b border-line-2 bg-surface px-2 py-2">
        {prevTerm && (
          <button type="button" onClick={onBack} aria-label={`Back to ${prevTerm.term}`} className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-lg text-ink-2 hover:bg-sunken">
            <Icon name="back" size={22} />
          </button>
        )}
        <div className={`min-w-0 flex-1 ${prevTerm ? '' : 'pl-2'}`}>
          <h2 id="term-sheet-title" className="truncate text-lg font-semibold text-ink">{term.term}</h2>
          <p className="text-xs text-ink-3">{termCategoryLabel(term.category)}</p>
        </div>
        <button type="button" onClick={close} aria-label="Close" className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-lg text-ink-2 hover:bg-sunken">
          <Icon name="x" size={22} />
        </button>
      </div>
      <div key={id} className="safe-bottom space-y-4 px-4 pb-4 pt-3">
        <TermBody term={term} onPick={onPick} onLeave={close} size="sheet" />
        <Link
          to={`/dictionary/${term.id}`} onClick={close}
          className="flex min-h-11 items-center justify-center gap-1 rounded-lg px-4 text-sm font-medium text-ink-2 hover:bg-sunken"
        >
          <Icon name="book" size={16} /> Open in the dictionary
        </Link>
      </div>
    </dialog>
  );
}

/**
 * Wrap the app once. Glossed words anywhere below call define(termId), which
 * opens the sheet without touching the screen underneath. Leaving the page
 * closes it.
 */
export function GlossaryProvider({ children }) {
  const [stack, setStack] = useState([]);
  const define = useCallback((id) => {
    if (!TERM_BY_ID[id]) return;
    setStack((s) => (s[s.length - 1] === id ? s : [...s, id].slice(-20)));
  }, []);
  const back = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const close = useCallback(() => setStack([]), []);

  // Close on any navigation. The full location, not just `key`: HashRouter gives
  // every state-less entry (a typed URL, some back/forward) the same key "default".
  const loc = useLocation();
  const key = `${loc.key}|${loc.pathname}|${loc.search}|${loc.hash}`;
  const [at, setAt] = useState(key);
  if (at !== key) {
    setAt(key);
    if (stack.length) setStack([]);
  }

  return (
    <DefineContext.Provider value={define}>
      {children}
      {stack.length > 0 && <TermSheet stack={stack} onPick={define} onBack={back} onClose={close} />}
    </DefineContext.Provider>
  );
}
