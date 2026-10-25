import { Link } from 'react-router-dom';
import { Card, PageHeader, SectionTitle, Bar, Pill, Stat } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { UnitMissing, SourceLinks } from '../components/bench.jsx';
import { useUnit, DISCLAIMER } from '../engine/unit.js';
import { UNIT_BY_ID, PHASE_KIND_LABEL, specSteps } from '../data/index.js';
import { useProgress } from '../engine/storage.js';
import { unitProgress, formatMs } from '../engine/progress.js';

function ModeTile({ to, icon, title, note, accent }) {
  return (
    <Link
      to={to}
      className={`flex min-h-20 items-start gap-3 rounded-xl border p-3 transition-colors ${
        accent ? 'border-brand bg-brand text-brand-ink hover:bg-brand-strong' : 'border-line bg-surface hover:border-brand-line hover:bg-brand-soft/40'}`}
    >
      <span className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg ${accent ? 'bg-brand-ink/15' : 'bg-brand-soft text-brand-text'}`}>
        <Icon name={icon} size={20} />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold leading-snug">{title}</span>
        <span className={`block text-sm leading-snug ${accent ? 'opacity-90' : 'text-ink-3'}`}>{note}</span>
      </span>
    </Link>
  );
}

export default function UnitOverview() {
  const unit = useUnit();
  const state = useProgress();
  if (!unit) return <UnitMissing />;

  const p = unitProgress(unit, state);
  const specs = specSteps(unit).length;
  const critical = unit.steps.filter((s) => s.critical).length;
  const pair = unit.pairsWith ? UNIT_BY_ID[unit.pairsWith] : null;
  const base = `/unit/${unit.id}`;

  return (
    <div className="space-y-6">
      <PageHeader title={unit.name} sub={unit.fullName} back={{ to: '/', label: 'Garage' }}>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Pill tone="brand">{unit.kind === 'transmission' ? 'Transmission' : 'Engine'}</Pill>
          {unit.vehicle && <Pill>{unit.vehicle}</Pill>}
          {unit.sample && <Pill tone="warn">Sample data, fake names</Pill>}
        </div>
      </PageHeader>

      <Card className="p-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Mastery" value={`${p.mastery}%`} />
          <Stat label="Due" value={p.due} note={`of ${p.cards} transitions`} />
          <Stat label="Best run" value={p.best ? `${p.best.mistakes} ${p.best.mistakes === 1 ? 'miss' : 'misses'}` : 'None'} note={p.best ? formatMs(p.best.ms) : 'yet'} />
        </div>
        <Bar pct={p.mastery} className="mt-3" label="Mastery" />
      </Card>

      <section>
        <SectionTitle>Play</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          <ModeTile to={`${base}/run`} icon="play" accent
            title={p.active ? 'Resume full rebuild run' : 'Full rebuild run'}
            note={p.active ? `Step ${p.active.pos + 1} of ${unit.steps.length}, ${p.active.mistakes} mistakes so far` : `Rebuild all ${unit.steps.length} steps in order, against the clock`} />
          <ModeTile to={`${base}/walk`} icon="walk" title="Walkthrough" note="Read every step in order, with why, tools and specs" />
          <ModeTile to={`${base}/order`} icon="shuffle" title="Order drill" note="Put 5 to 8 shuffled steps back in order" />
          <ModeTile to={`${base}/next`} icon="next" title="What's next" note="Pick the step that comes next, from 4" />
          <ModeTile to={`${base}/specs`} icon="cards" title="Spec flashcards"
            note={specs ? `${specs} sourced specs` : 'No sourced specs yet'} />
          <ModeTile to={`/review?unit=${unit.id}`} icon="review" title="Review due"
            note={p.due ? `${p.due} transitions due now` : 'Nothing due; misses come back here'} />
        </div>
      </section>

      {unit.summary && (
        <section>
          <SectionTitle>About this unit</SectionTitle>
          <p className="text-base leading-relaxed text-ink-2">{unit.summary}</p>
        </section>
      )}

      {unit.facts.length > 0 && (
        <section>
          <SectionTitle>Facts</SectionTitle>
          <Card as="dl" className="divide-y divide-line-2">
            {unit.facts.map((f, i) => (
              <div key={`${f.label}-${i}`} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 px-4 py-2.5">
                <dt className="text-sm text-ink-3">{f.label}</dt>
                <dd className="text-sm font-medium text-ink">{f.value}</dd>
              </div>
            ))}
          </Card>
        </section>
      )}

      {unit.notes.length > 0 && (
        <section>
          <SectionTitle>Know before you start</SectionTitle>
          <ul className="space-y-2">
            {unit.notes.map((n, i) => (
              <li key={i} className="flex gap-2.5 text-base leading-relaxed text-ink-2">
                <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-heat" />
                <span className="min-w-0">{n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionTitle sub={`${unit.steps.length} steps, ${critical} marked critical, ${specs} with a sourced spec`}>Phases</SectionTitle>
        <Card as="ol" className="divide-y divide-line-2 overflow-hidden">
          {unit.phases.map((ph, i) => (
            <li key={ph.id}>
              <Link to={`${base}/walk?phase=${encodeURIComponent(ph.id)}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-sunken">
                <span className="tabnum grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-sunken text-sm font-semibold text-ink-2">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-medium text-ink">{ph.name}</span>
                  <span className="block text-sm text-ink-3">
                    {PHASE_KIND_LABEL[ph.kind] || ph.kind}, {ph.steps.length} step{ph.steps.length === 1 ? '' : 's'}
                    {ph.summary ? `. ${ph.summary}` : ''}
                  </span>
                </span>
                <Icon name="chevron" size={18} className="text-ink-3" />
              </Link>
            </li>
          ))}
        </Card>
      </section>

      {pair && (
        <Link to={`/unit/${pair.id}`} className="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 hover:bg-sunken">
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-ink-3">Pairs with</span>
            <span className="block text-base font-medium text-ink">{pair.name}</span>
          </span>
          <Icon name="chevron" size={18} className="text-ink-3" />
        </Link>
      )}

      {unit.sources.length > 0 && (
        <section>
          <SectionTitle sub="Where the order and the numbers come from.">Sources</SectionTitle>
          <Card className="p-4">
            <SourceLinks unit={unit} ids={unit.sources.map((s) => s.id)} />
          </Card>
        </section>
      )}

      <p className="rounded-lg border border-warn-line bg-warn-soft p-3 text-sm leading-relaxed text-warn-text">{DISCLAIMER}</p>
    </div>
  );
}
