import { SortDir } from '../hooks/useSort';

export default function SortIcon({ dir }: { dir: SortDir }) {
  const dim = 'rgba(255,255,255,0.35)';
  const lit = 'rgba(255,255,255,0.95)';
  return (
    <span className="sort-icon" aria-hidden="true">
      <svg width="9" height="14" viewBox="0 0 9 14" fill="none">
        {/* up chevron */}
        <path
          d="M1.5 5.5L4.5 2.5L7.5 5.5"
          stroke={dir === 'asc' ? lit : dim}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* down chevron */}
        <path
          d="M1.5 8.5L4.5 11.5L7.5 8.5"
          stroke={dir === 'desc' ? lit : dim}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
