import { useState, useRef } from 'react';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import FileDropzone from '../../components/FileDropzone';
import PORTAL_CONFIG from '../../portalConfig';
import '../admin/AdminPages.css';
import './MidiaPage.css';

type FileType = 'image' | 'pdf' | 'video' | 'other';

interface MediaFile {
  id: string;
  name: string;
  type: FileType;
  size: string;
  url: string | null;
  uploadedAt: string;
}

const INITIAL: MediaFile[] = [
  { id: 'm1', name: 'banner-principal.jpg', type: 'image', size: '842 KB', url: null, uploadedAt: '10/06/2026' },
  { id: 'm2', name: 'logo-imc.svg', type: 'image', size: '14 KB', url: null, uploadedAt: '08/06/2026' },
  { id: 'm3', name: 'apresentacao-2t25.pdf', type: 'pdf', size: '3.2 MB', url: null, uploadedAt: '05/06/2026' },
  { id: 'm4', name: 'release-1t25.pdf', type: 'pdf', size: '1.8 MB', url: null, uploadedAt: '15/04/2026' },
  { id: 'm5', name: 'foto-sede.jpg', type: 'image', size: '1.1 MB', url: null, uploadedAt: '20/03/2026' },
];

const TYPE_LABEL: Record<FileType, string> = {
  image: 'Imagem', pdf: 'PDF', video: 'Vídeo', other: 'Outro',
};

const TYPE_ICONS: Record<FileType, React.ReactNode> = {
  image: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  pdf: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  video: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
  other: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
};

const TYPE_COLOR: Record<FileType, string> = {
  image: '#0B5B68', pdf: '#dc2626', video: '#7c3aed', other: '#6b7280',
};

export default function MidiaPage() {
  const [files, setFiles] = useState<MediaFile[]>(INITIAL);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FileType | ''>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const filtered = files.filter(f => {
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType && f.type !== filterType) return false;
    return true;
  });

  function fileToMedia(file: File): MediaFile {
    return {
      id: 'u' + Math.random().toString(36).slice(2),
      name: file.name,
      type: file.type.startsWith('image') ? 'image' : file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('video') ? 'video' : 'other',
      size: file.size >= 1024 * 1024 ? (file.size / 1024 / 1024).toFixed(1) + ' MB' : Math.round(file.size / 1024) + ' KB',
      url: null,
      uploadedAt: new Date().toLocaleDateString('pt-BR'),
    };
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const uploaded = Array.from(e.target.files ?? []);
    setFiles(prev => [...uploaded.map(fileToMedia), ...prev]);
    if (e.target) e.target.value = '';
  }

  function confirmUpload() {
    if (pendingFile) {
      setFiles(prev => [fileToMedia(pendingFile), ...prev]);
    }
    setPendingFile(null);
    setUploadModalOpen(false);
  }

  function deleteFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id));
  }

  return (
    <div className="page">
      <PageHeader
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
                  <td>
                    <div className="midia-file-name">
                      <span className="midia-file-icon" style={{ color: TYPE_COLOR[f.type] }}>
                        {TYPE_ICONS[f.type]}
                      </span>
                      <span className="table-cell--bold">{f.name}</span>
                    </div>
                  </td>
                  <td className="table-cell--muted">{TYPE_LABEL[f.type]}</td>
                  <td className="table-cell--muted">{f.size}</td>
                  <td className="table-cell--muted">{f.uploadedAt}</td>
                  <td>
                    <div className="table-actions">
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
          accept=".jpg,.jpeg,.png,.webp,.svg,.gif,.pdf,.mp4,.mov"
          hint="Imagens (JPG, PNG, SVG, WebP), PDF, Vídeo (MP4, MOV)"
        />
      </Modal>

      <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={handleUpload}
        accept=".jpg,.jpeg,.png,.webp,.svg,.pdf,.mp4,.mov" />
    </div>
  );
}
