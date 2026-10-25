import { PART_BY_ID } from './parts.js';

/**
 * The dictionary: one shared list of technical terms in src/data/glossary.json
 * (see docs/CONTENT_SCHEMA.md). Loaded through a glob so a missing file means
 * "no dictionary yet", not a broken build. Every field is normalized here so
 * the rest of the app can trust the shape.
 */
const modules = import.meta.glob('./glossary.json', { eager: true, import: 'default' });
const RAW = Object.values(modules)[0];

const asArr = (v) => (Array.isArray(v) ? v : []);
const str = (v) => (typeof v === 'string' ? v.trim() : '');

export const GLOSSARY_CATEGORIES = [
  ['general', 'General'],
  ['engine', 'Engine'],
  ['transmission', 'Transmission'],
  ['measurement', 'Measuring'],
  ['tools', 'Tools'],
  ['fasteners-sealing', 'Fasteners and sealing'],
  ['electrical', 'Electrical'],
  ['abbreviation', 'Abbreviations'],
  ['brand', 'Brands and names'],
];
const CATEGORY_LABEL = Object.fromEntries(GLOSSARY_CATEGORIES);
export const termCategoryLabel = (c) => CATEGORY_LABEL[c] || 'General';

function normalize(list) {
  const seen = new Set();
  const out = [];
  for (const t of asArr(list)) {
    const id = str(t?.id);
    const term = str(t?.term);
    if (!id || !term || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      term,
      aliases: asArr(t.aliases).map(str).filter(Boolean),
      short: str(t.short),
      long: str(t.long),
      category: CATEGORY_LABEL[t.category] ? t.category : 'general',
      part: PART_BY_ID[str(t.part)] ? str(t.part) : null,
      seeAlso: asArr(t.seeAlso).map(str).filter(Boolean),
      requires: asArr(t.requires).map(str).filter(Boolean),
      level: Number.isInteger(t.level) && t.level >= 0 ? t.level : null,
      group: str(t.group),
      plainWord: t.plainWord === true,
      example: t.example && typeof t.example === 'object' && str(t.example.text)
        ? { unit: str(t.example.unit), stepId: str(t.example.stepId), text: str(t.example.text) }
        : null,
    });
  }
  // seeAlso and requires may only point at terms that exist, never at itself.
  for (const t of out) {
    t.seeAlso = [...new Set(t.seeAlso)].filter((id) => id !== t.id && seen.has(id));
    t.requires = [...new Set(t.requires)].filter((id) => id !== t.id && seen.has(id));
  }
  layer(out);
  return out.sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
}

/**
 * Make the prerequisite graph safe to walk: compute each term's level from
 * its requires (0 when it has none, else 1 + the deepest prerequisite, the
 * same rule the content uses, so a stale `level` in the file cannot put a
 * term before what it rests on), and drop any edge that would close a cycle,
 * so no term can end up locked forever behind itself.
 */
function layer(list) {
  const byId = new Map(list.map((t) => [t.id, t]));
  const level = new Map();
  const visiting = new Set();
  const visit = (t) => {
    if (level.has(t.id)) return level.get(t.id);
    visiting.add(t.id);
    let lv = 0;
    t.requires = t.requires.filter((id) => {
      if (visiting.has(id)) return false; // a cycle: drop this edge
      lv = Math.max(lv, visit(byId.get(id)) + 1);
      return true;
    });
    visiting.delete(t.id);
    level.set(t.id, lv);
    return lv;
  };
  for (const t of list) t.level = visit(t);
}

/** Every term, sorted A to Z by its display name. */
export const TERMS = normalize(RAW);
export const TERM_BY_ID = Object.fromEntries(TERMS.map((t) => [t.id, t]));
export const HAS_GLOSSARY = TERMS.length > 0;

/** For each term, the terms that list it in requires ("leads to"), A to Z. */
export const LEADS_TO = (() => {
  const m = Object.fromEntries(TERMS.map((t) => [t.id, []]));
  for (const t of TERMS) for (const r of t.requires) m[r].push(t.id);
  return m;
})();

/** The concept cluster a term belongs to; falls back to its category name. */
export const groupOf = (term) => term.group || termCategoryLabel(term.category);

/** Every term required, directly or not, by any of these ids, including the ids. */
export function withPrerequisites(ids) {
  const out = new Set();
  const stack = [...ids];
  while (stack.length) {
    const id = stack.pop();
    if (out.has(id) || !TERM_BY_ID[id]) continue;
    out.add(id);
    stack.push(...TERM_BY_ID[id].requires);
  }
  return out;
}

/** Letter a term files under in the A to Z list ("#" for digits and symbols). */
export const letterOf = (term) => {
  const c = term.term.charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
};
