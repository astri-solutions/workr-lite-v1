import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { pKey } from '../utils/portalStorage';
import { savePortalConfig, fetchPortalConfig, PortalConfigPatch } from '../lib/portalConfigApi';

/**
 * Shared portal state backed by Supabase `portal_config`.
 *
 * Source-of-truth contract:
 * - Supabase is authoritative — every mutation is written there immediately.
 * - localStorage is ONLY a same-browser render cache to avoid a flash of
 *   defaults while the Supabase fetch is in flight.
 * - On mount the hook always hydrates from Supabase and overwrites both
 *   React state and the local cache, so any user of the portal sees the
 *   same state regardless of which browser last edited it.
 *
 * @param storageBase  localStorage base key, e.g. 'portal_footer'
 * @param configColumn portal_config column name, e.g. 'footer'
 * @param defaultValue value used when neither Supabase nor cache has data
 */
export function usePortalState<T>(
  storageBase: string,
  configColumn: keyof PortalConfigPatch,
  defaultValue: T,
): [T, (next: T | ((prev: T) => T)) => Promise<void>, { hydrated: boolean; saveError: boolean }] {
  const { user } = useAuth();
  const portalId = user?.activePortalId;
  const cacheKey = pKey(storageBase, portalId);

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(cacheKey);
      return raw ? (JSON.parse(raw) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });
  const [hydrated, setHydrated] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // Mirrors `value` synchronously. update() reads/writes through this ref
  // instead of extracting the resolved value out of a setValue() updater
  // callback — relying on React to have already invoked that callback by
  // the next line is an implementation detail, not a guarantee, and doing
  // so previously let a call site silently persist a stale/undefined value
  // to Supabase (the write still succeeded, just with the wrong payload).
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  // Guard: don't let an in-flight hydration overwrite a user edit made
  // after the fetch started.
  const dirtySinceMount = useRef(false);

  useEffect(() => {
    dirtySinceMount.current = false;
    setHydrated(false);
    if (!portalId) { setHydrated(true); return; }
    let cancelled = false;
    fetchPortalConfig(portalId)
      .then(data => {
        if (cancelled || dirtySinceMount.current) return;
        const remote = data?.[configColumn as string];
        if (remote !== null && remote !== undefined) {
          localStorage.setItem(cacheKey, JSON.stringify(remote));
          valueRef.current = remote as T;
          setValue(remote as T);
        }
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setHydrated(true); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portalId, cacheKey, configColumn]);

  // Callers that immediately publish after calling this (setPersisted(x); await
  // publish()) need the Supabase write to have actually landed first — publish()
  // re-fetches portal_config as the authoritative source for every OTHER field,
  // so if this field's write is still in flight, that fetch can race it and
  // publish the value this same edit just replaced. Returning a promise that
  // resolves after the write settles lets callers await it before publishing.
  const update = useCallback((next: T | ((prev: T) => T)): Promise<void> => {
    dirtySinceMount.current = true;
    const resolved = typeof next === 'function' ? (next as (p: T) => T)(valueRef.current) : next;
    valueRef.current = resolved;
    setValue(resolved);
    try { localStorage.setItem(cacheKey, JSON.stringify(resolved)); } catch { /* quota */ }
    if (!portalId) return Promise.resolve();
    setSaveError(false);
    return savePortalConfig(portalId, { [configColumn]: resolved } as PortalConfigPatch)
      .then(() => {})
      .catch(err => { console.error(`savePortalConfig(${String(configColumn)})`, err); setSaveError(true); });
  }, [cacheKey, portalId, configColumn]);

  return [value, update, { hydrated, saveError }];
}
