import { useId, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader, Chip, ChipRow, Empty, Button, Pill, Card } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { TermBody } from '../components/glossary.jsx';
import { TERMS, TERM_BY_ID, searchTerms } from '../engine/glossary.js';
import { GLOSSARY_CATEGORIES, termCategoryLabel, letterOf } from '../data/glossary.js';

function NoGlossary() {
  return (
    <Empty title="The dictionary is on its way" action={<Button to="/" variant="ghost">Back to the garage</Button>}>
      Terms appear here, and as tappable words across the app, as soon as the glossary file lands.
    </Empty>
  );
}

/** One row of the A to Z list: tap to open the definition in place. */
function TermRow({ term, open, onToggle }) {
  const bodyId = useId();
  return (
    <li className="border-b border-line-2 last:border-0">
      <button
        type="button" onClick={onToggle} aria-expanded={open} aria-controls={bodyId}
        className="flex min-h-14 w-full items-start gap-3 px-4 py-3 text-left hover:bg-sunken"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-ink">{term.term}</span>
          {!open && term.short && <span className="mt-0.5 line-clamp-2 block text-sm leading-snug text-ink-2">{term.short}</span>}
        </span>
        <Icon name="chevron" size={18} className={`mt-0.5 flex-shrink-0 text-ink-3 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div id={bodyId} className="space-y-3 px-4 pb-4">
          <p className="text-xs text-ink-3">{termCategoryLabel(term.category)}</p>
          <TermBody term={term} size="inline" headingLevel={3} />
          <Link
            to={`/dictionary/${term.id}`}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-text underline decoration-brand-line underline-offset-2"
          >
            Open as its own page <Icon name="chevron" size={14} />
          </Link>
        </div>
      )}
    </li>
  );
}

function DictionaryList() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const cat = GLOSSARY_CATEGORIES.some(([c]) => c === params.get('cat')) ? params.get('cat') : '';
  const [open, setOpen] = useState(() => new Set());

  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  const counts = useMemo(() => {
    const m = new Map();
    for (const t of TERMS) m.set(t.category, (m.get(t.category) || 0) + 1);
    return m;
  }, []);
  const results = useMemo(() => searchTerms(q, cat), [q, cat]);
  const groups = useMemo(() => {
    if (q.trim()) return null;
    const g = new Map();
    for (const t of results) {
      const l = letterOf(t);
      if (!g.has(l)) g.set(l, []);
      g.get(l).push(t);
    }
    return [...g.entries()];
  }, [results, q]);

  const toggle = (id) => setOpen((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const jump = (l) => document.getElementById(`dict-${l}`)?.scrollIntoView({ block: 'start' });

  if (!TERMS.length) return <div><PageHeader title="Dictionary" /><NoGlossary /></div>;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dictionary"
        sub="Shop words in plain English. Any word with a dotted underline elsewhere in the app opens its meaning here."
      />

      <div className="flex flex-wrap gap-2">
        <Button to="/terms" variant="soft"><Icon name="cards" size={18} /> Drill these terms</Button>
      </div>

      <div>
        <label htmlFor="dict-search" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-3">Search terms</label>
        <input
          id="dict-search" type="search" value={q} onChange={(e) => setParam('q', e.target.value)}
          placeholder="Bearing, TDC, torque..." autoComplete="off" spellCheck="false"
          className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>

      <ChipRow>
        <Chip active={!cat} onClick={() => setParam('cat', '')}>All {TERMS.length}</Chip>
        {GLOSSARY_CATEGORIES.filter(([c]) => counts.get(c)).map(([c, label]) => (
          <Chip key={c} active={cat === c} onClick={() => setParam('cat', cat === c ? '' : c)}>{label} {counts.get(c)}</Chip>
        ))}
      </ChipRow>

      <p className="text-sm text-ink-3" aria-live="polite">
        {results.length} term{results.length === 1 ? '' : 's'}{q.trim() ? ` matching "${q.trim()}"` : ''}
      </p>

      {groups && groups.length > 1 && (
        <nav aria-label="Jump to letter" className="scroll-x -mx-4 px-4 sm:mx-0 sm:px-0">
          <ul className="flex gap-1">
            {groups.map(([l]) => (
              <li key={l}>
                <button type="button" onClick={() => jump(l)} aria-label={`Jump to ${l === '#' ? 'numbers and symbols' : l}`}
                  className="grid h-11 w-9 place-items-center rounded-lg text-sm font-semibold text-brand-text hover:bg-brand-soft">
                  {l}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {!results.length ? (
        <Empty title="No term matches that">Try a shorter word, or clear the category filter.</Empty>
      ) : groups ? (
        <div className="space-y-4">
          {groups.map(([l, list]) => (
            <section key={l} id={`dict-${l}`} aria-labelledby={`dict-h-${l}`} className="scroll-mt-16">
              <h2 id={`dict-h-${l}`} className="sticky top-14 z-10 -mx-1 mb-1 bg-canvas/95 px-1 py-1 text-sm font-bold text-ink-3 backdrop-blur">
                {l === '#' ? '0 to 9' : l}
              </h2>
              <Card as="ul">
                {list.map((t) => <TermRow key={t.id} term={t} open={open.has(t.id)} onToggle={() => toggle(t.id)} />)}
              </Card>
            </section>
          ))}
        </div>
      ) : (
        <Card as="ul">
          {results.map((t) => <TermRow key={t.id} term={t} open={open.has(t.id)} onToggle={() => toggle(t.id)} />)}
        </Card>
      )}
    </div>
  );
}

function TermPage({ termId }) {
  const term = TERM_BY_ID[termId];
  const back = { to: '/dictionary', label: 'Dictionary' };
  if (!TERMS.length) return <div><PageHeader title="Dictionary" back={back} /><NoGlossary /></div>;
  if (!term) {
    return (
      <div>
        <PageHeader title="Term not found" back={back} />
        <Empty title="That term is not in the dictionary" action={<Button to="/dictionary" variant="ghost">Browse the dictionary</Button>} />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={term.term} back={back}>
        <div className="mt-2"><Pill>{termCategoryLabel(term.category)}</Pill></div>
      </PageHeader>
      <TermBody key={term.id} term={term} size="page" />
    </div>
  );
}

export default function Dictionary() {
  const { termId } = useParams();
  return termId ? <TermPage termId={termId} /> : <DictionaryList />;
}
