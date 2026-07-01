import { useState, useRef, useEffect, useCallback } from 'react';
import './DatePicker.css';

interface DatePickerProps {
  value: string; // ISO date string YYYY-MM-DD or ''
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  disabled?: boolean;
}

const MONTHS_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const MONTH_SHORT_PT = [
  'jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.',
  'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.',
];

const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

function parseDate(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(iso: string): string {
  const d = parseDate(iso);
  if (!d) return '';
  return `${MONTH_SHORT_PT[d.getMonth()]} ${d.getDate()}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Returns Monday=0 ... Sunday=6 offset for start of month
function getMonthStartOffset(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay(); // 0=Sun
  return (day + 6) % 7; // shift so Mon=0
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  label,
  id,
  disabled,
}: DatePickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selected = parseDate(value);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());

  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, close]);

  function openPicker() {
    if (disabled) return;
    const base = selected ?? today;
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setOpen(true);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function goToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  function selectDay(year: number, month: number, day: number) {
    const d = new Date(year, month, day);
    onChange(toISO(d));
    close();
  }

  // Build calendar grid (always 6 rows × 7 cols)
  const offset = getMonthStartOffset(viewYear, viewMonth);
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const daysInPrev = getDaysInMonth(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1,
  );

  const cells: { year: number; month: number; day: number; overflow: boolean }[] = [];

  for (let i = 0; i < offset; i++) {
    const day = daysInPrev - offset + 1 + i;
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({ year: y, month: m, day, overflow: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ year: viewYear, month: viewMonth, day: d, overflow: false });
  }
  let nextDay = 1;
  while (cells.length < 42) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    cells.push({ year: y, month: m, day: nextDay++, overflow: true });
  }

  return (
    <div className="dp-root" ref={rootRef}>
      {label && <label className="dp-label" htmlFor={id}>{label}</label>}
      <button
        id={id}
        type="button"
        className={`dp-trigger${disabled ? ' dp-trigger--disabled' : ''}${open ? ' dp-trigger--open' : ''}`}
        onClick={openPicker}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
      >
        <svg className="dp-trigger__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className={value ? 'dp-trigger__value' : 'dp-trigger__placeholder'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        {value && (
          <button
            className="dp-clear"
            type="button"
            tabIndex={-1}
            onClick={e => { e.stopPropagation(); onChange(''); }}
            aria-label="Limpar data"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </button>

      {open && (
        <div className="dp-popover" role="dialog" aria-label="Calendário">
          {/* Header */}
          <div className="dp-header">
            <span className="dp-month-label">
              {MONTHS_PT[viewMonth]} de {viewYear}
            </span>
            <div className="dp-header__controls">
              <button className="dp-nav" type="button" onClick={goToday}>Hoje</button>
              <button className="dp-nav dp-nav--arrow" type="button" onClick={prevMonth} aria-label="Mês anterior">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button className="dp-nav dp-nav--arrow" type="button" onClick={nextMonth} aria-label="Próximo mês">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Weekday row */}
          <div className="dp-grid">
            {WEEKDAYS.map(w => (
              <span key={w} className="dp-weekday">{w}</span>
            ))}

            {/* Day cells */}
            {cells.map((cell, i) => {
              const cellDate = new Date(cell.year, cell.month, cell.day);
              cellDate.setHours(0, 0, 0, 0);
              const isToday = cellDate.getTime() === today.getTime();
              const isSelected = selected && cellDate.getTime() === selected.getTime();

              let cls = 'dp-day';
              if (cell.overflow) cls += ' dp-day--overflow';
              if (isToday) cls += ' dp-day--today';
              if (isSelected) cls += ' dp-day--selected';

              return (
                <button
                  key={i}
                  type="button"
                  className={cls}
                  onClick={() => selectDay(cell.year, cell.month, cell.day)}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
