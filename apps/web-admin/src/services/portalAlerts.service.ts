import { supabase, isSupabaseConfigured } from '../lib/supabase';

// A canal page deleted in Canais (see CanaisPage.tsx's "auto-recreate on
// revisit" flow) flags every período/arquivo that was tied to it as
// pending_reactivation instead of silently losing the content — a client
// editor needs to actually notice that to fix it, which is exactly what
// this feeds into the topbar bell for portal (non-super_admin) users.
export interface PortalAlert {
  id: string;
  title: string;
  sub: string;
}

export async function listPendingReactivationAlerts(portalDbId: string | null): Promise<PortalAlert[]> {
  if (!isSupabaseConfigured || !supabase || !portalDbId) return [];
  const { data: periodos } = await supabase
    .from('portal_resultado_periodos')
    .select('id, period')
    .eq('portal_id', portalDbId)
    .eq('pending_reactivation', true);

  return (periodos ?? []).map(p => ({
    id: `periodo-${p.id as string}`,
    title: `Trimestre ${p.period as string} precisa ser reativado`,
    sub: 'A página de Central de Resultados foi removida — reative em Canais ou publique novamente.',
  }));
}
