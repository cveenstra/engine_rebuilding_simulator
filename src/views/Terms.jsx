import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, PageHeader, SectionTitle, Chip, ChipRow, Button, Empty, Stat } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { StatusBar, StatusLegend } from '../components/terms.jsx';
import { useProgress, getPref, setPref } from '../engine/storage.js';
import { REAL_UNITS, UNITS } from '../data/index.js';
import { GLOSSARY_CATEGORIES, TERMS } from '../data/glossary.js';
import { termSummary, termBreakdown, hasTerms, newPerDay, perDayLabel, scopeTerms, recordsOf } from '../engine/terms.js';
import { dueAt, formatGap } from '../engine/ladder.js';

const MODES = [
  ['ask', 'Questions', 'Pick from four. Questions get harder as you learn a term.'],
  ['flip', 'Flip cards', 'See the term, say what it means, then grade yourself.'],
];

/** When the next term in a scope comes back, as "10 min" or "3 days", or null. */
function nextBack(scope, state) {
  const records = recordsOf(state);
  const now = Date.now();
  let soonest = Infinity;
  for (const t of scopeTerms(scope)) {
    const r = records[t.id];
    if (r?.seen) { const d = dueAt(r); if (d > now && d < soonest) soonest = d; }
  }
  return Number.isFinite(soonest) ? formatGap(soonest - now) : null;
}

export default function Terms() {
  const state = useProgress();
  const [params, setParams] = useSearchParams();
  const units = REAL_UNITS.length ? REAL_UNITS : UNITS;
  const unitId = units.some((u) => u.id === params.get('unit')) ? params.get('unit') : '';
  const category = GLOSSARY_CATEGORIES.some(([c]) => c === params.get('cat')) ? params.get('cat') : '';
  const [mode, setMode] = useState(() => (getPref('termMode', 'ask') === 'flip' ? 'flip' : 'ask'));

  if (!hasTerms()) {
    return (
      <div>
        <PageHeader title="Terms" />
        <Empty title="No terms yet" action={<Button to="/" variant="ghost">Back to the garage</Button>}>
          The term drill needs at least four defined terms.
        </Empty>
      </div>
    );
  }

  const scope = { unitId, category };
  const s = termSummary(scope, state);
  const { byGroup, byUnit } = termBreakdown(state);
  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };
  const pickMode = (m) => { setMode(m); setPref('termMode', m); };
  const query = new URLSearchParams({ ...(unitId && { unit: unitId }), ...(category && { cat: category }), mode }).toString();
  const waiting = s.due + s.newToday;
  const later = waiting ? null : nextBack(scope, state);
  const cats = GLOSSARY_CATEGORIES.filter(([c]) => TERMS.some((t) => t.category === c && t.short));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Terms"
        sub="Learn the shop language one term at a time, basics first. A right answer moves a term up a rung and a miss moves it down. The higher it climbs, the longer until you see it again, from minutes to weeks."
      />

      <Card className="p-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Due now" value={s.due} />
          <Stat label="New today" value={s.newToday} note={newPerDay() === Infinity ? 'no daily limit' : `of ${newPerDay()} a day`} />
          <Stat label="Learned" value={s.learned + s.mature} note={`of ${s.total}`} />
        </div>
        <StatusBar counts={s} className="mt-4" />
        <StatusLegend className="mt-2" />
        {s.locked > 0 && (
          <p className="mt-2 text-sm text-ink-3">{s.locked} term{s.locked === 1 ? ' is' : 's are'} locked until you learn what {s.locked === 1 ? 'it builds' : 'they build'} on.</p>
        )}
      </Card>

      <section>
        <SectionTitle sub="Filters keep the basic terms each one builds on, so nothing gets stuck behind a term you filtered out.">What to drill</SectionTitle>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-3">Unit</p>
        <ChipRow className="mb-3">
          <Chip active={!unitId} onClick={() => setParam('unit', '')}>All units</Chip>
          {units.map((u) => <Chip key={u.id} active={unitId === u.id} onClick={() => setParam('unit', u.id)}>{u.name}</Chip>)}
        </ChipRow>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-3">Type</p>
        <ChipRow className="mb-3">
          <Chip active={!category} onClick={() => setParam('cat', '')}>All types</Chip>
          {cats.map(([c, label]) => <Chip key={c} active={category === c} onClick={() => setParam('cat', c)}>{label}</Chip>)}
        </ChipRow>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-3">How</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {MODES.map(([m, label, note]) => (
            <button
              key={m} type="button" onClick={() => pickMode(m)} aria-pressed={mode === m}
              className={`min-h-14 rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                mode === m ? 'border-brand bg-brand-soft/50' : 'border-line bg-surface hover:bg-sunken'}`}
            >
              <span className="block text-base font-semibold text-ink">{label}</span>
              <span className="block text-sm leading-snug text-ink-3">{note}</span>
            </button>
          ))}
        </div>
      </section>

      <div>
        {waiting > 0 ? (
          <Button to={`/terms/drill?${query}`} className="w-full sm:w-auto">
            <Icon name="play" size={16} /> Start: {[s.due && `${s.due} due`, s.newToday && `${s.newToday} new`].filter(Boolean).join(', ')}
          </Button>
        ) : (
          <Card className="p-4">
            <p className="text-base font-semibold text-ink">Nothing waiting{unitId || category ? ' in this filter' : ''}</p>
            <p className="mt-1 text-sm text-ink-3">
              {later ? `The next term comes back in ${later}. ` : ''}
              {s.allowance === 0 ? 'You’ve had today’s new terms. More tomorrow.' : s.new === 0 && s.locked ? 'Keep reviewing to unlock more.' : ''}
            </p>
          </Card>
        )}
        <p className="mt-2 text-sm text-ink-3">
          {perDayLabel()}. <Link to="/more" className="underline underline-offset-2">Change in settings</Link>.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Link to="/terms/map" className="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 hover:bg-sunken">
          <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-text"><Icon name="map" size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-medium text-ink">Concept map</span>
            <span className="block text-sm text-ink-3">Every term by level, and what it builds on</span>
          </span>
          <Icon name="chevron" size={18} className="text-ink-3" />
        </Link>
        <Link to="/dictionary" className="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 hover:bg-sunken">
          <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-text"><Icon name="book" size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-medium text-ink">Dictionary</span>
            <span className="block text-sm text-ink-3">Look up any term, A to Z</span>
          </span>
          <Icon name="chevron" size={18} className="text-ink-3" />
        </Link>
      </div>

      <section>
        <SectionTitle sub="The terms each unit uses, plus the ones they build on.">By unit</SectionTitle>
        <Card as="ul" className="divide-y divide-line-2">
          {units.filter((u) => byUnit.has(u.id)).map((u) => {
            const c = byUnit.get(u.id);
            return (
              <li key={u.id} className="px-4 py-3">
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 text-base font-medium text-ink">{u.name}</span>
                  <span className="tabnum text-sm text-ink-3">{c.learned + c.mature} of {c.total} learned</span>
                </div>
                <StatusBar counts={c} className="mt-2" />
              </li>
            );
          })}
        </Card>
      </section>

      <section>
        <SectionTitle>By topic</SectionTitle>
        <Card as="ul" className="divide-y divide-line-2">
          {[...byGroup.entries()].map(([g, c]) => (
            <li key={g} className="px-4 py-3">
              <div className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 text-base font-medium text-ink">{g}</span>
                <span className="tabnum text-sm text-ink-3">{c.learned + c.mature} of {c.total} learned</span>
              </div>
              <StatusBar counts={c} className="mt-2" />
            </li>
          ))}
        </Card>
      </section>
    </div>
  );
}
