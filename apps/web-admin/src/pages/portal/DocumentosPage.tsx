import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSort } from '../../hooks/useSort';
import SortIcon from '../../components/SortIcon';
import Modal from '../../components/Modal';
import PublishSuccessModal from '../../components/PublishSuccessModal';
import LangTabs from '../../components/LangTabs';
import StickyPageHeader from '../../components/StickyPageHeader';
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

type DocStatus = 'Publicado' | 'Rascunho' | 'Agendado';

interface DocFileEntry { filePath?: string; externalLink?: string; }

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
  scheduleAt?: string;
  arquivos: Record<string, DocFileEntry>;
}

const DOCS_BUCKET = 'portal-documents';

function statusBadgeClass(status: DocStatus): string {
  if (status === 'Publicado') return 'badge--success';
  if (status === 'Agendado') return 'badge--info';
  return 'badge--warning';
}

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

// One file/link slot per locale — independent of every other locale's slot,
// so replacing or removing the EN attachment never touches the PT one (they
// used to share a single file_path/external_link column on the row).
interface LocaleFileState {
  file: File | null;
  isExternalLink: boolean;
  externalUrl: string;
  existingPath?: string;
}

function emptyLocaleFile(): LocaleFileState {
  return { file: null, isExternalLink: false, externalUrl: '' };
}

function localeFileHasContent(entry: LocaleFileState): boolean {
  return entry.isExternalLink ? !!entry.externalUrl.trim() : (!!entry.file || !!entry.existingPath);
}

interface DocForm {
  editingId: string | null;
  entityId: string;
  titulos: Record<string, string>;
  allPages: boolean;
  paginaIds: string[];
  subGroupIds: Record<string, string[]>;
  scheduleEnabled: boolean;
  scheduleDate: string;
  scheduleTime: string;
  filesByLocale: Partial<Record<string, LocaleFileState>>;
  // Storage paths orphaned by a remove/replace/switch-to-link action this
  // session — deleted from the bucket only after the DB write succeeds.
  pendingStorageDeletes: string[];
}

function emptyDocForm(entityId = ''): DocForm {
  return {
    editingId: null,
    entityId,
    titulos: {},
    allPages: false, paginaIds: [], subGroupIds: {},
    scheduleEnabled: false, scheduleDate: '', scheduleTime: '',
    filesByLocale: {},
    pendingStorageDeletes: [],
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
  const scheduleAt = r.schedule_at as string | undefined;
  const scheduleLabel = scheduleAt
    ? new Date(scheduleAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
  const arquivos = (r.arquivos as Record<string, DocFileEntry>) ?? {};
  return {
    id: r.id as string,
    entityId: r.entity_id as string,
    nome: nomePrimary,
    tipo: r.tipo as string ?? 'Documento',
    status: (r.status as DocStatus) ?? 'Rascunho',
    dataPub: r.status === 'Publicado' ? createdAt : r.status === 'Agendado' ? scheduleLabel : '—',
    pagina: paginaLabel,
    idiomas: (r.idiomas as string[]) ?? ['PT'],
    tags: [],
    publicadoPor: r.publicado_por as string ?? '',
    ultimaEdicao: updatedAt,
    ultimoEditor: r.ultimo_editor as string ?? '',
    fromCvm: r.from_cvm as boolean ?? false,
    externalLink: r.external_link as string | undefined,
    filePath: r.file_path as string | undefined,
    scheduleAt,
    arquivos,
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
  const [publishSuccessSchedule, setPublishSuccessSchedule] = useState<string | null>(null);
  const [rawDocs, setRawDocs] = useState<Record<string, unknown>[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<DocForm>(emptyDocForm());
  const [dragActive, setDragActive] = useState(false);
  const [docLocale, setDocLocale] = useState<LocaleCode>(PORTAL_CONFIG.languages[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ptOnly, setPtOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const primaryLocale = PORTAL_CONFIG.languages[0];

  const destPages = useMemo(() => buildDestPages(loadPortalCanais(user?.activePortalId)), [user?.activePortalId]);
  const pageLabelById = useMemo(() => new Map(destPages.map(p => [p.id, p.label])), [destPages]);
  const compatiblePageIds = useMemo(() => destPages
    .filter(p => p.pageType ? COMPATIBLE_DOC_TYPES.includes(p.pageType) : !NON_LIST_DEFAULT_IDS.has(p.id))
    .map(p => p.id), [destPages]);
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

  function getLocaleFile(f: DocForm, locale: string): LocaleFileState {
    return f.filesByLocale[locale] ?? emptyLocaleFile();
  }

  function patchLocaleFile(locale: string, patch: Partial<LocaleFileState>) {
    setForm(f => ({
      ...f,
      filesByLocale: { ...f.filesByLocale, [locale]: { ...getLocaleFile(f, locale), ...patch } },
    }));
  }

  // Every path that stops being "the" current file for its locale (removed,
  // replaced by a new upload, or the locale switched to an external link)
  // gets queued here and only actually deleted from storage once the save
  // succeeds — never touching any other locale's own file.
  function queueStorageDelete(path?: string) {
    if (!path) return;
    setForm(f => f.pendingStorageDeletes.includes(path) ? f : { ...f, pendingStorageDeletes: [...f.pendingStorageDeletes, path] });
  }

  function handleFile(locale: string, file: File) {
    const existing = getLocaleFile(form, locale);
    if (existing.existingPath) queueStorageDelete(existing.existingPath);
    patchLocaleFile(locale, { file, existingPath: undefined });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(ptOnly ? primaryLocale : docLocale, f);
  }

  function openDrawer() {
    setForm(emptyDocForm(activeEntity));
    setDocLocale(primaryLocale);
    setPtOnly(false);
    setSaveError('');
    setDrawerOpen(true);
  }

  function openEdit(doc: DocRow) {
    const raw = rawDocs.find(r => r.id === doc.id);
    if (!raw) return;
    const titulos = (raw.titulo as Record<string, string>) ?? {};
    const paginaIds = (raw.pagina_ids as string[]) ?? [];
    const subGroupIds = (raw.sub_group_ids as Record<string, string[]>) ?? {};
    const arquivos = (raw.arquivos as Record<string, DocFileEntry>) ?? {};
    const filesByLocale: Partial<Record<string, LocaleFileState>> = {};
    PORTAL_CONFIG.languages.forEach(l => {
      const entry = arquivos[l];
      filesByLocale[l] = {
        file: null,
        isExternalLink: !!entry?.externalLink,
        externalUrl: entry?.externalLink ?? '',
        existingPath: entry?.filePath,
      };
    });
    const isAgendado = raw.status === 'Agendado' && !!raw.schedule_at;
    const scheduleDt = isAgendado ? new Date(raw.schedule_at as string) : null;
    setForm({
      editingId: doc.id,
      entityId: (raw.entity_id as string) ?? '',
      titulos,
      // "Todas as páginas" was previously stored as an EMPTY pagina_ids array
      // (a bug in its own right — the site's contains-filter query can never
      // match an empty array, so those documents never rendered anywhere).
      // Reconstructing "all pages" from a non-empty set that covers every
      // compatible page keeps this edit form consistent with what save now
      // writes for "Todas as páginas" going forward.
      allPages: compatiblePageIds.length > 0 && compatiblePageIds.every(id => paginaIds.includes(id)),
      paginaIds,
      subGroupIds,
      scheduleEnabled: isAgendado,
      scheduleDate: scheduleDt ? scheduleDt.toISOString().slice(0, 10) : '',
      scheduleTime: scheduleDt ? scheduleDt.toTimeString().slice(0, 5) : '',
      filesByLocale,
      pendingStorageDeletes: [],
    });
    setPtOnly(!!raw.pt_only);
    setDocLocale(primaryLocale);
    setSaveError('');
    setDrawerOpen(true);
  }

  function closeDrawer() { setDrawerOpen(false); setSaveError(''); }

  async function handleSave(asDraft: boolean) {
    const primaryTitle = (form.titulos[primaryLocale] ?? '').trim();
    if (!primaryTitle) return;
    if (!portalDbId || !supabase) return;
    const primaryEntryForCheck = ptOnly ? getLocaleFile(form, primaryLocale) : getLocaleFile(form, primaryLocale);
    if (!localeFileHasContent(primaryEntryForCheck)) return; // need either a file or an external link
    setSaveError('');
    // A schedule that has already passed (or landed exactly on "now") must
    // never fall through to an immediate publish — block instead of guessing.
    // Checked here with a fresh Date.now() (not the render-time value used
    // for the disabled/warning state) so a schedule that goes stale in the
    // seconds between rendering and clicking still gets caught, with clear
    // feedback instead of the click silently doing nothing.
    if (!asDraft && form.scheduleEnabled && form.scheduleDate && form.scheduleTime) {
      const scheduled = new Date(`${form.scheduleDate}T${form.scheduleTime}`);
      if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() <= Date.now()) {
        setSaveError('A data e hora de agendamento já passaram. Ajuste o horário e tente novamente.');
        return;
      }
    }
    setSaving(true);

    const titulos: Record<string, string> = {};
    PORTAL_CONFIG.languages.forEach(l => {
      titulos[l] = ptOnly ? primaryTitle : (form.titulos[l] ?? '');
    });

    const now = new Date().toISOString();
    const userName = user?.name ?? user?.email ?? '';
    const docId = form.editingId ?? crypto.randomUUID();

    // Resolve each language's final file/link independently — this is the
    // per-locale fix: no shared path, so replacing/removing one language's
    // attachment can never affect another language's.
    const arquivosPatch: Record<string, DocFileEntry> = {};
    const uploads: { locale: string; file: File; path: string }[] = [];
    for (const locale of PORTAL_CONFIG.languages) {
      const entry = ptOnly ? getLocaleFile(form, primaryLocale) : getLocaleFile(form, locale);
      if (entry.isExternalLink) {
        const link = entry.externalUrl.trim();
        if (link) arquivosPatch[locale] = { externalLink: link };
      } else if (entry.file) {
        const path = `${portalDbId}/${docId}-${locale}.${fileExt(entry.file.name)}`;
        uploads.push({ locale, file: entry.file, path });
        arquivosPatch[locale] = { filePath: path };
      } else if (entry.existingPath) {
        arquivosPatch[locale] = { filePath: entry.existingPath };
      }
    }

    for (const u of uploads) {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(DOCS_BUCKET)
        .upload(u.path, u.file, { upsert: true });
      // The upload call can resolve with no error yet no confirmed path in
      // some edge cases (e.g. a row-level-security policy that silently
      // rejects the write) — this reference would otherwise get written to
      // the document row while nothing actually exists in the bucket.
      if (uploadError || !uploadData?.path) {
        console.error('upload failed', u.locale, uploadError, uploadData);
        setSaveError(`Falha ao enviar o arquivo do idioma "${u.locale}". Tente novamente.`);
        setSaving(false);
        return;
      }
    }

    // A future schedule only applies when actually publishing — saving as
    // draft always takes priority over any pending schedule. Editing an
    // already-published document with a future schedule set is exactly
    // "unpublish now, publish again at the scheduled time": status flips to
    // 'Agendado' immediately (so it stops showing on the site right away)
    // and the pg_cron job (auto-publish-scheduled-documents) flips it back
    // to 'Publicado' once schedule_at arrives.
    let scheduleAtIso: string | null = null;
    let status: DocStatus = asDraft ? 'Rascunho' : 'Publicado';
    if (!asDraft && form.scheduleEnabled && form.scheduleDate && form.scheduleTime) {
      const scheduled = new Date(`${form.scheduleDate}T${form.scheduleTime}`);
      if (!Number.isNaN(scheduled.getTime()) && scheduled.getTime() > Date.now()) {
        scheduleAtIso = scheduled.toISOString();
        status = 'Agendado';
      }
    }

    const primaryEntry = arquivosPatch[primaryLocale];
    const idiomasWithContent = Object.keys(arquivosPatch);
    // "Todas as páginas" is stored as every compatible page id, not an empty
    // array — an empty array can never match the site's contains-filter
    // query, so the document would never actually render anywhere.
    const paginaIdsToSave = form.allPages ? compatiblePageIds : form.paginaIds;

    const patch: Record<string, unknown> = {
      entity_id: form.entityId || activeEntity,
      titulo: titulos,
      status,
      schedule_at: scheduleAtIso,
      pagina_ids: paginaIdsToSave,
      sub_group_ids: form.subGroupIds,
      idiomas: idiomasWithContent.length ? idiomasWithContent : [primaryLocale],
      pt_only: ptOnly,
      arquivos: arquivosPatch,
      external_link: primaryEntry?.externalLink ?? null,
      file_path: primaryEntry?.filePath ?? null,
      ultimo_editor: userName,
      updated_at: now,
    };

    const { error } = form.editingId
      ? await supabase.from('portal_documents').update(patch).eq('id', form.editingId)
      : await supabase.from('portal_documents').insert({
          id: docId,
          portal_id: portalDbId,
          tipo: 'Documento',
          publicado_por: userName,
          ...patch,
        });

    if (!error) {
      if (form.pendingStorageDeletes.length > 0) {
        await supabase.storage.from(DOCS_BUCKET).remove(form.pendingStorageDeletes);
      }
      closeDrawer();
      await loadDocs();
      logActivity({
        portalId: portalDbId,
        userName,
        userEmail: user?.email ?? '',
        action: status === 'Agendado' ? 'agendou' : form.editingId ? 'editou' : asDraft ? 'adicionou' : 'publicou',
        category: 'documento',
        entity: primaryTitle,
      });
      if (status === 'Publicado') {
        setPublishSuccessSchedule(null);
        setPublishSuccess(true);
      } else if (status === 'Agendado' && scheduleAtIso) {
        setPublishSuccessSchedule(new Date(scheduleAtIso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
        setPublishSuccess(true);
      }
    } else {
      console.error('save failed', error);
      setSaveError('Falha ao salvar o documento. Tente novamente.');
      // New uploads for this attempt are now orphaned — clean them up so a
      // failed save doesn't leave stray objects in storage.
      const orphanPaths = uploads.map(u => u.path);
      if (orphanPaths.length > 0) await supabase.storage.from(DOCS_BUCKET).remove(orphanPaths);
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
    const targets = docs.filter(d => ids.includes(d.id));
    const names = targets.map(d => d.nome).join(', ');
    // Every language's own file gets removed, not just the primary one —
    // otherwise a deleted document leaves every non-primary locale's file
    // as an orphan in storage forever.
    const paths = targets.flatMap(d => {
      const fromArquivos = Object.values(d.arquivos ?? {}).map(a => a.filePath).filter((p): p is string => !!p);
      return fromArquivos.length > 0 ? fromArquivos : (d.filePath ? [d.filePath] : []);
    });
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
    { key: 'status', label: 'Status', options: [{ value: '', label: 'Todos os status', shortLabel: 'Todos' }, { value: 'Publicado', label: 'Publicado' }, { value: 'Agendado', label: 'Agendado' }, { value: 'Rascunho', label: 'Rascunho' }] },
  ];

  const primaryTitle = (form.titulos[primaryLocale] ?? '').trim();
  // Recomputed on every render (not memoized) so the "now" comparison below
  // stays accurate as the user sits on the form — a stale value would let a
  // date picked as "today" silently drift into the past.
  const nowForSchedule = new Date();
  const todayStr = nowForSchedule.toISOString().slice(0, 10);
  const nowTimeStr = nowForSchedule.toTimeString().slice(0, 5);
  const scheduleInPast = form.scheduleEnabled && !!form.scheduleDate && !!form.scheduleTime
    && new Date(`${form.scheduleDate}T${form.scheduleTime}`).getTime() <= Date.now();
  const activeLocaleFile = getLocaleFile(form, ptOnly ? primaryLocale : docLocale);
  const canSave = !!primaryTitle && (form.allPages || form.paginaIds.length > 0)
    && localeFileHasContent(getLocaleFile(form, primaryLocale));

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
                  <td><span className={`badge ${statusBadgeClass(doc.status)}`}>{doc.status}</span></td>
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
                        onClick={() => openEdit(doc)}>Editar</button>
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
                  <span className={`badge ${statusBadgeClass(doc.status)}`}>{doc.status}</span>
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
                  onClick={() => openEdit(doc)}>Editar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── New / Edit document drawer — same form either way, only the
          entity id changes what gets written (insert vs update) ── */}
      <Modal open={drawerOpen} onClose={closeDrawer} title={form.editingId ? 'Editar documento' : 'Novo documento'} size="md" variant="side"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={closeDrawer}>Cancelar</button>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button type="button" className="btn-outline" onClick={() => handleSave(true)} disabled={!primaryTitle || saving}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>draft</span>
                Salvar rascunho
              </button>
              <button type="button" className="btn-primary" onClick={() => handleSave(false)} disabled={!canSave || saving}>
                {saving
                  ? (form.scheduleEnabled ? 'Agendando…' : 'Publicando…')
                  : (form.scheduleEnabled && form.scheduleDate && form.scheduleTime ? 'Agendar publicação' : form.editingId ? 'Salvar e publicar' : 'Publicar')}
              </button>
            </div>
          </div>
        }>
        <div className="doc-modal-body">
          {saveError && <p className="doc-field__error">{saveError}</p>}
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

          {PORTAL_CONFIG.languages.length > 1 && (docLocale === primaryLocale || ptOnly) && (
            <label className="doc-pt-only-row">
              <span className="doc-pt-only-label">
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>translate</span>
                Apenas Português
                <span className="doc-pt-only-hint">O mesmo arquivo será exibido em todos os idiomas</span>
              </span>
              <button type="button" className={`cdr2-toggle${ptOnly ? ' cdr2-toggle--on' : ''}`}
                onClick={() => { setPtOnly(v => !v); setDocLocale(primaryLocale); }} aria-pressed={ptOnly}>
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
            <button type="button" className={`doc-source-toggle__btn${!activeLocaleFile.isExternalLink ? ' doc-source-toggle__btn--active' : ''}`}
              onClick={() => patchLocaleFile(ptOnly ? primaryLocale : docLocale, { isExternalLink: false })}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>upload_file</span>Arquivo
            </button>
            <button type="button" className={`doc-source-toggle__btn${activeLocaleFile.isExternalLink ? ' doc-source-toggle__btn--active' : ''}`}
              onClick={() => {
                if (activeLocaleFile.existingPath) queueStorageDelete(activeLocaleFile.existingPath);
                patchLocaleFile(ptOnly ? primaryLocale : docLocale, { isExternalLink: true, file: null, existingPath: undefined });
              }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>open_in_new</span>Link externo
            </button>
          </div>

          {!ptOnly && PORTAL_CONFIG.languages.length > 1 && (
            <p className="doc-field__hint" style={{ marginTop: '-8px' }}>
              Arquivo/link específico para o idioma <strong>{docLocale}</strong> — deixe vazio se este documento não estiver disponível neste idioma.
            </p>
          )}

          {activeLocaleFile.isExternalLink ? (
            <div className="doc-field">
              <label className="doc-field__label">URL do documento{docLocale === primaryLocale || ptOnly ? ' *' : ''}</label>
              <input className="doc-field__input" type="url" placeholder="https://..."
                value={activeLocaleFile.externalUrl}
                onChange={e => patchLocaleFile(ptOnly ? primaryLocale : docLocale, { externalUrl: e.target.value })} />
              <span className="doc-field__hint">O documento abrirá em nova aba ao ser acessado no portal.</span>
            </div>
          ) : activeLocaleFile.existingPath && !activeLocaleFile.file ? (
            <div className="doc-upload doc-upload--filled">
              <div className="doc-upload__file">
                <span className="material-symbols-outlined doc-upload__file-icon">picture_as_pdf</span>
                <div className="doc-upload__file-info">
                  <span className="doc-upload__file-name">{activeLocaleFile.existingPath.split('/').pop()}</span>
                  <span className="doc-upload__file-size">Arquivo já enviado</span>
                </div>
                <button type="button" className="doc-upload__file-remove"
                  onClick={() => { queueStorageDelete(activeLocaleFile.existingPath); patchLocaleFile(ptOnly ? primaryLocale : docLocale, { existingPath: undefined }); }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                </button>
              </div>
            </div>
          ) : (
            <div className={`doc-upload${dragActive ? ' doc-upload--active' : ''}${activeLocaleFile.file ? ' doc-upload--filled' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => !activeLocaleFile.file && fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
                onChange={e => {
                  const f = e.target.files?.[0];
                  // Reset so the native input never holds on to the previous
                  // locale's file — without this, some browsers' file dialog
                  // re-opens pre-highlighting the last pick, and confirming it
                  // without changing anything can silently reuse the SAME file
                  // for the next locale instead of prompting a fresh choice.
                  e.target.value = '';
                  if (f) handleFile(ptOnly ? primaryLocale : docLocale, f);
                }} />
              {activeLocaleFile.file ? (
                <div className="doc-upload__file">
                  <span className="material-symbols-outlined doc-upload__file-icon">picture_as_pdf</span>
                  <div className="doc-upload__file-info">
                    <span className="doc-upload__file-name">{activeLocaleFile.file.name}</span>
                    <span className="doc-upload__file-size">{(activeLocaleFile.file.size / 1024).toFixed(0)} KB</span>
                  </div>
                  <button type="button" className="doc-upload__file-remove"
                    onClick={e => { e.stopPropagation(); patchLocaleFile(ptOnly ? primaryLocale : docLocale, { file: null }); }}>
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
            {form.editingId && (
              <p className="doc-field__hint">
                Marcar aqui despublica o documento agora e o publica automaticamente no horário definido.
              </p>
            )}
            {form.scheduleEnabled && (
              <>
                <div className="doc-schedule-row">
                  <input className="doc-field__input" type="date" min={todayStr}
                    value={form.scheduleDate}
                    onChange={e => {
                      const date = e.target.value;
                      // Moving off today drops a stale "must be after now" time
                      // that's no longer relevant to the min for the new date.
                      const time = date === todayStr && form.scheduleTime < nowTimeStr ? '' : form.scheduleTime;
                      setForm(f => ({ ...f, scheduleDate: date, scheduleTime: time }));
                    }} />
                  <input className="doc-field__input" type="time"
                    min={form.scheduleDate === todayStr ? nowTimeStr : undefined}
                    value={form.scheduleTime} onChange={e => patchForm('scheduleTime', e.target.value)} />
                </div>
                {scheduleInPast && (
                  <p className="doc-field__error">A data e hora de agendamento devem ser posteriores ao momento atual.</p>
                )}
              </>
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
        title={publishSuccessSchedule ? 'Documento agendado!' : 'Documento publicado!'}
        desc={publishSuccessSchedule ? `Será publicado automaticamente em ${publishSuccessSchedule}.` : undefined}
      />
    </div>
  );
}
