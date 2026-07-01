import { useState, useEffect } from 'react';
import './FilterBar.css';

export interface FilterOption {
  value: string;
  label: string;
  shortLabel?: string;
}

export interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
}

interface FilterBarProps {
  groups: FilterGroup[];
  value: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 720px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export default function FilterBar({ groups, value, onChange }: FilterBarProps) {
  const isMobile = useIsMobile();

  return (
    <div className="filter-bar">
      {groups.map((group) => {
        const selected = value[group.key] ?? group.options[0].value;
        const isFiltered = selected !== group.options[0].value;
        return (
          <div key={group.key} className="filter-bar__group">
            <label className="filter-bar__label" htmlFor={`filter-${group.key}`}>{group.label}</label>
            <div className={`filter-select-wrap${isFiltered ? ' filter-select-wrap--active' : ''}`}>
              <select
                id={`filter-${group.key}`}
                className="filter-select"
                value={selected}
                onChange={(e) => onChange(group.key, e.target.value)}
              >
                {group.options.map((opt, i) => (
                  <option key={opt.value} value={opt.value}>
                    {isMobile && i === 0 && opt.shortLabel ? opt.shortLabel : opt.label}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined filter-select__chevron" style={{ fontSize: '14px' }}>expand_more</span>
              {isFiltered && (
                <button
                  className="filter-select__clear"
                  type="button"
                  title="Limpar filtro"
                  onClick={() => onChange(group.key, group.options[0].value)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>close</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
