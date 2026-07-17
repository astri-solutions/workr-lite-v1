import { supabase, isSupabaseConfigured } from './supabase';

// ── UUID resolver ─────────────────────────────────────────────────────────────
// portal_key (timestamp string) → portals.id (UUID used in portal_config / portal_users)

const _cache = new Map<string, string>();

export async function resolvePortalUuid(portalKey: string): Promise<string | null> {
  if (!portalKey) return null;
  if (_cache.has(portalKey)) return _cache.get(portalKey)!;
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase
    .from('portals')
    .select('id')
    .eq('portal_key', portalKey)
    .maybeSingle();
  if (data?.id) _cache.set(portalKey, data.id as string);
  return (data?.id as string) ?? null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PortalConfigPatch {
  canais?:       unknown;
  cores?:        unknown;
  fontes?:       unknown;
  layout?:       string;
  footer?:       unknown;
  ticker?:       unknown;
  splash?:       unknown;
  cookies?:      unknown;
  banner_slides?: unknown;
  informacoes?:  unknown;
  empresas?:     unknown;
  logo_ext?:     string;
  favicon_ext?:  string;
}

// ── API ───────────────────────────────────────────────────────────────────────

export async function savePortalConfig(portalKey: string, patch: PortalConfigPatch): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const portalUuid = await resolvePortalUuid(portalKey);
  if (!portalUuid) return;
  await supabase
    .from('portal_config')
    .upsert({ portal_id: portalUuid, ...patch }, { onConflict: 'portal_id' });
}

export async function fetchPortalConfig(portalKey: string): Promise<Record<string, unknown> | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const portalUuid = await resolvePortalUuid(portalKey);
  if (!portalUuid) return null;
  const { data } = await supabase
    .from('portal_config')
    .select('*')
    .eq('portal_id', portalUuid)
    .maybeSingle();
  return (data as Record<string, unknown>) ?? null;
}
