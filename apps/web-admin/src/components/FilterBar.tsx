import './FilterBar.css';

export interface FilterOption {
  value: string;
  label: string;
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

export default function FilterBar({ groups, value, onChange }: FilterBarProps) {
  return (
    <div className="filter-bar">
      {groups.map((group) => {
        const selected = value[group.key] ?? group.options[0].value;
        const isFiltered = selected !== group.options[0].value;
        return (
          <div key={group.key} className="filter-bar__group">
            <label className="filter-bar__label" htmlFor={`filter-${group.key}`}>
              {group.label}
            </label>
            <div className={`filter-select-wrap${isFiltered ? ' filter-select-wrap--active' : ''}`}>
              <select
                id={`filter-${group.key}`}
                className="filter-select"
                value={selected}
                onChange={(e) => onChange(group.key, e.target.value)}
              >
                {group.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <svg className="filter-select__chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
              {isFiltered && (
                <button
                  className="filter-select__clear"
                  type="button"
                  title="Limpar filtro"
                  onClick={() => onChange(group.key, group.options[0].value)}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
