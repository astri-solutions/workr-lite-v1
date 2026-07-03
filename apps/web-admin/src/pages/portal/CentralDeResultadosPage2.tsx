import { useState, useRef } from 'react';
import Modal from '../../components/Modal';
import StickyPageHeader from '../../components/StickyPageHeader';
import SearchInput from '../../components/SearchInput';
import PORTAL_CONFIG from '../../portalConfig';
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
    status: 'draft',
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

  function update(id: string, patch: Partial<FileEntry>) {
    onChange(entries.map(e => e.id === id ? { ...e, ...patch } : e));
  }

  function remove(id: string) {
    onChange(entries.filter(e => e.id !== id));
  }

  function toggleStatus(id: string) {
    onChange(entries.map(e => e.id === id ? { ...e, status: e.status === 'published' ? 'draft' : 'published' } : e));
  }

  function addEmpty() {
    onChange([...entries, { id: uid(), nome: '', tipo: '', fileName: '', status: 'draft' }]);
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
            <span className="cdr2-col-label">Arquivo</span>
            <span />
          </div>

          {entries.map((entry, idx) => (
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
                  <option value="">Selecionar tipo…</option>
                  {DOC_TIPOS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="cdr2-fname-wrap">
                <span className="cdr2-field-label">Arquivo</span>
                {entry.fileName ? (
                  <span className="cdr2-file-fname" title={entry.fileName}>
                    <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>attach_file</span>
                    {entry.fileName}
                  </span>
                ) : (
                  <span className="cdr2-file-fname cdr2-file-fname--empty">—</span>
                )}
              </div>

              <div className="cdr2-file-actions">
                <button
                  type="button"
                  className={`cdr2-status-btn${entry.status === 'published' ? ' cdr2-status-btn--pub' : ''}`}
                  onClick={() => toggleStatus(entry.id)}
                  title={entry.status === 'published' ? 'Publicado — clique para despublicar' : 'Rascunho — clique para publicar'}
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
          ))}
        </div>
      )}

      <button type="button" className="cdr-add-doc" onClick={addEmpty}>
        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add</span>
        Adicionar documento manualmente
      </button>
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
      { id: 'd1', nome: 'Apresentação de Resultados 2T25', tipo: 'apresentacao', fileName: 'apresentacao-2t25.pdf', status: 'published' },
      { id: 'd2', nome: 'Release de Resultados 2T25',     tipo: 'release',      fileName: 'release-2t25.pdf',     status: 'published' },
      { id: 'd3', nome: 'Planilha de Apoio 2T25',         tipo: 'planilha',     fileName: 'planilha-2t25.xlsx',   status: 'draft' },
    ],
    '1t25': [
      { id: 'd4', nome: 'Apresentação de Resultados 1T25', tipo: 'apresentacao', fileName: 'apresentacao-1t25.pdf', status: 'published' },
      { id: 'd5', nome: 'Release de Resultados 1T25',     tipo: 'release',      fileName: 'release-1t25.pdf',     status: 'published' },
    ],
    '4t24': [],
  });

  // ── Novo trimestre wizard ──────────────────────────────────
  type WizardStep = 'step1' | 'step2' | null;
  const [wizardOpen, setWizardOpen] = useState<WizardStep>(null);
  const [wEntity, setWEntity] = useState('imc');
  const [wQuarter, setWQuarter] = useState('');
  const [wYear, setWYear] = useState('');
  const [wEntries, setWEntries] = useState<FileEntry[]>([]);
  const [pendingId, setPendingId] = useState('');

  // ── Quarter full-page editor ───────────────────────────────
  const [editingQuarterId, setEditingQuarterId] = useState<string | null>(null);

  function openWizard() {
    setWEntity(activeEntity);
    setWQuarter('');
    setWYear('');
    setWEntries([]);
    setWizardOpen('step1');
  }

  function wizardAdvance() {
    if (!wQuarter || !wYear) return;
    const period = `${wQuarter}${wYear.slice(-2)}`;
    const id = `${period.toLowerCase()}-${wEntity}-${Date.now()}`;
    setPendingId(id);
    setWizardOpen('step2');
  }

  function wizardCreate() {
    const period = `${wQuarter}${wYear.slice(-2)}`;
    setQuarters(prev => [{ id: pendingId, entityId: wEntity, period, exibirHome: false }, ...prev]);
    setDocs(prev => ({ ...prev, [pendingId]: wEntries }));
    setWizardOpen(null);
    setEditingQuarterId(pendingId);
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

      {/* ── Wizard step 1: Dados do trimestre ── */}
      <Modal
        open={wizardOpen === 'step1'}
        onClose={wizardCancel}
        title="Novo trimestre"
        size="sm"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={wizardCancel}>Cancelar</button>
            <button type="button" className="btn-primary" onClick={wizardAdvance} disabled={!wQuarter || !wYear}>
              Avançar
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
            </button>
          </div>
        }
      >
        <div className="cdr-modal-form">
          <p className="cdr2-wizard-step">Passo 1 de 2 — Defina o período</p>
          {ENTITIES.length > 1 && (
            <label className="cdr-modal-form__label">
              Entidade
              <select className="cdr-modal-form__input cdr-modal-form__select" value={wEntity} onChange={e => setWEntity(e.target.value)}>
                {ENTITIES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </label>
          )}
          <div className="cdr-modal-form__row">
            <label className="cdr-modal-form__label">
              Trimestre
              <select className="cdr-modal-form__input cdr-modal-form__select" value={wQuarter} onChange={e => setWQuarter(e.target.value)}>
                <option value="">Selecionar</option>
                {QUARTER_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </label>
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
        onClose={wizardCancel}
        title={`Trimestre ${wQuarter}${wYear.slice(-2)} — Adicionar arquivos`}
        size="lg"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={() => setWizardOpen('step1')}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_back</span>
              Voltar
            </button>
            <button type="button" className="btn-primary" onClick={wizardCreate}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>
              Criar trimestre
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p className="cdr2-wizard-step">Passo 2 de 2 — Arraste os arquivos e defina os tipos. Você pode adicionar mais depois.</p>
          <FileListEditor
            entries={wEntries}
            onChange={setWEntries}
            onDropFiles={files => setWEntries(prev => [...prev, ...makeEntries(files)])}
          />
        </div>
      </Modal>
    </div>
  );
}
