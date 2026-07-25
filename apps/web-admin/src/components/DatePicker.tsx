import { useEffect, useMemo, useState } from 'react';
import './DatePicker.css';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function pad(n: number) { return String(n).padStart(2, '0'); }
function toIso(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function parseIso(s: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(s ?? '');
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}
function todayParts() {
  const t = new Date();
  return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() };
}
function formatDisplay(iso: string): string {
  const p = parseIso(iso);
  if (!p) return '';
  return `${pad(p.d)}/${pad(p.m + 1)}/${p.y}`;
}
function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }

type View = 'days' | 'months' | 'years';

interface DatePickerProps {
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  min?: string; // 'YYYY-MM-DD' — days before this are shown but not selectable
}

// Modal calendar replacing the native <input type="date"> across the CMS —
// the native control renders with the OS/browser's own chrome, looks
// inconsistent across browsers, and never respects the CMS's own dark mode.
// Opens as a centered dialog (not an inline popover) with day/month/year
// panels — click the header label to zoom out to month, then year, pick
// there, and it zooms back in. Nothing commits until "Aplicar".
export default function DatePicker({ value, onChange, placeholder = 'dd/mm/aaaa', label, disabled, className, id, min }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('days');
  const [cursor, setCursor] = useState(() => {
    const p = parseIso(value) ?? todayParts();
    return { y: p.y, m: p.m };
  });
  const [yearPage, setYearPage] = useState(() => Math.floor((parseIso(value) ?? todayParts()).y / 12) * 12);
  const [draft, setDraft] = useState(value);

  // Every time it opens, reset to reflect the current value — or, with no
  // value yet, today's month — instead of wherever it was last left.
  useEffect(() => {
    if (!open) return;
    const p = parseIso(value) ?? todayParts();
    setCursor({ y: p.y, m: p.m });
    setYearPage(Math.floor(p.y / 12) * 12);
    setDraft(value);
    setView('days');
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  const today = todayParts();
  const selected = parseIso(draft);
  const minIso = min || undefined;

  const grid = useMemo(() => {
    const startWeekday = new Date(cursor.y, cursor.m, 1).getDay();
    const total = daysInMonth(cursor.y, cursor.m);
    const prevMonth = cursor.m === 0 ? 11 : cursor.m - 1;
    const prevYear = cursor.m === 0 ? cursor.y - 1 : cursor.y;
    const prevTotal = daysInMonth(prevYear, prevMonth);
    const cells: { y: number; m: number; d: number; outside: boolean }[] = [];
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ y: prevYear, m: prevMonth, d: prevTotal - startWeekday + 1 + i, outside: true });
    }
    for (let d = 1; d <= total; d++) cells.push({ y: cursor.y, m: cursor.m, d, outside: false });
    const nextMonth = cursor.m === 11 ? 0 : cursor.m + 1;
    const nextYear = cursor.m === 11 ? cursor.y + 1 : cursor.y;
    let nd = 1;
    while (cells.length % 7 !== 0) cells.push({ y: nextYear, m: nextMonth, d: nd++, outside: true });
    return cells;
  }, [cursor]);

  function handlePrev() {
    if (view === 'days') setCursor(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 });
    else if (view === 'months') setCursor(c => ({ ...c, y: c.y - 1 }));
    else setYearPage(p => p - 12);
  }
  function handleNext() {
    if (view === 'days') setCursor(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 });
    else if (view === 'months') setCursor(c => ({ ...c, y: c.y + 1 }));
    else setYearPage(p => p + 12);
  }
  function handleHeaderClick() {
    setView(v => (v === 'days' ? 'months' : 'years'));
  }
  function applyToday() {
    const t = todayParts();
    setCursor({ y: t.y, m: t.m });
    setYearPage(Math.floor(t.y / 12) * 12);
    setDraft(toIso(t.y, t.m, t.d));
    setView('days');
  }

  return (
    <div className={`dp${className ? ` ${className}` : ''}`}>
      {label && <label className="dp__label" htmlFor={id}>{label}</label>}
      <button type="button" id={id} className="dp__input" disabled={disabled} onClick={() => setOpen(true)}>
        <span className={value ? 'dp__input-value' : 'dp__input-placeholder'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {open && (
        <div className="dp__overlay" onMouseDown={() => setOpen(false)}>
          <div className="dp__panel" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="dp__header">
              <button type="button" className="dp__nav" onClick={handlePrev} aria-label="Anterior">‹</button>
              <button type="button" className="dp__header-label" onClick={handleHeaderClick} disabled={view === 'years'}>
                {view === 'days' && `${MONTHS[cursor.m]} de ${cursor.y}`}
                {view === 'months' && `${cursor.y}`}
                {view === 'years' && `${yearPage}–${yearPage + 11}`}
              </button>
              <button type="button" className="dp__nav" onClick={handleNext} aria-label="Próximo">›</button>
            </div>

            {view === 'days' && (
              <>
                <div className="dp__weekdays">
                  {WEEKDAYS.map((w, i) => <span key={i}>{w}</span>)}
                </div>
                <div className="dp__grid">
                  {grid.map((c, i) => {
                    const iso = toIso(c.y, c.m, c.d);
                    const isSelected = !!selected && selected.y === c.y && selected.m === c.m && selected.d === c.d;
                    const isToday = today.y === c.y && today.m === c.m && today.d === c.d;
                    const isDisabled = !!minIso && iso < minIso;
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={isDisabled}
                        className={`dp__day${c.outside ? ' dp__day--outside' : ''}${isSelected ? ' dp__day--selected' : ''}${isToday && !isSelected ? ' dp__day--today' : ''}${isDisabled ? ' dp__day--disabled' : ''}`}
                        onClick={() => setDraft(iso)}
                      >
                        {c.d}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {view === 'months' && (
              <div className="dp__grid dp__grid--months">
                {MONTHS.map((mLabel, i) => (
                  <button
                    key={mLabel}
                    type="button"
                    className={`dp__cell${cursor.m === i ? ' dp__cell--selected' : ''}`}
                    onClick={() => { setCursor(c => ({ ...c, m: i })); setView('days'); }}
                  >
                    {mLabel}
                  </button>
                ))}
              </div>
            )}

            {view === 'years' && (
              <div className="dp__grid dp__grid--years">
                {Array.from({ length: 12 }, (_, i) => yearPage + i).map(y => (
                  <button
                    key={y}
                    type="button"
                    className={`dp__cell${cursor.y === y ? ' dp__cell--selected' : ''}`}
                    onClick={() => { setCursor(c => ({ ...c, y })); setView('months'); }}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}

            <div className="dp__footer">
              <div className="dp__footer-actions">
                <button type="button" className="btn-outline" onClick={() => setOpen(false)}>Cancelar</button>
                <button type="button" className="btn-primary" onClick={() => { onChange(draft); setOpen(false); }}>Aplicar</button>
              </div>
              <div className="dp__footer-links">
                <button type="button" className="dp__link" onClick={() => setDraft('')}>Limpar</button>
                <button type="button" className="dp__link" onClick={applyToday}>Hoje</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
