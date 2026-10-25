#!/usr/bin/env node
// Checks every unit file in src/data/units/ (plus the test fixture), the
// shared parts catalog in src/data/parts/catalog.json and the glossary in
// src/data/glossary.json against docs/CONTENT_SCHEMA.md. No dependencies. Exits 1 on any error; warnings are
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
const GLOSSARY = join(ROOT, 'src', 'data', 'glossary.json');
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
const SEVERITIES = new Set(['ruins-unit', 'costly', 'rework', 'minor']);
const MISTAKE_TEXT = ['title', 'what', 'consequence', 'prevent'];

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

// ---- glossary: the technical terms a learner can tap, as a prerequisite graph.
// Checked after the units load, because aliases, examples and the "never used"
// warning are all checked against the real unit and catalog text.
const GLOSSARY_CATEGORIES = new Set([
  'general', 'engine', 'transmission', 'measurement', 'tools', 'fasteners-sealing', 'electrical', 'abbreviation', 'brand',
]);
const EXAMPLE_FIELDS = ['action', 'why', 'mistake'];
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Term matching uses the app's own matcher (src/engine/termMatch.js: whole
// words, longest match wins, hyphen-joined words stay whole, all-caps aliases
// match only in capitals), so the checks see exactly what the learner sees.
// If that module ever goes missing, fall back to a plain whole-word regex.
let createAppMatcher = null;
try {
  ({ createMatcher: createAppMatcher } = await import('../src/engine/termMatch.js'));
} catch {
  createAppMatcher = null;
}
/** terms: [{ id, term, aliases }] -> (text) => [{ id, text }] in reading order. */
function termMatcher(terms) {
  if (createAppMatcher) {
    const m = createAppMatcher(terms);
    return (text) => m.segment(String(text ?? '')).filter((s) => s.termId).map((s) => ({ id: s.termId, text: s.text }));
  }
  const byName = new Map();
  for (const t of terms) for (const n of [t.term, ...(t.aliases || [])]) if (isStr(n) && !byName.has(n.toLowerCase())) byName.set(n.toLowerCase(), t.id);
  if (byName.size === 0) return () => [];
  const alts = [...byName.keys()].sort((a, b) => b.length - a.length).map(escapeRe).join('|');
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${alts})(?![\\p{L}\\p{N}])`, 'giu');
  return (text) => [...String(text ?? '').matchAll(re)].map((m) => ({ id: byName.get(m[0].toLowerCase()), text: m[0] }));
}

/** All learner-facing text of one unit, for the "never used" warning. */
function unitText(u) {
  const parts = [u.name, u.fullName, u.vehicle, u.summary, ...(isArr(u.notes) ? u.notes : [])];
  for (const f of isArr(u.facts) ? u.facts : []) parts.push(f?.label, f?.value);
  for (const p of isArr(u.phases) ? u.phases : []) parts.push(p?.name, p?.summary);
  for (const c of isArr(u.components) ? u.components : []) parts.push(c?.name);
  for (const s of isArr(u.steps) ? u.steps : []) {
    if (!isObj(s)) continue;
    parts.push(s.title, s.action, s.why, s.mistake, ...(isArr(s.tools) ? s.tools : []));
    if (isObj(s.spec)) parts.push(s.spec.value, s.spec.unit, s.spec.note);
  }
  return parts.filter(isStr).join('\n');
}

function checkGlossary(file, units) {
  const rel = relative(ROOT, file);
  const errors = [];
  const warnings = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  const warn = (where, msg) => warnings.push(`${where}: ${msg}`);
  const result = { rel, errors, warnings, count: 0, maxLevel: 0, missing: false };

  if (!existsSync(file)) { result.missing = true; return result; }
  let list;
  try {
    list = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    err('file', `not valid JSON (${e.message})`);
    return result;
  }
  if (!isArr(list)) { err('file', 'top level is not an array'); return result; }
  result.count = list.length;

  const byId = new Map();
  const nameOwner = new Map();
  const at = (g, i) => `[${i}]${isObj(g) && isStr(g.id) ? ` (${g.id})` : ''}`;
  const namesOf = (g) => [g.term, ...(isArr(g.aliases) ? g.aliases : [])].filter(isStr);

  // Shape, ids and names. A name (term or alias) may belong to one entry only.
  list.forEach((g, i) => {
    const w = at(g, i);
    if (!isObj(g)) { err(w, 'not an object'); return; }
    if (!isStr(g.id)) err(w, 'id missing');
    else {
      if (byId.has(g.id)) err(w, `duplicate id "${g.id}"`);
      byId.set(g.id, g);
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(g.id)) err(w, 'id is not kebab-case');
    }
    for (const k of ['term', 'short', 'group']) if (!isStr(g[k])) err(w, `${k} missing or empty`);
    if (!isArr(g.aliases) || g.aliases.some((a) => !isStr(a))) err(w, 'aliases must be an array of strings');
    if (g.long != null && !isStr(g.long)) err(w, 'long is empty or not a string');
    if (!GLOSSARY_CATEGORIES.has(g.category)) err(w, `category "${g.category}" is not one of ${[...GLOSSARY_CATEGORIES].join('|')}`);
    if (g.plainWord != null && typeof g.plainWord !== 'boolean') err(w, 'plainWord is not true/false');
    if (!isArr(g.requires) || g.requires.some((r) => !isStr(r))) err(w, 'requires must be an array of ids');
    if (!Number.isInteger(g.level) || g.level < 0) err(w, `level "${g.level}" is not a whole number`);
    if (g.part != null && !catalog.ids.has(g.part)) err(w, `part "${g.part}" is not in the parts catalog`);
    if (isStr(g.short) && words(g.short) >= 25) warn(w, `short is ${words(g.short)} words (keep it under 25)`);
    for (const [k, v] of Object.entries(g)) if (typeof v === 'string' && EM_DASH.test(v)) warn(w, `em dash in ${k}`);
    const own = new Set();
    for (const n of namesOf(g)) {
      const key = n.toLowerCase();
      if (own.has(key)) { warn(w, `name "${n}" is listed twice`); continue; }
      own.add(key);
      const owner = nameOwner.get(key);
      if (owner != null && owner !== g.id) err(w, `name "${n}" also belongs to "${owner}"`);
      else nameOwner.set(key, g.id);
    }
  });

  // References resolve.
  list.forEach((g, i) => {
    if (!isObj(g)) return;
    const w = at(g, i);
    for (const r of isArr(g.requires) ? g.requires : []) {
      if (r === g.id) err(w, 'requires itself');
      else if (!byId.has(r)) err(w, `requires "${r}" does not resolve`);
    }
    if (g.seeAlso != null) {
      if (!isArr(g.seeAlso)) err(w, 'seeAlso is not an array');
      else for (const r of g.seeAlso) if (!byId.has(r)) err(w, `seeAlso "${r}" does not resolve`);
    }
  });

  // The prerequisite graph is acyclic, and level is its longest path down:
  // 0 with no prerequisites, else 1 + the deepest prerequisite.
  const reqs = (id) => (isArr(byId.get(id)?.requires) ? byId.get(id).requires : []).filter((r) => r !== id && byId.has(r));
  const level = new Map();
  const visiting = [];
  const cycles = new Set();
  const depth = (id) => {
    if (level.has(id)) return level.get(id);
    const k = visiting.indexOf(id);
    if (k !== -1) {
      const cyc = [...visiting.slice(k), id].join(' -> ');
      if (!cycles.has(cyc)) { cycles.add(cyc); err('requires', `cycle: ${cyc}`); }
      return 0;
    }
    visiting.push(id);
    let l = 0;
    for (const r of reqs(id)) l = Math.max(l, depth(r) + 1);
    visiting.pop();
    level.set(id, l);
    return l;
  };
  for (const id of byId.keys()) depth(id);
  const ancestorMemo = new Map();
  const ancestors = (id) => {
    if (ancestorMemo.has(id)) return ancestorMemo.get(id);
    const out = new Set();
    ancestorMemo.set(id, out); // set first, so a cycle (already reported) cannot recurse forever
    for (const r of reqs(id)) { out.add(r); for (const a of ancestors(r)) out.add(a); }
    return out;
  };
  list.forEach((g, i) => {
    if (!isObj(g) || byId.get(g.id) !== g) return;
    const w = at(g, i);
    const computed = level.get(g.id);
    result.maxLevel = Math.max(result.maxLevel, computed);
    if (Number.isInteger(g.level) && g.level !== computed) err(w, `level is ${g.level} but its prerequisites put it at ${computed}`);
    if (Number.isInteger(g.level) && g.level > 0 && reqs(g.id).length === 0) err(w, `level ${g.level} but no prerequisites`);
    const direct = reqs(g.id);
    for (const r of direct) {
      const via = direct.find((o) => o !== r && ancestors(o).has(r));
      if (via) warn(w, `requires "${r}" is already implied by "${via}" (list direct prerequisites only)`);
    }
  });

  // No definition may use a term the learner has not met: every glossary term
  // in short or long must be a prerequisite, directly or through others.
  // plainWord entries are ordinary English and never count. The entry's own
  // names stay in the matcher so its own words are not read as other terms.
  const asTerm = (g) => ({ id: g.id, term: g.term, aliases: isArr(g.aliases) ? g.aliases : [] });
  const technical = [...byId.values()].filter((g) => g.plainWord !== true && isStr(g.term)).map(asTerm);
  let forwardCount = 0;
  list.forEach((g, i) => {
    if (!isObj(g) || byId.get(g.id) !== g || !isStr(g.term)) return;
    const match = termMatcher([asTerm(g), ...technical.filter((t) => t.id !== g.id)]);
    const anc = ancestors(g.id);
    const missing = new Set();
    for (const hit of match([g.short, g.long].filter(isStr).join(' '))) {
      if (hit.id !== g.id && !anc.has(hit.id)) missing.add(`${hit.id} ("${hit.text}")`);
    }
    if (missing.size) {
      forwardCount++;
      err(at(g, i), `definition uses terms that are not among its prerequisites: ${[...missing].join(', ')}`);
    }
  });
  result.forwardCount = forwardCount;

  // Examples are real step sentences that use the term. Terms that never
  // appear anywhere in the content are flagged.
  let catalogList = [];
  try { catalogList = JSON.parse(readFileSync(CATALOG, 'utf8')); } catch { /* reported by the catalog check */ }
  const corpus = [...units.map(unitText), ...(isArr(catalogList) ? catalogList : []).map((p) => [p?.name, p?.what, p?.does, p?.lookFor].filter(isStr).join('\n'))].join('\n');
  const unitsById = new Map(units.map((u) => [u.id, u]));
  const matchAll = termMatcher([...byId.values()].filter((g) => isStr(g.term)).map(asTerm));
  let exampleCount = 0;
  list.forEach((g, i) => {
    if (!isObj(g) || byId.get(g.id) !== g) return;
    const w = at(g, i);
    if (g.example != null) {
      const ex = g.example;
      const step = isObj(ex) ? unitsById.get(ex.unit)?.steps?.find((s) => s?.id === ex.stepId) : null;
      if (!isObj(ex) || !isStr(ex.unit) || !isStr(ex.stepId) || !isStr(ex.text)) err(w, 'example needs unit, stepId and text');
      else if (!unitsById.has(ex.unit)) err(w, `example unit "${ex.unit}" does not resolve`);
      else if (!step) err(w, `example step "${ex.stepId}" is not in ${ex.unit}`);
      else if (!EXAMPLE_FIELDS.some((f) => isStr(step[f]) && step[f].includes(ex.text))) err(w, `example text is not copied from the action, why or mistake of ${ex.stepId}`);
      else if (!matchAll(ex.text).some((h) => h.id === g.id)) err(w, 'example text does not use the term');
      else exampleCount++;
    }
    const used = namesOf(g).some((n) => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(n)}(?![\\p{L}\\p{N}])`, 'iu').test(corpus));
    if (!used) warn(w, 'term and aliases never appear in the unit or catalog text');
  });
  result.exampleCount = exampleCount;
  return result;
}

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
  const mistakeIds = new Map();
  let mistakeCount = 0;
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

    // mistakes[]: the ways this step goes wrong. Ids key saved drill progress, so they are unique in the unit and stable.
    // When a step has mistakes[], the app shows those and not the older one-sentence mistake, so mistakes[] should cover it.
    if (s.mistakes != null) {
      if (!isArr(s.mistakes)) err(w, 'mistakes is not an array');
      else {
        s.mistakes.forEach((m, j) => {
          const mw = `${w} mistakes[${j}]${isObj(m) && isStr(m.id) ? ` (${m.id})` : ''}`;
          if (!isObj(m)) { err(mw, 'not an object'); return; }
          mistakeCount++;
          if (!isStr(m.id)) err(mw, 'id missing');
          else if (mistakeIds.has(m.id)) err(mw, `duplicate mistake id "${m.id}" (also on ${mistakeIds.get(m.id)})`);
          else mistakeIds.set(m.id, s.id);
          for (const k of MISTAKE_TEXT) if (!isStr(m[k])) err(mw, `${k} missing or empty`);
          if (m.detect != null && !isStr(m.detect)) err(mw, 'detect is empty or not a string');
          if (!SEVERITIES.has(m.severity)) err(mw, `severity "${m.severity}" is not one of ${[...SEVERITIES].join('|')}`);
          if (isStr(m.title)) {
            const n = words(m.title);
            if (n < 2 || n > 10) warn(mw, `title is ${n} words (aim for 2 to 10)`);
          }
          checkSourceIds(m.sourceIds, mw, false);
          for (const [k, v] of Object.entries(m)) {
            if (typeof v === 'string' && EM_DASH.test(v)) warn(mw, `em dash in ${k}`);
          }
        });
      }
    }
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

  // ---- failureModes: how the unit dies in service, each tied to the steps that matter
  if (u.failureModes != null) {
    if (!isArr(u.failureModes)) err('failureModes', 'is not an array');
    else {
      const fmIds = new Set();
      u.failureModes.forEach((f, i) => {
        const w = `failureModes[${i}]${isObj(f) && isStr(f.id) ? ` (${f.id})` : ''}`;
        if (!isObj(f)) { err(w, 'not an object'); return; }
        if (!isStr(f.id)) err(w, 'id missing');
        else if (fmIds.has(f.id)) err(w, `duplicate id "${f.id}"`);
        else fmIds.add(f.id);
        for (const k of ['title', 'cause', 'symptoms', 'rebuildAngle']) {
          const v = f[k];
          const okText = isStr(v) || (k !== 'title' && isArr(v) && v.length > 0 && v.every(isStr));
          if (!okText) err(w, `${k} missing or empty${k === 'title' ? '' : ' (a string, or for symptoms a list of strings)'}`);
        }
        if (!isArr(f.stepIds) || f.stepIds.length === 0) err(w, 'stepIds missing or empty');
        else for (const id of f.stepIds) if (!stepIds.has(id)) err(w, `stepId "${id}" does not resolve`);
        checkSourceIds(f.sourceIds, w, false);
        for (const [k, v] of Object.entries(f)) {
          const texts = isArr(v) ? v : [v];
          if (texts.some((t) => typeof t === 'string' && EM_DASH.test(t))) warn(w, `em dash in ${k}`);
        }
      });
    }
  }
  for (const id of sourceIds) if (!usedSources.has(id)) warn(`source ${id}`, 'is never cited');

  for (const k of ['summary', 'name', 'fullName', 'vehicle']) {
    if (typeof u[k] === 'string' && EM_DASH.test(u[k])) warn(k, 'em dash');
  }

  return { rel, errors, warnings, u, steps: steps.length, mistakes: mistakeCount, failureModes: isArr(u.failureModes) ? u.failureModes.length : 0 };
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
  const extra = r.mistakes || r.failureModes ? `, ${r.mistakes} mistakes, ${r.failureModes} failure modes` : '';
  console.log(`${status} ${r.rel}  (${r.steps ?? 0} steps${extra}, ${r.errors.length} errors, ${r.warnings.length} warnings)`);
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

// The glossary reports after the catalog: its part links and examples need both.
const glossary = checkGlossary(GLOSSARY, results.filter((r) => r.u && r.rel !== relative(ROOT, FIXTURE)).map((r) => r.u));
if (glossary.missing) console.log(`--   ${relative(ROOT, GLOSSARY)}  (no glossary yet)`);
else {
  errorCount += glossary.errors.length;
  warnCount += glossary.warnings.length;
  console.log(`${glossary.errors.length ? 'FAIL' : 'ok  '} ${glossary.rel}  (${glossary.count} terms, levels 0-${glossary.maxLevel}, ${glossary.exampleCount ?? 0} examples, ${glossary.errors.length} errors, ${glossary.warnings.length} warnings)`);
  for (const e of glossary.errors) console.log(`    error   ${e}`);
  if (!QUIET) for (const w of glossary.warnings) console.log(`    warning ${w}`);
}

console.log(`\n${all.length + (glossary.missing ? 1 : 2)} file(s), ${errorCount} error(s), ${warnCount} warning(s).`);
process.exit(errorCount ? 1 : 0);
