import { SortDir } from '../hooks/useSort';

export default function SortIcon({ dir }: { dir: SortDir }) {
  return (
    <span className="sort-icon" aria-hidden="true">
      <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
        <path d="M5 1L5 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M2 4L5 1L8 4" stroke={dir === 'asc' ? 'currentColor' : '#C4C4C4'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 10L5 13L8 10" stroke={dir === 'desc' ? 'currentColor' : '#C4C4C4'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}
