import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, PageHeader, SectionTitle, Chip, Button, Stat } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { UNITS } from '../data/index.js';
import {
  useProgress, getPref, setPref, applyTheme, exportJSON, importJSON, resetAll, storageWorks,
} from '../engine/storage.js';
import { allTransitions, studyStreak } from '../engine/progress.js';
import { srsSummary } from '../engine/srs.js';

export default function More() {
  const state = useProgress();
  const [theme, setTheme] = useState(() => getPref('theme', 'system'));
  const [msg, setMsg] = useState(null); // { tone, text }
  const [canSave] = useState(() => storageWorks());
  const fileRef = useRef(null);

  const pickTheme = (t) => { setTheme(t); setPref('theme', t); applyTheme(t); };

  const summary = srsSummary(allTransitions(), state);
  const runs = Object.values(state.runs).reduce((n, list) => n + (Array.isArray(list) ? list.length : 0), 0);

  const doExport = () => {
    try {
      const blob = new Blob([exportJSON()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rebuild-bench-progress-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMsg({ tone: 'ok', text: 'Backup downloaded.' });
    } catch {
      setMsg({ tone: 'bad', text: 'This browser blocked the download.' });
    }
  };

  const doImport = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        importJSON(String(r.result));
        setMsg({ tone: 'ok', text: 'Progress restored from the backup.' });
      } catch (err) {
        setMsg({ tone: 'bad', text: err instanceof SyntaxError ? 'That file is not valid JSON.' : err.message });
      }
    };
    r.onerror = () => setMsg({ tone: 'bad', text: 'Could not read that file.' });
    r.readAsText(file);
  };

  const doReset = () => {
    // eslint-disable-next-line no-alert
    if (window.confirm('Erase all progress on this device? Export a backup first if you might want it back.')) {
      resetAll();
      setMsg({ tone: 'ok', text: 'Progress erased.' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Progress and settings" />

      {!canSave && (
        <p className="rounded-lg border border-warn-line bg-warn-soft p-3 text-sm text-warn-text">
          This browser is not letting the app save (private mode or blocked site data). Everything works, but progress
          is lost when you close the tab. Export a backup before you leave.
        </p>
      )}

      <Card className="p-4">
        <SectionTitle>Your progress</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Studied" value={summary.studied} note={`of ${summary.total} transitions`} />
          <Stat label="Learned" value={summary.mature} note="16+ day gap" />
          <Stat label="Runs" value={runs} note={`${studyStreak(state)}-day streak`} />
        </div>
      </Card>

      <Card className="p-4">
        <SectionTitle sub="Progress lives only in this browser. Back it up as a file, or move it to another device.">Backup</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <Button onClick={doExport}><Icon name="download" size={18} /> Export progress</Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}><Icon name="upload" size={18} /> Import backup</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={doImport} />
        </div>
        {msg && (
          <p role="status" className={`mt-3 text-sm ${msg.tone === 'ok' ? 'text-ok-text' : 'text-bad-text'}`}>{msg.text}</p>
        )}
        <div className="mt-4 border-t border-line-2 pt-4">
          <Button variant="danger" onClick={doReset}>Erase all progress</Button>
        </div>
      </Card>

      <Card className="p-4">
        <SectionTitle sub="System follows your phone's light or dark setting.">Appearance</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => (
            <Chip key={v} active={theme === v} onClick={() => pickTheme(v)}>{l}</Chip>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <SectionTitle>Put it on your home screen</SectionTitle>
        <ul className="space-y-2 text-base leading-relaxed text-ink-2">
          <li><strong className="font-semibold text-ink">iPhone:</strong> open this page in Safari, tap Share, then Add to Home Screen.</li>
          <li><strong className="font-semibold text-ink">Android:</strong> open it in Chrome, tap the menu, then Add to Home screen or Install app.</li>
        </ul>
      </Card>

      <Link to="/about" className="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 hover:bg-sunken">
        <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-warn-soft text-warn-text">
          <Icon name="info" size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-medium text-ink">About and disclaimer</span>
          <span className="block text-sm text-ink-3">{UNITS.length} unit{UNITS.length === 1 ? '' : 's'} loaded. Study aid, not a service manual.</span>
        </span>
        <Icon name="chevron" size={18} className="text-ink-3" />
      </Link>
    </div>
  );
}
