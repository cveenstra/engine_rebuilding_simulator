import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Chip, ChipRow, Empty, Button } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { ModeHeader, UnitMissing } from '../components/bench.jsx';
import { PartThumb, FirstPhotoCredit } from '../components/parts.jsx';
import { useUnit } from '../engine/unit.js';
import { unitParts, categoryLabel, CATEGORY_LABEL } from '../data/parts.js';

const norm = (s) => String(s || '').toLowerCase();

function Gallery({ unit }) {
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const all = unitParts(unit);
  const cats = Object.keys(CATEGORY_LABEL).filter((c) => all.some((x) => x.part.category === c));
  const needle = norm(q.trim());
  const shown = all
    .filter((x) => !cat || x.part.category === cat)
    .filter((x) => !needle || [x.part.name, x.part.what, ...x.components.map((c) => c.name)].some((t) => norm(t).includes(needle)))
    .sort((a, b) => a.part.name.localeCompare(b.part.name));

  return (
    <div>
      <ModeHeader unit={unit} title="Parts gallery">
        <Button to={`/unit/${unit.id}/parts/quiz`} variant="soft" className="mt-11 flex-shrink-0 px-3 text-sm">
          Picture quiz
        </Button>
      </ModeHeader>

      {!all.length ? (
        <Empty title="No parts mapped yet">This unit&apos;s components do not point at the parts catalog yet.</Empty>
      ) : (
        <>
          <p className="mb-3 text-base text-ink-2">
            The {all.length} kinds of part in the {unit.name}. Tap one to see what it is, what it does and which steps touch it.
          </p>

          <label className="mb-3 block">
            <span className="sr-only">Search parts</span>
            <input
              type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search parts"
              className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </label>

          <ChipRow className="mb-4">
            <Chip active={!cat} onClick={() => setCat('')}>All</Chip>
            {cats.map((c) => (
              <Chip key={c} active={cat === c} onClick={() => setCat(cat === c ? '' : c)}>{categoryLabel(c)}</Chip>
            ))}
          </ChipRow>

          <p className="sr-only" aria-live="polite">{shown.length} parts shown</p>
          {shown.length ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {shown.map(({ part, components }) => (
                <li key={part.id} className="min-w-0 rounded-xl border border-line bg-surface transition-colors hover:border-brand-line hover:bg-brand-soft/40">
                  <Link to={`/part/${part.id}?unit=${unit.id}`} className="block rounded-xl p-2">
                    <PartThumb partId={part.id} />
                    <span className="mt-1.5 block text-sm font-medium leading-snug text-ink">{part.name}</span>
                    <span className="block text-xs leading-snug text-ink-3">
                      {components.length > 1 ? `${components.length} in this unit` : components[0].name}
                    </span>
                  </Link>
                  <FirstPhotoCredit partId={part.id} className="-mt-1 px-2 pb-2" />
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No parts match" action={<Button variant="ghost" onClick={() => { setQ(''); setCat(''); }}>Clear filters</Button>}>
              Try a shorter search or another category.
            </Empty>
          )}

          <Link to="/credits" className="mt-6 inline-flex min-h-11 items-center gap-1 text-sm text-ink-3 underline underline-offset-2">
            <Icon name="info" size={16} /> Photo credits
          </Link>
        </>
      )}
    </div>
  );
}

export default function PartsGallery() {
  const unit = useUnit();
  if (!unit) return <UnitMissing />;
  return <Gallery key={unit.id} unit={unit} />;
}
