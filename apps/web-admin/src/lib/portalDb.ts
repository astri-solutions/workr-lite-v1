/**
 * Resolves the Supabase UUID for the active portal from its portal_key.
 * Used by pages that need to write to portal_* tables.
 */
import { supabase, isSupabaseConfigured } from './supabase';

const cache: Record<string, string> = {};

export async function resolvePortalId(portalKey: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  if (cache[portalKey]) return cache[portalKey];
  const { data } = await supabase
    .from('portals')
    .select('id')
    .eq('portal_key', portalKey)
    .maybeSingle();
  if (data?.id) cache[portalKey] = data.id;
  return data?.id ?? null;
}
