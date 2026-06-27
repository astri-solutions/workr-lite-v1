import './FilterBar.css';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterGroup {
  key: string;
  label?: string;
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
      {groups.map((group) => (
        <div key={group.key} className="filter-bar__group">
          {group.label && (
            <span className="filter-bar__label">{group.label}</span>
          )}
          <div className="filter-bar__pills">
            {group.options.map((opt) => {
              const active = (value[group.key] ?? group.options[0].value) === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`filter-pill${active ? ' filter-pill--active' : ''}`}
                  onClick={() => onChange(group.key, opt.value)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
