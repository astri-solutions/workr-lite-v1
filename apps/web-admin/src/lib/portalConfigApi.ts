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
  error_pages?:  unknown;
  interacoes?:   unknown;
  idiomas?:      unknown;
  topbar?:       unknown;
}

// ── API ───────────────────────────────────────────────────────────────────────

export async function savePortalConfig(portalKey: string, patch: PortalConfigPatch): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const portalUuid = await resolvePortalUuid(portalKey);
  if (!portalUuid) throw new Error(`Portal não encontrado no banco (key ${portalKey})`);
  const { error } = await supabase
    .from('portal_config')
    .upsert({ portal_id: portalUuid, ...patch }, { onConflict: 'portal_id' });
  // supabase-js never throws — surface the error so callers can react
  // (RLS rejections used to be silently swallowed here).
  if (error) throw new Error(`Falha ao salvar configuração: ${error.message}`);
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
