import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import './AdminPages.css';
import './AutoCvmPage.css';
import StickyPageHeader from '../../components/StickyPageHeader';
import DatePicker from '../../components/DatePicker';
import { useAuth } from '../../contexts/AuthContext';
import { cvmService } from '../../services/cvm.service';
import type { CvmPortal, CvmEntityView, EntityStatus, CvmRoutingRule, RoutablePage, DiscoveredCategory } from '../../services/cvm.types';

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const CVM_ROUTABLE_CATEGORIES = [
  { id: 'fato-relevante',           label: 'Fato Relevante' },
  { id: 'comunicado',               label: 'Comunicado ao Mercado' },
  { id: 'aviso-acionistas',         label: 'Aviso aos Acionistas' },
  { id: 'ata-ago',                  label: 'Ata de AGO' },
  { id: 'ata-age',                  label: 'Ata de AGE' },
  { id: 'convocacao',               label: 'Convocação' },
  { id: 'documentos-societarios',   label: 'Documentos Societários' },
  { id: 'informacoes-periodicas',   label: 'Informações Periódicas' },
  { id: 'informe-mensal',           label: 'Informe Mensal' },
  { id: 'informe-trimestral',       label: 'Informe Trimestral' },
  { id: 'formulario-referencia',    label: 'Formulário de Referência' },
  { id: 'prospecto',                label: 'Prospecto' },
  { id: 'calendario-eventos',       label: 'Calendário de Eventos Corporativos' },
  { id: 'dados-economico-financeiros', label: 'Dados Econômico-Financeiros' },
  { id: 'plano-remuneracao',        label: 'Plano de Remuneração Baseado em Ações' },
  { id: 'relatorio-sustentabilidade', label: 'Relatório de Sustentabilidade' },
  { id: 'relatorio-proventos',      label: 'Relatório de Proventos' },
  { id: 'valores-mobiliarios-negociados', label: 'Valores Mobiliários Negociados e Detidos' },
];

// Hidden from the routing UI pending a decision on how Calendário de
// Eventos should be populated (auto-pull CVM's historical events vs.
// manual entry) — pulling this back in is just removing the id here.
const HIDDEN_ROUTABLE_CATEGORY_IDS = new Set(['calendario-eventos']);

function RoutingSection({ portalId, empresaId, initialRouting, discoveredCategories }: { portalId: string; empresaId: string; initialRouting: CvmRoutingRule[]; discoveredCategories: DiscoveredCategory[] }) {
  const [open, setOpen] = useState(false);
  const [pages, setPages] = useState<RoutablePage[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [rules, setRules] = useState<CvmRoutingRule[]>(initialRouting);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // CVM's real category taxonomy is far larger than the hand-picked list
  // above — anything cvm-import-run actually saw for this entity but isn't
  // in the static list gets appended here, so an admin can route it without
  // waiting on a code change.
  const categories = useMemo(() => {
    const staticIds = new Set(CVM_ROUTABLE_CATEGORIES.map(c => c.id));
    const extra = discoveredCategories.filter(c => !staticIds.has(c.id));
    return [...CVM_ROUTABLE_CATEGORIES, ...extra].filter(c => !HIDDEN_ROUTABLE_CATEGORY_IDS.has(c.id));
  }, [discoveredCategories]);

  useEffect(() => {
    if (!open || pages.length > 0) return;
    setLoadingPages(true);
    cvmService.listRoutablePages(portalId)
      .then(setPages)
      .finally(() => setLoadingPages(false));
  }, [open, portalId, pages.length]);

  // A saved rule's targetId may no longer exist — the canal/subcanal it
  // pointed to could have been renamed's id changed, reordered into a
  // different parent, or deleted entirely in Árvore de canais since the
  // routing was last saved. Importing against a stale id would silently
  // route nowhere, so flag it instead of trusting the saved reference.
  const orphanedRules = pages.length > 0
    ? rules.filter(r => !pages.some(p => p.id === r.targetId))
    : [];

  function getRule(catId: string): CvmRoutingRule | undefined {
    return rules.find(r => r.cvmCategoryId === catId);
  }

  function clearOrphan(catId: string) {
    setRules(prev => prev.filter(r => r.cvmCategoryId !== catId));
    setSaved(false);
  }

  // One flat option per selectable destination — a plain page is one option,
  // a grouped page contributes one option PER category (page › grupo) so the
  // whole thing is a single dropdown instead of a page select + group select.
  const destinationOptions = useMemo(() => {
    const opts: { value: string; label: string; targetId: string; targetLabel: string; groupCategory?: string }[] = [];
    for (const p of pages) {
      if (p.isGrouped && (p.groupCategories?.length ?? 0) > 0) {
        for (const g of p.groupCategories!) {
          opts.push({ value: `${p.id}::${g}`, label: `${p.path} › ${g}`, targetId: p.id, targetLabel: p.path, groupCategory: g });
        }
      } else {
        opts.push({ value: p.id, label: `${p.path}${p.isGrouped ? ' (lista agrupada)' : ''}`, targetId: p.id, targetLabel: p.path });
      }
    }
    return opts;
  }, [pages]);

  function valueForRule(rule: CvmRoutingRule | undefined): string {
    if (!rule) return '';
    return rule.groupCategory ? `${rule.targetId}::${rule.groupCategory}` : rule.targetId;
  }

  function setDestinationForCat(cat: { id: string; label: string }, value: string) {
    setRules(prev => {
      const without = prev.filter(r => r.cvmCategoryId !== cat.id);
      if (!value) return without;
      const opt = destinationOptions.find(o => o.value === value);
      if (!opt) return without;
      return [...without, {
        cvmCategoryId: cat.id,
        cvmCategoryLabel: cat.label,
        targetId: opt.targetId,
        targetLabel: opt.targetLabel,
        groupCategory: opt.groupCategory,
      }];
    });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await cvmService.updateRouting(portalId, empresaId, rules);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const configuredCount = rules.length;

  return (
    <div className="cvm-routing">
      <button
        type="button"
        className="cvm-routing__toggle"
        onClick={() => setOpen(v => !v)}
      >
        <span className="cvm-routing__toggle-label">
          Destinos de importação
          {configuredCount > 0 && (
            <span className="cvm-routing__count">{configuredCount} categoria{configuredCount !== 1 ? 's' : ''} mapeada{configuredCount !== 1 ? 's' : ''}</span>
          )}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="cvm-routing__body">
          <p className="cvm-routing__hint">
            Defina para qual página do portal cada categoria de documento CVM deve ser importada.
            Categorias sem destino serão ignoradas na importação automática.
          </p>
          {orphanedRules.length > 0 && (
            <div className="cvm-routing__orphan-banner">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><circle cx="12" cy="16" r=".5" fill="currentColor" />
              </svg>
              <div>
                <strong>{orphanedRules.length} destino{orphanedRules.length !== 1 ? 's' : ''} inválido{orphanedRules.length !== 1 ? 's' : ''}</strong> — a página que
                {orphanedRules.length !== 1 ? ' essas categorias apontavam' : ' essa categoria apontava'} não existe mais em Árvore de canais
                ({orphanedRules.map(r => r.cvmCategoryLabel).join(', ')}). Escolha um novo destino ou remova o mapeamento.
                <div className="cvm-routing__orphan-actions">
                  {orphanedRules.map(r => (
                    <button key={r.cvmCategoryId} type="button" className="cvm-routing__orphan-clear" onClick={() => clearOrphan(r.cvmCategoryId)}>
                      Remover "{r.cvmCategoryLabel}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {loadingPages ? (
            <p className="cvm-routing__no-pages">Carregando páginas do portal…</p>
          ) : pages.length === 0 ? (
            <p className="cvm-routing__no-pages">
              Nenhuma página de lista encontrada no canal. Crie páginas do tipo "Lista" ou "Lista agrupada" em Árvore de canais primeiro.
            </p>
          ) : (
            <div className="cvm-routing__table">
              {categories.map(cat => {
                const rule = getRule(cat.id);
                return (
                  <div key={cat.id} className="cvm-routing__row">
                    <span className="cvm-routing__cat">{cat.label}</span>
                    <select
                      className="cvm-select cvm-select--sm cvm-routing__select"
                      value={valueForRule(rule)}
                      onChange={e => setDestinationForCat(cat, e.target.value)}
                    >
                      <option value="">— não importar —</option>
                      {destinationOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
          <div className="cvm-routing__footer">
            {saved && <span className="cvm-routing__saved">Destinos salvos</span>}
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || pages.length === 0}
            >
              {saving ? 'Salvando…' : 'Salvar destinos'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EntityCard({ entity }: { entity: CvmEntityView }) {
  const [status, setStatus] = useState<EntityStatus>(entity.status);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDate, setImportDate] = useState(entity.importarDesde ?? '');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(entity.ultimaSync);
  const [importResult, setImportResult] = useState<{ found: number; imported: number; errors: string[] } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<unknown>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<{ found: number; imported: number; errors: string[] } | null>(null);
  const [backfillError, setBackfillError] = useState<string | null>(null);
  const [reroutingRouting, setReroutingRouting] = useState(false);
  const [reroutingResult, setReroutingResult] = useState<{ found: number; imported: number; errors: string[] } | null>(null);
  const [reroutingError, setReroutingError] = useState<string | null>(null);

  const isAtivo = status === 'ativo';
  const isErro = status === 'erro';

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await cvmService.syncNow(entity.portalId, entity.id);
      setLastSyncedAt(res.syncedAt);
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
    setImportError(null);
    try {
      const res = await cvmService.importHistory(entity.portalId, entity.id, { desde: importDate });
      setImportResult({ found: res.documentsFound, imported: res.documentsImported, errors: res.errors });
      setLastSyncedAt(res.syncedAt ?? new Date().toISOString());
    } catch {
      setImportError('Falha ao importar histórico. Tente novamente.');
    } finally {
      setImporting(false);
    }
  }

  async function handleBackfill() {
    setBackfilling(true);
    setBackfillResult(null);
    setBackfillError(null);
    try {
      const res = await cvmService.backfillFiles(entity.portalId, entity.id);
      setBackfillResult({ found: res.documentsFound, imported: res.documentsImported, errors: res.errors });
    } catch {
      setBackfillError('Falha ao reprocessar documentos. Tente novamente.');
    } finally {
      setBackfilling(false);
    }
  }

  async function handleReprocessRouting() {
    setReroutingRouting(true);
    setReroutingResult(null);
    setReroutingError(null);
    try {
      const res = await cvmService.reprocessRouting(entity.portalId, entity.id);
      setReroutingResult({ found: res.documentsFound, imported: res.documentsImported, errors: res.errors });
    } catch {
      setReroutingError('Falha ao reprocessar roteamento. Tente novamente.');
    } finally {
      setReroutingRouting(false);
    }
  }

  async function toggleStatus() {
    const next: EntityStatus = status === 'ativo' ? 'pausado' : 'ativo';
    try {
      await cvmService.updateStatus(entity.portalId, entity.id, { status: next });
      setStatus(next);
    } catch {
      // keep previous status on failure
    }
  }

  async function persistImportDate(date: string) {
    try {
      await cvmService.updateImportDate(entity.portalId, entity.id, { importarDesde: date || null });
    } catch {
      // silent — field remains editable
    }
  }

  // TEMPORARY (Phase 2 step 1): proves the real dados.cvm.gov.br pipeline
  // works for this entity's CNPJ/código CVM before the real importer exists.
  async function handleTestFetch() {
    setTesting(true);
    setTestError(null);
    setTestResult(null);
    try {
      const res = await cvmService.testFetch(entity.cnpj, entity.cvmCode);
      setTestResult(res);
    } catch (e) {
      setTestError(e instanceof Error ? e.message : 'Falha ao testar busca CVM.');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className={`cvm-entity-card${isErro ? ' cvm-entity-card--error' : !isAtivo ? ' cvm-entity-card--paused' : ''}`}>
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
            <span className="cvm-toggle__label">{isErro ? 'Erro' : isAtivo ? 'Ativo' : 'Pausado'}</span>
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
          <DatePicker
            value={importDate}
            onChange={(date) => { setImportDate(date); persistImportDate(date); }}
            disabled={!isAtivo}
          />
        </div>
      </div>

      {syncError && <p className="cvm-error-msg">{syncError}</p>}
      {importError && <p className="cvm-error-msg">{importError}</p>}
      {backfillError && <p className="cvm-error-msg">{backfillError}</p>}
      {reroutingError && <p className="cvm-error-msg">{reroutingError}</p>}
      {importResult && (
        <p className="cvm-import-result">
          {importResult.found} documento{importResult.found !== 1 ? 's' : ''} encontrado{importResult.found !== 1 ? 's' : ''} na CVM ·{' '}
          {importResult.imported} importado{importResult.imported !== 1 ? 's' : ''}
          {importResult.errors.length > 0 && <> · {importResult.errors.join(' ')}</>}
        </p>
      )}
      {backfillResult && (
        <p className="cvm-import-result">
          {backfillResult.found} documento{backfillResult.found !== 1 ? 's' : ''} pendente{backfillResult.found !== 1 ? 's' : ''} ·{' '}
          {backfillResult.imported} arquivo{backfillResult.imported !== 1 ? 's' : ''} baixado{backfillResult.imported !== 1 ? 's' : ''} agora
          {backfillResult.errors.length > 0 && <> · {backfillResult.errors.join(' ')}</>}
        </p>
      )}
      {reroutingResult && (
        <p className="cvm-import-result">
          {reroutingResult.found} documento{reroutingResult.found !== 1 ? 's' : ''} verificado{reroutingResult.found !== 1 ? 's' : ''} ·{' '}
          {reroutingResult.imported} movido{reroutingResult.imported !== 1 ? 's' : ''} para o destino atual
          {reroutingResult.errors.length > 0 && <> · {reroutingResult.errors.join(' ')}</>}
        </p>
      )}

      <RoutingSection portalId={entity.portalId} empresaId={entity.id} initialRouting={entity.routing} discoveredCategories={entity.discoveredCategories} />

      <div className="cvm-entity-card__footer">
        <span className="cvm-entity-card__sync-info">
          {!isAtivo ? (
            <span className="cvm-entity-card__sync-info--paused">Importação pausada</span>
          ) : lastSyncedAt ? (
            <>última sincronização: <strong>{new Date(lastSyncedAt).toLocaleString('pt-BR')}</strong></>
          ) : (
            <span className="cvm-entity-card__sync-info--paused">Ainda não sincronizado</span>
          )}
        </span>
        <div className="cvm-entity-card__footer-actions">
          <button
            className="btn-outline-sm"
            type="button"
            onClick={handleSync}
            disabled={syncing || !isAtivo}
            title="Verificar novos documentos na base da CVM"
          >
            {syncing
              ? <><span className="cvm-spin" />Verificando…</>
              : <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Verificar agora
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
          <button
            className="btn-outline-sm"
            type="button"
            onClick={handleBackfill}
            disabled={backfilling || !isAtivo}
            title="Tenta baixar como arquivo os documentos que hoje aparecem como link externo"
          >
            {backfilling
              ? <><span className="cvm-spin" />Reprocessando…</>
              : 'Reprocessar links externos'
            }
          </button>
          <button
            className="btn-outline-sm"
            type="button"
            onClick={handleReprocessRouting}
            disabled={reroutingRouting || !isAtivo}
            title="Move documentos já importados para o destino atual configurado em Auto CVM, sem re-baixar nada da CVM"
          >
            {reroutingRouting
              ? <><span className="cvm-spin" />Reprocessando…</>
              : 'Reprocessar roteamento'
            }
          </button>
          <button
            className="btn-outline-sm"
            type="button"
            onClick={handleTestFetch}
            disabled={testing || !entity.cnpj}
            title="TEMPORÁRIO: testar busca real na base aberta da CVM (dados.cvm.gov.br)"
          >
            {testing ? <><span className="cvm-spin" />Testando…</> : 'Testar busca CVM'}
          </button>
        </div>
      </div>

      {testError && <p className="cvm-error-msg">{testError}</p>}
      {testResult !== null && (
        <pre style={{
          marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-bg-light, #f4f4f4)',
          borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', overflowX: 'auto', maxHeight: 320,
        }}>
          {JSON.stringify(testResult, null, 2)}
        </pre>
      )}
    </div>
  );
}

function PortalAccordion({ portal }: { portal: CvmPortal }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="cvm-accordion">
      <button className="cvm-accordion__header" type="button" onClick={() => setOpen(v => !v)}>
        <div className="cvm-accordion__title-group">
          <span className="cvm-group__name">{portal.nome}</span>
          <span className="cvm-group__count">
            {portal.entidades.length} entidade{portal.entidades.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="cvm-accordion__actions">
          <ChevronIcon open={open} />
        </div>
      </button>
      {open && (
        <div className="cvm-accordion__body">
          {portal.entidades.length === 0 ? (
            <div className="cvm-group__empty">
              <p>Nenhuma empresa com Auto CVM ativado neste portal.</p>
            </div>
          ) : (
            <div className="cvm-entity-list cvm-entity-list--ingroup">
              {portal.entidades.map((entity) => (
                <EntityCard key={entity.id} entity={entity} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AutoCvmPage() {
  const { user } = useAuth();

  const [portais, setPortais] = useState<CvmPortal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cvmService.listPortais()
      .then(data => {
        // Auto CVM is scoped to whichever portal is active in the topbar
        // switcher — same as every other Gestão/Conteúdo/Relacionamento/
        // Personalizar page. super_admin can access any portal (via that
        // switcher) but never sees more than one portal's data at once,
        // exactly like a client_user would.
        const filtered = data.filter(p => p.portalKey === user?.activePortalId);
        setPortais(filtered);
        setLoading(false);
      })
      .catch(() => { setError('Falha ao carregar dados da CVM.'); setLoading(false); });
  }, [user?.activePortalId]);

  return (
    <div className="page cvm-page">

      <StickyPageHeader
        title="Auto CVM"
        description={
          <>
            Documentos publicados na CVM são importados automaticamente pelo <strong>CNPJ</strong>{' '}
            de cada empresa — apenas canais regulatórios. A Central de Resultados é gerida manualmente.
            Para conectar uma nova empresa, ative o Auto CVM em{' '}
            <Link to="/portal/empresas">Empresas</Link>.
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
              <p>Nenhuma empresa com Auto CVM ativado.</p>
            </div>
          ) : portais.length === 1 ? (
            /* Single portal: flat entity list */
            <div className="cvm-entity-list">
              {portais[0].entidades.length === 0 ? (
                <div className="cvm-empty">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  <p>Nenhuma empresa com Auto CVM ativado neste portal.</p>
                </div>
              ) : portais[0].entidades.map(entity => (
                <EntityCard key={entity.id} entity={entity} />
              ))}
            </div>
          ) : (
            /* Multiple portals: accordion per portal */
            <div className="cvm-groups">
              {portais.map(portal => (
                <PortalAccordion key={portal.id} portal={portal} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
