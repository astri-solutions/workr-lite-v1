import { useState, useRef, useEffect, useCallback } from 'react';
import Modal from '../../components/Modal';
import PublishSuccessModal from '../../components/PublishSuccessModal';
import DatePicker from '../../components/DatePicker';
import StickyPageHeader from '../../components/StickyPageHeader';
import SearchInput from '../../components/SearchInput';
import LangTabs from '../../components/LangTabs';
import PORTAL_CONFIG, { LocaleCode } from '../../portalConfig';
import { usePortalName } from '../../hooks/usePortalName';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { resolvePortalId } from '../../lib/portalDb';
import '../admin/AdminPages.css';
import './CentralDeResultadosPage.css';
import './CentralDeResultadosPage2.css';
// Shares the doc-upload/doc-source-toggle/doc-field__* classes with
// Documentos — the document drawer here is intentionally styled the same
// way (same upload/arquivo-vs-link pattern, same input/hint/error classes).
import './DocumentosPage.css';

const RESULTADOS_BUCKET = 'portal-documents';

interface Entity { id: string; name: string; tipo: 'EMPRESA' | 'FUNDO'; }

// allowedEmpresaIds: null = no restriction (portal_users.empresas convention).
// A restricted editor must never even see the other empresas in this
// selector — RLS blocks their actual data underneath, but leaving every
// empresa selectable here shows a picker where most options quietly do
// nothing.
function loadEntities(portalId: string | undefined, allowedEmpresaIds: string[] | null): Entity[] {
  try {
    const raw = localStorage.getItem(`portal_empresas_${portalId ?? 'default'}`);
    if (!raw) return [];
    const items: Array<{ id: string; nome?: string; name?: string; tipo?: string }> = JSON.parse(raw);
    return items
      .filter(e => allowedEmpresaIds === null || allowedEmpresaIds.includes(e.id))
      .map(e => ({
        id: e.id,
        name: e.nome ?? e.name ?? e.id,
        tipo: (e.tipo === 'FUNDO' ? 'FUNDO' : 'EMPRESA') as 'EMPRESA' | 'FUNDO',
      }));
  } catch { return []; }
}

// None of the current site templates actually render a "resultados na home"
// section yet, so the toggle just confused people into thinking they'd
// turned something on that had no visible effect anywhere. Hidden (not
// removed) — exibirHome/exibir_home keeps being read/written normally so
// nothing here needs to change again once a template adds real support.
const SHOW_HOME_OPTION = false;

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
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => String(CURRENT_YEAR + 1 - i));

interface FileEntry {
  id: string;
  nome: string;
  tipo: string;
  fileName: string;
  status: 'draft' | 'published';
  locale: string;
  filePath?: string;
  externalLink?: string;
  uploadedBy?: string;
  /** Raw File object for an entry not yet uploaded to Storage — set when
   * added via drop/pick or when replacing an existing entry's file; cleared
   * once persisted. */
  file?: File;
  /** Links this entry to its per-locale siblings as ONE logical document
   * (e.g. the pt-BR and EN files of the same "Apresentação de Resultados").
   * Absent on legacy rows created before grouping existed — those are shown
   * as their own single-locale document, same as before. */
  groupId?: string;
  /** Per-document (not per-período) "Apenas Português" — mirrors Documentos:
   * the document only shows a primary-locale file/link, same content for
   * every idioma. Redundant across every locale entry in the group (all
   * siblings carry the same value) for the same reason nome/tipo/status do. */
  ptOnly?: boolean;
  /** Shared across every locale entry in the group — the one thing that
   * doesn't vary per idioma. Blank = publish now, past date = backdate,
   * future date (+ scheduleTime) = schedule. */
  dataPublicacao?: string;
  scheduleTime?: string;
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
  status: 'draft' | 'published';
  portugueseOnly: boolean;
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

// Must be globally unique across page reloads and portals — this is the
// Supabase primary key for portal_resultado_arquivos. A sequential counter
// restarting at 200 on every reload could collide with an id already saved
// in an earlier session, and supabase-js doesn't throw on insert errors, so
// the collision silently dropped the row while the UI still showed it.
function uid() {
  return `f${crypto.randomUUID()}`;
}

// ─── FileList editor ─────────────────────────────────────────────────────────
// Shared between the step-2 modal and the full-page quarter editor

interface FileListEditorProps {
  entries: FileEntry[];
  onChange: (entries: FileEntry[]) => void;
  uploadedBy?: string;
}

interface DrawerLocaleFile {
  file?: File;
  fileName?: string;
  existingPath?: string;
  externalLink?: string;
  isExternalLink: boolean;
}
function emptyDrawerFile(): DrawerLocaleFile { return { isExternalLink: false }; }

// Key that groups an entry with its per-locale siblings as ONE logical
// document. Falls back to the entry's own id for legacy rows created before
// grouping existed — those are shown as their own single-locale document.
function groupKeyOf(e: FileEntry): string {
  return e.groupId ?? e.id;
}

// One document at a time, in a side panel — mirrors Documentos exactly
// instead of the old "drop N files → N table rows with per-language +/×
// chips" flow, which turned out confusing in practice (chips didn't read as
// "add the translation of this document" and dropping directly onto the
// table kept creating disconnected duplicate rows). Nome is per idioma (like
// Documentos' títulos); tipo, status and the publish date/horário are
// shared across every idioma of the same document — that's the one thing
// that has to stay in sync between the pt-BR and EN versions.
function FileListEditor({ entries, onChange, uploadedBy }: FileListEditorProps) {
  const primaryLocale = PORTAL_CONFIG.languages[0];
  const multiLang = PORTAL_CONFIG.languages.length > 1;

  // One row per logical document — every per-locale FileEntry sharing a
  // groupId is folded together here instead of listed as its own row.
  const groupOrder: string[] = [];
  const groupsMap = new Map<string, FileEntry[]>();
  for (const e of entries) {
    const k = groupKeyOf(e);
    if (!groupsMap.has(k)) { groupsMap.set(k, []); groupOrder.push(k); }
    groupsMap.get(k)!.push(e);
  }
  const groups = groupOrder.map(key => {
    const list = groupsMap.get(key)!;
    const primary = list.find(e => (e.locale ?? 'pt-BR') === primaryLocale) ?? list[0];
    return { key, entries: list, primary };
  });

  // Drag-reorder — operates on whole documents (groups), not individual
  // per-locale rows, since only one row per document is ever shown.
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  function onDragStart(idx: number) { dragItem.current = idx; }
  function onDragEnter(idx: number) { dragOverItem.current = idx; setDragOverIdx(idx); }
  function onDragEnd() {
    setDragOverIdx(null);
    const from = dragItem.current;
    const to = dragOverItem.current;
    if (from === null || to === null || from === to) { dragItem.current = null; dragOverItem.current = null; return; }
    const order = [...groupOrder];
    const [moved] = order.splice(from, 1);
    order.splice(to, 0, moved);
    onChange(order.flatMap(k => groupsMap.get(k) ?? []));
    dragItem.current = null;
    dragOverItem.current = null;
  }

  function removeGroup(key: string) {
    onChange(entries.filter(e => groupKeyOf(e) !== key));
  }

  function toggleGroupStatus(key: string) {
    const nowPublished = groupsMap.get(key)?.[0]?.status === 'published';
    onChange(entries.map(e => groupKeyOf(e) === key ? { ...e, status: nowPublished ? 'draft' : 'published' } : e));
  }

  // Publish/delete confirm modal state
  const [confirmStatusId, setConfirmStatusId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmGroup = confirmStatusId ? groups.find(g => g.key === confirmStatusId) : undefined;
  const confirmDeleteGroup = confirmDeleteId ? groups.find(g => g.key === confirmDeleteId) : undefined;

  // ── Document drawer (add/edit ONE document at a time) ──────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
  const [docLocaleTab, setDocLocaleTab] = useState<LocaleCode>(primaryLocale);
  const [docPtOnly, setDocPtOnly] = useState(false);
  const [docTipo, setDocTipo] = useState('');
  const [docCustomTipo, setDocCustomTipo] = useState(false);
  const [docStatus, setDocStatus] = useState<'draft' | 'published'>('draft');
  const [docNomeByLocale, setDocNomeByLocale] = useState<Record<string, string>>({});
  const [docFilesByLocale, setDocFilesByLocale] = useState<Record<string, DrawerLocaleFile>>({});
  const [docDataPublicacao, setDocDataPublicacao] = useState('');
  const [docScheduleTime, setDocScheduleTime] = useState('');
  const [docSaveError, setDocSaveError] = useState('');
  const [docDragActive, setDocDragActive] = useState(false);
  const [droppedExtraCount, setDroppedExtraCount] = useState(0);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  function resetDrawerState() {
    setEditingGroupKey(null);
    setDocLocaleTab(primaryLocale);
    setDocPtOnly(false);
    setDocTipo('');
    setDocCustomTipo(false);
    setDocStatus('draft');
    setDocNomeByLocale({});
    setDocFilesByLocale({});
    setDocDataPublicacao('');
    setDocScheduleTime('');
    setDocSaveError('');
    setDroppedExtraCount(0);
  }

  function openNewDocDrawer(files?: File[]) {
    resetDrawerState();
    const first = files?.[0];
    if (first) {
      const nome = first.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      setDocNomeByLocale({ [primaryLocale]: nome });
      const guess = guessType(first.name);
      setDocTipo(guess);
      setDocCustomTipo(!!guess && !DOC_TIPOS.some(t => t.value === guess));
      setDocFilesByLocale({ [primaryLocale]: { file: first, fileName: first.name, isExternalLink: false } });
      if (files.length > 1) setDroppedExtraCount(files.length - 1);
    }
    setDrawerOpen(true);
  }

  function openEditDocDrawer(key: string) {
    const group = groupsMap.get(key) ?? [];
    const primary = group.find(e => (e.locale ?? 'pt-BR') === primaryLocale) ?? group[0];
    resetDrawerState();
    setEditingGroupKey(key);
    setDocTipo(primary?.tipo ?? '');
    setDocCustomTipo(!!primary?.tipo && !DOC_TIPOS.some(t => t.value === primary.tipo));
    setDocStatus(primary?.status ?? 'draft');
    setDocPtOnly(!!primary?.ptOnly);
    const nomes: Record<string, string> = {};
    const files: Record<string, DrawerLocaleFile> = {};
    for (const e of group) {
      const loc = e.locale ?? 'pt-BR';
      nomes[loc] = e.nome;
      files[loc] = { fileName: e.fileName, existingPath: e.filePath, externalLink: e.externalLink, isExternalLink: !!e.externalLink };
    }
    setDocNomeByLocale(nomes);
    setDocFilesByLocale(files);
    setDocDataPublicacao(primary?.dataPublicacao ?? '');
    setDocScheduleTime(primary?.scheduleTime ?? '');
    setDrawerOpen(true);
  }

  function patchDocFile(locale: string, patch: Partial<DrawerLocaleFile>) {
    setDocFilesByLocale(prev => ({ ...prev, [locale]: { ...(prev[locale] ?? emptyDrawerFile()), ...patch } }));
  }
  function getDocFile(locale: string): DrawerLocaleFile {
    return docFilesByLocale[locale] ?? emptyDrawerFile();
  }
  function hasContent(f: DrawerLocaleFile): boolean {
    return !!(f.file || f.existingPath || (f.isExternalLink && f.externalLink));
  }

  const activeLocale = docPtOnly ? primaryLocale : docLocaleTab;
  const activeDocFile = getDocFile(activeLocale);

  function handleDocFile(locale: string, f: File) {
    patchDocFile(locale, { file: f, fileName: f.name, existingPath: undefined });
    if (locale === primaryLocale && !docTipo) {
      const guess = guessType(f.name);
      if (guess) { setDocTipo(guess); setDocCustomTipo(false); }
    }
  }

  const missingDocLocales = !docPtOnly && multiLang
    ? PORTAL_CONFIG.languages.filter(l => l !== primaryLocale && !hasContent(getDocFile(l)))
    : [];

  function saveDocDrawer() {
    const primaryNome = (docNomeByLocale[primaryLocale] ?? '').trim();
    const primaryFile = getDocFile(primaryLocale);
    if (!primaryNome) { setDocSaveError('Informe o nome do documento.'); return; }
    if (!hasContent(primaryFile)) {
      setDocSaveError(`Adicione um arquivo ou link para ${LOCALE_SHORT[primaryLocale] ?? primaryLocale}.`);
      return;
    }
    const key = editingGroupKey ?? uid();
    const existingGroup = editingGroupKey ? (groupsMap.get(editingGroupKey) ?? []) : [];
    const locales = docPtOnly ? [primaryLocale] : PORTAL_CONFIG.languages;
    const nextGroupEntries: FileEntry[] = [];
    for (const loc of locales) {
      const f = getDocFile(loc);
      if (!hasContent(f)) continue; // a non-primary idioma left empty simply has no row yet
      const existing = existingGroup.find(e => (e.locale ?? 'pt-BR') === loc);
      nextGroupEntries.push({
        id: existing?.id ?? uid(),
        nome: (docNomeByLocale[loc] ?? '').trim() || primaryNome,
        tipo: docTipo,
        fileName: f.file?.name ?? f.fileName ?? (f.externalLink ?? f.existingPath?.split('/').pop() ?? ''),
        status: docStatus,
        locale: loc,
        filePath: f.isExternalLink ? undefined : f.existingPath,
        externalLink: f.isExternalLink ? f.externalLink : undefined,
        uploadedBy: existing?.uploadedBy ?? uploadedBy,
        file: f.file,
        groupId: key,
        ptOnly: docPtOnly,
        dataPublicacao: docDataPublicacao || undefined,
        scheduleTime: docScheduleTime || undefined,
      });
    }
    const otherEntries = entries.filter(e => groupKeyOf(e) !== key);
    onChange([...otherEntries, ...nextGroupEntries]);
    setDrawerOpen(false);
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const isFutureDate = !!docDataPublicacao && docDataPublicacao > todayStr;

  return (
    <div className="cdr2-editor">
      {/* Drop zone — always opens the document drawer, one document at a time */}
      <div
        className={`cdr2-dropzone${docDragActive ? ' cdr2-dropzone--active' : ''}`}
        onDragOver={e => { e.preventDefault(); setDocDragActive(true); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDocDragActive(false); }}
        onDrop={e => { e.preventDefault(); setDocDragActive(false); openNewDocDrawer(Array.from(e.dataTransfer.files)); }}
      >
        <span className="material-symbols-outlined cdr2-dropzone__icon">upload_file</span>
        <p className="cdr2-dropzone__text">
          Arraste um arquivo aqui ou{' '}
          <label className="cdr2-dropzone__link">
            selecione do computador
            <input
              type="file"
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.length) openNewDocDrawer(Array.from(e.target.files)); e.target.value = ''; }}
            />
          </label>
        </p>
        <p className="cdr2-dropzone__hint">PDF, Excel, MP3, MP4 e outros — um documento por vez</p>
      </div>
      <button type="button" className="btn-outline cdr2-add-doc-btn" onClick={() => openNewDocDrawer()}>
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
        Adicionar documento
      </button>

      {/* File list */}
      {entries.length > 0 && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 24 }} />
                <th style={{ width: 28 }} />
                <th>Nome</th>
                <th style={{ width: 180 }}>Tipo de documento</th>
                <th style={{ width: 90 }}>Idioma</th>
                <th style={{ width: 56 }}>Ext.</th>
                <th style={{ width: 150 }}>Publicado por</th>
                <th style={{ width: 96 }} />
              </tr>
            </thead>
            <tbody>
              {groups.map((g, idx) => {
                const { key, primary } = g;
                const ext = fileExt(primary.fileName);
                return (
                  <tr
                    key={key}
                    className={dragOverIdx === idx ? 'cdr2-file-item--drag-over' : ''}
                    draggable
                    onDragStart={() => onDragStart(idx)}
                    onDragEnter={() => onDragEnter(idx)}
                    onDragEnd={onDragEnd}
                    onDragOver={e => e.preventDefault()}
                  >
                    <td>
                      <span className="cdr2-drag-handle material-symbols-outlined">drag_indicator</span>
                    </td>
                    <td>
                      <span className={`cdr2-file-tipo-icon material-symbols-outlined${primary.tipo ? ' cdr2-file-tipo-icon--set' : ''}`}>
                        {tipoIcon(primary.tipo)}
                      </span>
                    </td>
                    <td className="table-cell--bold">
                      <span className={!primary.nome ? 'cdr2-file-name-text--empty' : ''}>
                        {primary.nome || 'Sem nome'}
                      </span>
                      {primary.ptOnly && <span className="cdr2-lang-badge cdr2-lang-badge--pt-only" style={{ marginLeft: 6 }}>Portuguese only</span>}
                    </td>
                    <td className="table-cell--muted">{tipoLabel(primary.tipo) || '—'}</td>
                    <td>
                      {multiLang && !primary.ptOnly ? (
                        <div className="cdr2-locale-chips">
                          {PORTAL_CONFIG.languages.map(lang => {
                            const has = g.entries.some(e => (e.locale ?? 'pt-BR') === lang);
                            return (
                              <span key={lang} className={`cdr2-lang-badge${has ? ' cdr2-lang-badge--filled' : ' cdr2-lang-badge--missing'}`}>
                                {LOCALE_SHORT[lang] ?? lang}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="cdr2-lang-badge" title={primary.locale ?? 'pt-BR'}>{LOCALE_SHORT[primary.locale ?? 'pt-BR'] ?? 'PT'}</span>
                      )}
                    </td>
                    <td>
                      <span className={`cdr2-ext-badge${ext ? '' : ' cdr2-ext-badge--empty'}`}>{ext || '—'}</span>
                    </td>
                    <td className="table-cell--muted">{primary.uploadedBy || '—'}</td>
                    <td>
                      <div className="cdr2-file-actions">
                        <button
                          type="button"
                          className="cdr2-edit-btn"
                          onClick={() => openEditDocDrawer(key)}
                          title="Editar documento"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>edit</span>
                        </button>
                        <button
                          type="button"
                          className={`cdr2-status-btn${primary.status === 'published' ? ' cdr2-status-btn--pub' : ''}`}
                          onClick={() => setConfirmStatusId(key)}
                          title={primary.status === 'published' ? 'Publicado' : 'Rascunho'}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                            {primary.status === 'published' ? 'visibility' : 'visibility_off'}
                          </span>
                        </button>
                        <button type="button" className="cdr2-remove-btn" onClick={() => setConfirmDeleteId(key)} title="Remover">
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Document drawer ── */}
      <Modal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingGroupKey ? 'Editar documento' : 'Novo documento'}
        size="md"
        variant="side"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={() => setDrawerOpen(false)}>Cancelar</button>
            <button type="button" className="btn-primary" onClick={saveDocDrawer}>Salvar</button>
          </div>
        }
      >
        <div className="cdr-modal-form">
          {droppedExtraCount > 0 && (
            <p className="cdr2-edit-locale-hint">
              Você soltou {droppedExtraCount + 1} arquivos — apenas o primeiro foi usado aqui. Adicione os demais um de cada vez, depois de salvar este.
            </p>
          )}

          {multiLang && (
            <label className="cdr2-pt-only-switch-row">
              <span className="cdr2-pt-only-switch-label">
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>translate</span>
                Apenas Português
                <span className="cdr2-pt-only-switch-hint">O mesmo documento será exibido em todos os idiomas</span>
              </span>
              <button
                type="button"
                className={`cdr2-toggle${docPtOnly ? ' cdr2-toggle--on' : ''}`}
                onClick={() => { setDocPtOnly(v => !v); setDocLocaleTab(primaryLocale); }}
                aria-pressed={docPtOnly}
              >
                <span className="cdr2-toggle__knob" />
              </button>
            </label>
          )}

          {!docPtOnly && multiLang && (
            <LangTabs active={docLocaleTab} onChange={setDocLocaleTab} />
          )}

          {missingDocLocales.length > 0 && (
            <p className="cdr2-missing-locale-warning">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>warning</span>
              Ainda não foi adicionado arquivo para {missingDocLocales.map(l => LOCALE_SHORT[l] ?? l).join(', ')} — o documento não aparecerá para quem visita o site nesse(s) idioma(s).
            </p>
          )}

          <label className="cdr-modal-form__label">
            Nome do documento
            <input
              className="cdr-modal-form__input"
              type="text"
              value={docNomeByLocale[activeLocale] ?? ''}
              onChange={e => setDocNomeByLocale(prev => ({ ...prev, [activeLocale]: e.target.value }))}
              placeholder="Ex: Apresentação de Resultados 2T25"
              autoFocus
            />
          </label>

          <label className="cdr-modal-form__label">
            Tipo de documento
            {docCustomTipo ? (
              <div className="cdr2-type-custom">
                <input
                  type="text"
                  className="cdr2-type-select cdr2-type-select--set"
                  value={docTipo}
                  placeholder="Nome do tipo"
                  onChange={e => setDocTipo(e.target.value)}
                />
                <button type="button" className="cdr2-type-custom__revert" title="Voltar para a lista de tipos"
                  onClick={() => { setDocCustomTipo(false); setDocTipo(''); }}>
                  <span className="material-symbols-outlined">undo</span>
                </button>
              </div>
            ) : (
              <select
                className={`cdr2-type-select${docTipo ? ' cdr2-type-select--set' : ' cdr2-type-select--unset'}`}
                value={docTipo}
                onChange={e => {
                  if (e.target.value === '__custom__') { setDocCustomTipo(true); setDocTipo(''); return; }
                  setDocTipo(e.target.value);
                }}
              >
                <option value="">Tipo…</option>
                {DOC_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                <option value="__custom__">+ Novo tipo…</option>
              </select>
            )}
          </label>

          {!docPtOnly && multiLang && (
            <p className="cdr2-edit-locale-hint">
              Arquivo/link específico para o idioma <strong>{docLocaleTab}</strong> — deixe vazio se este documento não estiver disponível neste idioma.
            </p>
          )}

          <div className="doc-source-toggle">
            <button type="button" className={`doc-source-toggle__btn${!activeDocFile.isExternalLink ? ' doc-source-toggle__btn--active' : ''}`}
              onClick={() => patchDocFile(activeLocale, { isExternalLink: false })}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>upload_file</span>Arquivo
            </button>
            <button type="button" className={`doc-source-toggle__btn${activeDocFile.isExternalLink ? ' doc-source-toggle__btn--active' : ''}`}
              onClick={() => patchDocFile(activeLocale, { isExternalLink: true, file: undefined, existingPath: undefined })}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>open_in_new</span>Link externo
            </button>
          </div>

          {activeDocFile.isExternalLink ? (
            <div className="doc-field">
              <label className="doc-field__label">URL do documento{activeLocale === primaryLocale ? ' *' : ''}</label>
              <input className="doc-field__input" type="url" placeholder="https://..."
                value={activeDocFile.externalLink ?? ''}
                onChange={e => patchDocFile(activeLocale, { externalLink: e.target.value })} />
            </div>
          ) : activeDocFile.existingPath && !activeDocFile.file ? (
            <div className="doc-upload doc-upload--filled">
              <div className="doc-upload__file">
                <span className="material-symbols-outlined doc-upload__file-icon">picture_as_pdf</span>
                <div className="doc-upload__file-info">
                  <span className="doc-upload__file-name">{activeDocFile.fileName ?? activeDocFile.existingPath.split('/').pop()}</span>
                  <span className="doc-upload__file-size">Arquivo já enviado</span>
                </div>
                <button type="button" className="doc-upload__file-remove"
                  onClick={() => patchDocFile(activeLocale, { existingPath: undefined, fileName: undefined })}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                </button>
              </div>
            </div>
          ) : (
            <div className={`doc-upload${docDragActive ? ' doc-upload--active' : ''}${activeDocFile.file ? ' doc-upload--filled' : ''}`}
              onDragOver={e => { e.preventDefault(); setDocDragActive(true); }}
              onDragLeave={() => setDocDragActive(false)}
              onDrop={e => { e.preventDefault(); setDocDragActive(false); const f = e.dataTransfer.files?.[0]; if (f) handleDocFile(activeLocale, f); }}
              onClick={() => !activeDocFile.file && docFileInputRef.current?.click()}>
              <input ref={docFileInputRef} type="file" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleDocFile(activeLocale, f); }} />
              {activeDocFile.file ? (
                <div className="doc-upload__file">
                  <span className="material-symbols-outlined doc-upload__file-icon">picture_as_pdf</span>
                  <div className="doc-upload__file-info">
                    <span className="doc-upload__file-name">{activeDocFile.file.name}</span>
                    <span className="doc-upload__file-size">{(activeDocFile.file.size / 1024).toFixed(0)} KB</span>
                  </div>
                  <button type="button" className="doc-upload__file-remove"
                    onClick={e => { e.stopPropagation(); patchDocFile(activeLocale, { file: undefined }); }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                  </button>
                </div>
              ) : (
                <>
                  <span className="material-symbols-outlined doc-upload__icon">upload_file</span>
                  <p className="doc-upload__text">Arraste ou clique para enviar</p>
                  <p className="doc-upload__hint">PDF, DOC, XLS, PPT, ZIP</p>
                </>
              )}
            </div>
          )}

          <div className="cdr2-step2-opt">
            <span className="cdr2-step2-opt__label">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>schedule</span>
              Data de publicação
            </span>
            <div className="cdr2-schedule-wrap">
              <DatePicker value={docDataPublicacao} onChange={setDocDataPublicacao} placeholder="dd/mm/aaaa" />
              {isFutureDate && (
                <div className="cdr2-schedule-time-wrap">
                  <input className="doc-field__input" type="time" value={docScheduleTime}
                    onChange={e => setDocScheduleTime(e.target.value)} />
                </div>
              )}
            </div>
          </div>
          <p className="doc-field__hint">
            {isFutureDate
              ? 'Uma data futura agenda a publicação nessa data/horário — vale para todos os idiomas deste documento.'
              : 'Deixe em branco para publicar agora. Uma data anterior sobe o documento com a data real (posição cronológica).'}
          </p>

          {docSaveError && <p className="doc-field__error">{docSaveError}</p>}
        </div>
      </Modal>

      {/* ── Publish confirm modal ── */}
      <Modal
        open={!!confirmStatusId}
        onClose={() => setConfirmStatusId(null)}
        title={confirmGroup?.primary.status === 'published' ? 'Despublicar documento' : 'Publicar documento'}
        size="sm"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={() => setConfirmStatusId(null)}>Cancelar</button>
            <button
              type="button"
              className={confirmGroup?.primary.status === 'published' ? 'btn-outline btn-outline--danger' : 'btn-primary'}
              onClick={() => { if (confirmStatusId) { toggleGroupStatus(confirmStatusId); setConfirmStatusId(null); } }}
            >
              {confirmGroup?.primary.status === 'published' ? 'Despublicar' : 'Publicar'}
            </button>
          </div>
        }
      >
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', lineHeight: 1.6 }}>
          {confirmGroup?.primary.status === 'published'
            ? <>O documento <strong>"{confirmGroup?.primary.nome || 'sem nome'}"</strong> será removido da visualização pública imediatamente, em todos os idiomas.</>
            : <>O documento <strong>"{confirmGroup?.primary.nome || 'sem nome'}"</strong> ficará visível publicamente no portal, em todos os idiomas em que tiver arquivo.</>
          }
        </p>
      </Modal>

      {/* ── Delete confirm modal ── */}
      <Modal
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title="Remover documento"
        size="sm"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={() => setConfirmDeleteId(null)}>Cancelar</button>
            <button
              type="button"
              className="btn-outline btn-outline--danger"
              onClick={() => { if (confirmDeleteId) { removeGroup(confirmDeleteId); setConfirmDeleteId(null); } }}
            >
              Remover
            </button>
          </div>
        }
      >
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', lineHeight: 1.6 }}>
          O documento <strong>"{confirmDeleteGroup?.primary.nome || 'sem nome'}"</strong> será removido da lista, em todos os idiomas. Esta ação não pode ser desfeita.
        </p>
      </Modal>

    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CentralDeResultadosPage2() {
  const portalName = usePortalName();
  const { user, allowedEmpresaIds } = useAuth();
  const userName = user?.name ?? user?.email ?? '';
  const ENTITIES = loadEntities(user?.activePortalId, allowedEmpresaIds);
  const [activeEntity, setActiveEntity] = useState(ENTITIES[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterQuarter, setFilterQuarter] = useState('');

  const [portalDbId, setPortalDbId] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.activePortalId) return;
    resolvePortalId(user.activePortalId).then(setPortalDbId).catch(() => setPortalDbId(null));
  }, [user?.activePortalId]);

  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [docs, setDocs] = useState<Record<string, FileEntry[]>>({});

  // Resultados published here are a separate data source from the nav tree
  // in Canais — they only become reachable on the live site if some canal
  // node exists with pageType 'tabela-resultados'. If the admin deletes
  // that page (see CanaisPage), affected periods/files get flagged
  // pending_reactivation and drop to draft. Whenever this screen loads and
  // finds no such page, it auto-creates one (additive-only); if it finds
  // one AND there is pending_reactivation content, it republishes that
  // content automatically, closing the loop the user asked for.
  const [autoCreatedNotice, setAutoCreatedNotice] = useState<'checking' | 'ok' | 'created' | 'reactivated' | 'error'>('checking');
  useEffect(() => {
    if (!portalDbId || !isSupabaseConfigured || !supabase) return;
    let cancelled = false;
    interface CanalNode { pageType?: string; children?: CanalNode[] }
    function hasResultadosPage(nodes: CanalNode[]): boolean {
      return nodes.some(n => n.pageType === 'tabela-resultados' || (n.children && hasResultadosPage(n.children)));
    }
    (async () => {
      const { data } = await supabase!.from('portal_config').select('canais, updated_at').eq('portal_id', portalDbId).maybeSingle();
      if (cancelled) return;
      const canais = (data?.canais ?? []) as CanalNode[];

      if (!hasResultadosPage(canais)) {
        const newId = Math.random().toString(36).slice(2, 9);
        const newCanal = {
          id: newId,
          href: `/${newId}.html`,
          label: 'Central de Resultados',
          labels: { [PORTAL_CONFIG.languages[0]]: 'Central de Resultados' },
          enabled: true,
          children: [],
          pageType: 'tabela-resultados',
          showInFooter: false,
        };
        const { error } = await supabase!
          .from('portal_config')
          .update({ canais: [...canais, newCanal] })
          .eq('portal_id', portalDbId)
          .eq('updated_at', data?.updated_at ?? '');
        if (cancelled) return;
        if (error) { setAutoCreatedNotice('error'); return; }
        setAutoCreatedNotice('created');
      } else {
        setAutoCreatedNotice('ok');
      }

      const [{ count: pendingPeriodos }, { count: pendingArquivos }] = await Promise.all([
        supabase!.from('portal_resultado_periodos').select('id', { count: 'exact', head: true }).eq('portal_id', portalDbId).eq('pending_reactivation', true),
        supabase!.from('portal_resultado_arquivos').select('id', { count: 'exact', head: true }).eq('portal_id', portalDbId).eq('pending_reactivation', true),
      ]);
      if (cancelled) return;
      if ((pendingPeriodos ?? 0) > 0 || (pendingArquivos ?? 0) > 0) {
        await Promise.all([
          supabase!.from('portal_resultado_periodos').update({ status: 'Publicado', pending_reactivation: false }).eq('portal_id', portalDbId).eq('pending_reactivation', true),
          supabase!.from('portal_resultado_arquivos').update({ status: 'Publicado', pending_reactivation: false }).eq('portal_id', portalDbId).eq('pending_reactivation', true),
        ]);
        if (cancelled) return;
        setAutoCreatedNotice('reactivated');
        loadData();
      }
    })().catch(() => { if (!cancelled) setAutoCreatedNotice('error'); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portalDbId]);

  const loadData = useCallback(async () => {
    if (!portalDbId || !isSupabaseConfigured || !supabase) return;
    const [{ data: periodos }, { data: arquivos }] = await Promise.all([
      supabase.from('portal_resultado_periodos').select('*').eq('portal_id', portalDbId).order('created_at', { ascending: false }),
      supabase.from('portal_resultado_arquivos').select('*').eq('portal_id', portalDbId).order('ordem', { ascending: true }),
    ]);
    if (periodos) {
      setQuarters((periodos as Record<string, unknown>[]).map(r => ({
        id: r.id as string,
        entityId: r.entity_id as string,
        period: r.period as string,
        exibirHome: r.exibir_home as boolean,
        status: (r.status === 'Publicado' ? 'published' : 'draft') as 'draft' | 'published',
        portugueseOnly: !!r.pt_only,
      })));
    }
    if (arquivos) {
      const grouped: Record<string, FileEntry[]> = {};
      (arquivos as Record<string, unknown>[]).forEach(r => {
        const filePath = (r.file_path as string | null) ?? undefined;
        const entry: FileEntry = {
          id: r.id as string,
          nome: r.nome as string,
          tipo: r.tipo as string,
          fileName: filePath ? filePath.split('/').pop() ?? '' : ((r.external_link as string | null) ?? ''),
          status: (r.status === 'Publicado' ? 'published' : 'draft') as 'draft' | 'published',
          locale: r.locale as string,
          filePath,
          externalLink: (r.external_link as string | null) ?? undefined,
          uploadedBy: (r.uploaded_by as string | null) ?? undefined,
          groupId: (r.grupo_id as string | null) ?? undefined,
          ptOnly: !!r.pt_only,
          dataPublicacao: (r.data_publicacao as string | null)?.slice(0, 10) ?? undefined,
          scheduleTime: r.schedule_at ? new Date(r.schedule_at as string).toTimeString().slice(0, 5) : undefined,
        };
        const periodoId = r.periodo_id as string;
        (grouped[periodoId] ??= []).push(entry);
      });
      setDocs(grouped);
    }
  }, [portalDbId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Novo trimestre wizard ──────────────────────────────────
  type WizardStep = 'step1' | 'step2' | null;
  const [wizardOpen, setWizardOpen] = useState<WizardStep>(null);
  const [wEntity, setWEntity] = useState('');
  const [wPeriodType, setWPeriodType] = useState<'trimestral' | 'anual'>('trimestral');
  const [wQuarter, setWQuarter] = useState('');
  const [wYear, setWYear] = useState('');
  const [wEntries, setWEntries] = useState<FileEntry[]>([]);
  const [wExibirHome, setWExibirHome] = useState(false);
  const [pendingId, setPendingId] = useState('');
  // Per-período "Apenas Português" — kept only for the pre-existing
  // portal_resultado_periodos.pt_only column/legacy reads; document-level
  // language handling (nome/tipo/arquivo per idioma) now lives entirely in
  // FileListEditor's own document drawer.
  const [wPortugueseOnly, setWPortugueseOnly] = useState(false);

  const [savingWizard, setSavingWizard] = useState(false);

  // ── Quarter full-page editor ───────────────────────────────
  const [editingQuarterId, setEditingQuarterId] = useState<string | null>(null);
  // Staged edits for the currently-open período — every change (upload,
  // rename, delete, reorder, per-file publish toggle) used to call
  // updateQuarterDocs() directly from onChange/onDropFiles, persisting to
  // Supabase instantly. "Cancelar"/"Salvar" both looked like they mattered,
  // but the file was already saved the moment it was dropped. Now the
  // editor only touches this local array; only "Salvar e fechar"/"Salvar
  // trimestre" actually call updateQuarterDocs.
  const [stagedDocs, setStagedDocs] = useState<FileEntry[]>([]);
  const [saveConfirmId, setSaveConfirmId] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);

  function openWizard() {
    setWEntity(activeEntity);
    setWPeriodType('trimestral');
    setWQuarter('');
    setWYear('');
    setWEntries([]);
    setWExibirHome(false);
    setWPortugueseOnly(false);
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

  async function wizardSave(openEditor = false) {
    setSavingWizard(true);
    const isExisting = quarters.some(q => q.id === pendingId);
    if (!isExisting) {
      const period = wPeriodType === 'anual' ? wYear : `${wQuarter}${wYear.slice(-2)}`;
      setQuarters(prev => [{ id: pendingId, entityId: wEntity, period, exibirHome: wExibirHome, status: 'draft' as const, portugueseOnly: wPortugueseOnly }, ...prev]);
      if (portalDbId && supabase) {
        await supabase.from('portal_resultado_periodos').insert({
          id: pendingId, portal_id: portalDbId, entity_id: wEntity, period,
          exibir_home: wExibirHome, status: 'Rascunho', pt_only: wPortugueseOnly, updated_at: new Date().toISOString(),
        });
      }
    } else {
      // Reopening the wizard on an existing período (the "Adicionar
      // resultado" shortcut from the full-page editor) can still flip
      // "Apenas Português" — persist that change even though nothing else
      // about the período is editable from here.
      setQuarters(prev => prev.map(q => q.id === pendingId ? { ...q, portugueseOnly: wPortugueseOnly } : q));
      if (portalDbId && supabase) {
        await supabase.from('portal_resultado_periodos')
          .update({ pt_only: wPortugueseOnly, updated_at: new Date().toISOString() })
          .eq('id', pendingId);
      }
    }
    try {
      await updateQuarterDocs(pendingId, wEntries);
    } finally {
      setSavingWizard(false);
      // Always close — an unexpected error saving one file must not leave
      // the modal stuck open (updateQuarterDocs already surfaces per-file
      // failures via alert(), so this isn't hiding anything from the user).
      setWizardOpen(null);
      if (openEditor) setEditingQuarterId(pendingId);
    }
  }

  function wizardCancel() {
    setWizardOpen(null);
    setWEntries([]);
  }

  async function toggleHome(id: string) {
    const next = !quarters.find(q => q.id === id)?.exibirHome;
    setQuarters(prev => prev.map(q => q.id === id ? { ...q, exibirHome: next } : q));
    if (portalDbId && supabase) {
      await supabase.from('portal_resultado_periodos').update({ exibir_home: next, updated_at: new Date().toISOString() }).eq('id', id);
    }
  }

  async function setQuarterStatus(id: string, status: 'draft' | 'published') {
    setQuarters(prev => prev.map(q => q.id === id ? { ...q, status } : q));
    setEditingQuarterId(null);
    setSaveConfirmId(null);
    // Publishing the período also publishes every file inside it — a single
    // "Publicar" click should be enough to make everything live on the site,
    // matching what the wizard/editor visually implies ("Publicar trimestre").
    if (status === 'published') {
      setDocs(prev => ({ ...prev, [id]: (prev[id] ?? []).map(d => ({ ...d, status: 'published' })) }));
    }
    if (portalDbId && supabase) {
      await supabase.from('portal_resultado_periodos')
        .update({ status: status === 'published' ? 'Publicado' : 'Rascunho', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (status === 'published') {
        await supabase.from('portal_resultado_arquivos')
          .update({ status: 'Publicado', updated_at: new Date().toISOString() })
          .eq('periodo_id', id);
      }
    }
    if (status === 'published') setPublishSuccess(true);
  }

  function handleSaveQuarter(id: string | null) {
    if (!id) return;
    setSaveConfirmId(id);
  }

  // Diffs `entries` against the last-loaded state for this período and syncs
  // exactly the changes (insert/update/delete/reorder + upload pending files)
  // to Supabase — shared by the full-page editor and both wizard paths (a
  // brand-new período has no prior docs, so everything is treated as insert).
  async function updateQuarterDocs(quarterId: string, entries: FileEntry[]) {
    const prev = docs[quarterId] ?? [];
    setDocs(p => ({ ...p, [quarterId]: entries }));
    if (!portalDbId || !supabase) return;

    const prevById = new Map(prev.map(e => [e.id, e]));
    const nextIds = new Set(entries.map(e => e.id));

    for (const old of prev) {
      if (nextIds.has(old.id)) continue;
      await supabase.from('portal_resultado_arquivos').delete().eq('id', old.id);
      if (old.filePath) await supabase.storage.from(RESULTADOS_BUCKET).remove([old.filePath]);
    }

    const failed: string[] = [];

    for (const [idx, entry] of entries.entries()) {
      try {
        const prevMatch = prevById.get(entry.id);
        let filePath = entry.filePath;
        if (entry.file) {
          const ext = fileExt(entry.fileName);
          filePath = `${portalDbId}/resultados/${entry.id}.${ext}`;
          const { error: uploadError } = await supabase.storage.from(RESULTADOS_BUCKET).upload(filePath, entry.file, { upsert: true });
          if (uploadError) {
            console.error('portal_resultado_arquivos upload failed', uploadError);
            failed.push(entry.nome);
            continue;
          }
        }
        // Blank = publish now (no schedule), past date = backdate only,
        // future date + horário = schedule (mirrors Documentos' unified
        // "Data de publicação" field). Scheduling only actually applies to
        // a document meant to go live — a "draft" status always wins.
        const dataPublicacaoIso = entry.dataPublicacao ? new Date(`${entry.dataPublicacao}T12:00:00Z`).toISOString() : null;
        const todayStr = new Date().toISOString().slice(0, 10);
        const isFutureDate = !!entry.dataPublicacao && entry.dataPublicacao > todayStr;
        let scheduleAtIso: string | null = null;
        let status = entry.status === 'published' ? 'Publicado' : 'Rascunho';
        if (entry.status === 'published' && isFutureDate && entry.scheduleTime) {
          const scheduled = new Date(`${entry.dataPublicacao}T${entry.scheduleTime}`);
          if (!Number.isNaN(scheduled.getTime()) && scheduled.getTime() > Date.now()) {
            scheduleAtIso = scheduled.toISOString();
            status = 'Agendado';
          }
        }
        if (!prevMatch) {
          // upsert, not insert: if a previous call already wrote this id (e.g.
          // the user toggled publish before the initial drop's insert had
          // resolved, so this diff still saw no prevMatch), an insert would
          // hit the id's unique constraint and be silently lost. upsert lands
          // the latest fields either way.
          const { error } = await supabase.from('portal_resultado_arquivos').upsert({
            id: entry.id, portal_id: portalDbId, periodo_id: quarterId,
            nome: entry.nome, tipo: entry.tipo, file_path: filePath ?? null,
            external_link: entry.externalLink ?? null, locale: entry.locale,
            status, ordem: idx, updated_at: new Date().toISOString(),
            uploaded_by: entry.uploadedBy ?? null, grupo_id: entry.groupId ?? null,
            pt_only: !!entry.ptOnly, data_publicacao: dataPublicacaoIso, schedule_at: scheduleAtIso,
          }, { onConflict: 'id' });
          if (error) { console.error('portal_resultado_arquivos upsert failed', error); failed.push(entry.nome); }
          continue;
        }
        const changed = entry.file || prevMatch.nome !== entry.nome || prevMatch.tipo !== entry.tipo
          || prevMatch.status !== entry.status || prevMatch.locale !== entry.locale || prevMatch.filePath !== filePath
          || prevMatch.groupId !== entry.groupId || prevMatch.ptOnly !== entry.ptOnly
          || prevMatch.dataPublicacao !== entry.dataPublicacao || prevMatch.scheduleTime !== entry.scheduleTime;
        if (changed) {
          const { error } = await supabase.from('portal_resultado_arquivos').update({
            nome: entry.nome, tipo: entry.tipo, file_path: filePath ?? null,
            locale: entry.locale, status, ordem: idx, updated_at: new Date().toISOString(),
            grupo_id: entry.groupId ?? null,
            pt_only: !!entry.ptOnly, data_publicacao: dataPublicacaoIso, schedule_at: scheduleAtIso,
          }).eq('id', entry.id);
          if (error) { console.error('portal_resultado_arquivos update failed', error); failed.push(entry.nome); }
        } else {
          await supabase.from('portal_resultado_arquivos').update({ ordem: idx }).eq('id', entry.id);
        }
      } catch (e) {
        // A single entry throwing (network blip, unexpected shape) must not
        // abort the rest of the batch — each file is independent.
        console.error('portal_resultado_arquivos entry failed', e);
        failed.push(entry.nome);
      }
    }

    if (failed.length > 0) {
      alert(`Não foi possível salvar: ${failed.join(', ')}. Tente novamente.`);
    }
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
  // Re-seeds stagedDocs from the last-persisted state every time a DIFFERENT
  // período is opened for editing — deliberately not depending on `docs`
  // itself, so it doesn't reset mid-edit if some unrelated state update
  // touches the `docs` map while the editor is open.
  useEffect(() => {
    if (editingQuarterId) setStagedDocs(docs[editingQuarterId] ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingQuarterId]);

  const editorQuarter = editingQuarterId ? quarters.find(q => q.id === editingQuarterId) : null;
  const editorPublished = stagedDocs.filter(d => d.status === 'published').length;

  // ── Main return (always) ──────────────────────────────────────────────────
  return (
    <div className="page cdr-page">
      {editingQuarterId ? (<>
        <StickyPageHeader
          title={`Trimestre ${editorQuarter?.period ?? ''}`}
          description={<>Editar documentos do trimestre · <strong>{ENTITIES.find(e => e.id === editorQuarter?.entityId)?.name}</strong></>}
          action={
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-outline" onClick={() => setEditingQuarterId(null)}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_back</span>
                Voltar
              </button>
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  const p = parsePeriod(editorQuarter?.period ?? '');
                  setWEntity(editorQuarter?.entityId ?? activeEntity);
                  setWEntries(stagedDocs);
                  setPendingId(editingQuarterId);
                  setWPeriodType(p.quarter ? 'trimestral' : 'anual');
                  setWQuarter(p.quarter || '');
                  setWYear(p.year || editorQuarter?.period || '');
                  setWPortugueseOnly(editorQuarter?.portugueseOnly ?? false);
                  setWizardOpen('step2');
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                Adicionar resultado
              </button>
              <button type="button" className="btn-primary" onClick={async () => { if (!editingQuarterId) return; await updateQuarterDocs(editingQuarterId, stagedDocs); handleSaveQuarter(editingQuarterId); }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>
                Salvar e fechar
              </button>
            </div>
          }
        />

        <div className="cdr2-fullpage-meta">
          <span className="cdr2-meta-pill">
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>folder</span>
            {stagedDocs.length} arquivo{stagedDocs.length !== 1 ? 's' : ''}
          </span>
          <span className="cdr2-meta-pill cdr2-meta-pill--pub">
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>visibility</span>
            {editorPublished} publicado{editorPublished !== 1 ? 's' : ''}
          </span>
          {SHOW_HOME_OPTION && (
            <button
              type="button"
              className={`cal-home-toggle${editorQuarter?.exibirHome ? ' cal-home-toggle--on' : ''}`}
              onClick={() => toggleHome(editingQuarterId)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>home</span>
              {editorQuarter?.exibirHome ? 'Na home' : 'Home'}
            </button>
          )}
        </div>

        <FileListEditor
          entries={stagedDocs}
          onChange={entries => setStagedDocs(entries)}
          uploadedBy={userName}
        />

        <div className="cdr2-fullpage-footer">
          <button type="button" className="btn-outline" onClick={() => setEditingQuarterId(null)}>Cancelar</button>
          <button type="button" className="btn-primary" onClick={async () => { if (!editingQuarterId) return; await updateQuarterDocs(editingQuarterId, stagedDocs); handleSaveQuarter(editingQuarterId); }}>Salvar trimestre</button>
        </div>
      </>) : (<>
      <StickyPageHeader
        title="Resultados"
        description={<>Resultados de <strong>{portalName}</strong> · organização <strong>{PORTAL_CONFIG.orgType}</strong>.</>}
        action={
          <button className="btn-primary" type="button" onClick={openWizard}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
            Novo trimestre
          </button>
        }
      />

      {autoCreatedNotice === 'created' && (
        <div className="save-error-banner" role="alert" style={{ background: 'var(--color-success-50)', borderColor: 'var(--color-success-200)', color: 'var(--color-success-700)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
          <span>
            Este portal não tinha uma página do tipo "Tabela Resultados" em <strong>Canais</strong> — criamos automaticamente
            a página <strong>Central de Resultados</strong>. Publique para que ela apareça no site (você ainda pode
            renomear/reordenar em Canais).
          </span>
        </div>
      )}

      {autoCreatedNotice === 'reactivated' && (
        <div className="save-error-banner" role="alert" style={{ background: 'var(--color-success-50)', borderColor: 'var(--color-success-200)', color: 'var(--color-success-700)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
          <span>
            Uma nova página Central de Resultados foi encontrada — reativamos automaticamente os trimestres e arquivos
            que haviam ficado como rascunho quando a página anterior foi excluída.
          </span>
        </div>
      )}

      {autoCreatedNotice === 'error' && (
        <div className="save-error-banner" role="alert">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>warning</span>
          <span>
            Não foi possível verificar/criar automaticamente a página Central de Resultados em <strong>Canais</strong>.
            Crie manualmente uma página do tipo "Tabela Resultados", ou recarregue esta página para tentar de novo.
          </span>
        </div>
      )}

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
              <option value="">Todos</option>
              {QUARTER_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
            <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
          </div>
          <div className="filter-wrap">
            <select className="filter-select" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
              <option value="">Todos</option>
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
                      <span className={`badge ${q.status === 'published' ? 'badge--success' : 'badge--gray'}`}>
                        {q.status === 'published' ? 'Publicado' : 'Rascunho'}
                      </span>
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
                      {SHOW_HOME_OPTION && (
                        <button
                          type="button"
                          className={`cal-home-toggle${q.exibirHome ? ' cal-home-toggle--on' : ''}`}
                          onClick={() => toggleHome(q.id)}
                          title={q.exibirHome ? 'Remover da home' : 'Exibir na home'}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>home</span>
                          {q.exibirHome ? 'Na home' : 'Home'}
                        </button>
                      )}
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

      </>)}

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
        footer={(() => {
          const isExisting = quarters.some(q => q.id === pendingId);
          return (
            <div className="modal-footer">
              {isExisting ? (
                <button type="button" className="btn-outline" onClick={() => setWizardOpen(null)}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_back</span>
                  Voltar
                </button>
              ) : (
                <button type="button" className="btn-outline" onClick={() => setWizardOpen('step1')}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_back</span>
                  Voltar
                </button>
              )}
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {!isExisting && (
                  <button type="button" className="btn-outline" onClick={() => wizardSave(false)} disabled={savingWizard}>
                    Criar sem documentos
                  </button>
                )}
                <button type="button" className="btn-primary" onClick={() => wizardSave(!isExisting)} disabled={savingWizard}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    {savingWizard ? 'progress_activity' : 'check'}
                  </span>
                  {savingWizard ? 'Salvando…' : isExisting ? 'Salvar' : 'Criar e abrir'}
                </button>
              </div>
            </div>
          );
        })()}
      >
        <div className="cdr2-step2-body">
          {/* Entity context */}
          <p className="cdr2-wiz-entity-line">
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>business</span>
            {ENTITIES.find(e => e.id === wEntity)?.name}
            <span className="cdr2-wiz-entity-line__tipo">{ENTITIES.find(e => e.id === wEntity)?.tipo}</span>
          </p>

          {/* Drag & file list — each document (any idioma) is added/edited
              one at a time in its own side panel; see FileListEditor. */}
          <p className="cdr2-wizard-step">Adicione os documentos deste trimestre. Você pode inserir mais depois.</p>
          <FileListEditor
            entries={wEntries}
            onChange={setWEntries}
            uploadedBy={userName}
          />

          {SHOW_HOME_OPTION && (
            <div className="cdr2-step2-opts">
              <label className="cdr2-step2-opt">
                <span className="cdr2-step2-opt__label">
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>home</span>
                  Mostrar na home
                </span>
                <button
                  type="button"
                  className={`cdr2-toggle${wExibirHome ? ' cdr2-toggle--on' : ''}`}
                  onClick={() => setWExibirHome(v => !v)}
                  aria-pressed={wExibirHome}
                >
                  <span className="cdr2-toggle__knob" />
                </button>
              </label>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Save confirm: publicar ou rascunho ── */}
      <Modal
        open={!!saveConfirmId}
        onClose={() => setSaveConfirmId(null)}
        title="Publicar trimestre?"
        description="Como deseja salvar este trimestre?"
        size="sm"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={() => { if (saveConfirmId) setQuarterStatus(saveConfirmId, 'draft'); }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>draft</span>
              Salvar como rascunho
            </button>
            <button type="button" className="btn-primary" onClick={() => { if (saveConfirmId) setQuarterStatus(saveConfirmId, 'published'); }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>public</span>
              Publicar agora
            </button>
          </div>
        }
      >
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', lineHeight: 1.6 }}>
          Publicar tornará o trimestre e seus documentos visíveis no portal. Você pode alterar isso depois.
        </p>
      </Modal>

      <PublishSuccessModal
        open={publishSuccess}
        onClose={() => setPublishSuccess(false)}
        title="Trimestre publicado!"
      />
    </div>
  );
}