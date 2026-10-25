import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Card, PageHeader, SectionTitle, Empty, Button } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { CriticalBadge } from '../components/bench.jsx';
import { PartImage, PartFacts, CategoryPill } from '../components/parts.jsx';
import { PART_BY_ID, partUsage } from '../data/parts.js';
import { UNIT_BY_ID } from '../data/index.js';

function StepList({ unit, steps }) {
  return (
    <ol className="divide-y divide-line-2">
      {steps.map((s) => (
        <li key={s.id}>
          <Link to={`/unit/${unit.id}/walk?step=${s.order}`} className="flex min-h-12 items-center gap-3 px-4 py-2 hover:bg-sunken">
            <span className="tabnum w-9 flex-shrink-0 text-right text-sm font-semibold text-brand-text">{s.order}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-base leading-snug text-ink">{s.title}</span>
              <span className="block text-xs text-ink-3">{unit.phaseById[s.phase]?.name}</span>
            </span>
            {s.critical && <CriticalBadge />}
            <Icon name="chevron" size={16} className="flex-shrink-0 text-ink-3" />
          </Link>
        </li>
      ))}
    </ol>
  );
}

export default function PartDetail() {
  const { partId } = useParams();
  const [params] = useSearchParams();
  const part = PART_BY_ID[partId];
  const from = UNIT_BY_ID[params.get('unit')] || null;
  const back = from ? { to: `/unit/${from.id}/parts`, label: `${from.name} parts` } : { to: '/', label: 'Garage' };

  if (!part) {
    return (
      <div>
        <PageHeader title="Part not found" back={back} />
        <Empty title="That part is not in the catalog" action={<Button to={back.to} variant="ghost">{back.label}</Button>} />
      </div>
    );
  }

  // The unit you came from first, then the rest.
  const usage = partUsage(part.id).sort((a, b) => (a.unit.id === from?.id ? -1 : b.unit.id === from?.id ? 1 : 0));

  return (
    <div className="space-y-6">
      <PageHeader title={part.name} back={back}>
        <div className="mt-2"><CategoryPill category={part.category} /></div>
      </PageHeader>

      <div className="grid gap-5 md:grid-cols-2 md:items-start">
        <PartImage key={part.id} partId={part.id} />
        <PartFacts part={part} />
      </div>

      {usage.length > 0 && (
        <section>
          <SectionTitle sub="The names each unit's manual uses for it.">Where it is</SectionTitle>
          <Card as="ul" className="divide-y divide-line-2">
            {usage.map(({ unit, components }) => (
              <li key={unit.id} className="px-4 py-3">
                <Link to={`/unit/${unit.id}`} className="text-base font-medium text-brand-text underline decoration-brand-line underline-offset-2">
                  {unit.name}
                </Link>
                <p className="text-sm text-ink-2">{components.map((c) => c.name).join(', ')}</p>
              </li>
            ))}
          </Card>
        </section>
      )}

      {usage.map(({ unit, steps }, i) => steps.length > 0 && (
        <section key={unit.id}>
          <details open={i === 0} className="group">
            <summary className="mb-3 flex min-h-11 cursor-pointer list-none items-center gap-2">
              <Icon name="chevron" size={18} className="text-ink-3 transition-transform group-open:rotate-90" />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold text-ink">Steps in the {unit.name}</span>
                <span className="block text-sm text-ink-3">{steps.length} step{steps.length === 1 ? '' : 's'} touch it. Tap one to open it in the walkthrough.</span>
              </span>
            </summary>
            <Card className="overflow-hidden">
              <StepList unit={unit} steps={steps} />
            </Card>
          </details>
        </section>
      ))}

      {!usage.length && (
        <p className="text-base text-ink-2">No loaded unit uses this part yet.</p>
      )}
    </div>
  );
}
