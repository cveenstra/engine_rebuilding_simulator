import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Card, Chip, ChipRow, Bar, Empty } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { ActionBar } from '../components/bench.jsx';
import NextQuestion from '../components/NextQuestion.jsx';
import { useAutoAdvance } from '../components/useAutoAdvance.js';
import { cheer, miss } from '../engine/feedback.js';
import { UNITS, UNIT_BY_ID } from '../data/index.js';
import { useProgress } from '../engine/storage.js';
import { transitions, buildQueue, srsSummary, grade } from '../engine/srs.js';
import { nextQuestion } from '../engine/game.js';
import { logSession } from '../engine/progress.js';
import { splitNewCards, holdingTerms } from '../engine/terms.js';
import { HeldNotice } from '../components/terms.jsx';

const SESSION_SIZE = 20;
const NEW_SIZE = 10;

function cardsFor(unitId) {
  const units = unitId ? [UNIT_BY_ID[unitId]].filter(Boolean) : UNITS;
  return units.flatMap((u) => transitions(u));
}

function nextDueLabel(cards, state) {
  const now = Date.now();
  let soonest = Infinity;
  for (const c of cards) {
    const r = state.srs[c.id];
    if (r && r.due > now && r.due < soonest) soonest = r.due;
  }
  if (!Number.isFinite(soonest)) return null;
  const days = Math.max(1, Math.round((soonest - now) / 86400000));
  return days <= 1 ? 'tomorrow' : `in ${days} days`;
}

const qFor = (card) => nextQuestion(UNIT_BY_ID[card.unitId], card.index);

export default function Review() {
  const state = useProgress();
  const [params, setParams] = useSearchParams();
  const unitId = UNIT_BY_ID[params.get('unit')] ? params.get('unit') : '';
  const [session, setSession] = useState(null); // { queue, i, q, picked, right, unitId }

  // New cards still waiting on their terms stay out of the queue and the counts.
  const all = cardsFor(unitId);
  const held = splitNewCards(all, state);
  const heldIds = new Set(held.held.map((c) => c.id));
  const cards = heldIds.size ? all.filter((c) => !heldIds.has(c.id)) : all;
  const summary = { ...srsSummary(all, state), unseen: srsSummary(cards, state).unseen };
  const back = unitId ? { to: `/unit/${unitId}`, label: UNIT_BY_ID[unitId].name } : { to: '/', label: 'Garage' };

  const start = (includeNew) => {
    const queue = includeNew
      ? buildQueue(cards, NEW_SIZE, { includeNew: true })
      : buildQueue(cards, SESSION_SIZE, { includeNew: false });
    if (!queue.length) return;
    setSession({ queue, i: 0, q: qFor(queue[0]), picked: null, right: 0, unitId });
  };

  const onPick = (id) => {
    if (!session || session.picked) return;
    const ok = id === session.q.answer.id;
    if (ok) cheer(); else miss();
    grade(session.queue[session.i].id, ok, { onlyPromoteDue: false });
    setSession({ ...session, picked: id, right: session.right + (ok ? 1 : 0) });
  };

  const next = () => {
    const i = session.i + 1;
    if (i >= session.queue.length) {
      logSession('review', session.unitId || 'all', session.right, session.queue.length);
      setSession({ ...session, i, done: true });
      return;
    }
    setSession({ ...session, i, q: qFor(session.queue[i]), picked: null });
  };
  const inSession = !!session && !session.done;
  const beat = useAutoAdvance({
    token: inSession ? session.q : null,
    active: inSession && session.picked != null && session.picked === session.q.answer.id,
    onAdvance: next,
  });

  const header = (
    <div className="mb-4">
      <Link to={back.to} className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-brand-text hover:bg-brand-soft">
        <Icon name="back" size={18} /> {back.label}
      </Link>
      <h1 className="text-xl font-semibold leading-tight text-ink">Review</h1>
    </div>
  );

  if (!UNITS.length) {
    return <div>{header}<Empty title="No units yet">Review fills up once you play a mode.</Empty></div>;
  }

  // ---- in a session
  if (session && !session.done) {
    const card = session.queue[session.i];
    const unit = UNIT_BY_ID[card.unitId];
    return (
      <div>
        {header}
        <div className="mb-4 flex items-center gap-3">
          <Bar pct={(session.i / session.queue.length) * 100} label="Review progress" />
          <span className="tabnum flex-shrink-0 text-sm text-ink-3">{session.i + 1} / {session.queue.length}</span>
        </div>
        <NextQuestion key={card.id} unit={unit} q={session.q} picked={session.picked} onPick={onPick} showUnit={!session.unitId} explainProps={beat.pauseProps} />
        <ActionBar beat={beat}>
          <Button variant="ghost" className="flex-1" onClick={() => setSession(null)}>Stop</Button>
          <Button className="flex-[2]" onClick={beat.go} disabled={!session.picked}>
            {session.i + 1 >= session.queue.length ? 'Finish' : 'Next'} <Icon name="right" size={18} />
          </Button>
        </ActionBar>
      </div>
    );
  }

  // ---- start or finished
  const later = nextDueLabel(cards, state);
  return (
    <div className="space-y-4">
      {header}

      {UNITS.length > 1 && (
        <ChipRow>
          <Chip active={!unitId} onClick={() => { setSession(null); setParams({}, { replace: true }); }}>All units</Chip>
          {UNITS.map((u) => (
            <Chip key={u.id} active={unitId === u.id} onClick={() => { setSession(null); setParams({ unit: u.id }, { replace: true }); }}>
              {u.name}
            </Chip>
          ))}
        </ChipRow>
      )}

      {session?.done && (
        <Card className="border-ok-line bg-ok-soft p-4">
          <p className="text-lg font-semibold text-ink">Session done: {session.right} of {session.queue.length} right</p>
          <p className="text-sm text-ink-2">Right answers come back after longer gaps. Misses stay due until you get them right.</p>
        </Card>
      )}

      <Card className="p-4">
        <p className="text-2xl font-semibold text-ink"><span className="tabnum">{summary.due}</span> due</p>
        <p className="mt-1 text-sm text-ink-3">
          {summary.studied} of {summary.total} step cards studied, {summary.mature} learned well.
          {!summary.due && later ? ` Next review ${later}.` : ''}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          Each card asks what comes after a step. Miss one in any mode and it’s due here right away. Get it right on
          its due day and the gap grows: 1, 3, 7, 16, then 35 days.
        </p>
      </Card>

      <HeldNotice split={held} top={holdingTerms(held)} />

      <ActionBar>
        {summary.due > 0 ? (
          <Button className="flex-1" onClick={() => start(false)}>
            Review {Math.min(summary.due, SESSION_SIZE)} due <Icon name="right" size={18} />
          </Button>
        ) : (
          <Button className="flex-1" onClick={() => start(true)} disabled={!summary.unseen} variant={summary.unseen ? 'primary' : 'ghost'}>
            {summary.unseen ? `Learn ${Math.min(summary.unseen, NEW_SIZE)} new step card${Math.min(summary.unseen, NEW_SIZE) === 1 ? '' : 's'}` : 'All caught up'}
          </Button>
        )}
      </ActionBar>
    </div>
  );
}
