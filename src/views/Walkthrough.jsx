import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bar, Button, Select } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { ModeHeader, StepCard, UnitMissing, ActionBar } from '../components/bench.jsx';
import { useUnit } from '../engine/unit.js';
import { getState } from '../engine/storage.js';
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

function Walk({ unit }) {
  const [params] = useSearchParams();
  const [index, setIndex] = useState(() => startIndex(unit, params));
  const touch = useRef(null);
  const n = unit.steps.length;
  const step = unit.steps[index];

  const go = (i) => {
    const next = Math.max(0, Math.min(n - 1, i));
    if (next === index) return;
    setIndex(next);
    setWalkIndex(unit.id, next);
  };

  useEffect(() => { touchMode(unit.id, 'walk'); }, [unit.id]);

  // Arrow keys on a keyboard, for desktop study.
  const goRef = useRef(go);
  useEffect(() => { goRef.current = go; });
  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight') goRef.current(index + 1);
      if (e.key === 'ArrowLeft') goRef.current(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index]);

  const onTouchStart = (e) => {
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

      <div className="swipe" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div key={step.id} className="pop-in">
          <StepCard unit={unit} step={step} />
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-ink-3">Swipe left or right, or use the buttons below.</p>

      {index === n - 1 && (
        <div className="mt-4 rounded-xl border border-ok-line bg-ok-soft p-4">
          <p className="text-base font-semibold text-ok-text">That is the whole rebuild.</p>
          <p className="mt-1 text-sm text-ink-2">Now test yourself: a full run asks you to pick every step in order.</p>
          <Button to={`/unit/${unit.id}/run`} className="mt-3">Start a full rebuild run</Button>
        </div>
      )}

      <ActionBar>
        <Button variant="ghost" className="flex-1" onClick={() => go(index - 1)} disabled={index === 0}>
          <Icon name="left" size={18} /> Prev
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
