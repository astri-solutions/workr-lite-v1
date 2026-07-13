// ─── CVM Domain Types ────────────────────────────────────────────────────────
// These types mirror the backend DB schema and API responses exactly.
// When the Go backend is implemented, these should match the JSON tags on the
// Go structs without modification.

export type EntityStatus = 'ativo' | 'pausado' | 'erro';
export type EntityTipo = 'empresa' | 'fundo';

/** Maps one CVM document category to a portal page (pageId from the canal tree). */
export interface CvmRoutingRule {
  cvmCategoryId: string;   // e.g. 'fato-relevante'
  cvmCategoryLabel: string; // e.g. 'Fato Relevante'
  pageId: string;          // SubCanal.id
  pageLabel: string;       // human-readable page name
}

/** Storage key for entity routing config in localStorage */
export const CVM_ROUTING_KEY = 'cvm_routing';

/** Matches `cvm_entities` table row */
export interface CvmEntity {
  id: string;
  portalId: string;
  nome: string;
  tipo: EntityTipo;
  cnpj: string;          // primary lookup key against CVM base
  cvmCode: string;       // código CVM (secondary identifier, used for history import)
  status: EntityStatus;
  importarDesde: string | null; // ISO date "YYYY-MM-DD", null = incremental only
  ultimaSync: string | null;    // ISO datetime of last successful sync
  proximaSync: string | null;   // ISO datetime of next scheduled sync
  createdAt: string;
  updatedAt: string;
}

/** Matches `portais` table row (summary for CVM page) */
export interface CvmPortal {
  id: string;
  nome: string;
  entidades: CvmEntity[];
}

// ─── API Request / Response shapes ──────────────────────────────────────────

/** POST /api/cvm/entities */
export interface CreateEntityRequest {
  portalId: string;
  nome: string;
  tipo: EntityTipo;
  cnpj: string;
  cvmCode: string;
  importarDesde?: string | null; // ISO date, optional
}

/** PATCH /api/cvm/entities/:id/status */
export interface UpdateEntityStatusRequest {
  status: EntityStatus;
}

/** PATCH /api/cvm/entities/:id/import-date */
export interface UpdateImportDateRequest {
  importarDesde: string | null;
}

/** POST /api/cvm/entities/:id/sync — force immediate sweep */
export interface SyncResponse {
  entityId: string;
  syncedAt: string;        // ISO datetime
  documentsFound: number;
  documentsImported: number;
  errors: string[];
}

/** POST /api/cvm/entities/:id/import-history */
export interface ImportHistoryRequest {
  desde: string; // ISO date "YYYY-MM-DD"
}

export interface ImportHistoryResponse {
  entityId: string;
  desde: string;
  documentsQueued: number;
  estimatedMinutes: number;
}

/** GET /api/cvm/portais */
export type GetPortaisResponse = CvmPortal[];

/** Generic API error */
export interface ApiError {
  code: string;
  message: string;
}
