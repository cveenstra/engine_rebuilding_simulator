import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

export function Card({ children, className = '', as: Tag = 'div', ...rest }) {
  return (
    <Tag className={`rounded-xl border border-line bg-surface ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/** A whole-card link with a visible hover and focus state. */
export function CardLink({ to, children, className = '' }) {
  return (
    <Link
      to={to}
      className={`block rounded-xl border border-line bg-surface transition-colors hover:border-brand-line hover:bg-brand-soft/40 active:bg-brand-soft/60 ${className}`}
    >
      {children}
    </Link>
  );
}

export function PageHeader({ title, sub, back, children }) {
  return (
    <div className="mb-5">
      {back && (
        <Link to={back.to} className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-brand-text hover:bg-brand-soft">
          <Icon name="back" size={18} /> {back.label}
        </Link>
      )}
      <h1 className="text-2xl font-semibold leading-tight tracking-tight text-ink">{title}</h1>
      {sub && <p className="mt-1.5 max-w-3xl text-base leading-relaxed text-ink-2">{sub}</p>}
      {children}
    </div>
  );
}

export function SectionTitle({ children, sub, action }) {
  return (
    <div className="mb-3 flex items-end gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold text-ink">{children}</h2>
        {sub && <p className="mt-0.5 text-sm leading-relaxed text-ink-3">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

const TONES = {
  slate: 'bg-sunken text-ink-2 border-line',
  brand: 'bg-brand-soft text-brand-text border-brand-line',
  heat: 'bg-heat-soft text-heat-text border-heat-line',
  ok: 'bg-ok-soft text-ok-text border-ok-line',
  bad: 'bg-bad-soft text-bad-text border-bad-line',
  warn: 'bg-warn-soft text-warn-text border-warn-line',
};

export function Pill({ children, tone = 'slate', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${TONES[tone] || TONES.slate} ${className}`}>
      {children}
    </span>
  );
}

export function Stat({ label, value, note }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">{label}</p>
      <p className="tabnum text-2xl font-semibold leading-tight text-ink">{value}</p>
      {note && <p className="mt-0.5 text-xs text-ink-3">{note}</p>}
    </div>
  );
}

export function Bar({ pct, tone = 'brand', className = '', label }) {
  const bg = { brand: 'bg-brand', ok: 'bg-ok', heat: 'bg-heat', bad: 'bg-bad', warn: 'bg-warn' }[tone] || 'bg-brand';
  const v = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-sunken ${className}`}
      role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} aria-label={label}
    >
      <div className={`h-full rounded-full ${bg} transition-[width] duration-300`} style={{ width: `${v}%` }} />
    </div>
  );
}

const BTN_BASE = 'inline-flex min-h-11 select-none items-center justify-center gap-2 rounded-lg px-4 py-2 text-center text-base leading-snug font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45';
const BTN = {
  primary: 'bg-brand text-brand-ink hover:bg-brand-strong active:bg-brand-strong',
  ghost: 'border border-line bg-surface text-ink hover:bg-sunken active:bg-sunken',
  soft: 'bg-brand-soft text-brand-text hover:bg-brand-soft/70',
  danger: 'border border-bad-line bg-surface text-bad-text hover:bg-bad-soft',
  quiet: 'text-ink-2 hover:bg-sunken hover:text-ink',
};

export function Button({ children, onClick, to, href, variant = 'primary', className = '', disabled, type = 'button', ...rest }) {
  const cls = `${BTN_BASE} ${BTN[variant] || BTN.primary} ${className}`;
  if (to && !disabled) return <Link to={to} className={cls} {...rest}>{children}</Link>;
  if (href && !disabled) return <a href={href} className={cls} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>;
  return <button type={type} onClick={onClick} className={cls} disabled={disabled} {...rest}>{children}</button>;
}

/** A filter chip. 44px tall so it is an honest tap target. */
export function Chip({ active, onClick, children, className = '' }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={!!active}
      className={`inline-flex min-h-11 flex-shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors ${
        active ? 'border-brand bg-brand text-brand-ink' : 'border-line bg-surface text-ink-2 hover:bg-sunken'} ${className}`}
    >
      {children}
    </button>
  );
}

/** A labelled native select; native pickers are the best mobile control there is. */
export function Select({ label, value, onChange, children, className = '' }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-3">{label}</span>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      >
        {children}
      </select>
    </label>
  );
}

export function Empty({ title, children, action }) {
  return (
    <Card className="p-6 text-center">
      <p className="text-base font-medium text-ink">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink-3">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}

/** Tables always scroll inside their own box so the page never scrolls sideways. */
export function DataTable({ columns, rows, firstColStrong = true }) {
  if (!rows?.length) return null;
  return (
    <div className="-mx-1 overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-max border-collapse text-sm">
        {columns?.length > 0 && (
          <thead className="bg-sunken">
            <tr>
              {columns.map((h, i) => (
                <th key={`${h}-${i}`} scope="col" className="border-b border-line px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-line-2 last:border-0">
              {r.map((c, ci) => (
                <td key={ci} className={`max-w-[22rem] whitespace-normal px-3 py-2 align-top ${
                  ci === 0 && firstColStrong ? 'font-medium text-ink' : 'text-ink-2'}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A horizontal row of chips that scrolls inside itself on narrow screens. */
export function ChipRow({ children, className = '' }) {
  return (
    <div className={`scroll-x -mx-4 px-4 sm:mx-0 sm:px-0 ${className}`}>
      <div className="flex gap-2 sm:flex-wrap">{children}</div>
    </div>
  );
}

/** A chip-shaped link (44px tall). */
export function LinkChip({ to, children, tone = 'slate', className = '' }) {
  const t = {
    slate: 'border-line bg-surface text-ink-2 hover:bg-sunken',
    brand: 'border-brand-line bg-brand-soft text-brand-text hover:bg-brand-soft/70',
    heat: 'border-heat-line bg-heat-soft text-heat-text hover:bg-heat-soft/70',
  }[tone];
  return (
    <Link to={to} className={`inline-flex min-h-11 flex-shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors ${t} ${className}`}>
      {children}
    </Link>
  );
}
