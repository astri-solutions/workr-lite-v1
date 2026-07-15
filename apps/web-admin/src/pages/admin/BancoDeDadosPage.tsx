import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSort } from '../../hooks/useSort';
import SortIcon from '../../components/SortIcon';
import { loadPortalSite } from '../../utils/loadPortalSite';
import './AdminPages.css';
import './BancoDeDadosPage.css';

interface GhFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  sha: string;
  download_url: string | null;
}

interface FileRow {
  name: string;
  path: string;
  isDir: boolean;
  size: string;
  sizeBytes: number;
  download_url: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function ghToRow(f: GhFile): FileRow {
  return {
    name: f.name,
    path: f.path,
    isDir: f.type === 'dir',
    size: f.type === 'dir' ? '—' : formatBytes(f.size),
    sizeBytes: f.size,
    download_url: f.download_url,
  };
}

export default function BancoDeDadosPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const site = loadPortalSite(siteId ?? '');
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState('');

  const githubOrg = 'astri-solutions';
  const repoName = site?.githubRepo ?? (site?.subdomain ? `portal-${site.subdomain}` : null);

  useEffect(() => {
    if (!repoName) return;
    setLoading(true);
    setError(null);
    setSearch('');
    const apiPath = path ? `contents/${path}` : 'contents';
    fetch(`https://api.github.com/repos/${githubOrg}/${repoName}/${apiPath}`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then((data: GhFile[]) => {
        const sorted = [...(Array.isArray(data) ? data : [])].sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'dir' ? -1 : 1;
        });
        setFiles(sorted.map(ghToRow));
        setLoading(false);
      })
      .catch(e => {
        setError(String(e));
        setLoading(false);
      });
  }, [repoName, path]);

  if (!site) {
    return (
      <div className="page">
        <div className="page-placeholder">
          <h2>Site não encontrado</h2>
          <button className="btn-primary" type="button" onClick={() => navigate('/admin/portais')}>Voltar</button>
        </div>
      </div>
    );
  }

  const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  const { sorted: sortedFiles, col, dir, toggle } = useSort(filtered);

  const totalFiles = files.filter(f => !f.isDir).length;
  const totalFolders = files.filter(f => f.isDir).length;
  const totalBytes = files.filter(f => !f.isDir).reduce((acc, f) => acc + f.sizeBytes, 0);

  const pathParts = path ? path.split('/') : [];

  return (
    <div className="page db-page">
      <div className="painel-breadcrumb">
        <button className="painel-breadcrumb__back" type="button" onClick={() => navigate(`/admin/portais/${siteId}/painel`)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Painel de controle
        </button>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="painel-breadcrumb__sep">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span className="painel-breadcrumb__current">Gerenciador de arquivos</span>
      </div>

      <div className="db-header">
        <div>
          <h1 className="db-header__title">Gerenciador de arquivos</h1>
          <p className="db-header__sub">{site.link} · {site.cliente}</p>
        </div>
        {repoName && (
          <div className="db-header__actions">
            <a
              className="btn-outline"
              href={`https://github.com/${githubOrg}/${repoName}`}
              target="_blank"
              rel="noreferrer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Abrir no GitHub
            </a>
          </div>
        )}
      </div>

      {repoName ? (
        <>
          <div className="db-stats">
            <div className="db-stat">
              <span className="db-stat__value">{loading ? '…' : totalFiles}</span>
              <span className="db-stat__label">Arquivos</span>
            </div>
            <div className="db-stat">
              <span className="db-stat__value">{loading ? '…' : totalFolders}</span>
              <span className="db-stat__label">Pastas</span>
            </div>
            <div className="db-stat">
              <span className="db-stat__value">{loading ? '…' : formatBytes(totalBytes)}</span>
              <span className="db-stat__label">Tamanho total</span>
            </div>
            <div className="db-stat">
              <span className="db-stat__value" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{repoName}</span>
              <span className="db-stat__label">Repositório</span>
            </div>
          </div>

          {/* Path breadcrumb */}
          <div className="db-path-nav">
            <button className="db-path-btn" type="button" onClick={() => setPath('')}>
              {repoName}
            </button>
            {pathParts.map((part, i) => (
              <span key={i} className="db-path-sep-wrap">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                <button
                  className="db-path-btn"
                  type="button"
                  onClick={() => setPath(pathParts.slice(0, i + 1).join('/'))}
                >
                  {part}
                </button>
              </span>
            ))}
          </div>

          <div className="db-toolbar">
            <div className="db-search-wrap">
              <svg className="db-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className="db-search"
                type="text"
                placeholder="Buscar arquivo…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="db-card">
            {loading && <div className="db-loading">Carregando arquivos…</div>}
            {error && <div className="db-error">Erro ao carregar: {error}</div>}
            {!loading && !error && (
              <table className="db-table">
                <thead>
                  <tr>
                    <th className={`th-sort${col === 'name' ? ' th-sort--active' : ''}`} onClick={() => toggle('name')}><span className="th-sort-inner">Nome <SortIcon dir={col === 'name' ? dir : null} /></span></th>
                    <th>Tipo</th>
                    <th className={`th-sort db-th--num${col === 'sizeBytes' ? ' th-sort--active' : ''}`} onClick={() => toggle('sizeBytes')}><span className="th-sort-inner">Tamanho <SortIcon dir={col === 'sizeBytes' ? dir : null} /></span></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFiles.map(f => (
                    <tr key={f.path} className="db-row">
                      <td className="db-cell-name">
                        {f.isDir ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="db-table-icon" style={{ color: '#F59E0B' }}>
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="db-table-icon">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                        )}
                        {f.isDir ? (
                          <button className="db-table-name db-link-btn" type="button" onClick={() => setPath(f.path)}>
                            {f.name}
                          </button>
                        ) : (
                          <code className="db-table-name">{f.name}</code>
                        )}
                      </td>
                      <td>
                        <span className="db-badge-engine">{f.isDir ? 'Pasta' : f.name.split('.').pop()?.toUpperCase() ?? 'Arquivo'}</span>
                      </td>
                      <td className="db-cell-num">{f.size}</td>
                      <td className="db-cell-actions">
                        {!f.isDir && f.download_url && (
                          <a className="db-row-btn" href={f.download_url} target="_blank" rel="noreferrer" title="Ver arquivo">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                            </svg>
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                  {sortedFiles.length === 0 && !loading && (
                    <tr><td colSpan={4} className="db-empty">Nenhum arquivo encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <div className="page-placeholder">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="page-placeholder__icon">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <h2>Repositório não vinculado</h2>
          <p>Este portal não possui repositório GitHub configurado.</p>
        </div>
      )}
    </div>
  );
}
