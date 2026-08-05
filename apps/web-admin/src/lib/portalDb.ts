/**
 * Resolves the Supabase UUID for the active portal from its portal_key.
 * Used by pages that need to write to portal_* tables.
 */
import { supabase, isSupabaseConfigured } from './supabase';

const cache: Record<string, string> = {};

export async function resolvePortalId(portalKey: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  if (cache[portalKey]) return cache[portalKey];
  const { data, error } = await supabase
    .from('portals')
    .select('id')
    .eq('portal_key', portalKey)
    .maybeSingle();
  // A failed lookup (RLS, expired session, network blip) used to be
  // indistinguishable from "no portal with this key" — every caller's guard
  // (`if (!portalDbId) return`) then silently no-ops with zero indication
  // anything went wrong, instead of the real error at least reaching devtools.
  if (error) console.error('resolvePortalId lookup failed', error);
  if (data?.id) cache[portalKey] = data.id;
  return data?.id ?? null;
}
