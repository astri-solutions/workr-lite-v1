import { useState } from 'react';
import Modal from '../../components/Modal';
import './CentralDeResultadosPage.css';

interface Entity {
  id: string;
  name: string;
  tipo: 'EMPRESA' | 'FUNDO';
}

const ENTITIES: Entity[] = [
  { id: 'imc', name: 'International Meal Company', tipo: 'EMPRESA' },
  { id: 'imc-fii', name: 'IMC Recebíveis FII', tipo: 'FUNDO' },
  { id: 'imc-ce', name: 'IMC Crédito Estruturado FII', tipo: 'FUNDO' },
];

interface Quarter {
  id: string;
  period: string;
  totalDocs: number;
  publishedDocs: number;
}

const QUARTERS_BY_ENTITY: Record<string, Quarter[]> = {
  imc: [
    { id: '2t25', period: '2T25', totalDocs: 1, publishedDocs: 1 },
    { id: '1t25', period: '1T25', totalDocs: 3, publishedDocs: 2 },
    { id: '4t24', period: '4T24', totalDocs: 4, publishedDocs: 4 },
    { id: '3t24', period: '3T24', totalDocs: 1, publishedDocs: 1 },
    { id: '4t23', period: '4T23', totalDocs: 1, publishedDocs: 1 },
  ],
  'imc-fii': [],
  'imc-ce': [],
};

function parsePeriod(period: string): { quarter: string; year: string } {
  const match = period.match(/^(\d)[Tt](\d{2,4})$/);
  if (!match) return { quarter: '', year: '' };
  return { quarter: `${match[1]}T`, year: match[2].length === 2 ? `20${match[2]}` : match[2] };
}

export default function CentralDeResultadosPage() {
  const [activeEntity, setActiveEntity] = useState<string>('imc');
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterQuarter, setFilterQuarter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newPeriod, setNewPeriod] = useState('');
  const [newEntity, setNewEntity] = useState('imc');
  const [quarters, setQuarters] =
    useState<Record<string, Quarter[]>>(QUARTERS_BY_ENTITY);

  const allQuarters = quarters[activeEntity] ?? [];

  const years = [...new Set(allQuarters.map((q) => parsePeriod(q.period).year).filter(Boolean))].sort((a, b) => +b - +a);
  const quarterOptions = ['1T', '2T', '3T', '4T'];

  const currentQuarters = allQuarters.filter((q) => {
    const { quarter, year } = parsePeriod(q.period);
    if (search && !q.period.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterYear && year !== filterYear) return false;
    if (filterQuarter && quarter !== filterQuarter) return false;
    return true;
  });

  function handleAddResult() {
    if (!newPeriod.trim()) return;
    const id = newPeriod.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    const newQ: Quarter = { id, period: newPeriod.trim(), totalDocs: 0, publishedDocs: 0 };
    setQuarters((prev) => ({
      ...prev,
      [newEntity]: [newQ, ...(prev[newEntity] ?? [])],
    }));
    setNewPeriod('');
    setModalOpen(false);
  }

  return (
    <div className="page cdr-page">
      {/* Header */}
      <div className="cdr-header">
        <div className="cdr-header__text">
          <h1 className="cdr-header__title">Central de Resultados</h1>
          <p className="cdr-header__description">
            Resultados de <strong>IMC Investor Relations</strong> · organização{' '}
            <strong>trimestral</strong>.
          </p>
        </div>
        <button
          className="btn-novo-resultado"
          type="button"
          onClick={() => {
            setNewEntity(activeEntity);
            setModalOpen(true);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo resultado
        </button>
      </div>

      {/* Entity selector */}
      <div className="cdr-entities">
        {ENTITIES.map((e) => (
          <button
            key={e.id}
            type="button"
            className={`cdr-entity-card${activeEntity === e.id ? ' cdr-entity-card--active' : ''}`}
            onClick={() => setActiveEntity(e.id)}
          >
            <span className="cdr-entity-card__name">{e.name}</span>
            <span className="cdr-entity-card__tipo">{e.tipo}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="cdr-search-bar">
        <svg className="cdr-search-bar__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          className="cdr-search-bar__input"
          type="text"
          placeholder="Buscar resultado ou documento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="cdr-filters">
        <select
          className="cdr-filter-select"
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
        >
          <option value="">Todos os anos</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          className="cdr-filter-select"
          value={filterQuarter}
          onChange={(e) => setFilterQuarter(e.target.value)}
        >
          <option value="">Todos os trimestres</option>
          {quarterOptions.map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
      </div>

      {/* Accordion list */}
      <div className="cdr-list">
        {currentQuarters.length === 0 ? (
          <div className="cdr-empty">Nenhum resultado encontrado.</div>
        ) : (
          currentQuarters.map((q) => (
            <div key={q.id} className={`cdr-accordion${expandedId === q.id ? ' cdr-accordion--open' : ''}`}>
              <button
                type="button"
                className="cdr-accordion__row"
                onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
              >
                <span className="cdr-accordion__folder">📁</span>
                <span className="cdr-accordion__period">{q.period}</span>
                <span className="cdr-accordion__meta">
                  {q.totalDocs} {q.totalDocs === 1 ? 'doc' : 'docs'} ·{' '}
                  {q.publishedDocs} publicado{q.publishedDocs !== 1 ? 's' : ''}
                </span>
                <span
                  className={`cdr-accordion__chevron${expandedId === q.id ? ' cdr-accordion__chevron--open' : ''}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </button>
              {expandedId === q.id && (
                <div className="cdr-accordion__body">
                  <p className="cdr-accordion__placeholder">
                    Documentos do período <strong>{q.period}</strong> aparecerão aqui.
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo resultado"
        size="sm"
        footer={
          <div className="cdr-modal-footer">
            <button
              type="button"
              className="cdr-modal-footer__cancel"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleAddResult}
              disabled={!newPeriod.trim()}
            >
              Criar resultado
            </button>
          </div>
        }
      >
        <div className="cdr-modal-form">
          <label className="cdr-modal-form__label">
            Período
            <input
              className="cdr-modal-form__input"
              type="text"
              placeholder="ex: 3T25"
              value={newPeriod}
              onChange={(e) => setNewPeriod(e.target.value)}
              autoFocus
            />
          </label>
          <label className="cdr-modal-form__label">
            Entidade
            <select
              className="cdr-modal-form__input"
              value={newEntity}
              onChange={(e) => setNewEntity(e.target.value)}
            >
              {ENTITIES.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Modal>
    </div>
  );
}
