// ─── CVM Service ─────────────────────────────────────────────────────────────
// Company identity (nome, cnpj, cvmCodigo, autoCvm, importarDesde) is owned by
// EmpresasPage.tsx / portal_config.empresas — this file never creates,
// renames, or deletes a company. It only manages the CVM-sync-specific layer
// (routing, status, last sync) stored in cvm_sync_state, and merges the two
// for display.
//
// syncNow()/importHistory() still simulate the actual CVM fetch (that's the
// next phase — a scheduled job that reads dados.cvm.gov.br's IPE dataset).
// What's real today: the entities list, routing, and status all read/write
// Supabase instead of a mock/localStorage.

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { resolvePortalUuid } from '../lib/portalConfigApi';
import type {
  CvmPortal,
  CvmEntityView,
  CvmRoutingRule,
  RoutablePage,
  UpdateEntityStatusRequest,
  UpdateImportDateRequest,
  SyncResponse,
  ImportHistoryRequest,
  ImportHistoryResponse,
  EntityStatus,
  SyncResult,
  DiscoveredCategory,
} from './cvm.types';

interface EmpresaRow {
  id: string;
  nome: string;
  tipo: 'EMPRESA' | 'FUNDO' | 'OUTRO';
  cnpj: string;
  cvmCodigo: string;
  autoCvm: boolean;
  importarDesde: string;
  ativo: boolean;
}

interface SyncStateRow {
  portal_id: string;
  empresa_id: string;
  status: EntityStatus;
  routing: CvmRoutingRule[];
  ultima_sync: string | null;
  proxima_sync: string | null;
  last_sync_result: SyncResult | null;
  discovered_categories: DiscoveredCategory[] | null;
}

// Markers are id-based objects in the canal tree (Canais can rename/reorder
// them without breaking anything referencing them) — this still tolerates
// the legacy plain-string arrays from before that change.
interface CanalNode {
  id?: string;
  label: string;
  pageType?: string;
  listaAgrupadaCategories?: (string | { id: string; label: string })[];
  children?: CanalNode[];
}

function groupLabels(cats: CanalNode['listaAgrupadaCategories']): string[] | undefined {
  if (!cats) return undefined;
  return cats.map(c => (typeof c === 'string' ? c : c.label));
}

function collectRoutablePages(canais: CanalNode[]): RoutablePage[] {
  const LIST_TYPES = new Set(['lista', 'lista-agrupada']);
  const pages: RoutablePage[] = [];
  function walk(node: CanalNode, trail: string[]) {
    const path = [...trail, node.label];
    if (node.id && LIST_TYPES.has(node.pageType ?? '')) {
      pages.push({
        id: node.id,
        label: node.label,
        path: path.join(' › '),
        isGrouped: node.pageType === 'lista-agrupada',
        groupCategories: groupLabels(node.listaAgrupadaCategories),
      });
    }
    for (const child of node.children ?? []) walk(child, path);
  }
  for (const canal of canais) walk(canal, []);
  return pages;
}

async function _fetchAll(): Promise<CvmPortal[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data: portals } = await supabase.from('portals').select('id, cliente, portal_key');
  if (!portals || portals.length === 0) return [];
  const portalIds = portals.map(p => p.id as string);

  const { data: configs } = await supabase
    .from('portal_config')
    .select('portal_id, empresas')
    .in('portal_id', portalIds);

  const { data: syncRows } = await supabase
    .from('cvm_sync_state')
    .select('*')
    .in('portal_id', portalIds);

  const empresasByPortal = new Map<string, EmpresaRow[]>(
    (configs ?? []).map(c => [c.portal_id as string, (c.empresas ?? []) as EmpresaRow[]])
  );
  const syncByKey = new Map<string, SyncStateRow>(
    (syncRows ?? []).map((s: SyncStateRow) => [`${s.portal_id}:${s.empresa_id}`, s])
  );

  return portals.map(p => {
    const empresas = empresasByPortal.get(p.id as string) ?? [];
    const entidades: CvmEntityView[] = empresas
      .filter(e => e.autoCvm)
      .map(e => {
        const sync = syncByKey.get(`${p.id}:${e.id}`);
        return {
          id: e.id,
          portalId: p.id as string,
          nome: e.nome,
          tipo: e.tipo === 'FUNDO' ? 'fundo' : 'empresa',
          cnpj: e.cnpj,
          cvmCode: e.cvmCodigo,
          importarDesde: e.importarDesde || null,
          status: sync?.status ?? 'ativo',
          routing: sync?.routing ?? [],
          ultimaSync: sync?.ultima_sync ?? null,
          proximaSync: sync?.proxima_sync ?? null,
          lastSyncResult: sync?.last_sync_result ?? null,
          discoveredCategories: sync?.discovered_categories ?? [],
        };
      });
    return { id: p.id as string, portalKey: p.portal_key as string, nome: p.cliente as string, entidades };
  });
}

async function _upsertSyncState(portalId: string, empresaId: string, patch: Partial<SyncStateRow>): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('cvm_sync_state')
    .upsert({ portal_id: portalId, empresa_id: empresaId, ...patch }, { onConflict: 'portal_id,empresa_id' });
  if (error) throw new Error(`Falha ao salvar estado do Auto CVM: ${error.message}`);
}

export const cvmService = {

  /** Load all portais with their Auto-CVM-enabled empresas + sync state. */
  async listPortais(): Promise<CvmPortal[]> {
    return _fetchAll();
  },

  /** Toggle active/paused on an entity's sync. */
  async updateStatus(portalId: string, empresaId: string, req: UpdateEntityStatusRequest): Promise<void> {
    await _upsertSyncState(portalId, empresaId, { status: req.status });
  },

  /** Update the "importar desde" date — this lives on the empresa record itself. */
  async updateImportDate(portalId: string, empresaId: string, req: UpdateImportDateRequest): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    const { data: cfg } = await supabase.from('portal_config').select('empresas').eq('portal_id', portalId).maybeSingle();
    const empresas = ((cfg?.empresas ?? []) as EmpresaRow[]).map(e =>
      e.id === empresaId ? { ...e, importarDesde: req.importarDesde ?? '' } : e
    );
    const { error } = await supabase.from('portal_config').upsert({ portal_id: portalId, empresas }, { onConflict: 'portal_id' });
    if (error) throw new Error(`Falha ao salvar data de importação: ${error.message}`);
  },

  /** Force an immediate CVM sweep for one entity (Sincronizar agora button).
   *  Calls the real cvm-import-run edge function — fetches dados.cvm.gov.br,
   *  matches by CNPJ/código CVM, and writes matched documents straight into
   *  portal_documents at their routed destination. */
  async syncNow(portalId: string, empresaId: string): Promise<SyncResponse> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado.');
    const { data, error } = await supabase.functions.invoke('cvm-import-run', { body: { portalId, empresaId } });
    if (error) throw new Error(`Falha ao sincronizar: ${error.message}`);
    return data as SyncResponse;
  },

  /** Import all real CVM documents filed on/after a given date — same
   *  cvm-import-run function as syncNow, just with a wider year range. */
  async importHistory(portalId: string, empresaId: string, req: ImportHistoryRequest): Promise<ImportHistoryResponse> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado.');
    const { data, error } = await supabase.functions.invoke('cvm-import-run', { body: { portalId, empresaId, desde: req.desde } });
    if (error) throw new Error(`Falha ao importar histórico: ${error.message}`);
    return { ...(data as SyncResponse), desde: req.desde };
  },

  /** Reprocessa documentos já importados que ficaram como link externo —
   *  tenta baixar o arquivo real de novo (cobre tanto documentos importados
   *  antes do download automático existir quanto páginas de visualização
   *  que o scrape não reconheceu na primeira tentativa). Nunca cria
   *  documentos novos, só troca external_link por file_path quando funciona. */
  async backfillFiles(portalId: string, empresaId: string): Promise<SyncResponse> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado.');
    const { data, error } = await supabase.functions.invoke('cvm-import-run', { body: { portalId, empresaId, backfillOnly: true } });
    if (error) throw new Error(`Falha ao reprocessar documentos: ${error.message}`);
    return data as SyncResponse;
  },

  /** Reaplica o roteamento ATUAL (Auto CVM → destinos) a documentos já
   *  importados anteriormente. A importação normal só grava pagina_ids no
   *  momento do insert — mudar o destino de uma categoria depois não move
   *  os documentos que já existem, só afeta os próximos a serem importados.
   *  Este modo corrige isso sem re-baixar nada da CVM. */
  async reprocessRouting(portalId: string, empresaId: string): Promise<SyncResponse> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado.');
    const { data, error } = await supabase.functions.invoke('cvm-import-run', { body: { portalId, empresaId, reprocessRoutingOnly: true } });
    if (error) throw new Error(`Falha ao reprocessar roteamento: ${error.message}`);
    return data as SyncResponse;
  },

  /** Get routing rules for one entity. */
  async getRouting(portalId: string, empresaId: string): Promise<CvmRoutingRule[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data } = await supabase
      .from('cvm_sync_state')
      .select('routing')
      .eq('portal_id', portalId)
      .eq('empresa_id', empresaId)
      .maybeSingle();
    return (data?.routing as CvmRoutingRule[]) ?? [];
  },

  /** Persist routing rules for one entity. */
  async updateRouting(portalId: string, empresaId: string, rules: CvmRoutingRule[]): Promise<void> {
    await _upsertSyncState(portalId, empresaId, { routing: rules });
  },

  /** Load the routable pages (canal tree nodes with pageType 'lista'/'lista-agrupada') for one portal. */
  async listRoutablePages(portalId: string): Promise<RoutablePage[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data } = await supabase.from('portal_config').select('canais').eq('portal_id', portalId).maybeSingle();
    const canais = (data?.canais ?? []) as CanalNode[];
    return collectRoutablePages(canais);
  },
} as const;

/** All canal-tree target ids that have at least one CVM category routed to
 *  them in this portal — used to show the "⟳ Auto CVM" badge in Canais. */
export async function loadCvmRoutedPageIds(portalKey: string): Promise<Set<string>> {
  if (!isSupabaseConfigured || !supabase) return new Set();
  const portalId = await resolvePortalUuid(portalKey);
  if (!portalId) return new Set();
  const { data } = await supabase.from('cvm_sync_state').select('routing').eq('portal_id', portalId);
  const ids = (data ?? []).flatMap(row => ((row.routing ?? []) as CvmRoutingRule[]).map(r => r.targetId));
  return new Set(ids);
}

export type { EntityStatus };
