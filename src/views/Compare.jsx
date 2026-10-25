import { useSearchParams, Link } from 'react-router-dom';
import { PageHeader, Chip, Card, Pill } from '../components/ui.jsx';
import { KindIcon } from '../components/bench.jsx';
import { COMPARE_PAIRS, UNIT_BY_ID, VEHICLES, specSteps } from '../data/index.js';
import { Glossed } from '../components/glossary.jsx';

/**
 * Fact labels are free text in each unit file, so line them up by a normalized
 * key with a few aliases. A label only one unit has still shows, with a dash
 * on the other side.
 */
const ALIASES = {
  configuration: 'layout',
  'engine layout': 'layout',
  'cam drive': 'timing drive',
  timing: 'timing drive',
  'timing chain': 'timing drive',
  'timing system': 'timing drive',
  injection: 'fuel injection',
  'fuel system': 'fuel injection',
  'fuel delivery': 'fuel injection',
  'engine displacement': 'displacement',
  'gear count': 'gears',
  'forward gears': 'gears',
  speeds: 'gears',
  'transmission type': 'type',
};

const keyOf = (label) => {
  const k = label.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return ALIASES[k] || k;
};

function rowsFor(a, b) {
  const rows = [];
  const index = new Map();
  const add = (unit, side) => {
    for (const f of unit?.facts || []) {
      const k = keyOf(f.label);
      if (!index.has(k)) { index.set(k, rows.length); rows.push({ label: f.label, a: null, b: null }); }
      const row = rows[index.get(k)];
      if (row[side] == null) row[side] = f.value;
    }
  };
  add(a, 'a');
  add(b, 'b');
  // Shared facts first, keeping the first unit's order.
  rows.sort((x, y) => (x.a != null && x.b != null ? 0 : 1) - (y.a != null && y.b != null ? 0 : 1));

  const stat = (u, fn) => (u ? String(fn(u)) : null);
  rows.push(
    { label: 'Steps in this app', a: stat(a, (u) => u.steps.length), b: stat(b, (u) => u.steps.length), computed: true },
    { label: 'Phases', a: stat(a, (u) => u.phases.length), b: stat(b, (u) => u.phases.length), computed: true },
    { label: 'Critical steps', a: stat(a, (u) => u.steps.filter((s) => s.critical).length), b: stat(b, (u) => u.steps.filter((s) => s.critical).length), computed: true },
    { label: 'Sourced specs', a: stat(a, (u) => specSteps(u).length), b: stat(b, (u) => specSteps(u).length), computed: true },
  );
  return rows;
}

function metaFor(id) {
  for (const v of VEHICLES) {
    const m = v.units.find((u) => u.id === id);
    if (m) return { ...m, vehicle: v.name };
  }
  return { id, name: id, kind: 'engine', vehicle: '' };
}

function Head({ id }) {
  const unit = UNIT_BY_ID[id];
  const meta = metaFor(id);
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-brand-text"><KindIcon kind={meta.kind} size={18} /></div>
      {unit ? (
        <Link to={`/unit/${id}`} className="mt-1 block text-base font-semibold leading-snug text-ink underline decoration-line underline-offset-2 hover:decoration-brand">
          {unit.name}
        </Link>
      ) : (
        <p className="mt-1 text-base font-semibold leading-snug text-ink-2">{meta.name}</p>
      )}
      <p className="text-xs text-ink-3">{meta.vehicle}</p>
      {!unit && <Pill className="mt-1">Content coming</Pill>}
    </div>
  );
}

export default function Compare() {
  const [params, setParams] = useSearchParams();
  const pair = COMPARE_PAIRS.find((p) => p.id === params.get('pair')) || COMPARE_PAIRS[0];
  const a = UNIT_BY_ID[pair.a] || null;
  const b = UNIT_BY_ID[pair.b] || null;
  const rows = rowsFor(a, b);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Compare"
        sub="The two vehicles solve the same problems in different ways. Knowing how they differ helps the order make sense."
      />
      <div className="flex gap-2">
        {COMPARE_PAIRS.map((p) => (
          <Chip key={p.id} active={p.id === pair.id} onClick={() => setParams({ pair: p.id }, { replace: true })}>{p.label}</Chip>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 gap-3 border-b border-line bg-sunken p-4">
          <Head id={pair.a} />
          <Head id={pair.b} />
        </div>
        {!a && !b ? (
          <p className="p-4 text-sm text-ink-3">Neither unit has landed yet. This table fills in from each unit's facts as soon as it does.</p>
        ) : (
          <dl className="divide-y divide-line-2">
            {rows.map((r, i) => (
              <div key={`${r.label}-${i}`} className="px-4 py-3">
                <dt className={`text-xs font-semibold uppercase tracking-wide ${r.computed ? 'text-ink-3' : 'text-brand-text'}`}>{r.label}</dt>
                <dd className="mt-1 grid grid-cols-2 gap-3 text-sm leading-snug">
                  <span className={r.a != null ? 'text-ink' : 'text-ink-3'}>{r.a != null && !r.computed ? <Glossed text={r.a} /> : r.a ?? '-'}</span>
                  <span className={r.b != null ? 'text-ink' : 'text-ink-3'}>{r.b != null && !r.computed ? <Glossed text={r.b} /> : r.b ?? '-'}</span>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
      <p className="text-xs leading-relaxed text-ink-3">
        Built from each unit's facts list. Verify any number against the factory service manual.
      </p>
    </div>
  );
}
