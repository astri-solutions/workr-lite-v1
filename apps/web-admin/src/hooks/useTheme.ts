import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'workr_theme';

function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function readStoredTheme(): Theme | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

// Applied once, synchronously, on module load — before React mounts — so
// there's no flash of the wrong theme on first paint.
applyTheme(readStoredTheme() ?? (systemPrefersDark() ? 'dark' : 'light'));

function currentTheme(): Theme {
  // AppTopbar lives inside AdminLayout AND ClientLayout, which unmount/remount
  // each other on navigation (e.g. admin -> /portal/dashboard) — each fresh
  // mount used to seed its state from a module-level constant captured once
  // at page load, so a mid-session toggle got silently reverted the moment
  // the other layout's topbar mounted. Reading the live <html data-theme>
  // (already updated by whichever toggle happened most recently) instead of
  // a frozen initial value keeps every mount in sync with the real state.
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  return readStoredTheme() ?? (systemPrefersDark() ? 'dark' : 'light');
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}
