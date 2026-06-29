import { useState, useRef } from 'react';
import PageHeader from '../../components/PageHeader';
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

const TYPE_ICONS: Record<FileType, React.ReactNode> = {
  image: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  pdf: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  video: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
  other: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = files.filter(f => {
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType && f.type !== filterType) return false;
    return true;
  });

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const uploaded = Array.from(e.target.files ?? []);
    const newFiles: MediaFile[] = uploaded.map(file => ({
      id: 'u' + Date.now() + Math.random(),
      name: file.name,
      type: file.type.startsWith('image') ? 'image' : file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('video') ? 'video' : 'other',
      size: file.size > 1024 * 1024 ? (file.size / 1024 / 1024).toFixed(1) + ' MB' : Math.round(file.size / 1024) + ' KB',
      url: null,
      uploadedAt: new Date().toLocaleDateString('pt-BR'),
    }));
    setFiles(prev => [...newFiles, ...prev]);
    if (e.target) e.target.value = '';
  }

  function deleteSelected() {
    setFiles(prev => prev.filter(f => !selected.has(f.id)));
    setSelected(new Set());
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  return (
    <div className="page">
      <PageHeader
        title="Biblioteca de Mídia"
        description="Gerencie arquivos de imagem, PDF e vídeo utilizados no portal."
        action={
          <button className="btn-primary" type="button" onClick={() => inputRef.current?.click()}>
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
        <select className="midia-filter" value={filterType} onChange={e => setFilterType(e.target.value as FileType | '')}>
          <option value="">Todos os tipos</option>
          <option value="image">Imagens</option>
          <option value="pdf">PDFs</option>
          <option value="video">Vídeos</option>
        </select>
        {selected.size > 0 && (
          <button className="midia-delete-btn" type="button" onClick={deleteSelected}>
            Excluir {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
          </button>
        )}
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
        <div className="midia-grid">
          {filtered.map(f => (
            <div key={f.id} className={`midia-card${selected.has(f.id) ? ' midia-card--selected' : ''}`}
              onClick={() => toggleSelect(f.id)}>
              <div className="midia-card__thumb" style={{ color: TYPE_COLOR[f.type] }}>
                {TYPE_ICONS[f.type]}
              </div>
              <div className="midia-card__info">
                <span className="midia-card__name" title={f.name}>{f.name}</span>
                <span className="midia-card__meta">{f.size} · {f.uploadedAt}</span>
              </div>
              {selected.has(f.id) && (
                <span className="midia-card__check">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
