import catalog from './parts/catalog.json';
import { UNITS } from './index.js';

/**
 * Parts: the shared catalog, the photos credited in media.json, and the
 * drawings in public/parts/svg/ (see docs/CONTENT_SCHEMA.md).
 *
 * Photos are bundled metadata, so they are known at build time. media.json is
 * loaded through a glob so a missing file means "no photos yet", not a broken
 * build. Drawings and unit diagrams live in public/ and are discovered at run
 * time from public/parts/svg/MANIFEST.json; every asset URL is relative so the
 * app works under a GitHub Pages sub-path.
 */

const asArr = (v) => (Array.isArray(v) ? v : []);
const str = (v) => (typeof v === 'string' ? v.trim() : '');

export const PARTS = asArr(catalog).filter((p) => p && p.id);
export const PART_BY_ID = Object.fromEntries(PARTS.map((p) => [p.id, p]));

export const CATEGORY_LABEL = {
  'engine-block': 'Block and head',
  rotating: 'Rotating assembly',
  valvetrain: 'Valvetrain',
  timing: 'Timing',
  lubrication: 'Lubrication',
  cooling: 'Cooling',
  'fuel-air': 'Fuel and air',
  turbo: 'Turbo',
  'sealing-fasteners': 'Seals and fasteners',
  'electrical-sensors': 'Electrical and sensors',
  'transmission-case': 'Transmission case',
  hydraulics: 'Hydraulics',
  'clutches-gears': 'Clutches and gears',
  'cvt-variator': 'CVT variator',
  'torque-converter': 'Torque converter',
  driveline: 'Driveline',
  tools: 'Tools',
  other: 'Other',
};
export const categoryLabel = (c) => CATEGORY_LABEL[c] || c || 'Other';

/** Strip a leading slash or ./ so a URL stays relative to the page. */
export const relUrl = (u) => str(u).replace(/^(\.\/|\/)+/, '');

// ---- photos (media.json)
const mediaModules = import.meta.glob('./parts/media.json', { eager: true, import: 'default' });
const MEDIA_RAW = Object.values(mediaModules)[0];

function normalizePhoto(m, partId, i) {
  if (!m || typeof m !== 'object' || !str(m.file)) return null;
  return {
    key: `${partId}-${i}`,
    partId,
    src: relUrl(m.file),
    caption: str(m.caption),
    author: str(m.author),
    license: str(m.license),
    licenseUrl: str(m.licenseUrl),
    sourceUrl: str(m.sourceUrl),
    modified: m.modified === true ? 'modified' : str(m.modified),
  };
}

export const MEDIA = Object.fromEntries(
  Object.entries(MEDIA_RAW && typeof MEDIA_RAW === 'object' ? MEDIA_RAW : {})
    .filter(([id]) => PART_BY_ID[id])
    .map(([id, list]) => [id, asArr(list).map((m, i) => normalizePhoto(m, id, i)).filter(Boolean)])
    .filter(([, list]) => list.length > 0),
);

export const photosFor = (partId) => MEDIA[partId] || [];

/** Every photo, in catalog order, for the credits page. */
export const ALL_PHOTOS = PARTS.flatMap((p) => photosFor(p.id));

// ---- drawings and diagrams (public/, discovered at run time)
export const drawingUrl = (partId) => `parts/svg/${partId}.svg`;
export const diagramUrl = (unitId) => `diagrams/${unitId}.svg`;

// ---- how parts map onto units and steps
/** The catalog id a unit component points at. */
export function partOfComponent(unit, componentId) {
  const c = unit.components.find((x) => x.id === componentId);
  return c?.part && PART_BY_ID[c.part] ? c.part : null;
}

/** Unique part ids a step touches, in the order its components are listed, with the component names. */
export function stepParts(unit, step) {
  const byComp = Object.fromEntries(unit.components.map((c) => [c.id, c]));
  const out = new Map();
  for (const cid of step.components || []) {
    const c = byComp[cid];
    if (!c?.part || !PART_BY_ID[c.part]) continue;
    if (!out.has(c.part)) out.set(c.part, { partId: c.part, names: [] });
    if (c.name) out.get(c.part).names.push(c.name);
  }
  return [...out.values()];
}

/** Every part type a unit uses, with the components that use it. */
export function unitParts(unit) {
  const out = new Map();
  for (const c of unit.components) {
    if (!c?.part || !PART_BY_ID[c.part]) continue;
    if (!out.has(c.part)) out.set(c.part, { part: PART_BY_ID[c.part], components: [] });
    out.get(c.part).components.push(c);
  }
  return [...out.values()];
}

/** For one part: each unit that uses it, its component names there, and the steps that touch it. */
export function partUsage(partId) {
  return UNITS
    .map((unit) => {
      const comps = unit.components.filter((c) => c.part === partId);
      if (!comps.length) return null;
      const ids = new Set(comps.map((c) => c.id));
      const steps = unit.steps.filter((s) => s.components.some((cid) => ids.has(cid)));
      return { unit, components: comps, steps };
    })
    .filter(Boolean);
}

/** Alt text for a part picture: the part name plus the photo caption when there is one. */
export function altFor(partId, photo) {
  const name = PART_BY_ID[partId]?.name || partId;
  if (photo) return photo.caption ? `${name}: ${photo.caption}` : `Photo: ${name}`;
  return `Drawing: ${name}`;
}
