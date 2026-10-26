import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { Pill } from './ui.jsx';
import {
  PART_BY_ID, photosFor, drawingUrl, stepParts, altFor, categoryLabel,
} from '../data/parts.js';
import { useManifest, drawingState, useSvg, useInView, UID } from '../engine/assets.js';
import { Glossed } from './glossary.jsx';
import { glossSkips, termsForPart } from '../engine/glossary.js';

/** An SVG file's markup, inlined so currentColor and var(--accent) follow the theme. */
function InlineSvg({ markup, className = '' }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const html = useMemo(() => markup.split(UID).join(`rb${uid}`), [markup, uid]);
  return <div className={`part-svg ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

function Placeholder({ big = false }) {
  return (
    <div className="grid h-full w-full place-items-center text-ink-3">
      <div className="flex flex-col items-center gap-1 px-2 text-center">
        <Icon name="wrench" size={big ? 32 : 20} strokeWidth={1.5} />
        {big && <span className="text-sm">No picture yet</span>}
      </div>
    </div>
  );
}

/**
 * What can be shown for a part: its photos (minus any that failed to load) and
 * its drawing (once fetched). `enabled` gates the drawing fetch for lazy loading.
 */
function usePartPictures(partId, enabled, { preferPhoto = false } = {}) {
  const part = PART_BY_ID[partId];
  const manifest = useManifest();
  const [failed, setFailed] = useState(() => new Set());
  const photos = photosFor(partId).filter((p) => !failed.has(p.key));
  const dState = part && part.drawable === false ? 'no' : drawingState(manifest, partId);
  // A thumbnail only needs the drawing when there is no photo to show.
  const needDrawing = !(preferPhoto && photos.length);
  const can = dState === 'yes' || dState === 'maybe';
  const tryDrawing = needDrawing && enabled && can;
  const svg = useSvg(tryDrawing ? drawingUrl(partId) : null, tryDrawing);
  const pending = needDrawing && (dState === 'loading' || (can && (!enabled || svg === undefined)));
  const failPhoto = (key) => setFailed((s) => new Set(s).add(key));
  // Probe every photo once it is wanted, so a broken file drops out of the
  // slides before anyone swipes to it.
  const probeKey = enabled && !preferPhoto ? photosFor(partId).map((p) => p.src).join('|') : '';
  useEffect(() => {
    if (!probeKey) return undefined;
    let live = true;
    const imgs = photosFor(partId).map((p) => {
      const img = new Image();
      img.onerror = () => { if (live) setFailed((s) => new Set(s).add(p.key)); };
      img.src = p.src;
      return img;
    });
    return () => { live = false; imgs.forEach((img) => { img.onerror = null; }); };
  }, [probeKey, partId]);
  return { part, photos, svg: typeof svg === 'string' ? svg : null, pending, failPhoto };
}

/** One line of attribution, required by CC BY and CC BY-SA. */
export function PhotoCredit({ photo, className = '' }) {
  if (!photo) return null;
  const link = 'underline decoration-line underline-offset-2 hover:text-ink';
  const author = photo.author || 'Unknown author';
  const license = photo.license || 'see source';
  return (
    <p className={`${/\btext-(xs|sm|base|\[)/.test(className) ? '' : 'text-xs'} leading-snug text-ink-3 ${className}`}>
      Photo:{' '}
      {photo.sourceUrl ? <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className={link}>{author}</a> : author},{' '}
      {photo.licenseUrl ? <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" className={link}>{license}</a> : license}
      {photo.modified ? `, ${photo.modified}` : ''}
    </p>
  );
}

/** Credit for the photo a thumbnail shows, for grids where the thumbnail is inside a link. */
export function FirstPhotoCredit({ partId, className = '' }) {
  const photo = photosFor(partId)[0];
  return photo ? <PhotoCredit photo={photo} className={`line-clamp-2 text-[11px] ${className}`} /> : null;
}

/**
 * A small picture for a part: the first photo, else the drawing, else a
 * placeholder. Loads only when near the viewport. `hideAlt` is for the quiz,
 * where the name is the answer.
 */
export function PartThumb({ partId, photoKey, className = '', credit = false, hideAlt = false }) {
  const [ref, seen] = useInView();
  const { photos, svg, pending, failPhoto } = usePartPictures(partId, seen, { preferPhoto: true });
  const photo = photoKey ? photos.find((p) => p.key === photoKey) : photos[0];
  return (
    <div className={className}>
      <div ref={ref} className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-line-2 bg-sunken text-ink">
        {photo && seen ? (
          <img
            src={photo.src} alt={hideAlt ? '' : altFor(partId, photo)} loading="lazy" decoding="async"
            onError={() => failPhoto(photo.key)} className="h-full w-full object-cover"
          />
        ) : !photo && svg ? (
          <InlineSvg markup={svg} className="h-full w-full p-1" />
        ) : pending || photo ? (
          <div className="h-full w-full animate-pulse bg-line-2" />
        ) : (
          <Placeholder />
        )}
      </div>
      {credit && photo && seen && <PhotoCredit photo={photo} className="mt-1 line-clamp-2" />}
    </div>
  );
}

/**
 * The full picture set for a part: every photo with its credit, then the
 * drawing, as swipeable slides. Falls back to whichever exists.
 */
export function PartImage({ partId, className = '', hideCaption = false, hideAlt = false, onSlides }) {
  const [ref, seen] = useInView('400px');
  const { part, photos, svg, pending, failPhoto } = usePartPictures(partId, seen);
  const slides = [
    ...photos.map((p) => ({ kind: 'photo', key: p.key, photo: p })),
    ...(svg ? [{ kind: 'drawing', key: 'drawing' }] : []),
  ];
  const [at, setAt] = useState(0);
  const i = Math.min(at, Math.max(0, slides.length - 1));
  const slide = slides[i];
  const touch = useRef(null);
  const labelId = useId();

  useEffect(() => { onSlides?.(slides.length, pending); }, [slides.length, pending, onSlides]);

  const go = (d) => setAt(Math.max(0, Math.min(slides.length - 1, i + d)));
  const onTouchStart = (e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e) => {
    const s = touch.current;
    touch.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(t.clientY - s.y) * 1.5) go(dx < 0 ? 1 : -1);
  };
  const name = part?.name || partId;

  return (
    <div className={className} data-noswipe>
      <div
        ref={ref}
        role="group" aria-roledescription="carousel" aria-labelledby={labelId}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-line bg-sunken text-ink"
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      >
        <span id={labelId} className="sr-only">Pictures of {name}</span>
        {slide?.kind === 'photo' ? (
          <img
            key={slide.key} src={slide.photo.src} alt={hideAlt ? 'Part to identify' : altFor(partId, slide.photo)}
            loading="lazy" decoding="async" onError={() => failPhoto(slide.key)}
            className="h-full w-full object-contain"
          />
        ) : slide?.kind === 'drawing' ? (
          <div role="img" aria-label={hideAlt ? 'Part to identify' : altFor(partId, null)} className="h-full w-full p-3">
            <InlineSvg markup={svg} className="h-full w-full" />
          </div>
        ) : pending ? (
          <div className="h-full w-full animate-pulse bg-line-2" />
        ) : (
          <Placeholder big />
        )}

        {slides.length > 1 && (
          <>
            <button
              type="button" onClick={() => go(-1)} disabled={i === 0} aria-label="Previous picture"
              className="absolute left-1.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface/90 text-ink shadow-sm disabled:opacity-0"
            >
              <Icon name="left" size={20} />
            </button>
            <button
              type="button" onClick={() => go(1)} disabled={i === slides.length - 1} aria-label="Next picture"
              className="absolute right-1.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface/90 text-ink shadow-sm disabled:opacity-0"
            >
              <Icon name="right" size={20} />
            </button>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5" aria-live="polite">
          <span className="sr-only">Picture {i + 1} of {slides.length}</span>
          {slides.map((s, n) => (
            <button
              key={s.key} type="button" onClick={() => setAt(n)} aria-label={`Show ${s.kind === 'photo' ? `photo ${n + 1}` : 'drawing'}`}
              aria-current={n === i ? 'true' : undefined}
              className="grid h-6 w-6 place-items-center"
            >
              <span className={`block h-2 rounded-full transition-all ${n === i ? 'w-5 bg-brand' : 'w-2 bg-line'}`} />
            </button>
          ))}
        </div>
      )}

      {slide?.kind === 'photo' && (
        <div className="mt-1.5">
          {!hideCaption && slide.photo.caption && <p className="text-sm leading-snug text-ink-2">{slide.photo.caption}</p>}
          <PhotoCredit photo={slide.photo} />
        </div>
      )}
      {slide?.kind === 'drawing' && !hideCaption && (
        <p className="mt-1.5 text-xs text-ink-3">Drawing made for Rebuild Bench. Simplified, not to scale.</p>
      )}
    </div>
  );
}

/**
 * The part detail as a sheet over the current screen, so a game in progress is
 * never lost. Links on to the full part page.
 */
export function PartSheet({ partId, unit, onClose }) {
  const ref = useRef(null);
  const part = PART_BY_ID[partId];
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    const d = ref.current;
    if (!d) return undefined;
    if (!d.open) d.showModal?.();
    const onClosed = () => closeRef.current();
    d.addEventListener('close', onClosed);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      d.removeEventListener('close', onClosed);
      document.body.style.overflow = prev;
    };
  }, []);

  if (!part) return null;
  const here = unit ? unit.components.filter((c) => c.part === partId).map((c) => c.name) : [];
  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref} data-noswipe aria-labelledby={`sheet-${partId}`}
      onClick={(e) => { if (e.target === ref.current) close(); }}
      className="sheet m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border-0 bg-surface p-0 text-ink shadow-xl backdrop:bg-black/55 sm:m-auto sm:max-w-lg sm:rounded-2xl"
    >
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-line-2 bg-surface px-4 py-2">
        <div className="min-w-0 flex-1">
          <h2 id={`sheet-${partId}`} className="truncate text-lg font-semibold text-ink">{part.name}</h2>
          <p className="text-xs text-ink-3">{categoryLabel(part.category)}</p>
        </div>
        <button type="button" onClick={close} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-lg text-ink-2 hover:bg-sunken">
          <Icon name="x" size={22} />
        </button>
      </div>
      <div className="safe-bottom space-y-3 px-4 pb-4 pt-3">
        <PartImage partId={partId} />
        {here.length > 0 && (
          <p className="text-sm text-ink-2">
            <span className="font-semibold text-ink">In the {unit.name}:</span> {here.join(', ')}
          </p>
        )}
        <PartFacts part={part} />
        <Link
          to={`/part/${partId}${unit ? `?unit=${unit.id}` : ''}`}
          className="flex min-h-11 items-center justify-center gap-1 rounded-lg border border-line px-4 text-base font-medium text-brand-text hover:bg-sunken"
        >
          Full part page <Icon name="chevron" size={16} />
        </Link>
      </div>
    </dialog>
  );
}

/** What it is, what it does, what to look for. */
export function PartFacts({ part }) {
  const rows = [
    ['What it is', part.what],
    ['What it does', part.does],
    ['What to look for', part.lookFor],
  ].filter(([, v]) => v);
  // Link each term once across the three rows, and never the part's own term.
  const skips = glossSkips(rows.map(([, v]) => v));
  const self = termsForPart(part.id);
  return (
    <dl className="space-y-2.5">
      {rows.map(([k, v], i) => (
        <div key={k}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-ink-3">{k}</dt>
          <dd className="mt-0.5 text-base leading-relaxed text-ink-2"><Glossed text={v} skip={skips[i]} exclude={self} /></dd>
        </div>
      ))}
    </dl>
  );
}

/** Thumbnails of the parts a step touches. Tap one to see the part. */
export function PartStrip({ unit, step, small = false, className = '' }) {
  const parts = stepParts(unit, step);
  const [open, setOpen] = useState(null);
  if (!parts.length) return null;
  const w = small ? 'w-16' : 'w-24';
  return (
    <div className={className}>
      {!small && <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-3">Parts in this step</p>}
      <div className="scroll-x -mx-1 px-1" data-noswipe>
        <ul className="flex gap-2 pb-1">
          {parts.map(({ partId, names }) => {
            const name = PART_BY_ID[partId].name;
            return (
              <li key={partId} className={`${w} flex-shrink-0`}>
                <button
                  type="button" onClick={() => setOpen(partId)}
                  aria-label={`Show ${name}${names.length ? ` (${names.join(', ')})` : ''}`}
                  className="block w-full rounded-lg text-left hover:opacity-90 active:opacity-80"
                >
                  <PartThumb partId={partId} />
                  <span className={`mt-1 line-clamp-2 leading-tight text-ink-2 ${small ? 'text-[11px]' : 'text-xs'}`}>{name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {open && <PartSheet key={open} partId={open} unit={unit} onClose={() => setOpen(null)} />}
    </div>
  );
}

/**
 * The unit diagram inline, with the given parts highlighted and everything
 * else dimmed. Each part region is a button that calls onPick(partId).
 */
export function UnitDiagram({ unit, markup, highlight = [], onPick, className = '' }) {
  const box = useRef(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const html = useMemo(() => (markup ? markup.split(UID).join(`rb${uid}`) : ''), [markup, uid]);
  const [missing, setMissing] = useState([]);
  const key = highlight.join('|');

  useEffect(() => {
    const el = box.current;
    if (!el || !html) return;
    const svg = el.querySelector('svg');
    if (svg) {
      svg.removeAttribute('aria-hidden');
      svg.setAttribute('role', 'group');
      svg.setAttribute('aria-label', `${unit.name} diagram`);
    }
    const on = new Set(key ? key.split('|') : []);
    const present = new Set();
    el.querySelectorAll('g[data-part]').forEach((g) => {
      const id = g.getAttribute('data-part');
      const part = PART_BY_ID[id];
      if (!part) return;
      present.add(id);
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', `${part.name}${on.has(id) ? ', in this step' : ''}`);
      g.classList.toggle('is-on', on.has(id));
    });
    const anyOn = [...on].some((id) => present.has(id));
    el.classList.toggle('has-focus', anyOn);
    setMissing([...on].filter((id) => !present.has(id)));
  }, [html, key, unit.name]);

  const pickFrom = (target) => {
    const g = target instanceof Element ? target.closest('g[data-part]') : null;
    const id = g?.getAttribute('data-part');
    if (id && PART_BY_ID[id]) onPick?.(id);
  };

  if (!html) return null;
  return (
    <div className={`mx-auto w-full max-w-xl ${className}`}>
      <div
        ref={box}
        className="unit-diagram aspect-[4/3] w-full overflow-hidden rounded-xl border border-line bg-sunken p-1 text-ink-2"
        onClick={(e) => pickFrom(e.target)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickFrom(e.target); }
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {highlight.length > 0 && (
        <p className="mt-1.5 text-xs text-ink-3">
          {missing.length === highlight.length
            ? 'This step’s parts aren’t on the diagram.'
            : missing.length
              ? `This step’s parts are highlighted. Not on the diagram: ${missing.map((id) => PART_BY_ID[id]?.name || id).join(', ')}.`
              : 'This step’s parts are highlighted. Tap any part to see it.'}
        </p>
      )}
      {!highlight.length && <p className="mt-1.5 text-xs text-ink-3">Tap any part to see what it is.</p>}
    </div>
  );
}

/** Small category tag. */
export function CategoryPill({ category }) {
  return <Pill>{categoryLabel(category)}</Pill>;
}
