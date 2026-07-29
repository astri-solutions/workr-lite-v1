// ─── CVM Domain Types ────────────────────────────────────────────────────────
// Company identity (nome, cnpj, cvmCodigo, autoCvm, importarDesde) lives in
// portal_config.empresas — the same "Empresas" data EmpresasPage.tsx manages.
// These types only cover the CVM-sync-specific data layered on top of that,
// stored in the `cvm_sync_state` table (one row per portal_id+empresa_id).

export type EntityStatus = 'ativo' | 'pausado' | 'erro';
export type EntityTipo = 'empresa' | 'fundo';

/** Maps one CVM document category to a real node in the portal's canal tree. */
export interface CvmRoutingRule {
  cvmCategoryId: string;    // e.g. 'fato-relevante'
  cvmCategoryLabel: string; // e.g. 'Fato Relevante'
  targetId: string;         // id of a Canal | SubCanal | SubSubCanal (pageType 'lista' or 'lista-agrupada')
  targetLabel: string;      // breadcrumb path, e.g. "Governança › Atas › Atas de AGO"
  groupCategory?: string;   // when the target page is 'lista-agrupada', which category/group to file under
}

export interface SyncResult {
  documentsFound: number;
  documentsImported: number;
  errors: string[];
}

/** A company ("empresa") as it lives in portal_config.empresas, merged with
 *  its cvm_sync_state row for display in the Auto CVM admin page. */
export interface DiscoveredCategory { id: string; label: string; }

export interface CvmEntityView {
  id: string;             // empresa id (portal_config.empresas[].id)
  portalId: string;       // portals.id (uuid)
  nome: string;
  tipo: EntityTipo;
  cnpj: string;
  cvmCode: string;
  importarDesde: string | null;
  status: EntityStatus;
  routing: CvmRoutingRule[];
  ultimaSync: string | null;
  proximaSync: string | null;
  lastSyncResult: SyncResult | null;
  // Every distinct CVM category actually seen for this entity's real
  // filings — a superset of the hand-picked CVM_ROUTABLE_CATEGORIES list,
  // since CVM's real taxonomy is much larger and keeps adding new ones.
  discoveredCategories: DiscoveredCategory[];
}

export interface CvmPortal {
  id: string;       // portals.id (uuid) — used for all Supabase writes
  portalKey: string; // portals.portal_key — matches user.activePortalId
  nome: string;
  entidades: CvmEntityView[];
}

/** A routable destination in the canal tree (pageType 'lista' or 'lista-agrupada'). */
export interface RoutablePage {
  id: string;
  label: string;
  path: string; // breadcrumb, e.g. "Governança › Atas"
  isGrouped: boolean;
  groupCategories?: string[];
}

export interface UpdateEntityStatusRequest { status: EntityStatus; }
export interface UpdateImportDateRequest { importarDesde: string | null; }
export interface ImportHistoryRequest { desde: string; }

export interface SyncResponse extends SyncResult {
  entityId: string;
  syncedAt: string;
}

export interface ImportHistoryResponse extends SyncResult {
  entityId: string;
  desde: string;
  syncedAt: string;
}

/** An unresolved cvm_alerts row — a CVM category with no valid routing rule
 *  yet, surfaced to the bell dropdown in AppTopbar so a super_admin finds
 *  out without having to open Auto CVM and check on their own. */
export interface CvmAlert {
  id: string;
  portalId: string;
  portalNome: string;
  empresaId: string;
  empresaNome: string;
  cvmCategoryId: string;
  cvmCategoryLabel: string;
  createdAt: string;
}
