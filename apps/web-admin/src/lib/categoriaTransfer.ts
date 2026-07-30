import { supabase } from './supabase';
import { normalizeMarcadores, genMarcadorId, type Marcador, type PageType } from '../components/ChannelEditor';

// Shared by DocumentosPage's "Transferir categoria" modal and CanaisPage's
// drag-and-drop of a categoria/marcador chip onto another canal: moves every
// portal_documents row tagged with one categoria on a source page over to a
// destination page (and destination marker, existing or new), moves the
// marker itself in portal_config.canais, and — since Auto CVM's routing
// rules point at a (targetId, groupCategory) pair, exactly the same
// (page, label) tuple a categoria transfer changes — rewrites every
// cvm_sync_state row whose routing targeted the old pair so the import keeps
// landing in the right place without anyone touching Auto CVM by hand.
//
// portal_materias has no categoria/marker field of its own (a matéria only
// has a page_id, never a sub-group) — so there is nothing to move there:
// matérias aren't grouped by categoria the way documentos are, only by page.

export interface CanaisNode {
  id?: string;
  label: string;
  pageType?: PageType;
  listaAgrupadaCategories?: Marcador[];
  children?: CanaisNode[];
}

export function marcadorLbl(m: string | Marcador): string {
  return typeof m === 'string' ? m : m.label;
}

export interface TransferCategoriaParams {
  portalDbId: string;
  sourcePageId: string;
  sourceLabel: string;
  destPageId: string;
  destLabel: string;
  destIsGrouped: boolean;
  activePortalKey?: string;
}

export interface TransferCategoriaResult {
  moved: number;
  routingUpdated: number;
  error?: string;
}

export async function transferCategoria(params: TransferCategoriaParams): Promise<TransferCategoriaResult> {
  const { portalDbId, sourcePageId, sourceLabel, destPageId, destLabel, destIsGrouped, activePortalKey } = params;
  if (!supabase) return { moved: 0, routingUpdated: 0, error: 'Supabase não configurado.' };
  const finalDestLabel = destPageId === sourcePageId ? '' : destLabel.trim();
  if (destIsGrouped && !finalDestLabel) return { moved: 0, routingUpdated: 0, error: 'Escolha ou digite a categoria de destino.' };

  const { data: rows, error: fetchErr } = await supabase
    .from('portal_documents')
    .select('id, pagina_ids, sub_group_ids')
    .eq('portal_id', portalDbId)
    .contains('pagina_ids', [sourcePageId]);
  if (fetchErr) return { moved: 0, routingUpdated: 0, error: `Falha ao buscar documentos: ${fetchErr.message}` };

  const targets = (rows ?? []).filter(r => {
    const subGroups = (r.sub_group_ids as Record<string, string[]> | null)?.[sourcePageId] ?? [];
    return subGroups.includes(sourceLabel);
  });

  let moved = 0;
  for (const row of targets) {
    const paginaIds = new Set((row.pagina_ids as string[]) ?? []);
    paginaIds.delete(sourcePageId);
    paginaIds.add(destPageId);
    const subGroupIds = { ...((row.sub_group_ids as Record<string, string[]>) ?? {}) };
    delete subGroupIds[sourcePageId];
    if (destIsGrouped) subGroupIds[destPageId] = [finalDestLabel];
    else delete subGroupIds[destPageId];
    const { error } = await supabase.from('portal_documents')
      .update({ pagina_ids: [...paginaIds], sub_group_ids: subGroupIds, updated_at: new Date().toISOString() })
      .eq('id', row.id as string);
    if (!error) moved++;
  }

  const { data: cfg } = await supabase.from('portal_config').select('canais, updated_at').eq('portal_id', portalDbId).maybeSingle();
  const canais = (cfg?.canais ?? []) as CanaisNode[];
  let changed = false;
  function walk(node: CanaisNode): CanaisNode {
    let next = node;
    if (node.id === sourcePageId) {
      const cats = (node.listaAgrupadaCategories ?? []).filter(c => marcadorLbl(c) !== sourceLabel);
      if (cats.length !== (node.listaAgrupadaCategories ?? []).length) { changed = true; next = { ...node, listaAgrupadaCategories: cats }; }
    }
    if (node.id === destPageId && destIsGrouped) {
      const cats = normalizeMarcadores(next.listaAgrupadaCategories);
      if (!cats.some(c => marcadorLbl(c) === finalDestLabel)) {
        changed = true;
        next = { ...next, pageType: 'lista-agrupada', listaAgrupadaCategories: [...cats, { id: genMarcadorId(), label: finalDestLabel }] };
      }
    }
    if (next.children) next = { ...next, children: next.children.map(walk) };
    return next;
  }
  const nextCanais = canais.map(walk);
  if (changed) {
    const { data: updRows } = await supabase.from('portal_config')
      .update({ canais: nextCanais })
      .eq('portal_id', portalDbId)
      .eq('updated_at', cfg?.updated_at ?? '')
      .select('portal_id');
    if (updRows && updRows.length > 0) {
      if (activePortalKey) localStorage.setItem(`portal_canais_${activePortalKey}`, JSON.stringify(nextCanais));
    } else {
      return { moved, routingUpdated: 0, error: 'A árvore de canais foi editada em paralelo — os documentos foram movidos, mas a categoria em Canais precisa ser ajustada manualmente.' };
    }
  }

  // Auto CVM: every empresa's routing rules that pointed at the old
  // (sourcePageId, sourceLabel) pair now need to point at the new one, or
  // future imports would keep filing under a categoria that no longer
  // exists on the source page.
  let routingUpdated = 0;
  const { data: syncRows } = await supabase
    .from('cvm_sync_state')
    .select('empresa_id, routing')
    .eq('portal_id', portalDbId);
  for (const sr of syncRows ?? []) {
    const rules = (sr.routing as Array<{ cvmCategoryId: string; cvmCategoryLabel: string; targetId: string; targetLabel: string; groupCategory?: string }>) ?? [];
    let touched = false;
    const nextRules = rules.map(r => {
      if (r.targetId === sourcePageId && (r.groupCategory ?? '') === sourceLabel) {
        touched = true;
        return { ...r, targetId: destPageId, groupCategory: destIsGrouped ? finalDestLabel : undefined };
      }
      return r;
    });
    if (touched) {
      await supabase.from('cvm_sync_state')
        .update({ routing: nextRules })
        .eq('portal_id', portalDbId)
        .eq('empresa_id', sr.empresa_id as string);
      routingUpdated++;
    }
  }

  return { moved, routingUpdated };
}
