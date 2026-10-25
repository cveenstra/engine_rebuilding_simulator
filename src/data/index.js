import sampleUnit from './fixtures/sample-unit.json';

/**
 * Every unit is one JSON file in ./units/ (see docs/CONTENT_SCHEMA.md). They are
 * discovered at build time, so a new file shows up with no code change. The
 * practice fixture is shown in dev, and in a build only while no real unit exists.
 */
const modules = import.meta.glob('./units/*.json', { eager: true });

const asArr = (v) => (Array.isArray(v) ? v : []);
const str = (v) => (typeof v === 'string' ? v : '');

/** Make a unit safe to render even if a field is missing; sort steps by order. */
function normalize(raw, { sample = false } = {}) {
  const u = raw?.default ?? raw ?? {};
  const phases = asArr(u.phases).filter((p) => p && p.id);
  const phaseIds = new Set(phases.map((p) => p.id));
  const steps = asArr(u.steps)
    .filter((s) => s && s.id && Number.isFinite(s.order))
    .map((s) => ({
      ...s,
      title: str(s.title) || s.id,
      action: str(s.action),
      tools: asArr(s.tools),
      components: asArr(s.components),
      sourceIds: asArr(s.sourceIds),
      spec: s.spec && typeof s.spec === 'object' ? { ...s.spec, sourceIds: asArr(s.spec.sourceIds) } : null,
      phase: phaseIds.has(s.phase) ? s.phase : phases[0]?.id ?? 'unknown',
    }))
    .sort((a, b) => a.order - b.order)
    .map((s, index) => ({ ...s, index }));
  const sources = asArr(u.sources).filter((s) => s && s.id);
  return {
    id: str(u.id),
    kind: u.kind === 'transmission' ? 'transmission' : 'engine',
    name: str(u.name) || str(u.id),
    fullName: str(u.fullName) || str(u.name),
    vehicle: str(u.vehicle),
    pairsWith: str(u.pairsWith) || null,
    summary: str(u.summary),
    facts: asArr(u.facts).filter((f) => f && f.label),
    notes: asArr(u.notes).filter((n) => typeof n === 'string'),
    sources,
    sourceById: Object.fromEntries(sources.map((s) => [s.id, s])),
    components: asArr(u.components),
    phases: phases.map((p) => ({ ...p, steps: steps.filter((s) => s.phase === p.id) })),
    phaseById: Object.fromEntries(phases.map((p) => [p.id, p])),
    steps,
    sample,
  };
}

const REAL = Object.entries(modules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, mod]) => normalize(mod))
  .filter((u) => u.id && u.steps.length > 0);

export const SHOW_SAMPLE = import.meta.env.DEV || REAL.length === 0;

export const UNITS = [...REAL, ...(SHOW_SAMPLE ? [normalize(sampleUnit, { sample: true })] : [])];
export const UNIT_BY_ID = Object.fromEntries(UNITS.map((u) => [u.id, u]));
export const REAL_UNITS = REAL;

/** The garage: each vehicle with the engine and transmission it carries. */
export const VEHICLES = [
  {
    id: 'forester',
    name: 'Subaru Forester 2.5i',
    years: '2014 to 2018',
    units: [
      { id: 'fb25', kind: 'engine', name: 'Subaru FB25', fullName: '2.5L DOHC boxer four, port injection' },
      { id: 'tr580', kind: 'transmission', name: 'Subaru TR580 CVT', fullName: 'Lineartronic chain CVT' },
    ],
  },
  {
    id: 'discovery-sport',
    name: 'Land Rover Discovery Sport',
    years: '2018 (US)',
    units: [
      { id: 'ingenium-pt204', kind: 'engine', name: 'JLR Ingenium 2.0 petrol', fullName: 'PT204 turbo inline four, direct injection' },
      { id: 'zf-9hp48', kind: 'transmission', name: 'ZF 9HP48', fullName: '9-speed automatic' },
    ],
  },
];

const GARAGE_IDS = new Set(VEHICLES.flatMap((v) => v.units.map((u) => u.id)));
/** Units that loaded but are not in the garage (the sample, or a new unit nobody wired up yet). */
export const OTHER_UNITS = UNITS.filter((u) => !GARAGE_IDS.has(u.id));

/** Pairs shown on the Compare screen. */
export const COMPARE_PAIRS = [
  { id: 'engines', label: 'Engines', a: 'fb25', b: 'ingenium-pt204' },
  { id: 'transmissions', label: 'Transmissions', a: 'tr580', b: 'zf-9hp48' },
];

export const PHASE_KIND_LABEL = {
  prep: 'Prep', teardown: 'Teardown', inspect: 'Inspect', machine: 'Machine work', assembly: 'Assembly', final: 'Final checks',
};

export const SPEC_KIND_LABEL = {
  torque: 'Torque', clearance: 'Clearance', angle: 'Angle', sequence: 'Sequence', fluid: 'Fluid', other: 'Spec',
};

export function specSteps(unit) {
  return unit.steps.filter((s) => s.spec && s.spec.value);
}
