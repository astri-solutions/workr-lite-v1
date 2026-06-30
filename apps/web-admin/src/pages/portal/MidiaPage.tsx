import { useState, useRef } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import Modal from '../../components/Modal';
import FileDropzone from '../../components/FileDropzone';
import PORTAL_CONFIG from '../../portalConfig';
import '../admin/AdminPages.css';
import './MidiaPage.css';

type FileType = 'image' | 'pdf' | 'doc' | 'xls' | 'ppt' | 'video' | 'other';

interface MediaFile {
  id: string;
  name: string;
  type: FileType;
  size: string;
  url: string | null;
  previewUrl?: string;
  uploadedAt: string;
}

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

function fmtSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? (bytes / 1024 / 1024).toFixed(1) + ' MB'
    : Math.round(bytes / 1024) + ' KB';
}

/* SVG thumbs for document types */
function DocThumb({ type }: { type: FileType }) {
  const cfg: Record<string, { bg: string; label: string; icon: React.ReactNode }> = {
    pdf: {
      bg: '#fef2f2',
      label: 'PDF',
      icon: <path d="M9 12h6M9 16h4M14 3v5h5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>,
    },
    doc: {
      bg: '#eff6ff',
      label: 'DOC',
      icon: <path d="M9 12h6M9 16h6M9 8h4M14 3v5h5" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round"/>,
    },
    xls: {
      bg: '#f0fdf4',
      label: 'XLS',
      icon: <><path d="M9 9l6 6M15 9l-6 6" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/><path d="M14 3v5h5" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/></>,
    },
    ppt: {
      bg: '#fff7ed',
      label: 'PPT',
      icon: <><ellipse cx="11" cy="12" rx="3" ry="3" stroke="#ea580c" strokeWidth="1.5"/><path d="M14 3v5h5" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round"/></>,
    },
    video: {
      bg: '#faf5ff',
      label: 'VID',
      icon: <><polygon points="10,9 16,12 10,15" fill="#7c3aed"/><rect x="4" y="6" width="16" height="12" rx="2" stroke="#7c3aed" strokeWidth="1.5" fill="none"/></>,
    },
    image: {
      bg: '#f0f9ff',
      label: 'IMG',
      icon: <><rect x="4" y="4" width="16" height="16" rx="1" stroke="#0284c7" strokeWidth="1.5" fill="none"/><circle cx="8.5" cy="8.5" r="1.5" fill="#0284c7"/><path d="M4 15l5-5 3 3 2-2 5 5" stroke="#0284c7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    },
    other: {
      bg: '#f9fafb',
      label: 'ARQ',
      icon: <path d="M14 3v5h5" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>,
    },
  };
  const c = cfg[type] ?? cfg.other;
  return (
    <div className="midia-thumb midia-thumb--doc" style={{ background: c.bg }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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

const INITIAL: MediaFile[] = [
  { id: 'm1', name: 'banner-principal.jpg', type: extType('banner-principal.jpg'), size: '842 KB', url: null, uploadedAt: '10/06/2026' },
  { id: 'm2', name: 'logo-imc.svg', type: extType('logo-imc.svg'), size: '14 KB', url: null, uploadedAt: '08/06/2026' },
  { id: 'm3', name: 'apresentacao-2t25.pdf', type: extType('apresentacao-2t25.pdf'), size: '3.2 MB', url: null, uploadedAt: '05/06/2026' },
  { id: 'm4', name: 'release-1t25.pdf', type: extType('release-1t25.pdf'), size: '1.8 MB', url: null, uploadedAt: '15/04/2026' },
  { id: 'm5', name: 'foto-sede.jpg', type: extType('foto-sede.jpg'), size: '1.1 MB', url: null, uploadedAt: '20/03/2026' },
  { id: 'm6', name: 'dados-financeiros.xlsx', type: extType('dados-financeiros.xlsx'), size: '245 KB', url: null, uploadedAt: '01/06/2026' },
  { id: 'm7', name: 'apresentacao-ri.pptx', type: extType('apresentacao-ri.pptx'), size: '4.7 MB', url: null, uploadedAt: '28/05/2026' },
  { id: 'm8', name: 'relatorio-anual.docx', type: extType('relatorio-anual.docx'), size: '1.2 MB', url: null, uploadedAt: '10/05/2026' },
  { id: 'm9', name: 'webcast-2t25.mp4', type: extType('webcast-2t25.mp4'), size: '82 MB', url: null, uploadedAt: '05/05/2026' },
];

const TYPE_LABEL: Record<FileType, string> = {
  image: 'Imagem', pdf: 'PDF', doc: 'Word', xls: 'Planilha', ppt: 'Apresentação', video: 'Vídeo', other: 'Outro',
};

export default function MidiaPage() {
  const [files, setFiles] = useState<MediaFile[]>(INITIAL);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FileType | ''>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Upload modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Replace modal
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [replacePendingFile, setReplacePendingFile] = useState<File | null>(null);

  const replaceTarget = files.find(f => f.id === replaceTargetId) ?? null;

  const filtered = files.filter(f => {
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType && f.type !== filterType) return false;
    return true;
  });

  function fileToMedia(file: File, existingId?: string): MediaFile {
    const type = detectType(file);
    return {
      id: existingId ?? ('u' + Math.random().toString(36).slice(2)),
      name: file.name,
      type,
      size: fmtSize(file.size),
      url: null,
      previewUrl: type === 'image' ? URL.createObjectURL(file) : undefined,
      uploadedAt: new Date().toLocaleDateString('pt-BR'),
    };
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const uploaded = Array.from(e.target.files ?? []);
    setFiles(prev => [...uploaded.map(f => fileToMedia(f)), ...prev]);
    e.target.value = '';
  }

  function confirmUpload() {
    if (pendingFile) {
      setFiles(prev => [fileToMedia(pendingFile), ...prev]);
    }
    setPendingFile(null);
    setUploadModalOpen(false);
  }

  function openReplaceModal(id: string) {
    setReplacePendingFile(null);
    setReplaceTargetId(id);
  }

  function confirmReplace() {
    if (!replacePendingFile || !replaceTargetId) return;
    const updated = fileToMedia(replacePendingFile, replaceTargetId);
    setFiles(prev => prev.map(f => f.id === replaceTargetId ? updated : f));
    setReplaceTargetId(null);
    setReplacePendingFile(null);
  }

  function deleteFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id));
  }

  return (
    <div className="page">
      <StickyPageHeader
        title="Biblioteca de Mídia"
        description={<>Biblioteca de mídia do portal <strong>{PORTAL_CONFIG.name}</strong>.</>}
        action={
          <button className="btn-primary" type="button" onClick={() => { setPendingFile(null); setUploadModalOpen(true); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Enviar arquivo
          </button>
        }
      />

      <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={handleUpload}
        accept=".jpg,.jpeg,.png,.webp,.svg,.pdf,.mp4,.mov" />

      <div className="midia-toolbar">
        <div className="midia-search-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input className="midia-search" type="text" placeholder="Buscar arquivo..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-wrap">
          <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value as FileType | '')}>
            <option value="">Todos os tipos</option>
            <option value="image">Imagens</option>
            <option value="pdf">PDFs</option>
            <option value="doc">Word</option>
            <option value="xls">Planilhas</option>
            <option value="ppt">Apresentações</option>
            <option value="video">Vídeos</option>
          </select>
          <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
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
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th className="midia-col-thumb"></th>
                <th>Arquivo</th>
                <th>Tipo</th>
                <th>Tamanho</th>
                <th>Data de envio</th>
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
                    <span className="table-cell--bold">{f.name}</span>
                  </td>
                  <td className="table-cell--muted">{TYPE_LABEL[f.type]}</td>
                  <td className="table-cell--muted">{f.size}</td>
                  <td className="table-cell--muted">{f.uploadedAt}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-action btn-action--secondary" type="button" onClick={() => openReplaceModal(f.id)}>
                        Substituir
                      </button>
                      <button className="btn-action btn-action--danger" type="button" onClick={() => deleteFile(f.id)}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload modal */}
      <Modal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Enviar arquivo"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setUploadModalOpen(false)}>Cancelar</button>
            <button type="button" className="btn-primary" disabled={!pendingFile} onClick={confirmUpload}>
              Enviar
            </button>
          </>
        }
      >
        <FileDropzone
          file={pendingFile}
          onChange={setPendingFile}
          accept=".jpg,.jpeg,.png,.webp,.svg,.gif,.pdf,.mp4,.mov,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          hint="Imagens, PDF, Word, Planilha, Apresentação, Vídeo"
        />
      </Modal>

      {/* Replace modal */}
      <Modal
        open={!!replaceTargetId}
        onClose={() => setReplaceTargetId(null)}
        title="Substituir arquivo"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setReplaceTargetId(null)}>Cancelar</button>
            <button type="button" className="btn-primary" disabled={!replacePendingFile} onClick={confirmReplace}>
              Substituir
            </button>
          </>
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
