import { useState, useEffect } from 'react';
import './AdminPages.css';
import './AutoCvmPage.css';
import StickyPageHeader from '../../components/StickyPageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { cvmService } from '../../services/cvm.service';
import type { CvmPortal, CvmEntity, EntityStatus } from '../../services/cvm.types';

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

function NextSyncCountdown({ lastSyncedAt, active }: { lastSyncedAt: number; active: boolean }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!active) return;
    function tick() {
      const elapsed = Date.now() - lastSyncedAt;
      const left = Math.max(0, SYNC_INTERVAL_MS - elapsed);
      setRemaining(left);
    }
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, [lastSyncedAt, active]);

  if (!active) return null;
  const mins = Math.floor(remaining / 60_000);
  const secs = Math.floor((remaining % 60_000) / 1_000);
  return (
    <span className="cvm-next-sync">
      próxima varredura em <strong>{mins}:{String(secs).padStart(2, '0')}</strong>
    </span>
  );
}

function EntityCard({ entity, onDeleted }: { entity: CvmEntity; onDeleted: (id: string) => void }) {
  const [status, setStatus] = useState<EntityStatus>(entity.status);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(() =>
    entity.ultimaSync ? Date.parse(entity.ultimaSync) : Date.now() - 2 * 60_000
  );
  const [importDate, setImportDate] = useState(entity.importarDesde ?? '');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ queued: number; minutes: number } | null>(null);

  const isAtivo = status === 'ativo';

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await cvmService.syncNow(entity.id);
      setLastSyncedAt(Date.parse(res.syncedAt));
    } catch {
      setSyncError('Falha ao sincronizar. Tente novamente.');
    } finally {
      setSyncing(false);
    }
  }

  async function handleImport() {
    if (!importDate) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await cvmService.importHistory(entity.id, { desde: importDate });
      setImportResult({ queued: res.documentsQueued, minutes: res.estimatedMinutes });
    } finally {
      setImporting(false);
    }
  }

  async function toggleStatus() {
    const next: EntityStatus = status === 'ativo' ? 'pausado' : 'ativo';
    try {
      const updated = await cvmService.updateStatus(entity.id, { status: next });
      setStatus(updated.status);
    } catch {
      // revert handled by not updating state
    }
  }

  async function handleImportDateBlur() {
    try {
      await cvmService.updateImportDate(entity.id, { importarDesde: importDate || null });
    } catch {
      // silent — field remains editable
    }
  }

  async function handleDelete() {
    if (!confirm(`Remover "${entity.nome}" permanentemente?`)) return;
    setDeleting(true);
    try {
      await cvmService.deleteEntity(entity.id);
      onDeleted(entity.id);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className={`cvm-entity-card${!isAtivo ? ' cvm-entity-card--paused' : ''}`}>
      <div className="cvm-entity-card__header">
        <div>
          <h3 className="cvm-entity-card__name">{entity.nome}</h3>
          <p className="cvm-entity-card__meta">
            {entity.tipo === 'empresa' ? 'Empresa' : 'Fundo'}
          </p>
        </div>
        <div className="cvm-entity-card__header-actions">
          <button
            type="button"
            className={`cvm-toggle${isAtivo ? ' cvm-toggle--on' : ''}`}
            onClick={toggleStatus}
            title={isAtivo ? 'Pausar importação' : 'Ativar importação'}
          >
            <span className="cvm-toggle__track">
              <span className="cvm-toggle__thumb" />
            </span>
            <span className="cvm-toggle__label">{isAtivo ? 'Ativo' : 'Pausado'}</span>
          </button>
          <button
            className="cvm-delete-btn"
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            title="Remover entidade"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      </div>

      <div className="cvm-entity-card__fields">
        <div className="cvm-field">
          <label className="cvm-field__label">CNPJ <span className="cvm-field__badge">chave de conexão</span></label>
          <input
            className="cvm-field__input cvm-field__input--readonly"
            type="text"
            value={entity.cnpj}
            readOnly
          />
        </div>
        <div className="cvm-field">
          <label className="cvm-field__label">Código CVM</label>
          <input
            className="cvm-field__input cvm-field__input--readonly"
            type="text"
            value={entity.cvmCode}
            readOnly
          />
        </div>
        <div className="cvm-field">
          <label className="cvm-field__label">Importar histórico desde</label>
          <input
            className="cvm-field__input cvm-field__input--date"
            type="date"
            value={importDate}
            onChange={(e) => setImportDate(e.target.value)}
            onBlur={handleImportDateBlur}
            disabled={!isAtivo}
          />
        </div>
      </div>

      {syncError && <p className="cvm-error-msg">{syncError}</p>}
      {importResult && (
        <p className="cvm-import-result">
          {importResult.queued} documentos enfileirados · estimativa: ~{importResult.minutes} min
        </p>
      )}

      <div className="cvm-entity-card__footer">
        <span className="cvm-entity-card__sync-info">
          {isAtivo ? (
            <>
              varredura automática a cada <strong>10 min</strong>
              {entity.ultimaSync && (
                <> · última: <strong>{new Date(entity.ultimaSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong></>
              )}
              {' · '}<NextSyncCountdown lastSyncedAt={lastSyncedAt} active={isAtivo} />
            </>
          ) : (
            <span className="cvm-entity-card__sync-info--paused">Importação pausada — varredura inativa</span>
          )}
        </span>
        <div className="cvm-entity-card__footer-actions">
          <button
            className="btn-outline-sm"
            type="button"
            onClick={handleSync}
            disabled={syncing || !isAtivo}
            title="Forçar varredura imediata na base da CVM"
          >
            {syncing
              ? <><span className="cvm-spin" />Sincronizando…</>
              : <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Sincronizar agora
                </>
            }
          </button>
          <button
            className="btn-outline-sm"
            type="button"
            onClick={handleImport}
            disabled={importing || !isAtivo || !importDate}
            title={!importDate ? 'Selecione uma data de início para importar' : 'Importar todos os documentos desde a data informada'}
          >
            {importing
              ? <><span className="cvm-spin" />Importando…</>
              : 'Importar histórico'
            }
          </button>
        </div>
      </div>
    </div>
  );
}

interface NewEntityForm {
  nome: string;
  tipo: 'empresa' | 'fundo';
  cnpj: string;
  cvmCode: string;
  importarDesde: string;
}

const EMPTY_NEW_ENTITY: NewEntityForm = { nome: '', tipo: 'empresa', cnpj: '', cvmCode: '', importarDesde: '' };

function PortalAccordion({ portal, onEntityAdded }: { portal: CvmPortal; onEntityAdded: (portalId: string, entity: CvmEntity) => void }) {
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [entities, setEntities] = useState<CvmEntity[]>(portal.entidades);
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState<NewEntityForm>(EMPTY_NEW_ENTITY);
  const [saving, setSaving] = useState(false);

  function handleEntityDeleted(id: string) {
    setEntities(prev => prev.filter(e => e.id !== id));
  }

  async function handleSync(e: React.MouseEvent) {
    e.stopPropagation();
    setSyncing(true);
    try {
      await Promise.all(
        entities.filter(e => e.status === 'ativo').map(e => cvmService.syncNow(e.id))
      );
    } finally {
      setSyncing(false);
    }
  }

  async function handleAdd() {
    if (!form.nome.trim() || !form.cnpj.trim() || !form.cvmCode.trim()) return;
    setSaving(true);
    try {
      const entity = await cvmService.createEntity({
        portalId: portal.id,
        nome: form.nome.trim(),
        tipo: form.tipo,
        cnpj: form.cnpj.trim(),
        cvmCode: form.cvmCode.trim(),
        importarDesde: form.importarDesde || null,
      });
      setEntities(prev => [...prev, entity]);
      onEntityAdded(portal.id, entity);
      setForm(EMPTY_NEW_ENTITY);
      setAddModal(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="cvm-accordion">
        <button className="cvm-accordion__header" type="button" onClick={() => setOpen(v => !v)}>
          <div className="cvm-accordion__title-group">
            <span className="cvm-group__name">{portal.nome}</span>
            <span className="cvm-group__count">
              {entities.length} entidade{entities.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="cvm-accordion__actions">
            <button
              className="btn-outline-sm"
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(true); setAddModal(true); }}
            >
              + Entidade
            </button>
            <button
              className="btn-outline-sm"
              type="button"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? <><span className="cvm-spin" />Sincronizando…</> : 'Sincronizar'}
            </button>
            <ChevronIcon open={open} />
          </div>
        </button>
        {open && (
          <div className="cvm-accordion__body">
            {entities.length === 0 ? (
              <div className="cvm-group__empty">
                <p>Nenhuma entidade conectada.</p>
                <button className="btn-outline-sm" type="button" onClick={() => setAddModal(true)}>
                  + Adicionar entidade
                </button>
              </div>
            ) : (
              <div className="cvm-entity-list cvm-entity-list--ingroup">
                {entities.map((entity) => (
                  <EntityCard key={entity.id} entity={entity} onDeleted={handleEntityDeleted} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add entity modal */}
      {addModal && (
        <div className="cvm-modal-overlay" onClick={() => setAddModal(false)}>
          <div className="cvm-modal" onClick={e => e.stopPropagation()}>
            <div className="cvm-modal__header">
              <h3 className="cvm-modal__title">Adicionar entidade — {portal.nome}</h3>
              <button className="cvm-modal__close" type="button" onClick={() => setAddModal(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="cvm-modal__body">
              <div className="cvm-field">
                <label className="cvm-field__label">Nome da entidade</label>
                <input className="cvm-field__input" type="text" placeholder="Ex: Empresa XYZ S.A."
                  value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} autoFocus />
              </div>
              <div className="cvm-modal__row">
                <div className="cvm-field">
                  <label className="cvm-field__label">Tipo</label>
                  <select className="cvm-select cvm-select--sm"
                    value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as 'empresa' | 'fundo' }))}>
                    <option value="empresa">Empresa</option>
                    <option value="fundo">Fundo</option>
                  </select>
                </div>
                <div className="cvm-field">
                  <label className="cvm-field__label">CNPJ <span className="cvm-field__badge">chave de conexão</span></label>
                  <input className="cvm-field__input" type="text" placeholder="00.000.000/0001-00"
                    value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} />
                </div>
                <div className="cvm-field">
                  <label className="cvm-field__label">Código CVM</label>
                  <input className="cvm-field__input" type="text" placeholder="Ex: 23574"
                    value={form.cvmCode} onChange={e => setForm(f => ({ ...f, cvmCode: e.target.value }))} />
                </div>
              </div>
              <div className="cvm-field">
                <label className="cvm-field__label">Importar histórico desde (opcional)</label>
                <input className="cvm-field__input cvm-field__input--date" type="date"
                  value={form.importarDesde} onChange={e => setForm(f => ({ ...f, importarDesde: e.target.value }))} />
                <span className="cvm-field__hint">Deixe em branco para importar apenas documentos novos.</span>
              </div>
            </div>
            <div className="cvm-modal__footer">
              <button className="btn-outline" type="button" onClick={() => setAddModal(false)}>Cancelar</button>
              <button className="btn-primary" type="button"
                onClick={handleAdd}
                disabled={saving || !form.nome.trim() || !form.cnpj.trim() || !form.cvmCode.trim()}>
                {saving ? 'Salvando…' : 'Adicionar e ativar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function AutoCvmPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  // Active portal name for non-super_admin users (used to filter CVM data)
  const activePortalNome = user?.portais?.find(p => p.id === user.activePortalId)?.nome
    ?? user?.portais?.[0]?.nome
    ?? null;

  const [portais, setPortais] = useState<CvmPortal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cvmService.listPortais()
      .then(data => {
        // Non-super_admin sees only the active portal's CVM data (matched by name)
        const filtered = isSuperAdmin
          ? data
          : data.filter(p => p.nome === activePortalNome);
        setPortais(filtered);
        setLoading(false);
      })
      .catch(() => { setError('Falha ao carregar dados da CVM.'); setLoading(false); });
  }, [isSuperAdmin, activePortalNome]);

  function handleEntityAdded(pid: string, entity: CvmEntity) {
    setPortais(prev => prev.map(p =>
      p.id === pid ? { ...p, entidades: [...p.entidades, entity] } : p
    ));
  }

  return (
    <div className="page cvm-page">

      <StickyPageHeader
        title="Auto CVM"
        description={
          <>
            Documentos publicados na CVM são importados automaticamente pelo <strong>CNPJ</strong>{' '}
            de cada entidade — apenas canais regulatórios. A Central de Resultados é gerida manualmente.
          </>
        }
        action={undefined}
      />

      {loading && <p className="cvm-loading">Carregando…</p>}
      {error && <p className="cvm-error-msg">{error}</p>}

      {!loading && !error && (
        <>
          <div className="cvm-entities-header">
            <h2 className="cvm-entities-title">Entidades conectadas (por CNPJ)</h2>
          </div>

          {portais.length === 0 ? (
            <div className="cvm-empty">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <p>Nenhuma entidade conectada.</p>
            </div>
          ) : portais.length === 1 ? (
            /* Single portal: flat entity list */
            <div className="cvm-entity-list">
              {portais[0].entidades.length === 0 ? (
                <div className="cvm-empty">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  <p>Nenhuma entidade conectada neste portal.</p>
                </div>
              ) : portais[0].entidades.map(entity => (
                <EntityCard key={entity.id} entity={entity} onDeleted={(id) => {
                  setPortais(prev => prev.map(p => ({
                    ...p,
                    entidades: p.entidades.filter(e => e.id !== id),
                  })));
                }} />
              ))}
            </div>
          ) : (
            /* Multiple portals: accordion per portal */
            <div className="cvm-groups">
              {portais.map(portal => (
                <PortalAccordion key={portal.id} portal={portal} onEntityAdded={handleEntityAdded} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
