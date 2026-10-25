import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Card, Chip, ChipRow, Empty, PageHeader } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { UnitMissing } from '../components/bench.jsx';
import { MistakeItem, SeverityBadge, SeverityBars } from '../components/mistakes.jsx';
import { useUnit, DISCLAIMER } from '../engine/unit.js';
import { useProgress } from '../engine/storage.js';
import { SEVERITIES, severityMeta, mistakeStats, wreckLine, mistakeSummary } from '../engine/mistakes.js';

const NONE = 'unrated';
const sevKey = (m) => m.severity || NONE;
const fold = (s) => String(s || '').toLowerCase();

/** Every word of the query appears in the mistake or its step title. */
function matches(m, step, words) {
  if (!words.length) return true;
  const hay = fold([m.title, m.what, m.consequence, m.prevent, m.detect, step?.title, step && `step ${step.order}`].join(' '));
  return words.every((w) => hay.includes(w));
}

function Checklist({ unit, groups, ticked, onTick }) {
  const total = groups.reduce((n, g) => n + g.items.filter((m) => m.prevent).length, 0);
  if (!total) {
    return <Empty title="No prevent lines in this filter">Older one-line mistakes have no prevent line yet. Widen the filter to see more.</Empty>;
  }
  return (
    <div className="space-y-5">
      <div className="hidden print:block">
        <h1 className="text-xl font-semibold">{unit.name}: pre-flight checklist</h1>
        <p className="mt-1 text-sm">{unit.fullName}</p>
      </div>
      {groups.map(({ phase, items }) => {
        const lines = items.filter((m) => m.prevent);
        if (!lines.length) return null;
        return (
          <section key={phase.id} className="print-break">
            <h2 className="mb-2 text-base font-semibold text-ink">
              {phase.name} <span className="tabnum font-normal text-ink-3">({lines.length})</span>
            </h2>
            <ul className="divide-y divide-line-2 rounded-xl border border-line bg-surface">
              {lines.map((m) => {
                const step = unit.stepById[m.stepId];
                const id = `chk-${m.id}`;
                return (
                  <li key={m.id} className="print-break">
                    <label htmlFor={id} className="flex min-h-12 cursor-pointer items-start gap-3 px-3 py-2.5">
                      <input
                        id={id} type="checkbox" checked={ticked.has(m.id)} onChange={() => onTick(m.id)}
                        className="mt-0.5 h-5 w-5 flex-shrink-0 accent-[var(--c-brand)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-base leading-snug ${ticked.has(m.id) ? 'text-ink-3 line-through print:no-underline' : 'text-ink'}`}>{m.prevent}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
                          <span className="tabnum">Step {step?.order}: {step?.title}</span>
                          <span className="inline-flex items-center gap-1"><SeverityBars n={severityMeta(m.severity).bars} size={10} />{severityMeta(m.severity).short}</span>
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <p className="text-xs leading-relaxed text-ink-3">{DISCLAIMER}</p>
    </div>
  );
}

export default function Mistakes() {
  const unit = useUnit();
  const state = useProgress();
  const [params, setParams] = useSearchParams();
  const [ticked, setTicked] = useState(() => new Set());
  if (!unit) return <UnitMissing />;

  const all = unit.mistakes;
  const stats = mistakeStats(unit);
  const back = { to: `/unit/${unit.id}`, label: unit.name };
  if (!all.length) {
    return (
      <div>
        <PageHeader title="Ways to screw up" back={back} />
        <Empty title="No mistakes written for this unit yet" action={<Button to={back.to} variant="ghost">Back to {unit.name}</Button>}>
          They show up here, step by step, as soon as the content lands.
        </Empty>
      </div>
    );
  }

  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };
  const view = params.get('view') === 'checklist' ? 'checklist' : 'list';
  const sevs = new Set((params.get('sev') || '').split(',').filter((s) => s === NONE || SEVERITIES.includes(s)));
  const phaseId = unit.phaseById[params.get('phase')] ? params.get('phase') : '';
  const q = params.get('q') || '';
  const words = fold(q).split(/\s+/).filter(Boolean);

  const toggleSev = (s) => {
    const next = new Set(sevs);
    if (next.has(s)) next.delete(s); else next.add(s);
    setParam('sev', [...next].join(','));
  };

  const sevChips = [...SEVERITIES, NONE].filter((s) => (s === NONE ? stats.unrated : stats.bySeverity[s]) > 0);
  const phasesWith = unit.phases.filter((p) => all.some((m) => unit.stepById[m.stepId]?.phase === p.id));

  const shown = all.filter((m) => {
    const step = unit.stepById[m.stepId];
    return (!sevs.size || sevs.has(sevKey(m)))
      && (!phaseId || step?.phase === phaseId)
      && matches(m, step, words);
  });
  const groups = unit.phases
    .map((phase) => ({ phase, items: shown.filter((m) => unit.stepById[m.stepId]?.phase === phase.id) }))
    .filter((g) => g.items.length);
  const drill = mistakeSummary(unit, [], state);
  const tick = (id) => setTicked((t) => { const n = new Set(t); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="space-y-5">
      <div className="print-hide">
        <PageHeader title="Ways to screw up" sub={`${wreckLine(stats)}. Every one, in rebuild order, so you can get ahead of it.`} back={back} />

        <div className="flex flex-wrap gap-1.5" aria-label="Count by severity">
          {SEVERITIES.filter((s) => stats.bySeverity[s]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1">
              <SeverityBadge severity={s} /><span className="tabnum text-sm font-semibold text-ink-2">{stats.bySeverity[s]}</span>
            </span>
          ))}
        </div>

        {drill.total > 0 && (
          <Button to={`/unit/${unit.id}/mistakes/drill`} variant="soft" className="mt-4 w-full sm:w-auto">
            <Icon name="play" size={18} /> Mistake drill{drill.due ? `: ${drill.due} due` : ''}
          </Button>
        )}
      </div>

      <div className="print-hide space-y-3">
        <div role="group" aria-label="View" className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-sunken p-1">
          {[['list', 'All mistakes', 'alert'], ['checklist', 'Pre-flight checklist', 'checklist']].map(([v, label, icon]) => (
            <button
              key={v} type="button" aria-pressed={view === v} onClick={() => setParam('view', v === 'list' ? '' : v)}
              className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium ${
                view === v ? 'bg-brand text-brand-ink shadow-sm' : 'text-ink-2 hover:bg-surface hover:text-ink'}`}
            >
              <Icon name={icon} size={16} /> {label}
            </button>
          ))}
        </div>

        <label className="relative block">
          <span className="sr-only">Search mistakes</span>
          <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            type="search" value={q} onChange={(e) => setParam('q', e.target.value)} placeholder="Search: seal, torque, step 40..."
            className="min-h-11 w-full rounded-lg border border-line bg-surface py-2 pl-10 pr-3 text-base text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </label>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-3">Severity</p>
          <ChipRow>
            <Chip active={!sevs.size} onClick={() => setParam('sev', '')}>All</Chip>
            {sevChips.map((s) => (
              <Chip key={s} active={sevs.has(s)} onClick={() => toggleSev(s)}>
                <span className="inline-flex items-center gap-1.5">
                  <SeverityBars n={s === NONE ? 0 : severityMeta(s).bars} />
                  {s === NONE ? 'Not rated' : severityMeta(s).short}
                  <span className="tabnum opacity-75">{s === NONE ? stats.unrated : stats.bySeverity[s]}</span>
                </span>
              </Chip>
            ))}
          </ChipRow>
        </div>

        {phasesWith.length > 1 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-3">Phase</p>
            <ChipRow>
              <Chip active={!phaseId} onClick={() => setParam('phase', '')}>All phases</Chip>
              {phasesWith.map((p) => (
                <Chip key={p.id} active={phaseId === p.id} onClick={() => setParam('phase', phaseId === p.id ? '' : p.id)}>{p.name}</Chip>
              ))}
            </ChipRow>
          </div>
        )}

        <div className="flex items-center gap-2">
          <p className="tabnum min-w-0 flex-1 text-sm text-ink-3" role="status">
            {shown.length === all.length ? `All ${all.length}` : `${shown.length} of ${all.length}`}{view === 'checklist' ? ' mistakes, as prevent lines' : ''}
          </p>
          {view === 'checklist' && (
            <Button variant="ghost" className="flex-shrink-0 px-3" onClick={() => window.print()}>
              <Icon name="print" size={18} /> Print
            </Button>
          )}
        </div>
      </div>

      {!groups.length && (
        <Empty
          title="Nothing matches"
          action={<Button variant="ghost" onClick={() => setParams(view === 'checklist' ? { view } : {}, { replace: true })}>Clear filters</Button>}
        >
          Try fewer words, or another severity or phase.
        </Empty>
      )}

      {view === 'checklist' && groups.length > 0 && <Checklist unit={unit} groups={groups} ticked={ticked} onTick={tick} />}

      {view === 'list' && groups.map(({ phase, items }) => (
        <section key={phase.id}>
          <h2 className="mb-2 text-base font-semibold text-ink">
            {phase.name} <span className="tabnum font-normal text-ink-3">({items.length})</span>
          </h2>
          <Card as="ul" className="divide-y divide-line-2 overflow-hidden">
            {items.map((m) => <li key={m.id}><MistakeItem unit={unit} m={m} showStep /></li>)}
          </Card>
        </section>
      ))}
    </div>
  );
}
