import { useState, useRef } from 'react';
import Modal from '../../components/Modal';
import StickyPageHeader from '../../components/StickyPageHeader';
import SearchInput from '../../components/SearchInput';
import LangTabs from '../../components/LangTabs';
import PORTAL_CONFIG, { LocaleCode } from '../../portalConfig';
import '../admin/AdminPages.css';
import './CentralDeResultadosPage.css';
import './CentralDeResultadosPage2.css';

interface Entity { id: string; name: string; tipo: 'EMPRESA' | 'FUNDO'; }

const ENTITIES: Entity[] = [
  { id: 'imc',    name: 'International Meal Company', tipo: 'EMPRESA' },
  { id: 'imc-fii', name: 'IMC Recebíveis FII',        tipo: 'FUNDO' },
  { id: 'imc-ce',  name: 'IMC Crédito Estruturado FII', tipo: 'FUNDO' },
];

const DOC_TIPOS = [
  { value: 'apresentacao', label: 'Apresentação de Resultados', icon: 'slideshow' },
  { value: 'release',      label: 'Release de Resultados',     icon: 'newspaper' },
  { value: 'planilha',     label: 'Planilha de Apoio',         icon: 'table_chart' },
  { value: 'dfs',          label: 'Demonstrações Financeiras', icon: 'receipt_long' },
  { value: 'audio',        label: 'Áudio',                     icon: 'headphones' },
  { value: 'transmissao',  label: 'Transmissão',               icon: 'live_tv' },
  { value: 'transcricao',  label: 'Transcrição',               icon: 'text_snippet' },
  { value: 'ata',          label: 'Ata RCA',                   icon: 'gavel' },
  { value: 'outros',       label: 'Outros',                    icon: 'folder' },
];

const QUARTER_OPTIONS = ['1T', '2T', '3T', '4T'];
const CURRENT_YEAR = 2026;
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => String(CURRENT_YEAR - i));

interface FileEntry {
  id: string;
  nome: string;
  tipo: string;
  fileName: string;
  status: 'draft' | 'published';
  locale: string;
}

const LOCALE_SHORT: Record<string, string> = { 'pt-BR': 'PT', 'en': 'EN', 'es': 'ES' };

function fileExt(fileName: string): string {
  const m = fileName.match(/\.([^.]{1,5})$/);
  return m ? m[1].toUpperCase() : '';
}

interface Quarter {
  id: string;
  entityId: string;
  period: string;
  exibirHome: boolean;
}

function parsePeriod(period: string) {
  const m = period.match(/^(\d)[Tt](\d{2,4})$/);
  if (!m) return { quarter: '', year: '' };
  return { quarter: `${m[1]}T`, year: m[2].length === 2 ? `20${m[2]}` : m[2] };
}

function tipoIcon(tipo: string) {
  return DOC_TIPOS.find(t => t.value === tipo)?.icon ?? 'description';
}

function tipoLabel(tipo: string) {
  return DOC_TIPOS.find(t => t.value === tipo)?.label ?? tipo;
}

function guessType(fileName: string): string {
  const n = fileName.toLowerCase();
  if (n.includes('apresentacao') || n.includes('presentation')) return 'apresentacao';
  if (n.includes('release') || n.includes('earnings')) return 'release';
  if (n.includes('planilha') || n.match(/\.xlsx?$/)) return 'planilha';
  if (n.includes('dfs') || n.includes('demonstr')) return 'dfs';
  if (n.includes('audio') || n.match(/\.(mp3|m4a|wav)$/)) return 'audio';
  if (n.includes('transmissao') || n.match(/\.(mp4|mov|avi)$/)) return 'transmissao';
  if (n.includes('transcr')) return 'transcricao';
  if (n.includes('ata')) return 'ata';
  return '';
}

let _uid = 200;
function uid() { return `f${_uid++}`; }

function makeEntries(files: File[]): FileEntry[] {
  return files.map(f => ({
    id: uid(),
    nome: f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
    tipo: guessType(f.name),
    fileName: f.name,
    status: 'draft' as const,
    locale: 'pt-BR',
  }));
}

// ─── FileList editor ─────────────────────────────────────────────────────────
// Shared between the step-2 modal and the full-page quarter editor

interface FileListEditorProps {
  entries: FileEntry[];
  onChange: (entries: FileEntry[]) => void;
  onDropFiles: (files: File[]) => void;
}

function FileListEditor({ entries, onChange, onDropFiles }: FileListEditorProps) {
  const [dropActive, setDropActive] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Edit-file modal state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editLocale, setEditLocale] = useState('pt-BR');
  const editFileRef = useRef<HTMLInputElement>(null);

  function update(id: string, patch: Partial<FileEntry>) {
    onChange(entries.map(e => e.id === id ? { ...e, ...patch } : e));
  }

  function remove(id: string) {
    onChange(entries.filter(e => e.id !== id));
  }

  function toggleStatus(id: string) {
    onChange(entries.map(e => e.id === id ? { ...e, status: e.status === 'published' ? 'draft' : 'published' } : e));
  }

  function openEdit(entry: FileEntry) {
    setEditingId(entry.id);
    setEditNome(entry.nome);
    setEditLocale(entry.locale ?? 'pt-BR');
  }

  function saveEdit() {
    if (!editingId) return;
    const patch: Partial<FileEntry> = { nome: editNome, locale: editLocale };
    const f = editFileRef.current?.files?.[0];
    if (f) { patch.fileName = f.name; patch.tipo = guessType(f.name) || (entries.find(e => e.id === editingId)?.tipo ?? ''); }
    update(editingId, patch);
    setEditingId(null);
    if (editFileRef.current) editFileRef.current.value = '';
  }

  function onDragStart(idx: number) { dragItem.current = idx; }
  function onDragEnter(idx: number) { dragOverItem.current = idx; setDragOverIdx(idx); }
  function onDragEnd() {
    setDragOverIdx(null);
    const from = dragItem.current;
    const to = dragOverItem.current;
    if (from === null || to === null || from === to) { dragItem.current = null; dragOverItem.current = null; return; }
    const list = [...entries];
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    onChange(list);
    dragItem.current = null;
    dragOverItem.current = null;
  }

  const editingEntry = entries.find(e => e.id === editingId);

  return (
    <div className="cdr2-editor">
      {/* Drop zone */}
      <div
        className={`cdr2-dropzone${dropActive ? ' cdr2-dropzone--active' : ''}`}
        onDragOver={e => { e.preventDefault(); setDropActive(true); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropActive(false); }}
        onDrop={e => { e.preventDefault(); setDropActive(false); onDropFiles(Array.from(e.dataTransfer.files)); }}
      >
        <span className="material-symbols-outlined cdr2-dropzone__icon">upload_file</span>
        <p className="cdr2-dropzone__text">
          Arraste arquivos aqui ou{' '}
          <label className="cdr2-dropzone__link">
            selecione do computador
            <input
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files) onDropFiles(Array.from(e.target.files)); e.target.value = ''; }}
            />
          </label>
        </p>
        <p className="cdr2-dropzone__hint">PDF, Excel, MP3, MP4 e outros</p>
      </div>

      {/* File list */}
      {entries.length > 0 && (
        <div className="cdr2-file-list">
          {/* Column header */}
          <div className="cdr2-col-header">
            <span />
            <span />
            <span className="cdr2-col-label">Nome</span>
            <span className="cdr2-col-label">Tipo de documento</span>
            <span className="cdr2-col-label">Idioma</span>
            <span className="cdr2-col-label">Ext.</span>
            <span />
          </div>

          {entries.map((entry, idx) => {
            const ext = fileExt(entry.fileName);
            const langShort = LOCALE_SHORT[entry.locale ?? 'pt-BR'] ?? 'PT';
            return (
              <div
                key={entry.id}
                className={`cdr2-file-item${dragOverIdx === idx ? ' cdr2-file-item--drag-over' : ''}`}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragEnter={() => onDragEnter(idx)}
                onDragEnd={onDragEnd}
                onDragOver={e => e.preventDefault()}
              >
                <span className="cdr2-drag-handle material-symbols-outlined">drag_indicator</span>

                <span className={`cdr2-file-tipo-icon material-symbols-outlined${entry.tipo ? ' cdr2-file-tipo-icon--set' : ''}`}>
                  {tipoIcon(entry.tipo)}
                </span>

                <div className="cdr2-file-name-wrap">
                  <span className="cdr2-field-label">Nome</span>
                  <input
                    className="cdr2-file-name"
                    type="text"
                    placeholder="Ex: Apresentação de Resultados 3T26"
                    value={entry.nome}
                    onChange={e => update(entry.id, { nome: e.target.value })}
                  />
                </div>

                <div className="cdr2-tipo-wrap">
                  <span className="cdr2-field-label">Tipo de documento</span>
                  <select
                    className={`cdr2-type-select${entry.tipo ? ' cdr2-type-select--set' : ' cdr2-type-select--unset'}`}
                    value={entry.tipo}
                    onChange={e => update(entry.id, { tipo: e.target.value })}
                  >
                    <option value="">Tipo…</option>
                    {DOC_TIPOS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <span className="cdr2-lang-badge" title={entry.locale ?? 'pt-BR'}>{langShort}</span>

                <span className={`cdr2-ext-badge${ext ? '' : ' cdr2-ext-badge--empty'}`}>{ext || '—'}</span>

                <div className="cdr2-file-actions">
                  <button
                    type="button"
                    className="cdr2-edit-btn"
                    onClick={() => openEdit(entry)}
                    title="Editar arquivo"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>edit</span>
                  </button>
                  <button
                    type="button"
                    className={`cdr2-status-btn${entry.status === 'published' ? ' cdr2-status-btn--pub' : ''}`}
                    onClick={() => toggleStatus(entry.id)}
                    title={entry.status === 'published' ? 'Publicado' : 'Rascunho'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                      {entry.status === 'published' ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                  <button type="button" className="cdr2-remove-btn" onClick={() => remove(entry.id)} title="Remover">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit-file modal ── */}
      <Modal
        open={!!editingId}
        onClose={() => setEditingId(null)}
        title="Editar documento"
        size="sm"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={() => setEditingId(null)}>Cancelar</button>
            <button type="button" className="btn-primary" onClick={saveEdit}>Salvar</button>
          </div>
        }
      >
        <div className="cdr-modal-form">
          <label className="cdr-modal-form__label">
            Nome do documento
            <input
              className="cdr-modal-form__input"
              type="text"
              value={editNome}
              onChange={e => setEditNome(e.target.value)}
              placeholder="Ex: Apresentação de Resultados 2T25"
            />
          </label>

          <label className="cdr-modal-form__label">
            Idioma
            <select
              className="cdr-modal-form__input cdr-modal-form__select"
              value={editLocale}
              onChange={e => setEditLocale(e.target.value)}
            >
              {PORTAL_CONFIG.languages.map(l => (
                <option key={l} value={l}>{l === 'pt-BR' ? 'Português (BR)' : l === 'en' ? 'English' : 'Español'}</option>
              ))}
            </select>
          </label>

          <label className="cdr-modal-form__label">
            Substituir arquivo
            {editingEntry?.fileName && (
              <span className="cdr2-edit-current-file">
                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>attach_file</span>
                {editingEntry.fileName}
              </span>
            )}
            <label className="cdr2-replace-file-btn">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>upload</span>
              Escolher novo arquivo
              <input ref={editFileRef} type="file" style={{ display: 'none' }} />
            </label>
          </label>
        </div>
      </Modal>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CentralDeResultadosPage2() {
  const [activeEntity, setActiveEntity] = useState('imc');
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterQuarter, setFilterQuarter] = useState('');

  const [quarters, setQuarters] = useState<Quarter[]>([
    { id: '2t25', entityId: 'imc', period: '2T25', exibirHome: true },
    { id: '1t25', entityId: 'imc', period: '1T25', exibirHome: false },
    { id: '4t24', entityId: 'imc', period: '4T24', exibirHome: false },
  ]);

  const [docs, setDocs] = useState<Record<string, FileEntry[]>>({
    '2t25': [
      { id: 'd1', nome: 'Apresentação de Resultados 2T25', tipo: 'apresentacao', fileName: 'apresentacao-2t25.pdf', status: 'published', locale: 'pt-BR' },
      { id: 'd2', nome: 'Release de Resultados 2T25',     tipo: 'release',      fileName: 'release-2t25.pdf',     status: 'published', locale: 'pt-BR' },
      { id: 'd3', nome: 'Planilha de Apoio 2T25',         tipo: 'planilha',     fileName: 'planilha-2t25.xlsx',   status: 'draft',     locale: 'pt-BR' },
    ],
    '1t25': [
      { id: 'd4', nome: 'Apresentação de Resultados 1T25', tipo: 'apresentacao', fileName: 'apresentacao-1t25.pdf', status: 'published', locale: 'pt-BR' },
      { id: 'd5', nome: 'Release de Resultados 1T25',     tipo: 'release',      fileName: 'release-1t25.pdf',     status: 'published', locale: 'pt-BR' },
    ],
    '4t24': [],
  });

  // ── Novo trimestre wizard ──────────────────────────────────
  type WizardStep = 'step1' | 'step2' | null;
  const [wizardOpen, setWizardOpen] = useState<WizardStep>(null);
  const [wEntity, setWEntity] = useState('imc');
  const [wPeriodType, setWPeriodType] = useState<'trimestral' | 'anual'>('trimestral');
  const [wQuarter, setWQuarter] = useState('');
  const [wYear, setWYear] = useState('');
  const [wEntries, setWEntries] = useState<FileEntry[]>([]);
  const [wExibirHome, setWExibirHome] = useState(false);
  const [wSchedule, setWSchedule] = useState('');
  const [wLocale, setWLocale] = useState<LocaleCode>(PORTAL_CONFIG.languages[0]);
  const [pendingId, setPendingId] = useState('');

  // ── Quarter full-page editor ───────────────────────────────
  const [editingQuarterId, setEditingQuarterId] = useState<string | null>(null);

  function openWizard() {
    setWEntity(activeEntity);
    setWPeriodType('trimestral');
    setWQuarter('');
    setWYear('');
    setWEntries([]);
    setWExibirHome(false);
    setWSchedule('');
    setWLocale(PORTAL_CONFIG.languages[0]);
    setWizardOpen('step1');
  }

  function wizardAdvance() {
    const periodOk = wPeriodType === 'anual' ? !!wYear : !!(wQuarter && wYear);
    if (!periodOk) return;
    const period = wPeriodType === 'anual' ? wYear : `${wQuarter}${wYear.slice(-2)}`;
    const id = `${period.toLowerCase()}-${wEntity}-${Date.now()}`;
    setPendingId(id);
    setWizardOpen('step2');
  }

  function wizardSave(openEditor = false) {
    const period = wPeriodType === 'anual' ? wYear : `${wQuarter}${wYear.slice(-2)}`;
    setQuarters(prev => [{ id: pendingId, entityId: wEntity, period, exibirHome: wExibirHome }, ...prev]);
    setDocs(prev => ({ ...prev, [pendingId]: wEntries }));
    setWizardOpen(null);
    if (openEditor) setEditingQuarterId(pendingId);
  }

  function wizardCancel() {
    setWizardOpen(null);
    setWEntries([]);
  }

  function toggleHome(id: string) {
    setQuarters(prev => prev.map(q => q.id === id ? { ...q, exibirHome: !q.exibirHome } : q));
  }

  function updateQuarterDocs(quarterId: string, entries: FileEntry[]) {
    setDocs(prev => ({ ...prev, [quarterId]: entries }));
  }

  const allQuarters = quarters.filter(q => q.entityId === activeEntity);
  const years = [...new Set(allQuarters.map(q => parsePeriod(q.period).year).filter(Boolean))].sort((a, b) => +b - +a);

  const currentQuarters = allQuarters.filter(q => {
    const { quarter, year } = parsePeriod(q.period);
    if (search && !q.period.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterYear && year !== filterYear) return false;
    if (filterQuarter && quarter !== filterQuarter) return false;
    return true;
  });

  const byYear: { year: string; quarters: typeof currentQuarters }[] = [];
  for (const q of currentQuarters) {
    const { year } = parsePeriod(q.period);
    const existing = byYear.find(g => g.year === year);
    if (existing) existing.quarters.push(q);
    else byYear.push({ year, quarters: [q] });
  }

  // ── Full-page quarter editor ─────────────────────────────────────────────
  if (editingQuarterId) {
    const quarter = quarters.find(q => q.id === editingQuarterId);
    const qDocs = docs[editingQuarterId] ?? [];
    const published = qDocs.filter(d => d.status === 'published').length;

    return (
      <div className="page cdr-page">
        <StickyPageHeader
          title={`Trimestre ${quarter?.period ?? ''}`}
          description={<>Editar documentos do trimestre · <strong>{ENTITIES.find(e => e.id === quarter?.entityId)?.name}</strong></>}
          action={
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button type="button" className="btn-outline" onClick={() => setEditingQuarterId(null)}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_back</span>
                Voltar
              </button>
              <button
                type="button"
                className="btn-outline"
                onClick={() => updateQuarterDocs(editingQuarterId, [...qDocs, { id: `f${Date.now()}`, nome: '', tipo: '', fileName: '', status: 'draft', locale: 'pt-BR' }])}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                Adicionar resultado
              </button>
              <button type="button" className="btn-primary" onClick={() => setEditingQuarterId(null)}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>
                Salvar e fechar
              </button>
            </div>
          }
        />

        <div className="cdr2-fullpage-meta">
          <span className="cdr2-meta-pill">
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>folder</span>
            {qDocs.length} arquivo{qDocs.length !== 1 ? 's' : ''}
          </span>
          <span className="cdr2-meta-pill cdr2-meta-pill--pub">
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>visibility</span>
            {published} publicado{published !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            className={`cal-home-toggle${quarter?.exibirHome ? ' cal-home-toggle--on' : ''}`}
            onClick={() => toggleHome(editingQuarterId)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>home</span>
            {quarter?.exibirHome ? 'Na home' : 'Home'}
          </button>
        </div>

        <FileListEditor
          entries={qDocs}
          onChange={entries => updateQuarterDocs(editingQuarterId, entries)}
          onDropFiles={files => updateQuarterDocs(editingQuarterId, [...qDocs, ...makeEntries(files)])}
        />

        <div className="cdr2-fullpage-footer">
          <button type="button" className="btn-outline" onClick={() => setEditingQuarterId(null)}>Cancelar</button>
          <button type="button" className="btn-primary" onClick={() => setEditingQuarterId(null)}>Salvar trimestre</button>
        </div>
      </div>
    );
  }

  // ── Main list view ──────────────────────────────────────────────────────────
  return (
    <div className="page cdr-page">
      <StickyPageHeader
        title="Central de Resultados"
        description={<>Resultados de <strong>{PORTAL_CONFIG.name}</strong> · organização <strong>{PORTAL_CONFIG.orgType}</strong>.</>}
        action={
          <button className="btn-primary" type="button" onClick={openWizard}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
            Novo trimestre
          </button>
        }
      />

      {/* Entity cards */}
      <div className="cdr-entities">
        {ENTITIES.map(e => (
          <button key={e.id} type="button" className={`cdr-entity-card${activeEntity === e.id ? ' cdr-entity-card--active' : ''}`} onClick={() => setActiveEntity(e.id)}>
            <span className="cdr-entity-card__name">{e.name}</span>
            <span className="cdr-entity-card__tipo">{e.tipo}</span>
          </button>
        ))}
      </div>

      {/* Entity mobile */}
      <div className="cdr-entity-mobile">
        <div className="filter-wrap">
          <select className="filter-select" value={activeEntity} onChange={e => setActiveEntity(e.target.value)}>
            {ENTITIES.map(e => <option key={e.id} value={e.id}>{e.name} — {e.tipo}</option>)}
          </select>
          <svg className="filter-wrap__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
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
          <span className="toolbar__count">{currentQuarters.length} trimestre{currentQuarters.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* List */}
      <div className="cdr-list">
        {currentQuarters.length === 0 ? (
          <div className="cdr-empty">Nenhum trimestre encontrado. Clique em "Novo trimestre" para começar.</div>
        ) : (
          byYear.map(group => (
            <div key={group.year} className="cdr-year-group">
              <div className="cdr-year-label">{group.year}</div>
              {group.quarters.map(q => {
                const qDocs = docs[q.id] ?? [];
                const published = qDocs.filter(d => d.status === 'published').length;
                return (
                  <div key={q.id} className="cdr-accordion">
                    <div className="cdr-accordion__row cdr2-quarter-row">
                      <span className="cdr-accordion__folder">📁</span>
                      <span className="cdr-accordion__period">{q.period}</span>
                      <span className="cdr-accordion__meta">
                        {qDocs.length} {qDocs.length === 1 ? 'arquivo' : 'arquivos'}
                        {published > 0 && ` · ${published} publicado${published !== 1 ? 's' : ''}`}
                      </span>
                      {/* Per-doc type summary */}
                      {qDocs.length > 0 && (
                        <span className="cdr2-icon-row">
                          {qDocs.map(d => (
                            <span key={d.id} className="material-symbols-outlined cdr2-icon-row__icon" title={tipoLabel(d.tipo)} style={{ color: d.status === 'published' ? 'var(--color-primary-500)' : 'var(--color-gray-300)' }}>
                              {tipoIcon(d.tipo)}
                            </span>
                          ))}
                        </span>
                      )}
                      <button
                        type="button"
                        className={`cal-home-toggle${q.exibirHome ? ' cal-home-toggle--on' : ''}`}
                        onClick={() => toggleHome(q.id)}
                        title={q.exibirHome ? 'Remover da home' : 'Exibir na home'}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>home</span>
                        {q.exibirHome ? 'Na home' : 'Home'}
                      </button>
                      <button
                        type="button"
                        className="btn-action btn-action--enter"
                        onClick={() => setEditingQuarterId(q.id)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
                        Abrir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* ── Wizard step 1: Período ── */}
      <Modal
        open={wizardOpen === 'step1'}
        onClose={wizardCancel}
        title="Novo período de resultados"
        size="sm"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={wizardCancel}>Cancelar</button>
            <button
              type="button"
              className="btn-primary"
              onClick={wizardAdvance}
              disabled={wPeriodType === 'trimestral' ? (!wQuarter || !wYear) : !wYear}
            >
              Avançar
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
            </button>
          </div>
        }
      >
        <div className="cdr-modal-form">
          {/* Entity context */}
          <div className="cdr2-wiz-entity">
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-primary-500)' }}>business</span>
            <div>
              <p className="cdr2-wiz-entity__name">{ENTITIES.find(e => e.id === wEntity)?.name}</p>
              <p className="cdr2-wiz-entity__tipo">{ENTITIES.find(e => e.id === wEntity)?.tipo}</p>
            </div>
          </div>

          {/* Period type toggle */}
          <div className="cdr-modal-form__label" style={{ gap: 'var(--space-2)' }}>
            <span>Tipo de período</span>
            <div className="cdr2-period-chips">
              {(['trimestral', 'anual'] as const).map(pt => (
                <button
                  key={pt}
                  type="button"
                  className={`cdr2-period-chip${wPeriodType === pt ? ' cdr2-period-chip--active' : ''}`}
                  onClick={() => { setWPeriodType(pt); setWQuarter(''); }}
                >
                  {pt === 'trimestral' ? 'Trimestral' : 'Anual'}
                </button>
              ))}
            </div>
          </div>

          {/* Period selects */}
          <div className="cdr-modal-form__row">
            {wPeriodType === 'trimestral' && (
              <label className="cdr-modal-form__label">
                Trimestre
                <select className="cdr-modal-form__input cdr-modal-form__select" value={wQuarter} onChange={e => setWQuarter(e.target.value)}>
                  <option value="">Selecionar</option>
                  {QUARTER_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </label>
            )}
            <label className="cdr-modal-form__label">
              Ano
              <select className="cdr-modal-form__input cdr-modal-form__select" value={wYear} onChange={e => setWYear(e.target.value)}>
                <option value="">Selecionar</option>
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
          </div>
        </div>
      </Modal>

      {/* ── Wizard step 2: Arquivos ── */}
      <Modal
        open={wizardOpen === 'step2'}
        onClose={() => wizardSave(false)}
        title={`${wPeriodType === 'anual' ? wYear : `${wQuarter}${wYear.slice(-2)}`} — Adicionar documentos`}
        size="xl"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={() => setWizardOpen('step1')}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_back</span>
              Voltar
            </button>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button type="button" className="btn-outline" onClick={() => wizardSave(false)}>
                Salvar vazio
              </button>
              <button type="button" className="btn-primary" onClick={() => wizardSave(true)}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>
                Criar e abrir
              </button>
            </div>
          </div>
        }
      >
        <div className="cdr2-step2-body">
          {/* Entity context */}
          <p className="cdr2-wiz-entity-line">
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>business</span>
            {ENTITIES.find(e => e.id === wEntity)?.name}
            <span className="cdr2-wiz-entity-line__tipo">{ENTITIES.find(e => e.id === wEntity)?.tipo}</span>
          </p>

          {/* Language tabs */}
          <LangTabs active={wLocale} onChange={setWLocale} />

          {/* Drag & file list */}
          <p className="cdr2-wizard-step">Arraste os arquivos abaixo ou adicione manualmente. Você pode inserir mais depois.</p>
          <FileListEditor
            entries={wEntries}
            onChange={setWEntries}
            onDropFiles={files => setWEntries(prev => [...prev, ...makeEntries(files)])}
          />

          {/* Bottom options — only editable on primary locale */}
          <div className={`cdr2-step2-opts${wLocale !== PORTAL_CONFIG.languages[0] ? ' cdr2-step2-opts--locked' : ''}`}>
            {wLocale !== PORTAL_CONFIG.languages[0] && (
              <p className="cdr2-opts-locked-note">
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>lock</span>
                Configurações definidas no idioma principal ({PORTAL_CONFIG.languages[0]})
              </p>
            )}
            <label className="cdr2-step2-opt">
              <span className="cdr2-step2-opt__label">
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>home</span>
                Mostrar na home
              </span>
              <button
                type="button"
                className={`cdr2-toggle${wExibirHome ? ' cdr2-toggle--on' : ''}`}
                onClick={() => wLocale === PORTAL_CONFIG.languages[0] && setWExibirHome(v => !v)}
                aria-pressed={wExibirHome}
                style={{ opacity: wLocale !== PORTAL_CONFIG.languages[0] ? 0.4 : 1, cursor: wLocale !== PORTAL_CONFIG.languages[0] ? 'not-allowed' : 'pointer' }}
              >
                <span className="cdr2-toggle__knob" />
              </button>
            </label>
            <label className="cdr2-step2-opt">
              <span className="cdr2-step2-opt__label">
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>schedule</span>
                Agendamento de publicação
              </span>
              <input
                type="datetime-local"
                className="cdr2-schedule-input"
                value={wSchedule}
                disabled={wLocale !== PORTAL_CONFIG.languages[0]}
                onChange={e => setWSchedule(e.target.value)}
                style={{ opacity: wLocale !== PORTAL_CONFIG.languages[0] ? 0.4 : 1 }}
              />
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
