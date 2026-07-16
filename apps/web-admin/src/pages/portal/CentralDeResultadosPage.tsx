import { useState, useEffect, useCallback } from 'react';
import Modal from '../../components/Modal';
import StickyPageHeader from '../../components/StickyPageHeader';
import LangTabs from '../../components/LangTabs';
import SearchInput from '../../components/SearchInput';
import SortIcon from '../../components/SortIcon';
import { useSort } from '../../hooks/useSort';
import PORTAL_CONFIG, { ALL_LOCALES, LocaleCode } from '../../portalConfig';
import { usePortalName } from '../../hooks/usePortalName';
import { useAuth } from '../../contexts/AuthContext';
import { resolvePortalId } from '../../lib/portalDb';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import '../admin/AdminPages.css';
import './CentralDeResultadosPage.css';
import './CalendarioPage.css';

interface Entity {
  id: string;
  name: string;
  tipo: 'EMPRESA' | 'FUNDO';
}

function loadEntities(portalId?: string): Entity[] {
  try {
    const raw = localStorage.getItem(`portal_empresas_${portalId ?? 'default'}`);
    if (!raw) return [];
    const items: Array<{ id: string; nome?: string; name?: string; tipo?: string }> = JSON.parse(raw);
    return items.map(e => ({
      id: e.id,
      name: e.nome ?? e.name ?? e.id,
      tipo: (e.tipo === 'FUNDO' ? 'FUNDO' : 'EMPRESA') as 'EMPRESA' | 'FUNDO',
    }));
  } catch { return []; }
}

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

function parsePeriod(period: string): { quarter: string; year: string } {
  const match = period.match(/^(\d)[Tt](\d{2,4})$/);
  if (!match) {
    // anual format: just a year like "2026"
    if (/^\d{4}$/.test(period)) return { quarter: '', year: period };
    return { quarter: '', year: '' };
  }
  return { quarter: `${match[1]}T`, year: match[2].length === 2 ? `20${match[2]}` : match[2] };
}

const QUARTER_OPTIONS = ['1T', '2T', '3T', '4T'];
const CURRENT_YEAR = 2026;
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => String(CURRENT_YEAR + 1 - i));

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

interface QuarterDocTableProps {
  quarterId: string;
  docs: CdrDoc[];
  selectedDocs: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: (quarterId: string, ids: string[]) => void;
  onToggleStatus: (docId: string, currentStatus: string) => void;
  onRemove: (docId: string) => void;
  tipoIcon: (tipo: string) => string;
  tipoLabel: (tipo: string) => string;
  fmtDate: (iso: string) => string;
}

function QuarterDocTable({
  quarterId, docs, selectedDocs,
  onToggleSelect, onToggleAll, onToggleStatus, onRemove,
  tipoIcon, tipoLabel, fmtDate,
}: QuarterDocTableProps) {
  const { sorted, col, dir, toggle } = useSort<CdrDoc>(docs, 'date', 'desc');
  const allSelected = docs.length > 0 && docs.every(d => selectedDocs.has(d.id));

  return (
    <div className="cdr-doc-table-wrap">
      <table className="cdr-doc-table">
        <thead>
          <tr>
            <th className="cdr-doc-table__th cdr-doc-table__th--check">
              <input
                type="checkbox"
                className="cdr-checkbox"
                checked={allSelected}
                onChange={() => onToggleAll(quarterId, docs.map(d => d.id))}
              />
            </th>
            <th className={`cdr-doc-table__th th-sort${col === 'titulo' ? ' th-sort--active' : ''}`} onClick={() => toggle('titulo')}>
              <span className="th-sort-inner">Documento <SortIcon dir={col === 'titulo' ? dir : null} /></span>
            </th>
            <th className={`cdr-doc-table__th th-sort${col === 'tipo' ? ' th-sort--active' : ''}`} onClick={() => toggle('tipo')}>
              <span className="th-sort-inner">Tipo <SortIcon dir={col === 'tipo' ? dir : null} /></span>
            </th>
            <th className={`cdr-doc-table__th th-sort${col === 'date' ? ' th-sort--active' : ''}`} onClick={() => toggle('date')}>
              <span className="th-sort-inner">Data <SortIcon dir={col === 'date' ? dir : null} /></span>
            </th>
            <th className={`cdr-doc-table__th th-sort${col === 'publishedBy' ? ' th-sort--active' : ''}`} onClick={() => toggle('publishedBy')}>
              <span className="th-sort-inner">Publicado por <SortIcon dir={col === 'publishedBy' ? dir : null} /></span>
            </th>
            <th className={`cdr-doc-table__th th-sort${col === 'status' ? ' th-sort--active' : ''}`} onClick={() => toggle('status')}>
              <span className="th-sort-inner">Status <SortIcon dir={col === 'status' ? dir : null} /></span>
            </th>
            <th className="cdr-doc-table__th cdr-doc-table__th--actions" />
          </tr>
        </thead>
        <tbody>
          {sorted.map(doc => (
            <tr key={doc.id} className={`cdr-doc-table__row${selectedDocs.has(doc.id) ? ' cdr-doc-table__row--selected' : ''}`}>
              <td className="cdr-doc-table__td cdr-doc-table__td--check">
                <input type="checkbox" className="cdr-checkbox" checked={selectedDocs.has(doc.id)} onChange={() => onToggleSelect(doc.id)} />
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
                  <button
                    className={`btn-action ${doc.status === 'published' ? 'btn-action--secondary' : 'btn-action--activate'}`}
                    type="button"
                    onClick={() => onToggleStatus(doc.id, doc.status)}
                  >
                    {doc.status === 'published' ? 'Despublicar' : 'Publicar'}
                  </button>
                  <button
                    className="btn-action btn-action--danger"
                    type="button"
                    onClick={() => { if (window.confirm(`Excluir "${doc.titulo}"? Esta ação não pode ser desfeita.`)) onRemove(doc.id); }}
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CentralDeResultadosPage() {
  const portalName = usePortalName();
  const { user } = useAuth();
  const ENTITIES = loadEntities(user?.activePortalId);

  const [portalDbId, setPortalDbId] = useState<string | null>(null);
  const [activeEntity, setActiveEntity] = useState<string>(ENTITIES[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterQuarter, setFilterQuarter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [quarters, setQuarters] = useState<Record<string, Quarter[]>>({});
  const [docs, setDocs] = useState<Record<string, CdrDoc[]>>({});
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal form state
  const [newEntity, setNewEntity] = useState('');
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

  // Resolve portal UUID
  useEffect(() => {
    const key = user?.activePortalId;
    if (!key) return;
    resolvePortalId(key).then(id => setPortalDbId(id));
  }, [user?.activePortalId]);

  // Load quarters for active entity
  const loadQuarters = useCallback(async (entityId: string) => {
    if (!portalDbId || !isSupabaseConfigured || !supabase || !entityId) return;
    const { data } = await supabase
      .from('portal_quarters')
      .select('*')
      .eq('portal_id', portalDbId)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });
    if (!data) return;
    const mapped: Quarter[] = data.map(r => ({
      id: r.id,
      period: r.period,
      totalDocs: 0,
      publishedDocs: 0,
      exibirHome: r.exibir_home ?? false,
    }));
    setQuarters(prev => ({ ...prev, [entityId]: mapped }));
  }, [portalDbId]);

  // Load results for a quarter
  const loadResults = useCallback(async (quarterId: string) => {
    if (!portalDbId || !isSupabaseConfigured || !supabase) return;
    const { data } = await supabase
      .from('portal_results')
      .select('*')
      .eq('quarter_id', quarterId)
      .order('created_at', { ascending: false });
    if (!data) return;
    const mapped: CdrDoc[] = data.map(r => ({
      id: r.id,
      quarterId,
      titulo: typeof r.titulo === 'object' ? (r.titulo[PORTAL_CONFIG.languages[0]] ?? '') : (r.titulo ?? ''),
      tipo: r.tipo ?? '',
      date: r.date ?? '',
      publishedBy: r.published_by ?? '',
      status: r.status === 'published' ? 'published' : 'draft',
    }));
    setDocs(prev => ({ ...prev, [quarterId]: mapped }));

    // Update quarter doc counts
    setQuarters(prev => {
      const updated: Record<string, Quarter[]> = {};
      for (const [eid, qs] of Object.entries(prev)) {
        updated[eid] = qs.map(q => {
          if (q.id !== quarterId) return q;
          return { ...q, totalDocs: mapped.length, publishedDocs: mapped.filter(d => d.status === 'published').length };
        });
      }
      return updated;
    });
  }, [portalDbId]);

  useEffect(() => {
    if (portalDbId && activeEntity) loadQuarters(activeEntity);
  }, [portalDbId, activeEntity, loadQuarters]);

  // Load results when a quarter is expanded
  useEffect(() => {
    if (expandedId && !docs[expandedId]) loadResults(expandedId);
  }, [expandedId, docs, loadResults]);

  const allQuarters = quarters[activeEntity] ?? [];
  const years = [...new Set(allQuarters.map(q => parsePeriod(q.period).year).filter(Boolean))].sort((a, b) => +b - +a);

  const currentQuarters = allQuarters.filter(q => {
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

  function openModal() {
    setNewEntity(activeEntity);
    setModalOpen(true);
  }

  function buildPeriod() {
    return newPeriodType === 'anual' ? newYear : `${newQuarter}${newYear.slice(-2)}`;
  }

  async function handleSaveResult(asDraft: boolean) {
    if (!isFormValid() || !portalDbId || !isSupabaseConfigured || !supabase) return;
    setSaving(true);

    const period = buildPeriod();

    // Find or create the quarter for this entity+period
    let quarterId: string | null = null;
    const existingQs = quarters[newEntity] ?? [];
    const existing = existingQs.find(q => q.period === period);

    if (existing) {
      quarterId = existing.id;
    } else {
      // Create quarter in Supabase
      const qid = `${period.toLowerCase()}-${newEntity}-${Date.now()}`;
      const { error: qerr } = await supabase.from('portal_quarters').insert({
        id: qid,
        portal_id: portalDbId,
        entity_id: newEntity,
        period,
        exibir_home: false,
      });
      if (!qerr) {
        quarterId = qid;
        const newQ: Quarter = { id: qid, period, totalDocs: 0, publishedDocs: 0, exibirHome: false };
        setQuarters(prev => ({ ...prev, [newEntity]: [newQ, ...(prev[newEntity] ?? [])] }));
      }
    }

    if (!quarterId) { setSaving(false); return; }

    // Build titulo JSONB
    const titulo: Record<string, string> = {};
    PORTAL_CONFIG.languages.forEach(l => { titulo[l] = newTitles[l] ?? ''; });

    const scheduleAt = scheduleEnabled && scheduleDate
      ? `${scheduleDate}T${scheduleTime || '00:00'}:00`
      : null;

    const { data: inserted, error } = await supabase.from('portal_results').insert({
      portal_id: portalDbId,
      quarter_id: quarterId,
      entity_id: newEntity,
      titulo,
      tipo: newTipo,
      date: newDate,
      status: asDraft ? 'draft' : 'published',
      published_by: user?.name ?? user?.email ?? '',
      schedule_at: scheduleAt,
    }).select().single();

    if (!error && inserted) {
      const newDoc: CdrDoc = {
        id: inserted.id,
        quarterId,
        titulo: titulo[PORTAL_CONFIG.languages[0]] ?? '',
        tipo: newTipo,
        date: newDate,
        publishedBy: inserted.published_by ?? '',
        status: asDraft ? 'draft' : 'published',
      };
      setDocs(prev => ({ ...prev, [quarterId!]: [newDoc, ...(prev[quarterId!] ?? [])] }));
      setExpandedId(quarterId);
      await loadResults(quarterId);
    }

    setSaving(false);
    closeModal();
  }

  async function toggleQuarterHome(id: string) {
    const entityQs = quarters[activeEntity] ?? [];
    const q = entityQs.find(q => q.id === id);
    if (!q || !isSupabaseConfigured || !supabase) return;
    const next = !q.exibirHome;
    await supabase.from('portal_quarters').update({ exibir_home: next }).eq('id', id);
    setQuarters(prev => ({
      ...prev,
      [activeEntity]: (prev[activeEntity] ?? []).map(q => q.id === id ? { ...q, exibirHome: next } : q),
    }));
  }

  async function toggleDocStatus(docId: string, currentStatus: string) {
    if (!isSupabaseConfigured || !supabase) return;
    const next = currentStatus === 'published' ? 'draft' : 'published';
    await supabase.from('portal_results').update({ status: next }).eq('id', docId);
    setDocs(prev => {
      const updated: Record<string, CdrDoc[]> = {};
      for (const [qid, list] of Object.entries(prev)) {
        updated[qid] = list.map(d => d.id === docId ? { ...d, status: next as 'published' | 'draft' } : d);
      }
      return updated;
    });
  }

  async function removeDoc(docId: string) {
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from('portal_results').delete().eq('id', docId);
    setDocs(prev => {
      const updated: Record<string, CdrDoc[]> = {};
      for (const [qid, list] of Object.entries(prev)) {
        updated[qid] = list.filter(d => d.id !== docId);
      }
      return updated;
    });
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

  async function executeBulkAction(action: BulkAction) {
    if (!isSupabaseConfigured || !supabase) return;
    const ids = [...selectedDocs];
    if (action === 'excluir') {
      await supabase.from('portal_results').delete().in('id', ids);
      setDocs(prev => {
        const next: Record<string, CdrDoc[]> = {};
        for (const [qid, list] of Object.entries(prev)) next[qid] = list.filter(d => !selectedDocs.has(d.id));
        return next;
      });
    } else {
      const targetStatus = action === 'publicar' ? 'published' : 'draft';
      await supabase.from('portal_results').update({ status: targetStatus }).in('id', ids);
      setDocs(prev => {
        const next: Record<string, CdrDoc[]> = {};
        for (const [qid, list] of Object.entries(prev)) {
          next[qid] = list.map(d => selectedDocs.has(d.id) ? { ...d, status: targetStatus as 'published' | 'draft' } : d);
        }
        return next;
      });
    }
    setSelectedDocs(new Set());
    setConfirmAction(null);
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

  return (
    <div className="page cdr-page">
      <StickyPageHeader
        title="Resultados"
        description={<>Resultados de <strong>{portalName}</strong> · organização <strong>{PORTAL_CONFIG.orgType}</strong>.</>}
        action={
          <button className="btn-primary" type="button" onClick={openModal}>
            + Novo resultado
          </button>
        }
      />

      {ENTITIES.length === 0 && (
        <div className="page-placeholder">
          <span className="material-symbols-outlined page-placeholder__icon" style={{ fontSize: '40px' }}>bar_chart</span>
          <h2>Nenhuma empresa cadastrada</h2>
          <p>Cadastre uma empresa em <strong>Empresas</strong> para começar a publicar resultados.</p>
        </div>
      )}

      {/* Entity selector — cards on desktop */}
      <div className="cdr-entities">
        {ENTITIES.map(e => (
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

      {/* Entity selector — dropdown on mobile */}
      <div className="cdr-entity-mobile">
        <div className="filter-wrap">
          <select
            className="filter-select"
            value={activeEntity}
            onChange={e => setActiveEntity(e.target.value)}
          >
            {ENTITIES.map(e => (
              <option key={e.id} value={e.id}>{e.name} — {e.tipo}</option>
            ))}
          </select>
          <svg className="filter-wrap__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar__filters">
          <SearchInput value={search} onChange={setSearch} placeholder="Pesquisar por período..." />
          <div className="filter-wrap">
            <select className="filter-select" value={filterQuarter} onChange={e => setFilterQuarter(e.target.value)}>
              <option value="">Trimestre</option>
              {QUARTER_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
            <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
          </div>
          <div className="filter-wrap">
            <select className="filter-select" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
              <option value="">Ano</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
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
          <div className="cdr-empty">
            {activeEntity ? 'Nenhum resultado encontrado.' : 'Selecione uma empresa para ver os resultados.'}
          </div>
        ) : (
          (() => {
            const byYear: { year: string; quarters: typeof currentQuarters }[] = [];
            for (const q of currentQuarters) {
              const { year } = parsePeriod(q.period);
              const existing = byYear.find(g => g.year === year);
              if (existing) existing.quarters.push(q);
              else byYear.push({ year, quarters: [q] });
            }
            return byYear.map(group => (
              <div key={group.year} className="cdr-year-group">
                <div className="cdr-year-label">{group.year}</div>
                {group.quarters.map(q => (
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
                        onClick={e => { e.stopPropagation(); toggleQuarterHome(q.id); }}
                        title={q.exibirHome ? 'Remover da home' : 'Exibir na home'}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>home</span>
                        {q.exibirHome ? 'Na home' : 'Home'}
                      </button>
                      <span className={`cdr-accordion__chevron${expandedId === q.id ? ' cdr-accordion__chevron--open' : ''}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
                      </span>
                    </button>
                    {expandedId === q.id && (
                      <div className="cdr-accordion__body">
                        {(docs[q.id] ?? []).length === 0 ? (
                          <div className="cdr-accordion__placeholder-wrap">
                            <p className="cdr-accordion__placeholder">
                              Nenhum documento no período <strong>{q.period}</strong>.
                            </p>
                            <button className="btn-outline" type="button" onClick={openModal}>
                              + Adicionar resultado
                            </button>
                          </div>
                        ) : (
                          <QuarterDocTable
                            quarterId={q.id}
                            docs={docs[q.id] ?? []}
                            selectedDocs={selectedDocs}
                            onToggleSelect={toggleSelectDoc}
                            onToggleAll={toggleSelectAll}
                            onToggleStatus={toggleDocStatus}
                            onRemove={removeDoc}
                            tipoIcon={tipoIcon}
                            tipoLabel={tipoLabel}
                            fmtDate={fmtDate}
                          />
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

      {/* New result modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Novo resultado"
        size="sm"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={() => handleSaveResult(true)} disabled={!isFormValid() || saving}>
              {saving ? 'Salvando...' : 'Salvar como Rascunho'}
            </button>
            <button type="button" className="btn-primary" onClick={() => handleSaveResult(false)} disabled={!isFormValid() || saving}>
              {saving ? 'Salvando...' : 'Publicar Resultado'}
            </button>
          </div>
        }
      >
        {ENABLED_LANGS.length > 1 && (
          <LangTabs active={modalLang} onChange={setModalLang} />
        )}

        {(() => {
          const isPrimary = modalLang === PORTAL_CONFIG.languages[0];
          const locked = !isPrimary;
          return (
            <div className="cdr-modal-form">
              <label className="cdr-modal-form__label" key={modalLang}>
                Título
                <input
                  className="cdr-modal-form__input lang-fade"
                  type="text"
                  placeholder="Ex: Resultado do 2º Trimestre 2026"
                  value={newTitles[modalLang] ?? ''}
                  onChange={e => setNewTitles(prev => ({ ...prev, [modalLang]: e.target.value }))}
                  autoFocus
                />
              </label>

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
                {ENTITIES.length > 1 && (
                  <label className="cdr-modal-form__label">
                    Entidade
                    <select
                      className="cdr-modal-form__input cdr-modal-form__select"
                      value={newEntity}
                      onChange={e => setNewEntity(e.target.value)}
                      disabled={locked}
                    >
                      {ENTITIES.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="cdr-modal-form__label">
                  Data de divulgação
                  <input
                    className="cdr-modal-form__input"
                    type="date"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    disabled={locked}
                  />
                </label>

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

                <div className="cdr-modal-form__row">
                  {newPeriodType === 'trimestral' && (
                    <label className="cdr-modal-form__label">
                      Trimestre
                      <select
                        className="cdr-modal-form__input cdr-modal-form__select"
                        value={newQuarter}
                        onChange={e => setNewQuarter(e.target.value)}
                        disabled={locked}
                      >
                        <option value="">Selecionar</option>
                        {QUARTER_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                      </select>
                    </label>
                  )}
                  <label className="cdr-modal-form__label">
                    Ano
                    <select
                      className="cdr-modal-form__input cdr-modal-form__select"
                      value={newYear}
                      onChange={e => setNewYear(e.target.value)}
                      disabled={locked}
                    >
                      <option value="">Selecionar</option>
                      {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </label>
                </div>

                <div className="cdr-modal-form__label">
                  Tipo
                  <div className="cdr-tipo-grid">
                    {TIPO_OPTIONS.map(t => (
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

                <div className="cdr-modal-schedule">
                  <div className="cdr-modal-schedule__header">
                    <div className="cdr-modal-schedule__title-group">
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>schedule</span>
                      <span className="cdr-modal-schedule__title">Agendamento</span>
                    </div>
                    <button
                      type="button"
                      className={`cdr-modal-schedule__toggle${scheduleEnabled ? ' cdr-modal-schedule__toggle--on' : ''}`}
                      onClick={() => !locked && setScheduleEnabled(v => !v)}
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
                        <input className="cdr-modal-form__input" type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} disabled={locked} />
                      </label>
                      <label className="cdr-modal-form__label">
                        Horário
                        <input className="cdr-modal-form__input" type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} disabled={locked} />
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
