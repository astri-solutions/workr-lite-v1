import { useState, useEffect } from 'react';
import './AdminPages.css';
import './AutoCvmPage.css';
import StickyPageHeader from '../../components/StickyPageHeader';
import { useAuth } from '../../contexts/AuthContext';

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

type EntityStatus = 'ativo' | 'pausado' | 'erro';

interface CvmEntity {
  id: string;
  nome: string;
  tipo: 'empresa' | 'fundo';
  cnpj: string;
  cvmCode: string;
  status: EntityStatus;
  importarDesde: string;
  ultimaSync: string;
}

interface Portal {
  id: string;
  nome: string;
  entidades: CvmEntity[];
}

const PORTAIS: Portal[] = [
  {
    id: 'imc',
    nome: 'International Meal Company',
    entidades: [
      {
        id: '1',
        nome: 'International Meal Company',
        tipo: 'empresa',
        cnpj: '17.314.329/0001-20',
        cvmCode: '23574',
        status: 'ativo',
        importarDesde: '01/01/2024',
        ultimaSync: 'hoje 08:12',
      },
      {
        id: '2',
        nome: 'IMC Recebíveis FII',
        tipo: 'fundo',
        cnpj: '44.123.456/0001-77',
        cvmCode: '45012',
        status: 'ativo',
        importarDesde: '01/06/2025',
        ultimaSync: 'hoje 08:12',
      },
      {
        id: '3',
        nome: 'IMC Crédito Estruturado FII',
        tipo: 'fundo',
        cnpj: '44.987.654/0001-11',
        cvmCode: '45990',
        status: 'pausado',
        importarDesde: '',
        ultimaSync: '—',
      },
    ],
  },
  {
    id: 'aurora',
    nome: 'Construtora Aurora',
    entidades: [
      {
        id: '4',
        nome: 'Construtora Aurora S.A.',
        tipo: 'empresa',
        cnpj: '12.345.678/0001-90',
        cvmCode: '18920',
        status: 'ativo',
        importarDesde: '01/01/2023',
        ultimaSync: 'hoje 08:05',
      },
    ],
  },
  {
    id: 'vetra',
    nome: 'Vetra Energia',
    entidades: [],
  },
];


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

function EntityCard({ entity }: { entity: CvmEntity }) {
  const [status, setStatus] = useState<EntityStatus>(entity.status);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(() => Date.now() - 2 * 60_000); // simulate synced 2 min ago
  const [importDate, setImportDate] = useState(() => {
    if (!entity.importarDesde) return '';
    const [d, m, y] = entity.importarDesde.split('/');
    return y && m && d ? `${y}-${m}-${d}` : '';
  });

  const isAtivo = status === 'ativo';

  function handleSync() {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setLastSyncedAt(Date.now());
    }, 2200);
  }

  function handleImport() {
    setImporting(true);
    setTimeout(() => setImporting(false), 3000);
  }

  function toggleStatus() {
    setStatus((s) => (s === 'ativo' ? 'pausado' : 'ativo'));
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
            disabled={!isAtivo}
          />
        </div>
      </div>

      <div className="cvm-entity-card__footer">
        <span className="cvm-entity-card__sync-info">
          {isAtivo ? (
            <>
              varredura automática a cada <strong>10 min</strong>
              {entity.ultimaSync !== '—' && (
                <> · última: <strong>{entity.ultimaSync}</strong></>
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

function PortalAccordion({ portal }: { portal: Portal }) {
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [entities, setEntities] = useState<CvmEntity[]>(portal.entidades);
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState<NewEntityForm>(EMPTY_NEW_ENTITY);

  function handleSync(e: React.MouseEvent) {
    e.stopPropagation();
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2200);
  }

  function handleAdd() {
    if (!form.nome.trim() || !form.cnpj.trim() || !form.cvmCode.trim()) return;
    const entity: CvmEntity = {
      id: String(Date.now()),
      nome: form.nome.trim(),
      tipo: form.tipo,
      cnpj: form.cnpj.trim(),
      cvmCode: form.cvmCode.trim(),
      status: 'ativo',
      importarDesde: form.importarDesde,
      ultimaSync: '—',
    };
    setEntities(prev => [...prev, entity]);
    setForm(EMPTY_NEW_ENTITY);
    setAddModal(false);
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
                  <EntityCard key={entity.id} entity={entity} />
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
                disabled={!form.nome.trim() || !form.cnpj.trim() || !form.cvmCode.trim()}>
                Adicionar e ativar
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
  const isAdmin = user?.role === 'super_admin';

  const [portalId, setPortalId] = useState('');

  const clientPortal = PORTAIS[0];
  const selectedPortal = isAdmin
    ? (portalId ? PORTAIS.find((p) => p.id === portalId) : null)
    : clientPortal;

  const visibleEntidades = selectedPortal
    ? selectedPortal.entidades
    : PORTAIS.flatMap((p) => p.entidades);

  return (
    <div className="page cvm-page">

      {/* ── Header ── */}
      <StickyPageHeader
        title="Auto CVM"
        description={
          isAdmin ? (
            <>
              Importação automática de documentos da CVM, configurada pela Workr — para{' '}
              <strong>empresas listadas</strong> e <strong>fundos de gestoras</strong>. A conexão é
              pelo <strong>CNPJ</strong>: todo documento publicado com aquele CNPJ é reconhecido e
              alimenta o site (apenas canais regulatórios; a Central de Resultados é manual). O
              cliente não edita isto — vê só a marcação "Auto CVM".
            </>
          ) : (
            <>
              Documentos publicados na CVM são importados automaticamente pelo <strong>CNPJ</strong>{' '}
              de cada entidade — apenas canais regulatórios. A Central de Resultados é gerida manualmente.
            </>
          )
        }
        action={undefined}
      />

      {/* ── Portal selector (admin only) ── */}
      {isAdmin && (
        <div className="cvm-section">
          <label className="cvm-label" htmlFor="portal-select">Portal</label>
          <select
            id="portal-select"
            className="cvm-select"
            value={portalId}
            onChange={(e) => setPortalId(e.target.value)}
          >
            <option value="">Todos os portais</option>
            {PORTAIS.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Entities ── */}
      <div className="cvm-entities-header">
        <h2 className="cvm-entities-title">Entidades conectadas (por CNPJ)</h2>
      </div>

      {visibleEntidades.length === 0 && selectedPortal ? (
        <div className="cvm-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p>Nenhuma entidade conectada neste portal.</p>
        </div>
      ) : (!isAdmin || selectedPortal) ? (
        /* ── Single portal view: flat list ── */
        <div className="cvm-entity-list">
          {visibleEntidades.map((entity) => (
            <EntityCard key={entity.id} entity={entity} />
          ))}
        </div>
      ) : (
        /* ── All portals (admin): accordion per portal ── */
        <div className="cvm-groups">
          {PORTAIS.map((portal) => (
            <PortalAccordion key={portal.id} portal={portal} />
          ))}
        </div>
      )}
    </div>
  );
}
