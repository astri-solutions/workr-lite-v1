import { useState, useRef, useEffect, useCallback } from 'react';
import { processImage } from '../../utils/imageProcessor';
import StickyPageHeader from '../../components/StickyPageHeader';
import Modal from '../../components/Modal';
import FileDropzone from '../../components/FileDropzone';
import FilterBar from '../../components/FilterBar';
import SearchInput from '../../components/SearchInput';
import { useSort } from '../../hooks/useSort';
import SortIcon from '../../components/SortIcon';
import { usePortalName } from '../../hooks/usePortalName';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { resolvePortalId } from '../../lib/portalDb';
import { logActivity } from '../../lib/activityLog';
import '../admin/AdminPages.css';
import './MidiaPage.css';

const MEDIA_BUCKET = 'portal-media';

type FileType = 'image' | 'pdf' | 'doc' | 'xls' | 'ppt' | 'video' | 'other';
type ViewMode = 'grid' | 'list';

interface MediaFile {
  id: string;
  name: string;
  type: FileType;
  size: string;
  url: string | null;
  filePath?: string;
  previewUrl?: string;
  uploadedAt: string;
  dimensions?: string;
  ratio?: string;
  tags: string[];
  uploadedBy: string;
  copyright?: string;
  notes?: string;
  titulo?: string;
  alt?: string;
  legenda?: string;
  descricao?: string;
  link?: string;
}

function dbToMedia(r: Record<string, unknown>): MediaFile {
  const filePath = r.file_path as string | null;
  const publicUrl = filePath && supabase
    ? supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath).data.publicUrl
    : null;
  return {
    id: r.id as string,
    name: r.name as string,
    type: r.type as FileType,
    size: fmtSize(Number(r.size_bytes ?? 0)),
    url: publicUrl ?? (r.external_url as string | null),
    filePath: filePath ?? undefined,
    previewUrl: r.type === 'image' ? (publicUrl ?? (r.external_url as string | undefined)) : undefined,
    uploadedAt: new Date(r.created_at as string).toLocaleDateString('pt-BR'),
    tags: (r.tags as string[]) ?? [],
    uploadedBy: (r.uploaded_by as string) || '',
    titulo: (r.titulo as string) ?? undefined,
    alt: (r.alt as string) ?? undefined,
    legenda: (r.legenda as string) ?? undefined,
    descricao: (r.descricao as string) ?? undefined,
    link: (r.link as string) ?? undefined,
  };
}

interface UploadForm {
  titulo: string;
  alt: string;
  descricao: string;
  tags: string[];
  link: string;
  tagInput: string;
}

const EMPTY_UPLOAD_FORM: UploadForm = { titulo: '', alt: '', descricao: '', tags: [], link: '', tagInput: '' };

function detectType(file: File): FileType {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type.startsWith('video/')) return 'video';
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (['doc', 'docx'].includes(ext)) return 'doc';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'xls';
  if (['ppt', 'pptx'].includes(ext)) return 'ppt';
  return 'other';
}

function extType(name: string): FileType {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg','jpeg','png','webp','svg','gif','bmp','avif'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['doc','docx'].includes(ext)) return 'doc';
  if (['xls','xlsx','csv'].includes(ext)) return 'xls';
  if (['ppt','pptx'].includes(ext)) return 'ppt';
  if (['mp4','mov','avi','webm','mkv'].includes(ext)) return 'video';
  return 'other';
}

function extLabel(name: string): string {
  return (name.split('.').pop() ?? '').toUpperCase();
}

function fmtSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? (bytes / 1024 / 1024).toFixed(1) + ' MB'
    : Math.round(bytes / 1024) + ' KB';
}

function DocThumb({ type, size = 'md' }: { type: FileType; size?: 'sm' | 'md' | 'lg' }) {
  const cfg: Record<string, { bg: string; label: string; icon: React.ReactNode }> = {
    pdf: { bg: '#fef2f2', label: 'PDF', icon: <path d="M9 12h6M9 16h4M14 3v5h5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/> },
    doc: { bg: '#eff6ff', label: 'DOC', icon: <path d="M9 12h6M9 16h6M9 8h4M14 3v5h5" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round"/> },
    xls: { bg: '#f0fdf4', label: 'XLS', icon: <><path d="M9 9l6 6M15 9l-6 6" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/><path d="M14 3v5h5" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/></> },
    ppt: { bg: '#fff7ed', label: 'PPT', icon: <><ellipse cx="11" cy="12" rx="3" ry="3" stroke="#ea580c" strokeWidth="1.5"/><path d="M14 3v5h5" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round"/></> },
    video: { bg: '#faf5ff', label: 'VID', icon: <><polygon points="10,9 16,12 10,15" fill="#7c3aed"/><rect x="4" y="6" width="16" height="12" rx="2" stroke="#7c3aed" strokeWidth="1.5" fill="none"/></> },
    image: { bg: '#f0f9ff', label: 'IMG', icon: <><rect x="4" y="4" width="16" height="16" rx="1" stroke="#0284c7" strokeWidth="1.5" fill="none"/><circle cx="8.5" cy="8.5" r="1.5" fill="#0284c7"/><path d="M4 15l5-5 3 3 2-2 5 5" stroke="#0284c7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></> },
    other: { bg: '#f9fafb', label: 'ARQ', icon: <path d="M14 3v5h5" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/> },
  };
  const c = cfg[type] ?? cfg.other;
  const sz = size === 'lg' ? 32 : size === 'sm' ? 16 : 22;
  return (
    <div className={`midia-thumb midia-thumb--doc midia-thumb--${size}`} style={{ background: c.bg }}>
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
        {type !== 'image' && (
          <>
            <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeWidth="1.5" fill={c.bg}/>
            <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          </>
        )}
        {c.icon}
      </svg>
      <span className="midia-thumb__label">{c.label}</span>
    </div>
  );
}

const INITIAL: MediaFile[] = [];

const TYPE_LABEL: Record<FileType, string> = {
  image: 'Imagem', pdf: 'PDF', doc: 'Word', xls: 'Planilha', ppt: 'Apresentação', video: 'Vídeo', other: 'Outro',
};

const MIDIA_FILTERS = [
  {
    key: 'tipo',
    label: 'Tipo',
    options: [
      { value: '', label: 'Todos os tipos', shortLabel: 'Todos' },
      { value: 'image', label: 'Imagens' },
      { value: 'pdf', label: 'PDFs' },
      { value: 'doc', label: 'Word' },
      { value: 'xls', label: 'Planilhas' },
      { value: 'ppt', label: 'Apresentações' },
      { value: 'video', label: 'Vídeos' },
    ],
  },
];

function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1"/>
      <rect x="9" y="1" width="6" height="6" rx="1"/>
      <rect x="1" y="9" width="6" height="6" rx="1"/>
      <rect x="9" y="9" width="6" height="6" rx="1"/>
    </svg>
  );
}
function IconList() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="4" y1="4" x2="14" y2="4"/>
      <line x1="4" y1="8" x2="14" y2="8"/>
      <line x1="4" y1="12" x2="14" y2="12"/>
      <circle cx="1.5" cy="4" r="1" fill="currentColor" stroke="none"/>
      <circle cx="1.5" cy="8" r="1" fill="currentColor" stroke="none"/>
      <circle cx="1.5" cy="12" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
}

export default function MidiaPage() {
  const portalName = usePortalName();
  const { user } = useAuth();
  const [portalDbId, setPortalDbId] = useState<string | null>(null);
  const [files, setFiles] = useState<MediaFile[]>(INITIAL);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ tipo: '' });
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [addTagId, setAddTagId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Upload modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState<'computer' | 'url'>('computer');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingUrl, setPendingUrl] = useState('');
  const [uploadForm, setUploadForm] = useState<UploadForm>(EMPTY_UPLOAD_FORM);

  // Replace modal
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [replacePendingFile, setReplacePendingFile] = useState<File | null>(null);

  const replaceTarget = files.find(f => f.id === replaceTargetId) ?? null;
  const selectedFile = files.find(f => f.id === selectedId) ?? null;

  useEffect(() => {
    const portalKey = user?.activePortalId;
    if (!portalKey) return;
    resolvePortalId(portalKey).then(id => setPortalDbId(id));
  }, [user?.activePortalId]);

  const loadFiles = useCallback(async () => {
    if (!portalDbId || !isSupabaseConfigured || !supabase) return;
    const { data } = await supabase
      .from('portal_media')
      .select('*')
      .eq('portal_id', portalDbId)
      .order('created_at', { ascending: false });
    if (data) setFiles((data as Record<string, unknown>[]).map(dbToMedia));
  }, [portalDbId]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const _filtered = files.filter(f => {
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.tipo && f.type !== filters.tipo) return false;
    return true;
  });
  const { sorted: filtered, col: sortCol, dir: sortDir, toggle: sortToggle } = useSort(_filtered);

  const userName = user?.name ?? user?.email ?? '';

  async function confirmUpload() {
    if (!portalDbId || !supabase) return;
    const meta = {
      titulo: uploadForm.titulo || null,
      alt: uploadForm.alt || null,
      descricao: uploadForm.descricao || null,
      tags: uploadForm.tags,
      link: uploadForm.link || null,
    };

    if (uploadTab === 'computer' && pendingFile) {
      const type = detectType(pendingFile);
      let uploadFile = pendingFile;
      if (type === 'image') {
        const result = await processImage(pendingFile, 'media-library');
        uploadFile = result.file;
      }
      const newId = crypto.randomUUID();
      const ext = uploadFile.name.split('.').pop()?.toLowerCase() ?? 'bin';
      const filePath = `${portalDbId}/${newId}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(filePath, uploadFile, { upsert: false });
      if (uploadError) {
        console.error('media upload failed', uploadError);
        alert(`Não foi possível enviar o arquivo: ${uploadError.message}`);
        return;
      }

      const { error } = await supabase.from('portal_media').insert({
        id: newId,
        portal_id: portalDbId,
        name: uploadFile.name,
        type,
        size_bytes: uploadFile.size,
        file_path: filePath,
        uploaded_by: userName,
        ...meta,
      });
      if (error) {
        console.error('media insert failed', error);
        await supabase.storage.from(MEDIA_BUCKET).remove([filePath]);
        alert(`Não foi possível salvar o arquivo: ${error.message}`);
        return;
      }
      await loadFiles();
      setSelectedId(newId);
      logActivity({
        portalId: portalDbId,
        userName,
        userEmail: user?.email ?? '',
        action: 'fez_upload',
        category: 'midia',
        entity: uploadFile.name,
      });
    } else if (uploadTab === 'url' && pendingUrl.trim()) {
      const name = pendingUrl.split('/').pop() ?? 'arquivo';
      const type = extType(name);
      const newId = crypto.randomUUID();
      const { error } = await supabase.from('portal_media').insert({
        id: newId,
        portal_id: portalDbId,
        name,
        type,
        size_bytes: 0,
        external_url: pendingUrl.trim(),
        uploaded_by: userName,
        ...meta,
      });
      if (error) {
        console.error('media insert (url) failed', error);
        alert(`Não foi possível salvar o arquivo: ${error.message}`);
        return;
      }
      await loadFiles();
      setSelectedId(newId);
      logActivity({
        portalId: portalDbId,
        userName,
        userEmail: user?.email ?? '',
        action: 'adicionou',
        category: 'midia',
        entity: name,
      });
    }
    setPendingFile(null);
    setPendingUrl('');
    setUploadForm(EMPTY_UPLOAD_FORM);
    setUploadModalOpen(false);
  }

  function openReplaceModal(id: string) {
    setReplacePendingFile(null);
    setReplaceTargetId(id);
  }

  async function confirmReplace() {
    if (!replacePendingFile || !replaceTargetId || !portalDbId || !supabase) return;
    const target = files.find(f => f.id === replaceTargetId);
    const type = detectType(replacePendingFile);
    let uploadFile = replacePendingFile;
    if (type === 'image') {
      const result = await processImage(replacePendingFile, 'media-library');
      uploadFile = result.file;
    }
    const ext = uploadFile.name.split('.').pop()?.toLowerCase() ?? 'bin';
    const newPath = `${portalDbId}/${replaceTargetId}.${ext}`;
    if (target?.filePath && target.filePath !== newPath) {
      await supabase.storage.from(MEDIA_BUCKET).remove([target.filePath]);
    }
    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(newPath, uploadFile, { upsert: true });
    if (uploadError) { console.error('media replace upload failed', uploadError); return; }

    await supabase.from('portal_media').update({
      name: uploadFile.name,
      type,
      size_bytes: uploadFile.size,
      file_path: newPath,
      uploaded_by: userName,
    }).eq('id', replaceTargetId);

    setReplaceTargetId(null);
    setReplacePendingFile(null);
    await loadFiles();
  }

  async function deleteFile(id: string) {
    if (!supabase || !portalDbId) return;
    const target = files.find(f => f.id === id);
    await supabase.from('portal_media').delete().eq('id', id);
    if (target?.filePath) await supabase.storage.from(MEDIA_BUCKET).remove([target.filePath]);
    if (selectedId === id) setSelectedId(null);
    await loadFiles();
    logActivity({
      portalId: portalDbId,
      userName,
      userEmail: user?.email ?? '',
      action: 'removeu',
      category: 'midia',
      entity: target?.name ?? '',
    });
  }

  async function handleAddTag(id: string) {
    const tag = newTag.trim();
    setAddTagId(null);
    if (!tag || !supabase) { setNewTag(''); return; }
    const target = files.find(f => f.id === id);
    const nextTags = [...(target?.tags ?? []), tag];
    setFiles(prev => prev.map(f => f.id === id ? { ...f, tags: nextTags } : f));
    setNewTag('');
    await supabase.from('portal_media').update({ tags: nextTags }).eq('id', id);
  }

  async function removeTag(id: string, tag: string) {
    if (!supabase) return;
    const target = files.find(f => f.id === id);
    const nextTags = (target?.tags ?? []).filter(t => t !== tag);
    setFiles(prev => prev.map(f => f.id === id ? { ...f, tags: nextTags } : f));
    await supabase.from('portal_media').update({ tags: nextTags }).eq('id', id);
  }

  const MEDIA_FIELD_COLUMN: Partial<Record<keyof MediaFile, string>> = {
    titulo: 'titulo', alt: 'alt', legenda: 'legenda', descricao: 'descricao',
  };

  function patchFile<K extends keyof MediaFile>(id: string, key: K, value: MediaFile[K]) {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, [key]: value } : f));
    const column = MEDIA_FIELD_COLUMN[key];
    if (!column || !supabase) return;
    supabase.from('portal_media').update({ [column]: value }).eq('id', id).then(({ error }) => {
      if (error) console.error('media field update failed', error);
    });
  }

  const canUpload = uploadTab === 'computer' ? !!pendingFile : !!pendingUrl.trim();

  return (
    <div className="page">
      <StickyPageHeader
        title="Biblioteca de Mídia"
        description={<>Biblioteca de mídia do portal <strong>{portalName}</strong>.</>}
        action={
          <button className="btn-primary" type="button" onClick={() => { setPendingFile(null); setPendingUrl(''); setUploadTab('computer'); setUploadForm(EMPTY_UPLOAD_FORM); setUploadModalOpen(true); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Enviar arquivo
          </button>
        }
      />

      <input ref={inputRef} type="file" multiple style={{ display: 'none' }} />

      <div className="toolbar">
        <div className="toolbar__filters">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar arquivo..." />
          <FilterBar groups={MIDIA_FILTERS} value={filters} onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} />
        </div>
        <div className="toolbar__actions">
          <div className="midia-view-toggle">
            <button
              type="button"
              className={`midia-view-btn${viewMode === 'grid' ? ' midia-view-btn--active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Visualização em grade"
            >
              <IconGrid />
            </button>
            <button
              type="button"
              className={`midia-view-btn${viewMode === 'list' ? ' midia-view-btn--active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Visualização em lista"
            >
              <IconList />
            </button>
          </div>
          <span className="toolbar__count">{filtered.length} arquivo{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="page-placeholder">
          <svg className="page-placeholder__icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <h2>Nenhum arquivo encontrado</h2>
          <p>Envie imagens, PDFs ou vídeos para a biblioteca.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── GRID VIEW ── */
        <div className={`midia-workspace${selectedFile ? ' midia-workspace--with-panel' : ''}`}>
          <div className="midia-grid">
            {filtered.map(f => (
              <div
                key={f.id}
                className={`midia-card${selectedId === f.id ? ' midia-card--active' : ''}`}
                onClick={() => setSelectedId(prev => prev === f.id ? null : f.id)}
              >
                <div className="midia-card__thumb">
                  {f.type === 'image' && f.previewUrl ? (
                    <img className="midia-card__img" src={f.previewUrl} alt={f.name} />
                  ) : (
                    <DocThumb type={f.type} size="lg" />
                  )}
                </div>
                <div className="midia-card__body">
                  <p className="midia-card__name" title={f.name}>{f.name}</p>
                  {f.dimensions && <p className="midia-card__dim">{f.dimensions}</p>}
                  <div className="midia-card__chips">
                    <span className="midia-chip midia-chip--ext">{extLabel(f.name)}</span>
                    {f.tags.map(t => (
                      <span key={t} className="midia-chip midia-chip--tag" onClick={e => { e.stopPropagation(); removeTag(f.id, t); }}>
                        {t} ×
                      </span>
                    ))}
                  </div>
                  {addTagId === f.id ? (
                    <div className="midia-tag-input-wrap" onClick={e => e.stopPropagation()}>
                      <input
                        autoFocus
                        className="midia-tag-input"
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddTag(f.id); if (e.key === 'Escape') setAddTagId(null); }}
                        placeholder="Nova tag..."
                      />
                      <button type="button" className="midia-tag-confirm" onClick={() => handleAddTag(f.id)}>✓</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="midia-add-tag"
                      onClick={e => { e.stopPropagation(); setAddTagId(f.id); setNewTag(''); }}
                    >
                      + Adicionar tag
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {selectedFile && (
            <div className="midia-detail">
              <div className="midia-detail__preview">
                {selectedFile.type === 'image' && selectedFile.previewUrl ? (
                  <img className="midia-detail__img" src={selectedFile.previewUrl} alt={selectedFile.name} />
                ) : (
                  <DocThumb type={selectedFile.type} size="lg" />
                )}
              </div>

              <div className="midia-detail__meta">
                <p className="midia-detail__meta-row"><strong>Upload feito em:</strong> {selectedFile.uploadedAt}</p>
                <p className="midia-detail__meta-row"><strong>Enviado por:</strong> {selectedFile.uploadedBy}</p>
                <p className="midia-detail__meta-row"><strong>Nome do arquivo:</strong> {selectedFile.name}</p>
                <p className="midia-detail__meta-row"><strong>Tipo do arquivo:</strong> {TYPE_LABEL[selectedFile.type]}</p>
                <p className="midia-detail__meta-row"><strong>Tamanho do arquivo:</strong> {selectedFile.size}</p>
                {selectedFile.dimensions && (
                  <p className="midia-detail__meta-row"><strong>Dimensões:</strong> {selectedFile.dimensions}</p>
                )}
              </div>

              <div className="midia-detail__divider" />

              <div className="midia-detail__form">
                {selectedFile.type === 'image' && (
                  <div className="midia-detail__form-field">
                    <label className="midia-detail__form-label">Texto alternativo</label>
                    <textarea
                      className="midia-detail__form-textarea"
                      rows={2}
                      value={selectedFile.alt ?? ''}
                      onChange={e => patchFile(selectedFile.id, 'alt', e.target.value)}
                      placeholder="Descreva a imagem para acessibilidade…"
                    />
                  </div>
                )}
                <div className="midia-detail__form-field">
                  <label className="midia-detail__form-label">Título</label>
                  <input
                    className="midia-detail__form-input"
                    type="text"
                    value={selectedFile.titulo ?? selectedFile.name.replace(/\.[^.]+$/, '')}
                    onChange={e => patchFile(selectedFile.id, 'titulo', e.target.value)}
                  />
                </div>
                <div className="midia-detail__form-field">
                  <label className="midia-detail__form-label">Legenda</label>
                  <textarea
                    className="midia-detail__form-textarea"
                    rows={2}
                    value={selectedFile.legenda ?? ''}
                    onChange={e => patchFile(selectedFile.id, 'legenda', e.target.value)}
                  />
                </div>
                <div className="midia-detail__form-field">
                  <label className="midia-detail__form-label">Descrição</label>
                  <textarea
                    className="midia-detail__form-textarea"
                    rows={3}
                    value={selectedFile.descricao ?? ''}
                    onChange={e => patchFile(selectedFile.id, 'descricao', e.target.value)}
                  />
                </div>
                <div className="midia-detail__form-field">
                  <label className="midia-detail__form-label">URL do arquivo</label>
                  <input
                    className="midia-detail__form-input midia-detail__form-input--readonly"
                    type="text"
                    readOnly
                    value={selectedFile.url ?? ''}
                  />
                  <button
                    type="button"
                    className="midia-detail__copy-btn"
                    disabled={!selectedFile.url}
                    onClick={() => {
                      if (!selectedFile.url) return;
                      navigator.clipboard.writeText(selectedFile.url).catch(() => {});
                      setCopiedUrl(true);
                      setTimeout(() => setCopiedUrl(false), 2000);
                    }}
                  >
                    {copiedUrl ? 'Copiado!' : 'Copiar URL'}
                  </button>
                </div>
              </div>

              <div className="midia-detail__divider" />

              <div className="midia-detail__links">
                <button type="button" className="midia-detail__link" onClick={() => openReplaceModal(selectedFile.id)}>Substituir arquivo</button>
                <span className="midia-detail__link-sep">|</span>
                <button type="button" className="midia-detail__link midia-detail__link--danger" onClick={() => deleteFile(selectedFile.id)}>Excluir permanentemente</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── LIST VIEW ── */
        <div className="table-wrapper table-wrapper--responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th className="midia-col-thumb"></th>
                <th className={`th-sort${sortCol === 'name' ? ' th-sort--active' : ''}`} onClick={() => sortToggle('name')}><span className="th-sort-inner">Arquivo <SortIcon dir={sortCol === 'name' ? sortDir : null} /></span></th>
                <th className={`th-sort${sortCol === 'type' ? ' th-sort--active' : ''}`} onClick={() => sortToggle('type')}><span className="th-sort-inner">Tipo <SortIcon dir={sortCol === 'type' ? sortDir : null} /></span></th>
                <th className={`th-sort${sortCol === 'size' ? ' th-sort--active' : ''}`} onClick={() => sortToggle('size')}><span className="th-sort-inner">Tamanho <SortIcon dir={sortCol === 'size' ? sortDir : null} /></span></th>
                <th>Dimensões</th>
                <th className={`th-sort${sortCol === 'uploadedAt' ? ' th-sort--active' : ''}`} onClick={() => sortToggle('uploadedAt')}><span className="th-sort-inner">Data de envio <SortIcon dir={sortCol === 'uploadedAt' ? sortDir : null} /></span></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id}>
                  <td className="midia-col-thumb">
                    {f.type === 'image' && f.previewUrl ? (
                      <img className="midia-thumb midia-thumb--img" src={f.previewUrl} alt={f.name} />
                    ) : (
                      <DocThumb type={f.type} />
                    )}
                  </td>
                  <td>
                    <div>
                      <span className="table-cell--bold">{f.name}</span>
                      {f.tags.length > 0 && (
                        <div className="midia-list-chips">
                          {f.tags.map(t => <span key={t} className="midia-chip midia-chip--tag">{t}</span>)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="table-cell--muted">{TYPE_LABEL[f.type]}</td>
                  <td className="table-cell--muted">{f.size}</td>
                  <td className="table-cell--muted">{f.dimensions ?? '—'}</td>
                  <td className="table-cell--muted">{f.uploadedAt}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-action btn-action--secondary" type="button" onClick={() => openReplaceModal(f.id)}>Substituir</button>
                      <button className="btn-action btn-action--danger" type="button" onClick={() => deleteFile(f.id)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload modal — Pinterest style */}
      <Modal
        open={uploadModalOpen}
        onClose={() => { setUploadModalOpen(false); setPendingFile(null); setPendingUrl(''); setUploadForm(EMPTY_UPLOAD_FORM); }}
        title="Enviar arquivo"
        size="xl"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={() => { setUploadModalOpen(false); setPendingFile(null); setPendingUrl(''); setUploadForm(EMPTY_UPLOAD_FORM); }}>Cancelar</button>
            <button type="button" className="btn-primary" disabled={!canUpload} onClick={confirmUpload}>
              Enviar
            </button>
          </div>
        }
      >
        <div className="midia-pin-layout">
          {/* Left: source + preview */}
          <div className="midia-pin-left">
            <div className="midia-upload-tabs midia-upload-tabs--inline">
              <button
                type="button"
                className={`midia-upload-tab${uploadTab === 'computer' ? ' midia-upload-tab--active' : ''}`}
                onClick={() => setUploadTab('computer')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/>
                  <line x1="12" y1="17" x2="12" y2="3"/>
                </svg>
                Computador
              </button>
              <button
                type="button"
                className={`midia-upload-tab${uploadTab === 'url' ? ' midia-upload-tab--active' : ''}`}
                onClick={() => setUploadTab('url')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                URL
              </button>
            </div>

            <div className="midia-pin-drop">
              {uploadTab === 'computer' ? (
                pendingFile && detectType(pendingFile) === 'image' ? (
                  <div className="midia-pin-preview">
                    <img
                      className="midia-pin-preview__img"
                      src={URL.createObjectURL(pendingFile)}
                      alt="preview"
                    />
                    <button
                      type="button"
                      className="midia-pin-preview__change"
                      onClick={() => setPendingFile(null)}
                    >Trocar arquivo</button>
                  </div>
                ) : pendingFile ? (
                  <div className="midia-pin-preview midia-pin-preview--doc">
                    <DocThumb type={detectType(pendingFile)} size="lg" />
                    <p className="midia-pin-preview__name">{pendingFile.name}</p>
                    <button
                      type="button"
                      className="midia-pin-preview__change"
                      onClick={() => setPendingFile(null)}
                    >Trocar arquivo</button>
                  </div>
                ) : (
                  <FileDropzone
                    file={null}
                    onChange={setPendingFile}
                    accept=".jpg,.jpeg,.png,.webp,.svg,.gif,.pdf,.mp4,.mov,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    hint="Imagens, PDF, Word, Planilha, Apresentação, Vídeo"
                  />
                )
              ) : (
                <div className="midia-url-upload">
                  <label className="midia-url-label">URL do arquivo</label>
                  <input
                    className="midia-url-input"
                    type="url"
                    placeholder="https://exemplo.com/arquivo.pdf"
                    value={pendingUrl}
                    onChange={e => setPendingUrl(e.target.value)}
                  />
                  <p className="midia-url-hint">Cole o link direto para um arquivo público (JPG, PNG, PDF, MP4…)</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: metadata form */}
          <div className="midia-pin-right">
            <label className="midia-pin-field">
              <span className="midia-pin-label">Título</span>
              <input
                className="midia-pin-input"
                type="text"
                placeholder="Ex: Banner institucional 2026"
                value={uploadForm.titulo}
                onChange={e => setUploadForm(f => ({ ...f, titulo: e.target.value }))}
              />
            </label>

            {(uploadTab === 'computer' ? (pendingFile && detectType(pendingFile) === 'image') : !!pendingUrl) && (
              <label className="midia-pin-field">
                <span className="midia-pin-label">Texto alternativo (Alt)</span>
                <input
                  className="midia-pin-input"
                  type="text"
                  placeholder="Descreva a imagem para acessibilidade"
                  value={uploadForm.alt}
                  onChange={e => setUploadForm(f => ({ ...f, alt: e.target.value }))}
                />
              </label>
            )}

            <label className="midia-pin-field">
              <span className="midia-pin-label">Descrição</span>
              <textarea
                className="midia-pin-textarea"
                placeholder="Adicione uma descrição ou contexto…"
                rows={3}
                value={uploadForm.descricao}
                onChange={e => setUploadForm(f => ({ ...f, descricao: e.target.value }))}
              />
            </label>

            <div className="midia-pin-field">
              <span className="midia-pin-label">Tags</span>
              <div className="midia-pin-tags">
                {uploadForm.tags.map(t => (
                  <span key={t} className="midia-chip midia-chip--tag" onClick={() => setUploadForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))}>
                    {t} ×
                  </span>
                ))}
                <input
                  className="midia-pin-tag-input"
                  type="text"
                  placeholder="Adicionar tag…"
                  value={uploadForm.tagInput}
                  onChange={e => setUploadForm(f => ({ ...f, tagInput: e.target.value }))}
                  onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === ',') && uploadForm.tagInput.trim()) {
                      e.preventDefault();
                      const tag = uploadForm.tagInput.trim().replace(/,$/, '');
                      if (tag && !uploadForm.tags.includes(tag)) {
                        setUploadForm(f => ({ ...f, tags: [...f.tags, tag], tagInput: '' }));
                      } else {
                        setUploadForm(f => ({ ...f, tagInput: '' }));
                      }
                    }
                  }}
                />
              </div>
              <p className="midia-pin-hint">Pressione Enter ou vírgula para adicionar</p>
            </div>

            <label className="midia-pin-field">
              <span className="midia-pin-label">Link de destino</span>
              <input
                className="midia-pin-input"
                type="url"
                placeholder="https://exemplo.com"
                value={uploadForm.link}
                onChange={e => setUploadForm(f => ({ ...f, link: e.target.value }))}
              />
            </label>
          </div>
        </div>
      </Modal>

      {/* Replace modal */}
      <Modal
        open={!!replaceTargetId}
        onClose={() => setReplaceTargetId(null)}
        title="Substituir arquivo"
        size="sm"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={() => setReplaceTargetId(null)}>Cancelar</button>
            <button type="button" className="btn-primary" disabled={!replacePendingFile} onClick={confirmReplace}>
              Substituir
            </button>
          </div>
        }
      >
        {replaceTarget && (
          <p className="midia-replace-info">
            Substituindo: <strong>{replaceTarget.name}</strong>
          </p>
        )}
        <FileDropzone
          file={replacePendingFile}
          onChange={setReplacePendingFile}
          accept=".jpg,.jpeg,.png,.webp,.svg,.gif,.pdf,.mp4,.mov,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          hint="Selecione o novo arquivo que substituirá o atual"
        />
      </Modal>
    </div>
  );
}
