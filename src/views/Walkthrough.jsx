import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bar, Button, Select } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { ModeHeader, StepCard, UnitMissing, ActionBar } from '../components/bench.jsx';
import { useUnit } from '../engine/unit.js';
import { getState, getPref, setPref } from '../engine/storage.js';
import { UnitDiagram } from '../components/parts.jsx';
import { usePartSheet } from '../components/usePartSheet.jsx';
import { useUnitDiagram } from '../engine/assets.js';
import { stepParts } from '../data/parts.js';
import { setWalkIndex, touchMode } from '../engine/progress.js';

function startIndex(unit, params) {
  const n = unit.steps.length;
  const order = Number(params.get('step'));
  if (Number.isInteger(order) && order >= 1 && order <= n) return order - 1;
  const phase = params.get('phase');
  if (phase) {
    const first = unit.steps.find((s) => s.phase === phase);
    if (first) return first.index;
  }
  const saved = getState().walk[unit.id];
  return Number.isInteger(saved) && saved >= 0 && saved < n ? saved : 0;
}

/** The unit diagram as a collapsible panel, lighting up the parts this step touches. */
function DiagramPanel({ unit, step }) {
  const diagram = useUnitDiagram(unit.id);
  const [open, setOpen] = useState(() => getPref('walkDiagram', false) === true);
  const [sheet, openPart] = usePartSheet(unit);
  if (diagram.state === 'none') return null;
  const highlight = stepParts(unit, step).map((p) => p.partId);
  return (
    <>
      <details
        open={open}
        onToggle={(e) => { const o = e.currentTarget.open; setOpen(o); setPref('walkDiagram', o); }}
        className="mb-3 rounded-xl border border-line bg-surface"
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium text-ink-2 [&::-webkit-details-marker]:hidden">
          <Icon name="chevron" size={16} className={`text-ink-3 transition-transform ${open ? 'rotate-90' : ''}`} />
          {open ? 'Hide' : 'Show'} where this step is on the {unit.kind === 'transmission' ? 'transmission' : 'engine'}
        </summary>
        {open && (
          <div className="px-3 pb-3" data-noswipe>
            {diagram.state === 'ready'
              ? <UnitDiagram unit={unit} markup={diagram.markup} highlight={highlight} onPick={openPart} />
              : <div className="aspect-[4/3] w-full animate-pulse rounded-xl bg-line-2" />}
          </div>
        )}
      </details>
      {sheet}
    </>
  );
}

function Walk({ unit }) {
  const [params, setParams] = useSearchParams();
  const [index, setIndex] = useState(() => startIndex(unit, params));
  const touch = useRef(null);
  const n = unit.steps.length;

  // A link to another step of this unit (from a definition's "Appears in")
  // changes only ?step=, so follow it here rather than remounting.
  const stepParam = params.get('step');
  const [seenParam, setSeenParam] = useState(stepParam);
  if (stepParam !== seenParam) {
    setSeenParam(stepParam);
    const order = Number(stepParam);
    if (Number.isInteger(order) && order >= 1 && order <= n && order - 1 !== index) {
      setIndex(order - 1);
    }
  }
  const step = unit.steps[index];
  useEffect(() => { setWalkIndex(unit.id, index); }, [unit.id, index]);

  const go = (i) => {
    const next = Math.max(0, Math.min(n - 1, i));
    if (next === index) return;
    setIndex(next);
    setWalkIndex(unit.id, next);
    // Keep the step in the URL so coming back from a part page lands on the same step.
    setParams({ step: String(next + 1) }, { replace: true });
  };

  useEffect(() => { touchMode(unit.id, 'walk'); }, [unit.id]);

  // Arrow keys on a keyboard, for desktop study.
  const goRef = useRef(go);
  useEffect(() => { goRef.current = go; });
  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (document.querySelector('dialog[open]')) return;
      if (e.key === 'ArrowRight') goRef.current(index + 1);
      if (e.key === 'ArrowLeft') goRef.current(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index]);

  const onTouchStart = (e) => {
    // Picture strips and sheets handle their own swipes.
    if (e.target instanceof Element && e.target.closest('[data-noswipe]')) { touch.current = null; return; }
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1));
  };

  return (
    <div>
      <ModeHeader unit={unit} title="Walkthrough" />

      <div className="mb-3 flex items-end gap-3">
        <Select label="Jump to phase" value={step.phase} onChange={(id) => go(unit.steps.find((s) => s.phase === id)?.index ?? index)} className="flex-1">
          {unit.phases.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.steps.length})</option>)}
        </Select>
      </div>

      <div className="mb-3 flex items-center gap-3">
        <Bar pct={((index + 1) / n) * 100} label="Walkthrough position" />
        <span className="tabnum flex-shrink-0 text-sm text-ink-3">{index + 1} / {n}</span>
      </div>

      <DiagramPanel unit={unit} step={step} />

      <div className="swipe" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div key={step.id} className="pop-in">
          <StepCard unit={unit} step={step} mistakesOpen={params.get('show') === 'mistakes' && Number(stepParam) === step.order} />
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-ink-3">Swipe, or use the buttons below, to move between steps.</p>

      {index === n - 1 && (
        <div className="mt-4 rounded-xl border border-ok-line bg-ok-soft p-4">
          <p className="text-base font-semibold text-ok-text">That’s the whole rebuild.</p>
          <p className="mt-1 text-sm text-ink-2">Now test yourself. A full run has you pick every step in order.</p>
          <Button to={`/unit/${unit.id}/run`} className="mt-3">Start a full rebuild run</Button>
        </div>
      )}

      <ActionBar>
        <Button variant="ghost" className="flex-1" onClick={() => go(index - 1)} disabled={index === 0}>
          <Icon name="left" size={18} /> Back
        </Button>
        <Button className="flex-[2]" onClick={() => go(index + 1)} disabled={index === n - 1}>
          Next step <Icon name="right" size={18} />
        </Button>
      </ActionBar>
    </div>
  );
}

export default function Walkthrough() {
  const unit = useUnit();
  if (!unit) return <UnitMissing />;
  return <Walk key={unit.id} unit={unit} />;
}
