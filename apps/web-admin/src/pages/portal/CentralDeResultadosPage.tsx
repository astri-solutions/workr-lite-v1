import { useState } from 'react';
import Modal from '../../components/Modal';
import StickyPageHeader from '../../components/StickyPageHeader';
import LangTabs from '../../components/LangTabs';
import PORTAL_CONFIG, { ALL_LOCALES, LocaleCode } from '../../portalConfig';
import '../admin/AdminPages.css';
import './CentralDeResultadosPage.css';
import './CalendarioPage.css';

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
  exibirHome: boolean;
}

interface CdrDoc {
  id: string;
  quarterId: string;
  titulo: string;
  tipo: string;
  date: string;
  publishedBy: string;
  status: 'published' | 'draft';
}

const QUARTERS_BY_ENTITY: Record<string, Quarter[]> = {
  imc: [
    { id: '2t25', period: '2T25', totalDocs: 1, publishedDocs: 1, exibirHome: true },
    { id: '1t25', period: '1T25', totalDocs: 3, publishedDocs: 2, exibirHome: false },
    { id: '4t24', period: '4T24', totalDocs: 4, publishedDocs: 4, exibirHome: false },
    { id: '3t24', period: '3T24', totalDocs: 1, publishedDocs: 1, exibirHome: false },
    { id: '4t23', period: '4T23', totalDocs: 1, publishedDocs: 1, exibirHome: false },
  ],
  'imc-fii': [],
  'imc-ce': [],
};

const DOCS_BY_QUARTER: Record<string, CdrDoc[]> = {
  '2t25': [
    { id: 'd1', quarterId: '2t25', titulo: 'Apresentação de Resultados 2T25', tipo: 'apresentacao', date: '2025-08-12', publishedBy: 'Admin', status: 'published' },
  ],
  '1t25': [
    { id: 'd2', quarterId: '1t25', titulo: 'Earnings Release 1T25', tipo: 'earnings', date: '2025-05-14', publishedBy: 'Admin', status: 'published' },
    { id: 'd3', quarterId: '1t25', titulo: 'Demonstrações Financeiras 1T25', tipo: 'dfp', date: '2025-05-14', publishedBy: 'Admin', status: 'published' },
    { id: 'd4', quarterId: '1t25', titulo: 'Apresentação de Resultados 1T25', tipo: 'apresentacao', date: '2025-05-15', publishedBy: 'Admin', status: 'draft' },
  ],
  '4t24': [
    { id: 'd5', quarterId: '4t24', titulo: 'Earnings Release 4T24', tipo: 'earnings', date: '2025-02-20', publishedBy: 'Admin', status: 'published' },
    { id: 'd6', quarterId: '4t24', titulo: 'Apresentação de Resultados 4T24', tipo: 'apresentacao', date: '2025-02-20', publishedBy: 'Admin', status: 'published' },
    { id: 'd7', quarterId: '4t24', titulo: 'DFP 2024', tipo: 'dfp', date: '2025-03-10', publishedBy: 'Admin', status: 'published' },
    { id: 'd8', quarterId: '4t24', titulo: 'Press Release 4T24', tipo: 'press', date: '2025-02-20', publishedBy: 'Admin', status: 'published' },
  ],
  '3t24': [
    { id: 'd9', quarterId: '3t24', titulo: 'Earnings Release 3T24', tipo: 'earnings', date: '2024-11-13', publishedBy: 'Admin', status: 'published' },
  ],
  '4t23': [
    { id: 'd10', quarterId: '4t23', titulo: 'Earnings Release 4T23', tipo: 'earnings', date: '2024-02-15', publishedBy: 'Admin', status: 'published' },
  ],
};

function parsePeriod(period: string): { quarter: string; year: string } {
  const match = period.match(/^(\d)[Tt](\d{2,4})$/);
  if (!match) return { quarter: '', year: '' };
  return { quarter: `${match[1]}T`, year: match[2].length === 2 ? `20${match[2]}` : match[2] };
}

const QUARTER_OPTIONS = ['1T', '2T', '3T', '4T'];
const CURRENT_YEAR = 2026;
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => String(CURRENT_YEAR - i));

const TIPO_OPTIONS = [
  { value: 'earnings',      label: 'Earnings Release', icon: 'article' },
  { value: 'apresentacao',  label: 'Apresentação',     icon: 'slideshow' },
  { value: 'itr',           label: 'ITR',              icon: 'receipt_long' },
  { value: 'dfp',           label: 'DFP',              icon: 'description' },
  { value: 'press',         label: 'Press Release',    icon: 'campaign' },
  { value: 'outros',        label: 'Outros',           icon: 'folder' },
];

const ENABLED_LANGS = ALL_LOCALES.filter(l =>
  (PORTAL_CONFIG.languages as readonly string[]).includes(l.code)
);

type BulkAction = 'publicar' | 'despublicar' | 'excluir';

export default function CentralDeResultadosPage() {
  const [activeEntity, setActiveEntity] = useState<string>('imc');
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterQuarter, setFilterQuarter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [quarters, setQuarters] =
    useState<Record<string, Quarter[]>>(QUARTERS_BY_ENTITY);
  const [docs, setDocs] = useState<Record<string, CdrDoc[]>>(DOCS_BY_QUARTER);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);

  // Modal form state
  const [newEntity, setNewEntity] = useState('imc');
  const [newTitles, setNewTitles] = useState<Record<string, string>>({});
  const [newDate, setNewDate] = useState('');
  const [newPeriodType, setNewPeriodType] = useState<'trimestral' | 'anual'>(
    (PORTAL_CONFIG.orgType as string) === 'anual' ? 'anual' : 'trimestral'
  );
  const [newQuarter, setNewQuarter] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newTipo, setNewTipo] = useState('');
  const [modalLang, setModalLang] = useState<LocaleCode>(PORTAL_CONFIG.languages[0]);
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
    const primaryTitle = newTitles[PORTAL_CONFIG.languages[0]] ?? '';
    const quarterOk = newPeriodType === 'anual' || !!newQuarter;
    return !!(newEntity && primaryTitle.trim() && newDate && newYear && quarterOk && newTipo);
  }

  function closeModal() {
    setModalOpen(false);
    setNewEntity(activeEntity);
    setNewTitles({});
    setNewDate('');
    setNewPeriodType((PORTAL_CONFIG.orgType as string) === 'anual' ? 'anual' : 'trimestral');
    setNewQuarter('');
    setNewYear('');
    setNewTipo('');
    setModalLang(PORTAL_CONFIG.languages[0]);
    setScheduleEnabled(false);
    setScheduleDate('');
    setScheduleTime('');
  }

  function toggleQuarterHome(id: string) {
    setQuarters(prev => ({
      ...prev,
      [activeEntity]: (prev[activeEntity] ?? []).map(q => q.id === id ? { ...q, exibirHome: !q.exibirHome } : q),
    }));
  }

  function fmtDate(iso: string) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function tipoIcon(tipo: string) {
    return TIPO_OPTIONS.find(t => t.value === tipo)?.icon ?? 'description';
  }

  function tipoLabel(tipo: string) {
    return TIPO_OPTIONS.find(t => t.value === tipo)?.label ?? tipo;
  }

  function toggleDocStatus(quarterId: string, docId: string) {
    setDocs(prev => ({
      ...prev,
      [quarterId]: (prev[quarterId] ?? []).map(d =>
        d.id === docId ? { ...d, status: d.status === 'published' ? 'draft' : 'published' } : d
      ),
    }));
  }

  function removeDoc(quarterId: string, docId: string) {
    setDocs(prev => ({
      ...prev,
      [quarterId]: (prev[quarterId] ?? []).filter(d => d.id !== docId),
    }));
  }

  function toggleSelectDoc(docId: string) {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId); else next.add(docId);
      return next;
    });
  }

  function toggleSelectAll(_quarterId: string, allIds: string[]) {
    const allSelected = allIds.every(id => selectedDocs.has(id));
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (allSelected) allIds.forEach(id => next.delete(id));
      else allIds.forEach(id => next.add(id));
      return next;
    });
  }

  function executeBulkAction(action: BulkAction) {
    if (action === 'excluir') {
      setDocs(prev => {
        const next = { ...prev };
        for (const qid of Object.keys(next)) {
          next[qid] = next[qid].filter(d => !selectedDocs.has(d.id));
        }
        return next;
      });
    } else {
      const targetStatus = action === 'publicar' ? 'published' : 'draft';
      setDocs(prev => {
        const next = { ...prev };
        for (const qid of Object.keys(next)) {
          next[qid] = next[qid].map(d => selectedDocs.has(d.id) ? { ...d, status: targetStatus } : d);
        }
        return next;
      });
    }
    setSelectedDocs(new Set());
    setConfirmAction(null);
  }

  const confirmLabels: Record<BulkAction, { title: string; body: string; btn: string; btnClass: string }> = {
    publicar: {
      title: 'Publicar documentos',
      body: `Deseja publicar ${selectedDocs.size} documento${selectedDocs.size !== 1 ? 's' : ''} selecionado${selectedDocs.size !== 1 ? 's' : ''}?`,
      btn: 'Publicar',
      btnClass: 'btn-primary',
    },
    despublicar: {
      title: 'Despublicar documentos',
      body: `Deseja despublicar ${selectedDocs.size} documento${selectedDocs.size !== 1 ? 's' : ''} selecionado${selectedDocs.size !== 1 ? 's' : ''}? Eles ficarão como rascunho.`,
      btn: 'Despublicar',
      btnClass: 'btn-outline',
    },
    excluir: {
      title: 'Excluir documentos',
      body: `Deseja excluir ${selectedDocs.size} documento${selectedDocs.size !== 1 ? 's' : ''} selecionado${selectedDocs.size !== 1 ? 's' : ''}? Esta ação não pode ser desfeita.`,
      btn: 'Excluir',
      btnClass: 'btn-outline btn-outline--danger',
    },
  };

  function buildPeriod() {
    return newPeriodType === 'anual' ? newYear : `${newQuarter}${newYear.slice(-2)}`;
  }

  function handlePublish() {
    if (!isFormValid()) return;
    const period = buildPeriod();
    const id = `${period.toLowerCase()}-${newEntity}-${Date.now()}`;
    const newQ: Quarter = { id, period, totalDocs: 0, publishedDocs: 0, exibirHome: false };
    setQuarters((prev) => ({ ...prev, [newEntity]: [newQ, ...(prev[newEntity] ?? [])] }));
    closeModal();
  }

  function handleSaveDraft() {
    if (!isFormValid()) return;
    const period = buildPeriod();
    const id = `${period.toLowerCase()}-${newEntity}-draft-${Date.now()}`;
    const newQ: Quarter = { id, period, totalDocs: 0, publishedDocs: 0, exibirHome: false };
    setQuarters((prev) => ({ ...prev, [newEntity]: [newQ, ...(prev[newEntity] ?? [])] }));
    closeModal();
  }

  return (
    <div className="page cdr-page">
      <StickyPageHeader
        title="Central de Resultados"
        description={<>Resultados de <strong>{PORTAL_CONFIG.name}</strong> · organização <strong>{PORTAL_CONFIG.orgType}</strong>.</>}
        action={
          <button
            className="btn-primary"
            type="button"
            onClick={() => {
              setNewEntity(activeEntity);
              setNewQuarter('');
              setNewYear('');
              setScheduleEnabled(false);
              setModalOpen(true);
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
            Novo resultado
          </button>
        }
      />

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

      {/* Toolbar: filters left · actions right */}
      <div className="toolbar">
        <div className="toolbar__filters">
          <div className="mat-search-wrap">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>search</span>
            <input
              className="mat-search"
              type="text"
              placeholder="Pesquisar por título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-wrap">
            <select className="filter-select" value={filterQuarter} onChange={(e) => setFilterQuarter(e.target.value)}>
              <option value="">Trimestre</option>
              {quarterOptions.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
            <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
          </div>
          <div className="filter-wrap">
            <select className="filter-select" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
              <option value="">Ano</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
          </div>
        </div>
        <div className="toolbar__actions">
          <button className="btn-toolbar" type="button" disabled={selectedDocs.size === 0} onClick={() => setConfirmAction('despublicar')}>Despublicar</button>
          <button className="btn-toolbar btn-toolbar--success" type="button" disabled={selectedDocs.size === 0} onClick={() => setConfirmAction('publicar')}>Publicar</button>
          <button className="btn-toolbar btn-toolbar--danger" type="button" disabled={selectedDocs.size === 0} onClick={() => setConfirmAction('excluir')}>Excluir</button>
          <span className="toolbar__count">{selectedDocs.size > 0 ? `${selectedDocs.size} selecionado${selectedDocs.size !== 1 ? 's' : ''}` : `${currentQuarters.length} resultado${currentQuarters.length !== 1 ? 's' : ''}`}</span>
        </div>
      </div>

      {/* Accordion list grouped by year */}
      <div className="cdr-list">
        {currentQuarters.length === 0 ? (
          <div className="cdr-empty">Nenhum resultado encontrado.</div>
        ) : (
          (() => {
            const byYear: { year: string; quarters: typeof currentQuarters }[] = [];
            for (const q of currentQuarters) {
              const { year } = parsePeriod(q.period);
              const existing = byYear.find((g) => g.year === year);
              if (existing) existing.quarters.push(q);
              else byYear.push({ year, quarters: [q] });
            }
            return byYear.map((group) => (
              <div key={group.year} className="cdr-year-group">
                <div className="cdr-year-label">{group.year}</div>
                {group.quarters.map((q) => (
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
                      <button
                        type="button"
                        className={`cal-home-toggle${q.exibirHome ? ' cal-home-toggle--on' : ''}`}
                        onClick={(e) => { e.stopPropagation(); toggleQuarterHome(q.id); }}
                        title={q.exibirHome ? 'Remover da home' : 'Exibir na home'}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>home</span>
                        {q.exibirHome ? 'Na home' : 'Home'}
                      </button>
                      <span
                        className={`cdr-accordion__chevron${expandedId === q.id ? ' cdr-accordion__chevron--open' : ''}`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
                      </span>
                    </button>
                    {expandedId === q.id && (
                      <div className="cdr-accordion__body">
                        {(docs[q.id] ?? []).length === 0 ? (
                          <p className="cdr-accordion__placeholder">
                            Documentos do período <strong>{q.period}</strong> aparecerão aqui.
                          </p>
                        ) : (
                          <table className="cdr-doc-table">
                            <thead>
                              <tr>
                                <th className="cdr-doc-table__th cdr-doc-table__th--check">
                                  <input
                                    type="checkbox"
                                    className="cdr-checkbox"
                                    checked={(docs[q.id] ?? []).length > 0 && (docs[q.id] ?? []).every(d => selectedDocs.has(d.id))}
                                    onChange={() => toggleSelectAll(q.id, (docs[q.id] ?? []).map(d => d.id))}
                                  />
                                </th>
                                <th className="cdr-doc-table__th">Documento</th>
                                <th className="cdr-doc-table__th">Tipo</th>
                                <th className="cdr-doc-table__th">Data</th>
                                <th className="cdr-doc-table__th">Publicado por</th>
                                <th className="cdr-doc-table__th">Status</th>
                                <th className="cdr-doc-table__th cdr-doc-table__th--actions" />
                              </tr>
                            </thead>
                            <tbody>
                              {(docs[q.id] ?? []).map(doc => (
                                <tr key={doc.id} className={`cdr-doc-table__row${selectedDocs.has(doc.id) ? ' cdr-doc-table__row--selected' : ''}`}>
                                  <td className="cdr-doc-table__td cdr-doc-table__td--check">
                                    <input
                                      type="checkbox"
                                      className="cdr-checkbox"
                                      checked={selectedDocs.has(doc.id)}
                                      onChange={() => toggleSelectDoc(doc.id)}
                                    />
                                  </td>
                                  <td className="cdr-doc-table__td cdr-doc-table__td--title">
                                    <span className="material-symbols-outlined cdr-doc-item__icon">{tipoIcon(doc.tipo)}</span>
                                    {doc.titulo}
                                  </td>
                                  <td className="cdr-doc-table__td cdr-doc-table__td--meta">{tipoLabel(doc.tipo)}</td>
                                  <td className="cdr-doc-table__td cdr-doc-table__td--meta">{fmtDate(doc.date)}</td>
                                  <td className="cdr-doc-table__td cdr-doc-table__td--meta">{doc.publishedBy}</td>
                                  <td className="cdr-doc-table__td">
                                    <span className={`badge ${doc.status === 'published' ? 'badge--success' : 'badge--gray'}`}>
                                      {doc.status === 'published' ? 'Publicado' : 'Rascunho'}
                                    </span>
                                  </td>
                                  <td className="cdr-doc-table__td cdr-doc-table__td--actions">
                                    <div className="table-actions">
                                      <button className="btn-action btn-action--enter" type="button">Editar</button>
                                      <button
                                        className={`btn-action ${doc.status === 'published' ? 'btn-action--secondary' : 'btn-action--activate'}`}
                                        type="button"
                                        onClick={() => toggleDocStatus(q.id, doc.id)}
                                      >
                                        {doc.status === 'published' ? 'Despublicar' : 'Publicar'}
                                      </button>
                                      <button className="btn-action btn-action--danger" type="button" onClick={() => { if (window.confirm(`Excluir "${doc.titulo}"? Esta ação não pode ser desfeita.`)) removeDoc(q.id, doc.id); }}>Excluir</button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ));
          })()
        )}
      </div>

      {/* Bulk action confirmation modal */}
      <Modal
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        title={confirmAction ? confirmLabels[confirmAction].title : ''}
        size="sm"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={() => setConfirmAction(null)}>Cancelar</button>
            <button
              type="button"
              className={confirmAction ? confirmLabels[confirmAction].btnClass : 'btn-primary'}
              onClick={() => confirmAction && executeBulkAction(confirmAction)}
            >
              {confirmAction ? confirmLabels[confirmAction].btn : ''}
            </button>
          </div>
        }
      >
        <p style={{ margin: 0, color: 'var(--color-gray-600)', fontSize: 'var(--text-sm)' }}>
          {confirmAction ? confirmLabels[confirmAction].body : ''}
        </p>
      </Modal>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Novo resultado"
        size="sm"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={handleSaveDraft} disabled={!isFormValid()}>
              Salvar como Rascunho
            </button>
            <button type="button" className="btn-primary" onClick={handlePublish} disabled={!isFormValid()}>
              Publicar Resultado
            </button>
          </div>
        }
      >
        {/* Language tabs */}
        {ENABLED_LANGS.length > 1 && (
          <LangTabs active={modalLang} onChange={setModalLang} />
        )}

        {(() => {
          const isPrimary = modalLang === PORTAL_CONFIG.languages[0];
          const locked = !isPrimary;
          return (
            <div className="cdr-modal-form">
              {/* Título (per language) */}
              <label className="cdr-modal-form__label" key={modalLang}>
                Título
                <input
                  className="cdr-modal-form__input lang-fade"
                  type="text"
                  placeholder="Ex: Resultado do 2º Trimestre 2026"
                  value={newTitles[modalLang] ?? ''}
                  onChange={(e) => setNewTitles(prev => ({ ...prev, [modalLang]: e.target.value }))}
                  autoFocus
                />
              </label>

              {/* Locked notice + shared fields */}
              {locked && (
                <div className="modal-locked-notice">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Campos comuns já definidos no idioma principal
                </div>
              )}

              <div className={locked ? 'modal-locked-group' : ''}>
                {/* Entidade — only if more than one */}
                {ENTITIES.length > 1 && (
                  <label className="cdr-modal-form__label">
                    Entidade
                    <select
                      className="cdr-modal-form__input cdr-modal-form__select"
                      value={newEntity}
                      onChange={(e) => setNewEntity(e.target.value)}
                      disabled={locked}
                    >
                      {ENTITIES.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </label>
                )}

                {/* Data */}
                <label className="cdr-modal-form__label">
                  Data de divulgação
                  <input
                    className="cdr-modal-form__input"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    disabled={locked}
                  />
                </label>

                {/* Período: trimestral / anual */}
                <div className="cdr-modal-form__label">
                  Período
                  <div className="cdr-period-toggle">
                    <button
                      type="button"
                      className={`cdr-period-toggle__btn${newPeriodType === 'trimestral' ? ' cdr-period-toggle__btn--active' : ''}`}
                      onClick={() => !locked && setNewPeriodType('trimestral')}
                      disabled={locked}
                    >Trimestral</button>
                    <button
                      type="button"
                      className={`cdr-period-toggle__btn${newPeriodType === 'anual' ? ' cdr-period-toggle__btn--active' : ''}`}
                      onClick={() => !locked && setNewPeriodType('anual')}
                      disabled={locked}
                    >Anual</button>
                  </div>
                </div>

                {/* Trimestre + Ano */}
                <div className="cdr-modal-form__row">
                  {newPeriodType === 'trimestral' && (
                    <label className="cdr-modal-form__label">
                      Trimestre
                      <select
                        className="cdr-modal-form__input cdr-modal-form__select"
                        value={newQuarter}
                        onChange={(e) => setNewQuarter(e.target.value)}
                        disabled={locked}
                      >
                        <option value="">Selecionar</option>
                        {QUARTER_OPTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
                      </select>
                    </label>
                  )}
                  <label className="cdr-modal-form__label">
                    Ano
                    <select
                      className="cdr-modal-form__input cdr-modal-form__select"
                      value={newYear}
                      onChange={(e) => setNewYear(e.target.value)}
                      disabled={locked}
                    >
                      <option value="">Selecionar</option>
                      {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </label>
                </div>

                {/* Tipo */}
                <div className="cdr-modal-form__label">
                  Tipo
                  <div className="cdr-tipo-grid">
                    {TIPO_OPTIONS.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        className={`cdr-tipo-btn${newTipo === t.value ? ' cdr-tipo-btn--active' : ''}`}
                        onClick={() => !locked && setNewTipo(t.value)}
                        disabled={locked}
                      >
                        <span className="material-symbols-outlined cdr-tipo-btn__icon">{t.icon}</span>
                        <span className="cdr-tipo-btn__label">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Agendamento */}
                <div className="cdr-modal-schedule">
                  <div className="cdr-modal-schedule__header">
                    <div className="cdr-modal-schedule__title-group">
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>schedule</span>
                      <span className="cdr-modal-schedule__title">Agendamento</span>
                    </div>
                    <button
                      type="button"
                      className={`cdr-modal-schedule__toggle${scheduleEnabled ? ' cdr-modal-schedule__toggle--on' : ''}`}
                      onClick={() => !locked && setScheduleEnabled((v) => !v)}
                      aria-pressed={scheduleEnabled}
                      disabled={locked}
                    >
                      <span className="cdr-modal-schedule__toggle-knob" />
                    </button>
                  </div>
                  {scheduleEnabled && (
                    <div className="cdr-modal-schedule__fields">
                      <label className="cdr-modal-form__label">
                        Data
                        <input className="cdr-modal-form__input" type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} disabled={locked} />
                      </label>
                      <label className="cdr-modal-form__label">
                        Horário
                        <input className="cdr-modal-form__input" type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} disabled={locked} />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
