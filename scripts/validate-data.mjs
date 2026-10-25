#!/usr/bin/env node
// Checks every unit file in src/data/units/ (plus the test fixture) and the
// shared parts catalog in src/data/parts/catalog.json against
// docs/CONTENT_SCHEMA.md. No dependencies. Exits 1 on any error; warnings are
// printed but do not fail the run.
//   node scripts/validate-data.mjs           errors, warnings and counts
//   node scripts/validate-data.mjs --quiet   errors and counts only
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UNITS_DIR = join(ROOT, 'src', 'data', 'units');
const FIXTURE = join(ROOT, 'src', 'data', 'fixtures', 'sample-unit.json');
const CATALOG = join(ROOT, 'src', 'data', 'parts', 'catalog.json');
const QUIET = process.argv.includes('--quiet');

const UNIT_KINDS = new Set(['engine', 'transmission']);
const PHASE_KINDS = new Set(['prep', 'teardown', 'inspect', 'machine', 'assembly', 'final']);
const SPEC_KINDS = new Set(['torque', 'clearance', 'angle', 'sequence', 'fluid', 'other']);
const SOURCE_KINDS = new Set(['manual', 'oem', 'forum', 'vendor', 'video', 'reference']);
const PART_CATEGORIES = new Set([
  'engine-block', 'rotating', 'valvetrain', 'timing', 'lubrication', 'cooling', 'fuel-air', 'turbo',
  'sealing-fasteners', 'electrical-sensors', 'transmission-case', 'hydraulics', 'clutches-gears',
  'cvt-variator', 'torque-converter', 'driveline', 'tools', 'other',
]);
const PART_TEXT_FIELDS = ['name', 'what', 'does', 'photoQuery'];
const EM_DASH = /\u2014/;

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isArr = Array.isArray;
const isObj = (v) => v != null && typeof v === 'object' && !isArr(v);
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;

let errorCount = 0;
let warnCount = 0;

// ---- parts catalog: one shared list of part types that unit components point at.
function checkCatalog(file) {
  const rel = relative(ROOT, file);
  const errors = [];
  const warnings = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  const warn = (where, msg) => warnings.push(`${where}: ${msg}`);
  const ids = new Set();

  let list;
  try {
    list = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    err('file', existsSync(file) ? `not valid JSON (${e.message})` : 'missing');
    return { rel, errors, warnings, ids, count: 0 };
  }
  if (!isArr(list)) {
    err('file', 'top level is not an array');
    return { rel, errors, warnings, ids, count: 0 };
  }

  list.forEach((p, i) => {
    const w = `[${i}]${isObj(p) && isStr(p.id) ? ` (${p.id})` : ''}`;
    if (!isObj(p)) { err(w, 'not an object'); return; }
    if (!isStr(p.id)) err(w, 'id missing');
    else {
      if (ids.has(p.id)) err(w, `duplicate id "${p.id}"`);
      ids.add(p.id);
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id)) err(w, 'id is not kebab-case');
    }
    for (const k of PART_TEXT_FIELDS) if (!isStr(p[k])) err(w, `${k} missing or empty`);
    if (typeof p.lookFor !== 'string') err(w, 'lookFor missing (use "" when nothing applies)');
    if (!PART_CATEGORIES.has(p.category)) err(w, `category "${p.category}" is not one of ${[...PART_CATEGORIES].join('|')}`);
    if (typeof p.drawable !== 'boolean') err(w, 'drawable is not true/false');
    if (isStr(p.photoQuery)) {
      const n = words(p.photoQuery);
      if (n < 2 || n > 5) warn(w, `photoQuery "${p.photoQuery}" is ${n} words (aim for 2 to 5)`);
    }
    for (const [k, v] of Object.entries(p)) {
      if (typeof v === 'string' && EM_DASH.test(v)) warn(w, `em dash in ${k}`);
    }
  });
  return { rel, errors, warnings, ids, count: list.length };
}

const catalog = checkCatalog(CATALOG);
const usedParts = new Set();

function checkUnit(file, isFixture = false) {
  const rel = relative(ROOT, file);
  const errors = [];
  const warnings = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

  let u;
  try {
    u = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    err('file', `not valid JSON (${e.message})`);
    return { rel, errors, warnings, u: null };
  }
  if (!isObj(u)) {
    err('file', 'top level is not an object');
    return { rel, errors, warnings, u: null };
  }

  // ---- unit header
  const expectedId = basename(file, '.json');
  if (u.id !== expectedId) err('id', `"${u.id}" does not match file name "${expectedId}"`);
  if (!UNIT_KINDS.has(u.kind)) err('kind', `"${u.kind}" is not engine or transmission`);
  for (const k of ['name', 'fullName', 'vehicle', 'summary']) if (!isStr(u[k])) err(k, 'missing or empty');
  if (u.pairsWith != null && !isStr(u.pairsWith)) err('pairsWith', 'is not a string');

  // ---- sources
  const sourceIds = new Set();
  if (!isArr(u.sources) || u.sources.length === 0) err('sources', 'missing or empty');
  (isArr(u.sources) ? u.sources : []).forEach((s, i) => {
    const w = `sources[${i}]`;
    if (!isObj(s)) { err(w, 'not an object'); return; }
    if (!isStr(s.id)) err(w, 'id missing');
    else if (sourceIds.has(s.id)) err(w, `duplicate id "${s.id}"`);
    else sourceIds.add(s.id);
    if (!isStr(s.title)) err(w, 'title missing');
    if (s.kind === 'manual') { if (s.url !== undefined) err(w, `manual source ${s.id} must not link (cite by title only)`); }
    else if (!isStr(s.url) || !/^https?:\/\//.test(s.url)) err(w, `url is not http(s): ${s.url}`);
    if (s.kind != null && !SOURCE_KINDS.has(s.kind)) warn(w, `kind "${s.kind}" is not one of ${[...SOURCE_KINDS].join('|')}`);
  });
  const usedSources = new Set();
  const checkSourceIds = (ids, where, required) => {
    if (ids == null) { if (required) err(where, 'sourceIds missing'); return; }
    if (!isArr(ids)) { err(where, 'sourceIds is not an array'); return; }
    if (required && ids.length === 0) err(where, 'needs at least one sourceId');
    for (const id of ids) {
      if (!sourceIds.has(id)) err(where, `sourceId "${id}" does not resolve`);
      else usedSources.add(id);
    }
  };

  // ---- facts and notes
  if (!isArr(u.facts)) err('facts', 'missing');
  else {
    if (u.facts.length < 6 || u.facts.length > 15) warn('facts', `${u.facts.length} facts (schema asks for 6 to 15)`);
    u.facts.forEach((f, i) => {
      const w = `facts[${i}]`;
      if (!isObj(f) || !isStr(f.label) || !isStr(f.value)) err(w, 'needs label and value');
      if (f?.sourceIds != null) checkSourceIds(f.sourceIds, w, false);
    });
  }
  if (u.notes != null && (!isArr(u.notes) || u.notes.some((n) => !isStr(n)))) err('notes', 'must be an array of strings');

  // ---- components
  const componentIds = new Set();
  (isArr(u.components) ? u.components : []).forEach((c, i) => {
    const w = `components[${i}]`;
    if (!isObj(c) || !isStr(c.id)) { err(w, 'id missing'); return; }
    if (componentIds.has(c.id)) err(w, `duplicate id "${c.id}"`);
    componentIds.add(c.id);
    if (!isStr(c.name)) err(w, 'name missing');
    // Real units must map every component to a catalog part; the fixture may skip it.
    if (c.part == null) { if (!isFixture) err(w, `component "${c.id}" has no part`); }
    else if (!isStr(c.part)) err(w, 'part is not a string');
    else if (!catalog.ids.has(c.part)) err(w, `part "${c.part}" is not in the parts catalog`);
    else usedParts.add(c.part);
  });
  if (u.components != null && !isArr(u.components)) err('components', 'is not an array');

  // ---- phases
  const phaseIndex = new Map();
  if (!isArr(u.phases) || u.phases.length === 0) err('phases', 'missing or empty');
  (isArr(u.phases) ? u.phases : []).forEach((p, i) => {
    const w = `phases[${i}]`;
    if (!isObj(p) || !isStr(p.id)) { err(w, 'id missing'); return; }
    if (phaseIndex.has(p.id)) err(w, `duplicate id "${p.id}"`);
    phaseIndex.set(p.id, i);
    if (!isStr(p.name)) err(w, 'name missing');
    if (!PHASE_KINDS.has(p.kind)) err(w, `kind "${p.kind}" is not one of ${[...PHASE_KINDS].join('|')}`);
  });

  // ---- steps
  const steps = isArr(u.steps) ? u.steps : [];
  if (!isArr(u.steps) || steps.length === 0) err('steps', 'missing or empty');
  else if (steps.length < 100 && !isFixture) warn('steps', `${steps.length} steps (schema aims for 100+; say why in notes if fewer)`);

  const stepIds = new Set();
  const titles = new Map();
  const orders = [];
  const usedPhases = new Set();
  steps.forEach((s, i) => {
    const w = `steps[${i}]${isObj(s) && isStr(s.id) ? ` (${s.id})` : ''}`;
    if (!isObj(s)) { err(w, 'not an object'); return; }

    if (!isStr(s.id)) err(w, 'id missing');
    else {
      if (stepIds.has(s.id)) err(w, `duplicate step id "${s.id}"`);
      stepIds.add(s.id);
      if (!new RegExp(`^${expectedId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d{3,}$`).test(s.id)) {
        warn(w, `id should look like ${expectedId}-NNN`);
      }
    }

    if (!Number.isInteger(s.order)) err(w, `order "${s.order}" is not an integer`);
    else orders.push(s.order);

    if (!phaseIndex.has(s.phase)) err(w, `phase "${s.phase}" does not resolve`);
    else usedPhases.add(s.phase);

    if (!isStr(s.title)) err(w, 'title missing');
    else {
      const n = words(s.title);
      if (n < 2 || n > 7) err(w, `title "${s.title}" is ${n} words (must be 2 to 7)`);
      const key = s.title.trim().toLowerCase();
      if (titles.has(key)) err(w, `title "${s.title}" duplicates ${titles.get(key)}`);
      else titles.set(key, s.id);
    }
    if (!isStr(s.action)) err(w, 'action missing');
    if (s.why != null && !isStr(s.why)) err(w, 'why is empty or not a string');
    if (s.mistake != null && !isStr(s.mistake)) err(w, 'mistake is empty or not a string');
    if (s.critical != null && typeof s.critical !== 'boolean') err(w, 'critical is not true/false');
    if (s.tools != null && (!isArr(s.tools) || s.tools.some((t) => !isStr(t)))) err(w, 'tools must be an array of strings');

    if (s.components != null) {
      if (!isArr(s.components)) err(w, 'components is not an array');
      else for (const c of s.components) if (!componentIds.has(c)) err(w, `component "${c}" does not resolve`);
    }

    checkSourceIds(s.sourceIds, w, false);
    if (s.sourceIds == null || (isArr(s.sourceIds) && s.sourceIds.length === 0)) warn(w, 'step has no sourceIds');

    if (s.spec != null) {
      const sw = `${w} spec`;
      if (!isObj(s.spec)) err(sw, 'is not an object');
      else {
        if (!SPEC_KINDS.has(s.spec.kind)) err(sw, `kind "${s.spec.kind}" is not one of ${[...SPEC_KINDS].join('|')}`);
        if (!isStr(s.spec.value)) err(sw, 'value missing (must be a string)');
        if (s.spec.unit != null && typeof s.spec.unit !== 'string') err(sw, 'unit is not a string');
        checkSourceIds(s.spec.sourceIds, sw, true);
      }
    }

    for (const [k, v] of Object.entries(s)) {
      if (typeof v === 'string' && EM_DASH.test(v)) warn(w, `em dash in ${k}`);
    }
  });

  // order is 1..N, unique and gapless, and the array should be sorted by it.
  const sorted = [...orders].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== i + 1) {
      const dup = sorted[i] === sorted[i - 1];
      err('steps', dup ? `order ${sorted[i]} is used more than once` : `order is not 1..${steps.length} without gaps (expected ${i + 1}, found ${sorted[i]})`);
      break;
    }
  }
  if (orders.length === steps.length && orders.some((o, i) => i > 0 && o < orders[i - 1])) {
    warn('steps', 'array is not sorted by order (the app sorts it, but keep the file readable)');
  }

  // Steps should move through phases in the phases[] order.
  const byOrder = steps.filter((s) => isObj(s) && Number.isInteger(s.order) && phaseIndex.has(s.phase))
    .sort((a, b) => a.order - b.order);
  for (let i = 1; i < byOrder.length; i++) {
    if (phaseIndex.get(byOrder[i].phase) < phaseIndex.get(byOrder[i - 1].phase)) {
      warn(`step ${byOrder[i].id}`, `phase "${byOrder[i].phase}" comes before the previous step's phase "${byOrder[i - 1].phase}"`);
    }
  }
  for (const id of phaseIndex.keys()) if (!usedPhases.has(id)) warn(`phase ${id}`, 'has no steps');
  for (const id of sourceIds) if (!usedSources.has(id)) warn(`source ${id}`, 'is never cited');

  for (const k of ['summary', 'name', 'fullName', 'vehicle']) {
    if (typeof u[k] === 'string' && EM_DASH.test(u[k])) warn(k, 'em dash');
  }

  return { rel, errors, warnings, u, steps: steps.length };
}

// ---- run
let files = [];
if (existsSync(UNITS_DIR)) {
  files = readdirSync(UNITS_DIR).filter((f) => f.endsWith('.json')).sort().map((f) => join(UNITS_DIR, f));
}
if (files.length === 0) console.log('No unit files in src/data/units/ yet; checking the fixture only.');
const all = [...files, FIXTURE];

const loadedIds = new Set();
const results = all.map((f) => checkUnit(f, f === FIXTURE));
for (const r of results) if (r.u?.id) loadedIds.add(r.u.id);

for (const r of results) {
  // pairsWith points at a sibling file; content lands in parallel, so a missing one is a warning.
  if (r.u && isStr(r.u.pairsWith) && !loadedIds.has(r.u.pairsWith)) {
    r.warnings.push(`pairsWith: "${r.u.pairsWith}" has no file yet`);
  }
  errorCount += r.errors.length;
  warnCount += r.warnings.length;
  const status = r.errors.length ? 'FAIL' : 'ok  ';
  console.log(`${status} ${r.rel}  (${r.steps ?? 0} steps, ${r.errors.length} errors, ${r.warnings.length} warnings)`);
  for (const e of r.errors) console.log(`    error   ${e}`);
  if (!QUIET) for (const w of r.warnings) console.log(`    warning ${w}`);
}

// The catalog reports last, once every unit has had a chance to use its parts.
for (const id of catalog.ids) if (!usedParts.has(id)) catalog.warnings.push(`part ${id}: no unit component uses it`);
errorCount += catalog.errors.length;
warnCount += catalog.warnings.length;
console.log(`${catalog.errors.length ? 'FAIL' : 'ok  '} ${catalog.rel}  (${catalog.count} parts, ${catalog.errors.length} errors, ${catalog.warnings.length} warnings)`);
for (const e of catalog.errors) console.log(`    error   ${e}`);
if (!QUIET) for (const w of catalog.warnings) console.log(`    warning ${w}`);

console.log(`\n${all.length + 1} file(s), ${errorCount} error(s), ${warnCount} warning(s).`);
process.exit(errorCount ? 1 : 0);
