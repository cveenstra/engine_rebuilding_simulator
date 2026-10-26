import { useEffect, useMemo, useState } from 'react';
import { PageHeader, Card, Button, Empty } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { StatusDot, StatusLegend } from '../components/terms.jsx';
import { Glossed } from '../components/glossary.jsx';
import { useDefine } from '../components/glossaryContext.js';
import { useProgress } from '../engine/storage.js';
import { conceptLevels, termStatus, recordsOf, hasTerms, LEADS_TO, STATUS_LABEL } from '../engine/terms.js';
import { knownSet } from '../engine/ladder.js';
import { TERM_BY_ID, groupOf } from '../data/glossary.js';

const levelName = (n) => (n === 0 ? 'Level 0: Foundations' : `Level ${n}`);
const groupKey = (level, name) => `${level}|${name}`;
const termCount = (lv) => {
  const n = lv.groups.reduce((sum, g) => sum + g.terms.length, 0);
  return `${n} term${n === 1 ? '' : 's'}`;
};

function Chips({ title, ids, onPick, statusOf }) {
  if (!ids.length) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-3">{title}</p>
      <ul className="flex flex-wrap gap-2">
        {ids.map((id) => (
          <li key={id}>
            <button
              type="button" onClick={() => onPick(id)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm font-medium text-ink hover:bg-sunken"
            >
              <StatusDot status={statusOf(id)} /> {TERM_BY_ID[id].term}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Every term laid out by level (how many layers of words it rests on) and
 * concept group, with where the learner stands on each. Tapping a term shows
 * what it builds on and what it leads to; those chips jump across the map.
 */
export default function ConceptMap() {
  const state = useProgress();
  const define = useDefine();
  const levels = useMemo(() => conceptLevels(), []);
  const known = knownSet(recordsOf(state));
  const statusOf = (id) => termStatus(id, state, known);

  // Groups start open where there is something to do: a new or learning term.
  const [open, setOpen] = useState(() => {
    const s = new Set();
    for (const lv of levels) {
      for (const g of lv.groups) {
        if (g.terms.some((t) => ['new', 'learning'].includes(termStatus(t.id, state, known)))) s.add(groupKey(lv.level, g.name));
      }
    }
    if (!s.size && levels[0]) levels[0].groups.forEach((g) => s.add(groupKey(levels[0].level, g.name)));
    return s;
  });
  const [sel, setSel] = useState(null);

  const toggleGroup = (key) => setOpen((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const select = (id) => {
    const t = TERM_BY_ID[id];
    if (!t) return;
    setOpen((s) => new Set(s).add(groupKey(t.level, groupOf(t))));
    setSel(id);
  };
  useEffect(() => {
    if (!sel) return;
    const el = document.getElementById(`cm-${sel}`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el?.focus({ preventScroll: true });
  }, [sel]);

  if (!hasTerms()) {
    return (
      <div>
        <PageHeader title="Concept map" back={{ to: '/terms', label: 'Terms' }} />
        <Empty title="No terms yet">The map fills in once there are terms to show.</Empty>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Concept map"
        back={{ to: '/terms', label: 'Terms' }}
        sub="Each term sits on the terms it builds on. Level 0 needs nothing else, and each level rests on the ones below. A term unlocks once you’ve learned everything it builds on."
      >
        <StatusLegend className="mt-3" />
      </PageHeader>

      {levels.map((lv) => (
        <section key={lv.level} aria-labelledby={`cm-l-${lv.level}`}>
          <h2 id={`cm-l-${lv.level}`} className="mb-2 text-lg font-semibold text-ink">
            {levelName(lv.level)} <span className="text-sm font-normal text-ink-3">{termCount(lv)}</span>
          </h2>
          <div className="space-y-2">
            {lv.groups.map((g) => {
              const key = groupKey(lv.level, g.name);
              const isOpen = open.has(key);
              const done = g.terms.filter((t) => ['learned', 'mature'].includes(statusOf(t.id))).length;
              return (
                <Card key={key}>
                  <button
                    type="button" onClick={() => toggleGroup(key)} aria-expanded={isOpen}
                    className="flex min-h-12 w-full items-center gap-2 px-4 py-2 text-left"
                  >
                    <Icon name="chevron" size={16} className={`flex-shrink-0 text-ink-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    <span className="min-w-0 flex-1 text-base font-medium text-ink">{g.name}</span>
                    <span className="tabnum flex-shrink-0 text-sm text-ink-3">{done}/{g.terms.length}</span>
                  </button>
                  {isOpen && (
                    <ul className="border-t border-line-2">
                      {g.terms.map((t) => {
                        const st = statusOf(t.id);
                        const on = sel === t.id;
                        return (
                          <li key={t.id} className={`border-b border-line-2 last:border-0 ${on ? 'bg-brand-soft/40' : ''}`}>
                            <button
                              id={`cm-${t.id}`} type="button" onClick={() => setSel(on ? null : t.id)} aria-expanded={on}
                              className="flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left hover:bg-sunken"
                            >
                              <StatusDot status={st} decorative />
                              <span className={`min-w-0 flex-1 text-base ${st === 'locked' ? 'text-ink-3' : 'text-ink'}`}>{t.term}</span>
                              <span className="flex-shrink-0 text-xs text-ink-3">{STATUS_LABEL[st]}</span>
                            </button>
                            {on && (
                              <div className="space-y-3 px-4 pb-4">
                                {t.short && <p className="text-base leading-relaxed text-ink-2"><Glossed text={t.short} exclude={t.id} /></p>}
                                <Chips title="Builds on" ids={t.requires} onPick={select} statusOf={statusOf} />
                                <Chips title="Leads to" ids={LEADS_TO[t.id] || []} onPick={select} statusOf={statusOf} />
                                {!t.requires.length && !(LEADS_TO[t.id] || []).length && (
                                  <p className="text-sm text-ink-3">Stands alone: it builds on nothing, and nothing builds on it yet.</p>
                                )}
                                <Button variant="ghost" onClick={() => define?.(t.id)}><Icon name="book" size={16} /> Full definition</Button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
