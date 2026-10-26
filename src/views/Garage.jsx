import { Link } from 'react-router-dom';
import { Card, PageHeader, SectionTitle, Bar, Button, Pill } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { KindIcon } from '../components/bench.jsx';
import { VEHICLES, UNIT_BY_ID, OTHER_UNITS, UNITS } from '../data/index.js';
import { useProgress } from '../engine/storage.js';
import { unitProgress, continuePath, allTransitions, studyStreak } from '../engine/progress.js';
import { srsSummary } from '../engine/srs.js';
import { hasTerms, termSummary, splitNewCards, holdingTerms } from '../engine/terms.js';
import { HeldNotice } from '../components/terms.jsx';
import { mistakeStats, wreckLine, mistakesDueByUnit, drillable } from '../engine/mistakes.js';

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
  const wreck = mistakeStats(unit);
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
            {wreck.total > 0 && (
              <span className="mt-0.5 flex items-center gap-1 text-sm text-bad-text">
                <Icon name="alert" size={14} className="flex-shrink-0" /> {wreckLine(wreck, 'it')}
              </span>
            )}
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
  const terms = hasTerms() ? termSummary({}, state) : null;
  const held = terms ? splitNewCards(allTransitions(), state) : null;
  const hasMistakeDrill = UNITS.some((u) => drillable(u).length >= 4);
  const mistakesDue = hasMistakeDrill ? mistakesDueByUnit(state) : [];
  const mistakesDueTotal = mistakesDue.reduce((n, x) => n + x.due, 0);
  // The unit with the most due, or else the first with mistakes to drill (real units before the practice ones).
  const drillTarget = mistakesDue[0]?.unit || [...UNITS].sort((a, b) => Number(a.sample) - Number(b.sample)).find((u) => drillable(u).length >= 4) || null;

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
            {review.due ? `${review.due} step card${review.due === 1 ? '' : 's'} due` : 'No step cards due'}
          </p>
          <p className="text-sm text-ink-3">
            {review.studied
              ? `${review.studied} of ${review.total} studied${streak ? `, ${streak}-day streak` : ''}`
              : 'Play any mode, and missed steps come back here to review.'}
          </p>
        </div>
        <Button to="/review" variant={review.due ? 'primary' : 'ghost'} className="flex-shrink-0 px-3" disabled={!UNITS.length}>
          Review
        </Button>
      </Card>

      {terms && (
        <Card className="flex items-center gap-4 p-4">
          <span className={`grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl ${terms.due ? 'bg-heat-soft text-heat-text' : 'bg-sunken text-ink-3'}`}>
            <Icon name="book" size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-ink">
              {terms.due ? `${terms.due} term${terms.due === 1 ? '' : 's'} due` : 'No terms due'}
            </p>
            <p className="text-sm text-ink-3">
              {terms.learned + terms.mature} of {terms.total} learned{terms.newToday ? `, ${terms.newToday} new to learn` : ''}
            </p>
          </div>
          <Button to="/terms" variant={terms.due || terms.newToday ? 'primary' : 'ghost'} className="flex-shrink-0 px-3">
            Terms
          </Button>
        </Card>
      )}

      {hasMistakeDrill && (
        <Card className="flex items-center gap-4 p-4">
          <span className={`grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl ${mistakesDueTotal ? 'bg-bad-soft text-bad-text' : 'bg-sunken text-ink-3'}`}>
            <Icon name="shield" size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-ink">
              {mistakesDueTotal ? `${mistakesDueTotal} mistake${mistakesDueTotal === 1 ? '' : 's'} due` : 'No mistakes due'}
            </p>
            <p className="text-sm text-ink-3">
              {mistakesDue.length
                ? mistakesDue.map((x) => `${x.due} in ${x.unit.name}`).join(', ')
                : 'Drill the ways to wreck a unit. Missed ones come back here.'}
            </p>
          </div>
          {drillTarget && (
            <Button to={`/unit/${drillTarget.id}/mistakes/drill${mistakesDue.length ? '?sev=all' : ''}`} variant={mistakesDue.length ? 'primary' : 'ghost'} className="flex-shrink-0 px-3">
              Drill
            </Button>
          )}
        </Card>
      )}

      {held && <HeldNotice split={held} top={holdingTerms(held)} />}

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
          <SectionTitle sub="Made-up parts and numbers, so you can try every mode.">
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
          <span className="block text-sm text-ink-3">Boxer vs inline four, chain CVT vs 9-speed automatic</span>
        </span>
        <Icon name="chevron" size={18} className="text-ink-3" />
      </Link>
    </div>
  );
}
