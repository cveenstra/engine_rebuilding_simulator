import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { diagramUrl } from '../data/parts.js';

/**
 * Run-time loading of the drawings in public/. Everything is fetched with a
 * relative URL so it resolves under whatever sub-path the app is served from,
 * cached per URL for the session, and treated as optional: a missing or broken
 * file resolves to null and the caller falls back.
 */

// ---- MANIFEST.json: { parts: [ids], diagrams: { unitId: [placed ids] } }
const MANIFEST_URL = 'parts/svg/MANIFEST.json';
let manifest; // undefined while loading, null if missing, else { parts: Set, diagrams: {} }
let manifestPromise = null;
const listeners = new Set();

function loadManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch(MANIFEST_URL, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => {
        if (!m || typeof m !== 'object' || !Array.isArray(m.parts)) return null;
        const diagrams = m.diagrams && typeof m.diagrams === 'object' ? m.diagrams : {};
        return { parts: new Set(m.parts.filter((x) => typeof x === 'string')), diagrams };
      })
      .catch(() => null)
      .then((m) => {
        manifest = m;
        listeners.forEach((fn) => fn());
        return m;
      });
  }
  return manifestPromise;
}

const subscribe = (fn) => {
  listeners.add(fn);
  loadManifest();
  return () => listeners.delete(fn);
};

/** undefined while loading, null when there is no manifest, else { parts, diagrams }. */
export function useManifest() {
  return useSyncExternalStore(subscribe, () => manifest, () => undefined);
}

/**
 * Does this part have a drawing? true / false from the manifest. With no
 * manifest at all the answer is 'maybe': the caller tries the file and falls
 * back if it is not there.
 */
export function drawingState(m, partId) {
  if (m === undefined) return 'loading';
  if (m === null) return 'maybe';
  return m.parts.has(partId) ? 'yes' : 'no';
}

export function diagramState(m, unitId) {
  if (m === undefined) return 'loading';
  if (m === null) return 'maybe';
  return Object.prototype.hasOwnProperty.call(m.diagrams, unitId) ? 'yes' : 'no';
}

// ---- inline SVG
const svgCache = new Map(); // url -> Promise<string|null>
const svgDone = new Map(); // url -> string|null once settled
export const UID = '__rbuid__';

/**
 * Parse, check and lightly sanitize an SVG file. Returns markup whose ids are
 * prefixed with a placeholder so each inline copy can get unique ids.
 */
function cleanSvg(text) {
  if (typeof text !== 'string' || !text.includes('<svg')) return null;
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.documentElement;
  if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) return null;
  svg.querySelectorAll('script, foreignObject').forEach((n) => n.remove());
  const ids = [];
  for (const el of [svg, ...svg.querySelectorAll('*')]) {
    for (const a of [...el.attributes]) {
      const name = a.name.toLowerCase();
      if (name.startsWith('on')) el.removeAttribute(a.name);
      else if ((name === 'href' || name === 'xlink:href') && !a.value.startsWith('#')) el.removeAttribute(a.name);
    }
    if (el.id) ids.push(el.id);
  }
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  let out = new XMLSerializer().serializeToString(svg);
  for (const id of ids) {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out
      .replace(new RegExp(`id="${esc}"`, 'g'), `id="${UID}-${id}"`)
      .replace(new RegExp(`url\\(#${esc}\\)`, 'g'), `url(#${UID}-${id})`)
      .replace(new RegExp(`href="#${esc}"`, 'g'), `href="#${UID}-${id}"`);
  }
  return out;
}

export function loadSvg(url) {
  if (!svgCache.has(url)) {
    svgCache.set(url, fetch(url)
      .then((r) => (r.ok ? r.text() : null))
      .then(cleanSvg)
      .catch(() => null)
      .then((s) => { svgDone.set(url, s); return s; }));
  }
  return svgCache.get(url);
}

/**
 * Inline SVG markup for a URL. Returns undefined while loading (or while
 * `enabled` is false), null if the file is missing or not an SVG.
 */
export function useSvg(url, enabled = true) {
  const [, force] = useState(0);
  const settled = url && svgDone.has(url);
  useEffect(() => {
    if (!enabled || !url || svgDone.has(url)) return undefined;
    let live = true;
    loadSvg(url).then(() => { if (live) force((n) => n + 1); });
    return () => { live = false; };
  }, [url, enabled]);
  if (!url) return null;
  return settled ? svgDone.get(url) : undefined;
}

/** True once the element has come near the viewport; stays true. */
export function useInView(rootMargin = '200px') {
  const ref = useRef(null);
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (seen) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); }
    }, { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, rootMargin]);
  return [ref, seen];
}

/**
 * The unit's exploded diagram, if there is one: { state: 'loading'|'ready'|'none', markup }.
 */
export function useUnitDiagram(unitId) {
  const manifest = useManifest();
  const st = diagramState(manifest, unitId);
  const want = st === 'yes' || st === 'maybe';
  const svg = useSvg(want ? diagramUrl(unitId) : null, want);
  if (st === 'loading' || (want && svg === undefined)) return { state: 'loading', markup: null };
  if (typeof svg === 'string') return { state: 'ready', markup: svg };
  return { state: 'none', markup: null };
}
