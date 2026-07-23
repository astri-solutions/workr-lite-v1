import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSort } from '../../hooks/useSort';
import SortIcon from '../../components/SortIcon';
import Modal from '../../components/Modal';
import PublishSuccessModal from '../../components/PublishSuccessModal';
import LangTabs from '../../components/LangTabs';
import StickyPageHeader from '../../components/StickyPageHeader';
import FileDropzone from '../../components/FileDropzone';
import FilterBar from '../../components/FilterBar';
import SearchInput from '../../components/SearchInput';
import PORTAL_CONFIG, { LocaleCode } from '../../portalConfig';
import { usePortalName } from '../../hooks/usePortalName';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { resolvePortalId } from '../../lib/portalDb';
import { loadPortalCanais, buildDestPages as buildBasePages, type DestPage as BaseDestPage } from '../../utils/destPages';
import { logActivity } from '../../lib/activityLog';
import '../admin/AdminPages.css';
import './DocumentosPage.css';

interface Entity {
  id: string;
  name: string;
  tipo: 'EMPRESA' | 'FUNDO';
}

type DocStatus = 'Publicado' | 'Rascunho';

interface DocRow {
  id: string;
  entityId: string;
  nome: string;
  tipo: string;
  status: DocStatus;
  dataPub: string;
  pagina: string;
  idiomas: string[];
  tags: string[];
  publicadoPor: string;
  ultimaEdicao: string;
  ultimoEditor: string;
  fromCvm?: boolean;
  externalLink?: string;
  filePath?: string;
}

const DOCS_BUCKET = 'portal-documents';

// Documents only make sense on "lista"/"lista-agrupada" pages (accordion of
// files) — pages without pageType set yet (legacy canais) stay selectable,
// EXCEPT the default canais that are structurally never a document list
// (contact forms, Central de Resultados which has its own document table,
// calendar/ratings pages) — those must never be offered even without an
// explicit pageType.
const COMPATIBLE_DOC_TYPES = ['lista', 'lista-agrupada'] as (string | undefined)[];
const NON_LIST_DEFAULT_IDS = new Set([
  'fale-ri', 'mailing', 'resultados', 'central-resultados', 'calendario-eventos', 'ratings',
]);

function fileExt(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? 'pdf';
}

// Sub-group categories (e.g. "Fatos Relevantes", "AGO/AGE") come from the
// canal's own "Grupos" config (Árvore de canais → Tipo de página → Lista
// agrupada) — only pages of that pageType have any to offer.
interface DestPage extends BaseDestPage { subGroups: string[]; }

function buildDestPages(canais: Parameters<typeof buildBasePages>[0]): DestPage[] {
  return buildBasePages(canais).map(p => ({
    ...p,
    subGroups: p.pageType === 'lista-agrupada' ? (p.listaAgrupadaCategories ?? []) : [],
  }));
}

interface DocForm {
  entityId: string;
  titulos: Record<string, string>;
  allPages: boolean;
  paginaIds: string[];
  subGroupIds: Record<string, string[]>;
  idiomas: string[];
  scheduleEnabled: boolean;
  scheduleDate: string;
  scheduleTime: string;
  file: File | null;
  isExternalLink: boolean;
  externalUrl: string;
}

function emptyDocForm(entityId = ''): DocForm {
  return {
    entityId,
    titulos: {},
    allPages: false, paginaIds: [], subGroupIds: {},
    idiomas: ['PT'], scheduleEnabled: false, scheduleDate: '', scheduleTime: '',
    file: null, isExternalLink: false, externalUrl: '',
  };
}

// Convert DB row → DocRow
function dbToRow(r: Record<string, unknown>, pageLabelById: Map<string, string>): DocRow {
  const titulo = (r.titulo as Record<string, string>) ?? {};
  // The table always shows the Portuguese title regardless of which locale
  // tab was last edited — 'PT' was never a real key (locales are stored as
  // 'pt-BR'/'en'/'es'), so this previously fell through to an arbitrary key.
  const nomePrimary = titulo['pt-BR'] ?? titulo[Object.keys(titulo)[0]] ?? String(r.id);
  const paginaIds = (r.pagina_ids as string[]) ?? [];
  const paginaLabel = paginaIds.length === 0
    ? '—'
    : paginaIds.map(id => pageLabelById.get(id) ?? id).join(', ');
  const createdAt = r.created_at ? new Date(r.created_at as string).toLocaleDateString('pt-BR') : '—';
  const updatedAt = r.updated_at ? new Date(r.updated_at as string).toLocaleDateString('pt-BR') : '—';
  return {
    id: r.id as string,
    entityId: r.entity_id as string,
    nome: nomePrimary,
    tipo: r.tipo as string ?? 'Documento',
    status: (r.status as DocStatus) ?? 'Rascunho',
    dataPub: r.status === 'Publicado' ? createdAt : '—',
    pagina: paginaLabel,
    idiomas: (r.idiomas as string[]) ?? ['PT'],
    tags: [],
    publicadoPor: r.publicado_por as string ?? '',
    ultimaEdicao: updatedAt,
    ultimoEditor: r.ultimo_editor as string ?? '',
    fromCvm: r.from_cvm as boolean ?? false,
    externalLink: r.external_link as string | undefined,
    filePath: r.file_path as string | undefined,
  };
}

export default function DocumentosPage() {
  const portalName = usePortalName();
  const { user } = useAuth();
  const [portalDbId, setPortalDbId] = useState<string | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [activeEntity, setActiveEntity] = useState('');

  useEffect(() => {
    const portalKey = user?.activePortalId;
    if (!portalKey) return;
    resolvePortalId(portalKey).then(id => setPortalDbId(id));
    try {
      const raw = localStorage.getItem(`portal_empresas_${portalKey}`);
      const items: Array<{ id: string; nome?: string; name?: string; tipo?: string }> = raw ? JSON.parse(raw) : [];
      const loaded: Entity[] = items.map(e => ({
        id: e.id,
        name: e.nome ?? e.name ?? e.id,
        tipo: (e.tipo === 'FUNDO' ? 'FUNDO' : 'EMPRESA') as 'EMPRESA' | 'FUNDO',
      }));
      setEntities(loaded);
      if (loaded.length > 0) setActiveEntity(loaded[0].id);
    } catch { setEntities([]); }
  }, [user?.activePortalId]);

  const [search, setSearch] = useState('');
  const [docFilters, setDocFilters] = useState<Record<string, string>>({ tipo: '', ano: '', status: '' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [rawDocs, setRawDocs] = useState<Record<string, unknown>[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<DocForm>(emptyDocForm());
  const [dragActive, setDragActive] = useState(false);
  const [docLocale, setDocLocale] = useState<LocaleCode>(PORTAL_CONFIG.languages[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [replaceDoc, setReplaceDoc] = useState<DocRow | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceTitle, setReplaceTitle] = useState('');
  const [ptOnly, setPtOnly] = useState(false);
  const [saving, setSaving] = useState(false);

  const destPages = useMemo(() => buildDestPages(loadPortalCanais(user?.activePortalId)), [user?.activePortalId]);
  const pageLabelById = useMemo(() => new Map(destPages.map(p => [p.id, p.label])), [destPages]);
  const docs = useMemo(() => rawDocs.map(r => dbToRow(r, pageLabelById)), [rawDocs, pageLabelById]);

  const loadDocs = useCallback(async () => {
    if (!portalDbId || !isSupabaseConfigured || !supabase) return;
    setLoadingDocs(true);
    const { data } = await supabase
      .from('portal_documents')
      .select('*')
      .eq('portal_id', portalDbId)
      .order('created_at', { ascending: false });
    if (data) setRawDocs(data as Record<string, unknown>[]);
    setLoadingDocs(false);
  }, [portalDbId]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  function patchForm<K extends keyof DocForm>(key: K, val: DocForm[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function handleFile(file: File) { patchForm('file', file); }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function openDrawer() {
    setForm(emptyDocForm(activeEntity));
    setDocLocale(PORTAL_CONFIG.languages[0]);
    setPtOnly(false);
    setDrawerOpen(true);
  }
  function closeDrawer() { setDrawerOpen(false); }

  async function handleSave(asDraft: boolean) {
    const primaryLocale = PORTAL_CONFIG.languages[0];
    const primaryTitle = (form.titulos[primaryLocale] ?? '').trim();
    if (!primaryTitle) return;
    if (!portalDbId || !supabase) return;
    if (!form.isExternalLink && !form.file) return; // need either a file or an external link
    setSaving(true);

    const titulos: Record<string, string> = {};
    PORTAL_CONFIG.languages.forEach(l => {
      titulos[l] = ptOnly ? primaryTitle : (form.titulos[l] ?? '');
    });
    if (ptOnly) {
      PORTAL_CONFIG.languages.forEach(l => { titulos[l] = primaryTitle; });
    }

    const now = new Date().toISOString();
    const userName = user?.name ?? user?.email ?? '';

    // Generate the id up front so the storage path can reference it.
    const newId = crypto.randomUUID();
    let filePath: string | null = null;
    if (!form.isExternalLink && form.file) {
      filePath = `${portalDbId}/${newId}.${fileExt(form.file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(DOCS_BUCKET)
        .upload(filePath, form.file, { upsert: false });
      if (uploadError) {
        console.error('upload failed', uploadError);
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase.from('portal_documents').insert({
      id: newId,
      portal_id: portalDbId,
      entity_id: form.entityId || activeEntity,
      titulo: titulos,
      tipo: 'Documento',
      status: asDraft ? 'Rascunho' : 'Publicado',
      pagina_ids: form.paginaIds,
      sub_group_ids: form.subGroupIds,
      idiomas: ptOnly ? ['PT'] : form.idiomas,
      pt_only: ptOnly,
      external_link: form.isExternalLink ? form.externalUrl : null,
      file_path: filePath,
      publicado_por: userName,
      ultimo_editor: userName,
      updated_at: now,
    });

    if (!error) {
      closeDrawer();
      await loadDocs();
      logActivity({
        portalId: portalDbId,
        userName,
        userEmail: user?.email ?? '',
        action: asDraft ? 'adicionou' : 'publicou',
        category: 'documento',
        entity: primaryTitle,
      });
      if (!asDraft) setPublishSuccess(true);
    } else if (filePath) {
      // Row insert failed after the file made it to storage — clean up the orphan.
      await supabase.storage.from(DOCS_BUCKET).remove([filePath]);
    }
    setSaving(false);
  }

  async function handleBulkStatus(status: DocStatus) {
    if (!supabase || selected.size === 0 || !portalDbId) return;
    const ids = Array.from(selected);
    const names = docs.filter(d => ids.includes(d.id)).map(d => d.nome).join(', ');
    await supabase
      .from('portal_documents')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', ids);
    setSelected(new Set());
    await loadDocs();
    logActivity({
      portalId: portalDbId,
      userName: user?.name ?? user?.email ?? '',
      userEmail: user?.email ?? '',
      action: status === 'Publicado' ? 'publicou' : 'pausou',
      category: 'documento',
      entity: names,
    });
    if (status === 'Publicado') setPublishSuccess(true);
  }

  async function handleDelete() {
    if (!supabase || selected.size === 0 || !portalDbId) return;
    const ids = Array.from(selected);
    const names = docs.filter(d => ids.includes(d.id)).map(d => d.nome).join(', ');
    const paths = docs.filter(d => ids.includes(d.id) && d.filePath).map(d => d.filePath!);
    await supabase.from('portal_documents').delete().in('id', ids);
    if (paths.length > 0) await supabase.storage.from(DOCS_BUCKET).remove(paths);
    setSelected(new Set());
    setDeleteModalOpen(false);
    await loadDocs();
    logActivity({
      portalId: portalDbId,
      userName: user?.name ?? user?.email ?? '',
      userEmail: user?.email ?? '',
      action: 'removeu',
      category: 'documento',
      entity: names,
    });
  }

  async function handleReplaceDoc() {
    if (!replaceDoc || !supabase || !portalDbId) return;
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {
      titulo: { ...((docs.find(d => d.id === replaceDoc.id) as unknown as { titulo?: Record<string, string> })?.titulo ?? {}), 'pt-BR': replaceTitle || replaceDoc.nome },
      ultimo_editor: user?.name ?? user?.email ?? '',
      updated_at: now,
    };

    if (replaceFile) {
      const newPath = `${portalDbId}/${replaceDoc.id}.${fileExt(replaceFile.name)}`;
      // Extension may have changed (e.g. .pdf → .docx) — the old object would
      // be left orphaned under the previous filename, so remove it first.
      if (replaceDoc.filePath && replaceDoc.filePath !== newPath) {
        await supabase.storage.from(DOCS_BUCKET).remove([replaceDoc.filePath]);
      }
      const { error: uploadError } = await supabase.storage
        .from(DOCS_BUCKET)
        .upload(newPath, replaceFile, { upsert: true });
      if (uploadError) { console.error('replace upload failed', uploadError); return; }
      patch.file_path = newPath;
    }

    await supabase.from('portal_documents').update(patch).eq('id', replaceDoc.id);
    setReplaceDoc(null);
    await loadDocs();
  }

  async function handleDownload(doc: DocRow) {
    if (doc.externalLink) { window.open(doc.externalLink, '_blank', 'noopener'); return; }
    if (!doc.filePath || !supabase) return;
    const { data, error } = await supabase.storage.from(DOCS_BUCKET).createSignedUrl(doc.filePath, 60);
    if (error || !data) { console.error('signed url failed', error); return; }
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  const _filtered = docs.filter(d => {
    // With a single empresa, "entidade" isn't a meaningful dimension — don't hide
    // documents whose entity_id was never set (e.g. created before this field existed).
    if (entities.length > 1 && d.entityId !== activeEntity) return false;
    if (search && !d.nome.toLowerCase().includes(search.toLowerCase())) return false;
    if (docFilters.tipo && d.tipo !== docFilters.tipo) return false;
    if (docFilters.ano && !d.dataPub.includes(docFilters.ano)) return false;
    if (docFilters.status && d.status !== docFilters.status) return false;
    return true;
  });
  const { sorted: filtered, col, dir, toggle } = useSort(_filtered);

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(d => d.id)));
  }

  const tipoOptions = Array.from(new Set(docs.map(d => d.tipo)));
  const DOC_FILTERS = [
    { key: 'tipo', label: 'Tipo', options: [{ value: '', label: 'Todos os tipos', shortLabel: 'Todos' }, ...tipoOptions.map(t => ({ value: t, label: t }))] },
    { key: 'ano', label: 'Ano', options: [{ value: '', label: 'Todos os anos', shortLabel: 'Todos' }, { value: '2026', label: '2026' }, { value: '2025', label: '2025' }, { value: '2024', label: '2024' }] },
    { key: 'status', label: 'Status', options: [{ value: '', label: 'Todos os status', shortLabel: 'Todos' }, { value: 'Publicado', label: 'Publicado' }, { value: 'Rascunho', label: 'Rascunho' }] },
  ];

  const primaryLocale = PORTAL_CONFIG.languages[0];
  const primaryTitle = (form.titulos[primaryLocale] ?? '').trim();
  const canSave = !!primaryTitle && (form.allPages || form.paginaIds.length > 0)
    && (form.isExternalLink ? !!form.externalUrl.trim() : !!form.file);

  return (
    <div className="page docs-page">
      <StickyPageHeader
        title="Documentos"
        description={<>Documentos publicados no portal <strong>{portalName}</strong>.</>}
        action={
          <button type="button" className="btn-primary" onClick={openDrawer}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
            Novo documento
          </button>
        }
      />

      {entities.length > 1 && (
        <>
          <div className="cdr-entities">
            {entities.map(e => (
              <button key={e.id} type="button"
                className={`cdr-entity-card${activeEntity === e.id ? ' cdr-entity-card--active' : ''}`}
                onClick={() => { setActiveEntity(e.id); setSelected(new Set()); }}>
                <span className="cdr-entity-card__name">{e.name}</span>
                <span className="cdr-entity-card__tipo">{e.tipo}</span>
              </button>
            ))}
          </div>
          <div className="cdr-entity-mobile">
            <div className="filter-wrap">
              <select className="filter-select" value={activeEntity}
                onChange={ev => { setActiveEntity(ev.target.value); setSelected(new Set()); }}>
                {entities.map(e => <option key={e.id} value={e.id}>{e.name} — {e.tipo}</option>)}
              </select>
              <svg className="filter-wrap__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
          </div>
        </>
      )}

      <div className="toolbar">
        <div className="toolbar__filters">
          <SearchInput value={search} onChange={setSearch} placeholder="Pesquisar por título..." />
          <FilterBar groups={DOC_FILTERS} value={docFilters} onChange={(k, v) => setDocFilters(f => ({ ...f, [k]: v }))} />
        </div>
        <div className="toolbar__actions">
          <button type="button" className="btn-toolbar" disabled={selected.size === 0}
            onClick={() => handleBulkStatus('Rascunho')}>Despublicar</button>
          <button type="button" className="btn-toolbar btn-toolbar--success" disabled={selected.size === 0}
            onClick={() => handleBulkStatus('Publicado')}>Publicar</button>
          <button type="button" className="btn-toolbar btn-toolbar--danger" disabled={selected.size === 0}
            onClick={() => setDeleteModalOpen(true)}>Excluir</button>
          <span className="toolbar__count">
            {selected.size > 0 ? `${selected.size} de ` : ''}{filtered.length} doc{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="table-wrapper table-wrapper--responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll} /></th>
              <th className={`th-sort${col==='status'?' th-sort--active':''}`} onClick={() => toggle('status')}><span className="th-sort-inner">Status <SortIcon dir={col==='status'?dir:null} /></span></th>
              <th className={`th-sort${col==='nome'?' th-sort--active':''}`} onClick={() => toggle('nome')}><span className="th-sort-inner">Nome <SortIcon dir={col==='nome'?dir:null} /></span></th>
              <th className={`th-sort docs-col-pub${col==='dataPub'?' th-sort--active':''}`} onClick={() => toggle('dataPub')}><span className="th-sort-inner">Publicação <SortIcon dir={col==='dataPub'?dir:null} /></span></th>
              <th className={`th-sort${col==='pagina'?' th-sort--active':''}`} onClick={() => toggle('pagina')}><span className="th-sort-inner">Página <SortIcon dir={col==='pagina'?dir:null} /></span></th>
              <th className={`th-sort docs-col-center${col==='publicadoPor'?' th-sort--active':''}`} onClick={() => toggle('publicadoPor')}><span className="th-sort-inner">Publicado por <SortIcon dir={col==='publicadoPor'?dir:null} /></span></th>
              <th className={`th-sort docs-col-center${col==='ultimaEdicao'?' th-sort--active':''}`} onClick={() => toggle('ultimaEdicao')}><span className="th-sort-inner">Última edição <SortIcon dir={col==='ultimaEdicao'?dir:null} /></span></th>
              <th className={`th-sort docs-col-center${col==='ultimoEditor'?' th-sort--active':''}`} onClick={() => toggle('ultimoEditor')}><span className="th-sort-inner">Editado por <SortIcon dir={col==='ultimoEditor'?dir:null} /></span></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loadingDocs ? (
              <tr><td colSpan={9} className="table-empty">Carregando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="table-empty">Nenhum documento encontrado.</td></tr>
            ) : (
              filtered.map(doc => (
                <tr key={doc.id} className={selected.has(doc.id) ? 'docs-row--selected' : ''}>
                  <td><input type="checkbox" checked={selected.has(doc.id)} onChange={() => toggleSelect(doc.id)} /></td>
                  <td><span className={`badge ${doc.status === 'Publicado' ? 'badge--success' : 'badge--warning'}`}>{doc.status}</span></td>
                  <td className="docs-cell-nome">
                    <span className="docs-nome-title">{doc.nome}</span>
                    <div className="docs-nome-badges">
                      {doc.idiomas.map(lang => <span key={lang} className="docs-badge docs-badge--lang">{lang}</span>)}
                    </div>
                  </td>
                  <td className="table-cell--muted">{doc.dataPub}</td>
                  <td className="table-cell--muted">
                    <span className="docs-pagina-cell">
                      {doc.pagina}
                      {doc.externalLink && (
                        <span className="docs-ext-badge" title={doc.externalLink}>
                          <span className="material-symbols-outlined docs-ext-badge__icon">open_in_new</span>
                          Link externo
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="docs-col-center">
                    <div className={`docs-avatar${doc.fromCvm ? ' docs-avatar--cvm' : ''}`} title={doc.fromCvm ? 'Auto CVM' : doc.publicadoPor}>{doc.publicadoPor.slice(0,2).toUpperCase()}</div>
                  </td>
                  <td className="table-cell--muted docs-col-center">{doc.ultimaEdicao}</td>
                  <td className="docs-col-center">
                    <div className="docs-avatar" title={doc.ultimoEditor}>{doc.ultimoEditor.slice(0,2).toUpperCase()}</div>
                  </td>
                  <td>
                    <div className="table-actions">
                      {(doc.filePath || doc.externalLink) && (
                        <button type="button" className="btn-action btn-action--secondary" onClick={() => handleDownload(doc)}>Abrir</button>
                      )}
                      <button type="button" className="btn-action btn-action--enter"
                        onClick={() => { setReplaceDoc(doc); setReplaceFile(null); setReplaceTitle(doc.nome); }}>Editar</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="rcard-list">
        {filtered.map(doc => (
          <div key={doc.id} className="rcard">
            <div className="rcard__stripe" style={{ background: doc.status === 'Publicado' ? 'var(--color-primary-400)' : 'var(--color-gray-300)' }} />
            <div className="rcard__inner">
              <div className="rcard__body">
                <div className="docs-rcard__check">
                  <input type="checkbox" checked={selected.has(doc.id)} onChange={() => toggleSelect(doc.id)} />
                  <span className={`badge ${doc.status === 'Publicado' ? 'badge--success' : 'badge--warning'}`}>{doc.status}</span>
                </div>
                <span className="rcard__title" style={{ padding: '0 var(--space-4)' }}>{doc.nome}</span>
              </div>
              <div className="docs-rcard__rows">
                <div className="docs-rcard__row"><span className="docs-rcard__label">Publicação</span><span className="docs-rcard__value">{doc.dataPub}</span></div>
                <div className="docs-rcard__row"><span className="docs-rcard__label">Página</span><span className="docs-rcard__value">{doc.pagina}</span></div>
              </div>
              <div className="rcard__footer">
                {(doc.filePath || doc.externalLink) && (
                  <button type="button" className="btn-action btn-action--secondary" onClick={() => handleDownload(doc)}>Abrir</button>
                )}
                <button type="button" className="btn-action btn-action--enter"
                  onClick={() => { setReplaceDoc(doc); setReplaceFile(null); setReplaceTitle(doc.nome); }}>Editar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Edit modal ── */}
      <Modal open={!!replaceDoc} onClose={() => setReplaceDoc(null)} title="Editar documento" size="sm"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={() => setReplaceDoc(null)}>Cancelar</button>
            <button type="button" className="btn-primary" onClick={handleReplaceDoc}>Salvar alterações</button>
          </div>
        }>
        <div className="doc-field" style={{ marginBottom: 'var(--space-4)' }}>
          <label className="doc-field__label">Título</label>
          <input className="doc-field__input" type="text" value={replaceTitle}
            onChange={e => setReplaceTitle(e.target.value)} autoFocus />
        </div>
        <FileDropzone file={replaceFile} onChange={setReplaceFile}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" hint="PDF, Word, Excel, PowerPoint" />
      </Modal>

      {/* ── New document modal ── */}
      <Modal open={drawerOpen} onClose={closeDrawer} title="Novo documento" size="md" variant="side"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={closeDrawer}>Cancelar</button>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button type="button" className="btn-outline" onClick={() => handleSave(true)} disabled={!primaryTitle || saving}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>draft</span>
                Salvar rascunho
              </button>
              <button type="button" className="btn-primary" onClick={() => handleSave(false)} disabled={!canSave || saving}>
                {saving ? 'Publicando…' : 'Publicar'}
              </button>
            </div>
          </div>
        }>
        <div className="doc-modal-body">
          {entities.length > 1 ? (
            <label className="doc-entity-badge doc-entity-badge--select">
              <span className="doc-entity-badge__label">Empresa</span>
              <select
                className="filter-select"
                value={form.entityId || activeEntity}
                onChange={e => patchForm('entityId', e.target.value)}
              >
                {entities.map(e => <option key={e.id} value={e.id}>{e.name} — {e.tipo}</option>)}
              </select>
            </label>
          ) : (() => {
            const ent = entities.find(e => e.id === (form.entityId || activeEntity));
            return ent ? (
              <div className="doc-entity-badge">
                <span className="doc-entity-badge__tipo">{ent.tipo}</span>
                <span className="doc-entity-badge__name">{ent.name}</span>
              </div>
            ) : null;
          })()}

          {!ptOnly && PORTAL_CONFIG.languages.length > 1 && (
            <LangTabs active={docLocale} onChange={setDocLocale} />
          )}

          {PORTAL_CONFIG.languages.length > 1 && (docLocale === PORTAL_CONFIG.languages[0] || ptOnly) && (
            <label className="doc-pt-only-row">
              <span className="doc-pt-only-label">
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>translate</span>
                Apenas Português
                <span className="doc-pt-only-hint">O mesmo arquivo será exibido em todos os idiomas</span>
              </span>
              <button type="button" className={`cdr2-toggle${ptOnly ? ' cdr2-toggle--on' : ''}`}
                onClick={() => { setPtOnly(v => !v); setDocLocale(PORTAL_CONFIG.languages[0]); }} aria-pressed={ptOnly}>
                <span className="cdr2-toggle__knob" />
              </button>
            </label>
          )}

          <div className="doc-field">
            <label className="doc-field__label">
              Título *
            </label>
            <input className="doc-field__input" type="text" placeholder="Nome do documento"
              value={form.titulos[docLocale] ?? ''}
              onChange={e => patchForm('titulos', { ...form.titulos, [docLocale]: e.target.value })}
              autoFocus />
          </div>

          <div className="doc-source-toggle">
            <button type="button" className={`doc-source-toggle__btn${!form.isExternalLink ? ' doc-source-toggle__btn--active' : ''}`}
              onClick={() => patchForm('isExternalLink', false)}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>upload_file</span>Arquivo
            </button>
            <button type="button" className={`doc-source-toggle__btn${form.isExternalLink ? ' doc-source-toggle__btn--active' : ''}`}
              onClick={() => patchForm('isExternalLink', true)}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>open_in_new</span>Link externo
            </button>
          </div>

          {form.isExternalLink ? (
            <div className="doc-field">
              <label className="doc-field__label">URL do documento *</label>
              <input className="doc-field__input" type="url" placeholder="https://..."
                value={form.externalUrl} onChange={e => patchForm('externalUrl', e.target.value)} />
              <span className="doc-field__hint">O documento abrirá em nova aba ao ser acessado no portal.</span>
            </div>
          ) : (
            <div className={`doc-upload${dragActive ? ' doc-upload--active' : ''}${form.file ? ' doc-upload--filled' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => !form.file && fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              {form.file ? (
                <div className="doc-upload__file">
                  <span className="material-symbols-outlined doc-upload__file-icon">picture_as_pdf</span>
                  <div className="doc-upload__file-info">
                    <span className="doc-upload__file-name">{form.file.name}</span>
                    <span className="doc-upload__file-size">{(form.file.size / 1024).toFixed(0)} KB</span>
                  </div>
                  <button type="button" className="doc-upload__file-remove"
                    onClick={e => { e.stopPropagation(); patchForm('file', null); }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                  </button>
                </div>
              ) : (
                <>
                  <span className="material-symbols-outlined doc-upload__icon">upload_file</span>
                  <span className="doc-upload__label">Arraste ou clique para enviar</span>
                  <span className="doc-upload__hint">PDF, DOC, XLS, PPT, ZIP</span>
                </>
              )}
            </div>
          )}

          <div className="up-form__section">
            <span className="up-form__section-label">Página de destino</span>
            <label className="up-form__check">
              <input type="checkbox" checked={form.allPages}
                onChange={e => patchForm('allPages', e.target.checked)} />
              Todas as páginas do portal
            </label>
            {!form.allPages && (
              <div className="up-form__emp-list">
                {destPages.map(p => {
                  const checked = form.paginaIds.includes(p.id);
                  const subs = form.subGroupIds[p.id] ?? [];
                  const compatible = p.pageType
                    ? COMPATIBLE_DOC_TYPES.includes(p.pageType)
                    : !NON_LIST_DEFAULT_IDS.has(p.id);
                  return (
                    <div key={p.id}>
                      <label className="up-form__check" title={!compatible ? 'Esta página não é do tipo Lista — não aceita documentos' : undefined}>
                        <input type="checkbox" checked={checked} disabled={!compatible}
                          onChange={e => {
                            const ids = e.target.checked ? [...form.paginaIds, p.id] : form.paginaIds.filter(id => id !== p.id);
                            patchForm('paginaIds', ids);
                            if (!e.target.checked) patchForm('subGroupIds', { ...form.subGroupIds, [p.id]: [] });
                          }} />
                        {p.label}{!compatible ? ' (incompatível)' : ''}
                      </label>
                      {checked && p.subGroups.length > 0 && (
                        <div className="doc-subgroup">
                          <label className="doc-subgroup__check">
                            <input type="checkbox" checked={subs.length === 0}
                              onChange={() => patchForm('subGroupIds', { ...form.subGroupIds, [p.id]: [] })} />
                            Todos os grupos
                          </label>
                          {p.subGroups.map(sg => (
                            <label key={sg} className="doc-subgroup__check">
                              <input type="checkbox" checked={subs.includes(sg)}
                                onChange={e => {
                                  const next = e.target.checked ? [...subs, sg] : subs.filter(s => s !== sg);
                                  patchForm('subGroupIds', { ...form.subGroupIds, [p.id]: next });
                                }} />
                              {sg}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="doc-field">
            <label className="doc-field__label">Agendamento</label>
            <label className="doc-schedule-toggle">
              <input type="checkbox" checked={form.scheduleEnabled}
                onChange={e => patchForm('scheduleEnabled', e.target.checked)} />
              <span>Publicar em data e hora específica</span>
            </label>
            {form.scheduleEnabled && (
              <div className="doc-schedule-row">
                <input className="doc-field__input" type="date"
                  value={form.scheduleDate} onChange={e => patchForm('scheduleDate', e.target.value)} />
                <input className="doc-field__input" type="time"
                  value={form.scheduleTime} onChange={e => patchForm('scheduleTime', e.target.value)} />
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Excluir documentos" size="sm"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={() => setDeleteModalOpen(false)}>Cancelar</button>
            <button type="button" className="btn-outline btn-outline--danger" onClick={handleDelete}>Excluir</button>
          </div>
        }>
        <p className="docs-delete-msg">
          Tem certeza que deseja excluir <strong>{selected.size} documento{selected.size !== 1 ? 's' : ''}</strong>? Esta ação não pode ser desfeita.
        </p>
      </Modal>

      <PublishSuccessModal
        open={publishSuccess}
        onClose={() => setPublishSuccess(false)}
        title="Documento publicado!"
      />
    </div>
  );
}
