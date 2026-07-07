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
} from './cvm.types';

// ─── Config ──────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

// Flip to false when the real backend is live.
const MOCK_MODE = true;

// ─── Mock seed data (replace with DB rows) ───────────────────────────────────

const _mockPortais: CvmPortal[] = [
  {
    id: 'imc',
    nome: 'International Meal Company',
    entidades: [
      {
        id: 'ent-1',
        portalId: 'imc',
        nome: 'International Meal Company',
        tipo: 'empresa',
        cnpj: '17.314.329/0001-20',
        cvmCode: '23574',
        status: 'ativo',
        importarDesde: '2024-01-01',
        ultimaSync: new Date(Date.now() - 2 * 60_000).toISOString(),
        proximaSync: new Date(Date.now() + 8 * 60_000).toISOString(),
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ent-2',
        portalId: 'imc',
        nome: 'IMC Recebíveis FII',
        tipo: 'fundo',
        cnpj: '44.123.456/0001-77',
        cvmCode: '45012',
        status: 'ativo',
        importarDesde: '2025-06-01',
        ultimaSync: new Date(Date.now() - 2 * 60_000).toISOString(),
        proximaSync: new Date(Date.now() + 8 * 60_000).toISOString(),
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ent-3',
        portalId: 'imc',
        nome: 'IMC Crédito Estruturado FII',
        tipo: 'fundo',
        cnpj: '44.987.654/0001-11',
        cvmCode: '45990',
        status: 'pausado',
        importarDesde: null,
        ultimaSync: null,
        proximaSync: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'aurora',
    nome: 'Construtora Aurora',
    entidades: [
      {
        id: 'ent-4',
        portalId: 'aurora',
        nome: 'Construtora Aurora S.A.',
        tipo: 'empresa',
        cnpj: '12.345.678/0001-90',
        cvmCode: '18920',
        status: 'ativo',
        importarDesde: '2023-01-01',
        ultimaSync: new Date(Date.now() - 5 * 60_000).toISOString(),
        proximaSync: new Date(Date.now() + 5 * 60_000).toISOString(),
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'vetra',
    nome: 'Vetra Energia',
    entidades: [],
  },
];

// Mutable in-memory store for mock mode
let _store: CvmPortal[] = JSON.parse(JSON.stringify(_mockPortais));

function _findEntity(entityId: string): CvmEntity | undefined { // eslint-disable-line @typescript-eslint/no-unused-vars
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
        proximaSync: new Date(Date.now() + 10 * 60_000).toISOString(),
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
          ? new Date(Date.now() + 10 * 60_000).toISOString()
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
        proximaSync: new Date(Date.now() + 10 * 60_000).toISOString(),
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
} as const;

export type { EntityStatus };
