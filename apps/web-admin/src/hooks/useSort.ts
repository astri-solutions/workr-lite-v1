import { useState, useMemo } from 'react';

export type SortDir = 'asc' | 'desc' | null;

export function useSort<T>(data: T[], defaultCol?: keyof T, defaultDir?: SortDir) {
  const [col, setCol] = useState<keyof T | null>(defaultCol ?? null);
  const [dir, setDir] = useState<SortDir>(defaultDir ?? null);

  function toggle(key: keyof T) {
    if (col !== key) { setCol(key); setDir('asc'); return; }
    if (dir === 'asc') { setDir('desc'); return; }
    setCol(null); setDir(null);
  }

  const sorted = useMemo(() => {
    if (!col || !dir) return data;
    return [...data].sort((a, b) => {
      const av = a[col]; const bv = b[col];
      const as = String(av ?? '').toLowerCase();
      const bs = String(bv ?? '').toLowerCase();
      return dir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
  }, [data, col, dir]);

  return { sorted, col, dir, toggle };
}
