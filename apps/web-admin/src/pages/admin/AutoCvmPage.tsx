import { useState } from 'react';
import './AdminPages.css';
import './AutoCvmPage.css';

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

const STATUS_LABEL: Record<EntityStatus, string> = {
  ativo: 'Ativo',
  pausado: 'Pausado',
  erro: 'Erro',
};

const STATUS_CLASS: Record<EntityStatus, string> = {
  ativo: 'badge badge--success',
  pausado: 'badge badge--error',
  erro: 'badge badge--error',
};

export default function AutoCvmPage() {
  const [portalId, setPortalId] = useState(PORTAIS[0].id);
  const [syncing, setSyncing] = useState(false);

  const portal = PORTAIS.find((p) => p.id === portalId)!;

  function handleSync() {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2200);
  }

  return (
    <div className="page cvm-page">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Auto CVM</h1>
          <p className="page-subtitle cvm-page__desc">
            Importação automática de documentos da CVM, configurada pela Workr — para{' '}
            <strong>empresas listadas</strong> e <strong>fundos de gestoras</strong>. A conexão é
            pelo <strong>CNPJ</strong>: todo documento publicado com aquele CNPJ é reconhecido e
            alimenta o site (apenas canais regulatórios; a Central de Resultados é manual). O
            cliente não edita isto — vê só a marcação "Auto CVM".
          </p>
        </div>
        <button
          className="btn-outline-dark"
          type="button"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <>
              <span className="cvm-spin" />
              Sincronizando…
            </>
          ) : (
            'Sincronizar agora'
          )}
        </button>
      </div>

      {/* ── Portal selector ── */}
      <div className="cvm-section">
        <label className="cvm-label" htmlFor="portal-select">Portal</label>
        <select
          id="portal-select"
          className="cvm-select"
          value={portalId}
          onChange={(e) => setPortalId(e.target.value)}
        >
          {PORTAIS.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      </div>

      {/* ── Entities ── */}
      <div className="cvm-entities-header">
        <h2 className="cvm-entities-title">Entidades conectadas (por CNPJ)</h2>
        <button className="btn-link" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          Buscar e adicionar entidade
        </button>
      </div>

      {portal.entidades.length === 0 ? (
        <div className="cvm-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p>Nenhuma entidade conectada neste portal.</p>
          <p className="cvm-empty__hint">Clique em "+ Buscar e adicionar entidade" para conectar pelo CNPJ.</p>
        </div>
      ) : (
        <div className="cvm-entity-list">
          {portal.entidades.map((entity) => (
            <div key={entity.id} className="cvm-entity-card">

              {/* Card header */}
              <div className="cvm-entity-card__header">
                <div>
                  <h3 className="cvm-entity-card__name">{entity.nome}</h3>
                  <p className="cvm-entity-card__meta">
                    {entity.tipo} · CNPJ {entity.cnpj} · CVM {entity.cvmCode}
                  </p>
                </div>
                <span className={STATUS_CLASS[entity.status]}>
                  {STATUS_LABEL[entity.status]}
                </span>
              </div>

              {/* Fields */}
              <div className="cvm-entity-card__fields">
                <div className="cvm-field">
                  <label className="cvm-field__label">CNPJ (chave de conexão)</label>
                  <input
                    className="cvm-field__input cvm-field__input--readonly"
                    type="text"
                    value={entity.cnpj}
                    readOnly
                  />
                </div>
                <div className="cvm-field">
                  <label className="cvm-field__label">Importar desde (retroativo)</label>
                  <input
                    className="cvm-field__input"
                    type="text"
                    defaultValue={entity.importarDesde}
                    placeholder="dd/mm/aaaa"
                  />
                </div>
              </div>

              {/* Card footer */}
              <div className="cvm-entity-card__footer">
                <span className="cvm-entity-card__sync-info">
                  Casa por CNPJ · incremental a cada 5 min
                  {entity.ultimaSync !== '—' && (
                    <> · última: <strong>{entity.ultimaSync}</strong></>
                  )}
                </span>
                <button className="btn-outline-sm" type="button">
                  Importar histórico
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
