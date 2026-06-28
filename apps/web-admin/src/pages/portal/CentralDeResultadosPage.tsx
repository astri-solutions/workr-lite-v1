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

const QUARTER_OPTIONS = ['1T', '2T', '3T', '4T'];
const IDIOMA_OPTIONS = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
];
const CURRENT_YEAR = 2026;
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => String(CURRENT_YEAR - i));

export default function CentralDeResultadosPage() {
  const [activeEntity, setActiveEntity] = useState<string>('imc');
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterQuarter, setFilterQuarter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [quarters, setQuarters] =
    useState<Record<string, Quarter[]>>(QUARTERS_BY_ENTITY);

  // Modal form state
  const [newEntity, setNewEntity] = useState('imc');
  const [newQuarter, setNewQuarter] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newIdioma, setNewIdioma] = useState('pt');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

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

  function isFormValid() {
    return newEntity && newQuarter && newYear;
  }

  function closeModal() {
    setModalOpen(false);
    setNewEntity(activeEntity);
    setNewQuarter('');
    setNewYear('');
    setNewIdioma('pt');
    setScheduleEnabled(false);
    setScheduleDate('');
    setScheduleTime('');
  }

  function handlePublish() {
    if (!isFormValid()) return;
    const period = `${newQuarter}${newYear.slice(-2)}`;
    const id = `${period.toLowerCase()}-${newEntity}`;
    const newQ: Quarter = { id, period, totalDocs: 0, publishedDocs: 0 };
    setQuarters((prev) => ({
      ...prev,
      [newEntity]: [newQ, ...(prev[newEntity] ?? [])],
    }));
    closeModal();
  }

  function handleSaveDraft() {
    if (!isFormValid()) return;
    const period = `${newQuarter}${newYear.slice(-2)}`;
    const id = `${period.toLowerCase()}-${newEntity}-draft`;
    const newQ: Quarter = { id, period, totalDocs: 0, publishedDocs: 0 };
    setQuarters((prev) => ({
      ...prev,
      [newEntity]: [newQ, ...(prev[newEntity] ?? [])],
    }));
    closeModal();
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
            setNewQuarter('');
            setNewYear('');
            setScheduleEnabled(false);
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
        onClose={closeModal}
        title="Novo resultado"
        size="sm"
        footer={
          <div className="cdr-modal-footer">
            <button
              type="button"
              className="cdr-modal-footer__draft"
              onClick={handleSaveDraft}
              disabled={!isFormValid()}
            >
              Salvar como Rascunho
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handlePublish}
              disabled={!isFormValid()}
            >
              Publicar Resultado
            </button>
          </div>
        }
      >
        <div className="cdr-modal-form">
          {/* Entidade */}
          <label className="cdr-modal-form__label">
            Entidade
            <select
              className="cdr-modal-form__input cdr-modal-form__select"
              value={newEntity}
              onChange={(e) => setNewEntity(e.target.value)}
              autoFocus
            >
              {ENTITIES.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </label>

          {/* Trimestre */}
          <label className="cdr-modal-form__label">
            Trimestre
            <select
              className="cdr-modal-form__input cdr-modal-form__select"
              value={newQuarter}
              onChange={(e) => setNewQuarter(e.target.value)}
            >
              <option value="">Selecionar trimestre</option>
              {QUARTER_OPTIONS.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </label>

          {/* Ano */}
          <label className="cdr-modal-form__label">
            Ano
            <select
              className="cdr-modal-form__input cdr-modal-form__select"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
            >
              <option value="">Selecionar ano</option>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>

          {/* Idioma */}
          <label className="cdr-modal-form__label">
            Idioma
            <select
              className="cdr-modal-form__input cdr-modal-form__select"
              value={newIdioma}
              onChange={(e) => setNewIdioma(e.target.value)}
            >
              {IDIOMA_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </label>

          {/* Agendamento */}
          <div className="cdr-modal-schedule">
            <div className="cdr-modal-schedule__header">
              <div className="cdr-modal-schedule__title-group">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className="cdr-modal-schedule__title">Agendamento</span>
              </div>
              <button
                type="button"
                className={`cdr-modal-schedule__toggle${scheduleEnabled ? ' cdr-modal-schedule__toggle--on' : ''}`}
                onClick={() => setScheduleEnabled((v) => !v)}
                aria-pressed={scheduleEnabled}
              >
                <span className="cdr-modal-schedule__toggle-knob" />
              </button>
            </div>
            {scheduleEnabled && (
              <div className="cdr-modal-schedule__fields">
                <label className="cdr-modal-form__label">
                  Data
                  <input
                    className="cdr-modal-form__input"
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </label>
                <label className="cdr-modal-form__label">
                  Horário
                  <input
                    className="cdr-modal-form__input"
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
