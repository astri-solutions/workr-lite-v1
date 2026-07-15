// ─── CVM API Service ──────────────────────────────────────────────────────────
// All CVM operations go through this file. When the Go backend is ready:
//   1. Set VITE_API_BASE_URL in your .env (e.g. https://api.workrlite.com)
//   2. Remove the MOCK_MODE flag — every function already calls the real endpoint.
//   3. The mock seed data below can be deleted or moved to a fixtures file.
//
// The UI never calls fetch() directly — it imports from here. That means the
// switch from mock → real requires zero changes in component files.

import type {
  CvmPortal,
  CvmEntity,
  CreateEntityRequest,
  UpdateEntityStatusRequest,
  UpdateImportDateRequest,
  SyncResponse,
  ImportHistoryRequest,
  ImportHistoryResponse,
  EntityStatus,
  CvmRoutingRule,
} from './cvm.types';
import { CVM_ROUTING_KEY } from './cvm.types';

// ─── Config ──────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

// Flip to false when the real backend is live.
const MOCK_MODE = true;

// ─── Mock seed data — loaded from workr_portais localStorage ─────────────────

function _loadPortaisFromStorage(): CvmPortal[] {
  try {
    const raw = localStorage.getItem('workr_portais');
    const portais: Array<{ id: string; cliente: string }> = raw ? JSON.parse(raw) : [];
    return portais.map(p => ({ id: p.id, nome: p.cliente, entidades: [] }));
  } catch {
    return [];
  }
}

// Mutable in-memory store for mock mode — seeded from localStorage portals
let _store: CvmPortal[] = _loadPortaisFromStorage();

// Seed any previously-saved routing rules from localStorage into the in-memory store
function _seedRoutingFromStorage() {
  try {
    const raw = localStorage.getItem(CVM_ROUTING_KEY);
    if (!raw) return;
    const all: Record<string, CvmRoutingRule[]> = JSON.parse(raw);
    for (const [entityId, rules] of Object.entries(all)) {
      try { _updateEntity(entityId, { routing: rules }); } catch { /* entity not in store */ }
    }
  } catch { /* silent */ }
}
_seedRoutingFromStorage();

export function _findEntity(entityId: string): CvmEntity | undefined {
  for (const p of _store) {
    const e = p.entidades.find(e => e.id === entityId);
    if (e) return e;
  }
  return undefined;
}

function _updateEntity(entityId: string, patch: Partial<CvmEntity>): CvmEntity {
  for (const p of _store) {
    const idx = p.entidades.findIndex(e => e.id === entityId);
    if (idx !== -1) {
      p.entidades[idx] = { ...p.entidades[idx], ...patch, updatedAt: new Date().toISOString() };
      return p.entidades[idx];
    }
  }
  throw new Error(`Entity ${entityId} not found`);
}

function _delay(ms = 600): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ─── API helpers ─────────────────────────────────────────────────────────────

async function _get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function _post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json();
}

async function _patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}`);
  return res.json();
}

async function _delete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`DELETE ${path} → ${res.status}`);
}

// ─── Public API ───────────────────────────────────────────────────────────────
//
// Backend endpoint map (Go router):
//   GET    /api/cvm/portais                          → listPortais
//   GET    /api/cvm/portais/:portalId/entidades      → listEntidades
//   POST   /api/cvm/entidades                        → createEntity
//   PATCH  /api/cvm/entidades/:id/status             → updateStatus
//   PATCH  /api/cvm/entidades/:id/import-date        → updateImportDate
//   POST   /api/cvm/entidades/:id/sync               → syncNow
//   POST   /api/cvm/entidades/:id/import-history     → importHistory
//   DELETE /api/cvm/entidades/:id                    → deleteEntity

export const cvmService = {

  /** Load all portais with their entidades. */
  async listPortais(): Promise<CvmPortal[]> {
    if (MOCK_MODE) { await _delay(); return JSON.parse(JSON.stringify(_store)); }
    return _get<CvmPortal[]>('/api/cvm/portais');
  },

  /** Create a new CVM entity (called on portal creation when autoCvm=true, or manually). */
  async createEntity(req: CreateEntityRequest): Promise<CvmEntity> {
    if (MOCK_MODE) {
      await _delay();
      const entity: CvmEntity = {
        id: `ent-${Date.now()}`,
        portalId: req.portalId,
        nome: req.nome,
        tipo: req.tipo,
        cnpj: req.cnpj,
        cvmCode: req.cvmCode,
        status: 'ativo',
        importarDesde: req.importarDesde ?? null,
        ultimaSync: null,
        proximaSync: new Date(Date.now() + 5 * 60_000).toISOString(),
        routing: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const portal = _store.find(p => p.id === req.portalId);
      if (portal) portal.entidades.push(entity);
      return JSON.parse(JSON.stringify(entity));
    }
    return _post<CvmEntity>('/api/cvm/entidades', req);
  },

  /** Toggle active/paused on an entity. */
  async updateStatus(entityId: string, req: UpdateEntityStatusRequest): Promise<CvmEntity> {
    if (MOCK_MODE) {
      await _delay(300);
      return JSON.parse(JSON.stringify(_updateEntity(entityId, {
        status: req.status,
        proximaSync: req.status === 'ativo'
          ? new Date(Date.now() + 5 * 60_000).toISOString()
          : null,
      })));
    }
    return _patch<CvmEntity>(`/api/cvm/entidades/${entityId}/status`, req);
  },

  /** Update the "importar desde" date on an entity. */
  async updateImportDate(entityId: string, req: UpdateImportDateRequest): Promise<CvmEntity> {
    if (MOCK_MODE) {
      await _delay(300);
      return JSON.parse(JSON.stringify(_updateEntity(entityId, { importarDesde: req.importarDesde })));
    }
    return _patch<CvmEntity>(`/api/cvm/entidades/${entityId}/import-date`, req);
  },

  /** Force an immediate CVM sweep for one entity (Sincronizar agora button). */
  async syncNow(entityId: string): Promise<SyncResponse> {
    if (MOCK_MODE) {
      await _delay(2200);
      const now = new Date().toISOString();
      _updateEntity(entityId, {
        ultimaSync: now,
        proximaSync: new Date(Date.now() + 5 * 60_000).toISOString(),
      });
      return {
        entityId,
        syncedAt: now,
        documentsFound: Math.floor(Math.random() * 5),
        documentsImported: Math.floor(Math.random() * 3),
        errors: [],
      };
    }
    return _post<SyncResponse>(`/api/cvm/entidades/${entityId}/sync`);
  },

  /** Queue a historical document import from a given date. */
  async importHistory(entityId: string, req: ImportHistoryRequest): Promise<ImportHistoryResponse> {
    if (MOCK_MODE) {
      await _delay(3000);
      return {
        entityId,
        desde: req.desde,
        documentsQueued: Math.floor(Math.random() * 200) + 10,
        estimatedMinutes: Math.floor(Math.random() * 15) + 2,
      };
    }
    return _post<ImportHistoryResponse>(`/api/cvm/entidades/${entityId}/import-history`, req);
  },

  /** Remove an entity permanently. */
  async deleteEntity(entityId: string): Promise<void> {
    if (MOCK_MODE) {
      await _delay(400);
      for (const p of _store) {
        p.entidades = p.entidades.filter(e => e.id !== entityId);
      }
      return;
    }
    return _delete(`/api/cvm/entidades/${entityId}`);
  },

  /** Called during portal creation wizard when autoCvm=true. */
  async onPortalCreated(portalId: string, cnpj: string, cvmCode: string, nome: string): Promise<CvmEntity> {
    return cvmService.createEntity({
      portalId,
      nome,
      tipo: 'empresa',
      cnpj,
      cvmCode,
      importarDesde: null,
    });
  },

  /** Get routing rules for one entity.
   *  In mock mode: reads from the in-memory entity (source of truth for the Go backend),
   *  with localStorage as a fallback for rules saved before this pattern was introduced.
   */
  getRouting(entityId: string): CvmRoutingRule[] {
    // Prefer the in-memory store (mirrors what the real backend will serve)
    const entity = _findEntity(entityId);
    if (entity) return entity.routing ?? [];
    // Fallback: legacy localStorage rules
    try {
      const raw = localStorage.getItem(CVM_ROUTING_KEY);
      const all: Record<string, CvmRoutingRule[]> = raw ? JSON.parse(raw) : {};
      return all[entityId] ?? [];
    } catch {
      return [];
    }
  },

  /** Persist routing rules for one entity.
   *  In mock mode: writes to both the in-memory store (so the Go backend gets it on
   *  integration) and localStorage (so rules survive a page refresh during development).
   */
  async updateRouting(entityId: string, rules: CvmRoutingRule[]): Promise<void> {
    if (MOCK_MODE) {
      await _delay(300);
      // Write to in-memory entity (the Go backend's source of truth)
      try { _updateEntity(entityId, { routing: rules }); } catch { /* entity may not exist yet */ }
      // Also write to localStorage so rules persist across page reloads in dev
      try {
        const raw = localStorage.getItem(CVM_ROUTING_KEY);
        const all: Record<string, CvmRoutingRule[]> = raw ? JSON.parse(raw) : {};
        all[entityId] = rules;
        localStorage.setItem(CVM_ROUTING_KEY, JSON.stringify(all));
      } catch {
        // silent
      }
      return;
    }
    await _patch<void>(`/api/cvm/entidades/${entityId}/routing`, { rules });
  },
} as const;

/** Returns all pageIds referenced in any entity's CVM routing config. */
export function loadCvmRoutedPageIds(): Set<string> {
  try {
    const raw = localStorage.getItem(CVM_ROUTING_KEY);
    if (!raw) return new Set();
    const all: Record<string, CvmRoutingRule[]> = JSON.parse(raw);
    const ids = Object.values(all).flatMap(rules => rules.map(r => r.pageId));
    return new Set(ids);
  } catch {
    return new Set();
  }
}

export type { EntityStatus };
