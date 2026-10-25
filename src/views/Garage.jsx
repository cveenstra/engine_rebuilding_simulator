import { Link } from 'react-router-dom';
import { Card, PageHeader, SectionTitle, Bar, Button, Pill } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { KindIcon } from '../components/bench.jsx';
import { VEHICLES, UNIT_BY_ID, OTHER_UNITS, UNITS } from '../data/index.js';
import { useProgress } from '../engine/storage.js';
import { unitProgress, continuePath, allTransitions, studyStreak } from '../engine/progress.js';
import { srsSummary } from '../engine/srs.js';

function UnitRow({ meta, unit, state }) {
  if (!unit) {
    return (
      <li className="flex items-center gap-3 px-4 py-3">
        <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-sunken text-ink-3">
          <KindIcon kind={meta.kind} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-medium text-ink-2">{meta.name}</span>
          <span className="block text-sm text-ink-3">{meta.fullName}</span>
        </span>
        <Pill>Content coming</Pill>
      </li>
    );
  }
  const p = unitProgress(unit, state);
  const started = p.studied > 0 || p.runs.length > 0 || p.active;
  return (
    <li className="px-4 py-3">
      <div className="flex items-center gap-3">
        <Link to={`/unit/${unit.id}`} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg hover:text-brand-text">
          <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-text">
            <KindIcon kind={unit.kind} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-medium text-ink">{unit.name}</span>
            <span className="block text-sm text-ink-3">
              {unit.steps.length} steps{p.due ? `, ${p.due} due` : ''}
            </span>
          </span>
        </Link>
        <Button to={continuePath(unit, state)} variant={started ? 'primary' : 'soft'} className="flex-shrink-0 px-3">
          {started ? 'Continue' : 'Start'} <Icon name="chevron" size={16} />
        </Button>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <Bar pct={p.mastery} label={`${unit.name} mastery`} />
        <span className="tabnum w-12 flex-shrink-0 text-right text-sm font-semibold text-ink">{p.mastery}%</span>
      </div>
    </li>
  );
}

export default function Garage() {
  const state = useProgress();
  const review = srsSummary(allTransitions(), state);
  const streak = studyStreak(state);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your garage"
        sub="Learn each rebuild step by step, in order, until you can do the whole sequence from memory."
      />

      <Card className="flex items-center gap-4 p-4">
        <span className={`grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl ${review.due ? 'bg-heat-soft text-heat-text' : 'bg-sunken text-ink-3'}`}>
          <Icon name="review" size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-ink">
            {review.due ? `${review.due} step${review.due === 1 ? '' : 's'} due for review` : 'Nothing due right now'}
          </p>
          <p className="text-sm text-ink-3">
            {review.studied
              ? `${review.studied} of ${review.total} transitions studied${streak ? `, ${streak}-day streak` : ''}`
              : 'Play any mode and missed steps come back here on a schedule.'}
          </p>
        </div>
        <Button to="/review" variant={review.due ? 'primary' : 'ghost'} className="flex-shrink-0 px-3" disabled={!UNITS.length}>
          Review
        </Button>
      </Card>

      {VEHICLES.map((v) => (
        <section key={v.id}>
          <SectionTitle sub={v.years}>{v.name}</SectionTitle>
          <Card as="ul" className="divide-y divide-line-2 overflow-hidden">
            {v.units.map((m) => <UnitRow key={m.id} meta={m} unit={UNIT_BY_ID[m.id]} state={state} />)}
          </Card>
        </section>
      ))}

      {OTHER_UNITS.length > 0 && (
        <section>
          <SectionTitle sub="Fake parts and fake numbers, here so you can try every mode before the real content lands.">
            Practice bench
          </SectionTitle>
          <Card as="ul" className="divide-y divide-line-2 overflow-hidden">
            {OTHER_UNITS.map((u) => (
              <UnitRow key={u.id} meta={{ id: u.id, kind: u.kind, name: u.name, fullName: u.fullName }} unit={u} state={state} />
            ))}
          </Card>
        </section>
      )}

      <Link to="/compare" className="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 hover:bg-sunken">
        <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-text">
          <Icon name="compare" size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-medium text-ink">Compare the units</span>
          <span className="block text-sm text-ink-3">Boxer against inline, chain CVT against 9-speed automatic</span>
        </span>
        <Icon name="chevron" size={18} className="text-ink-3" />
      </Link>
    </div>
  );
}
