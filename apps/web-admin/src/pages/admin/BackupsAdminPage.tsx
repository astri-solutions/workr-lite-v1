import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSort } from '../../hooks/useSort';
import SortIcon from '../../components/SortIcon';
import { loadPortalSite } from '../../utils/loadPortalSite';
import './AdminPages.css';
import './BackupsAdminPage.css';

type BackupStatus = 'Concluído' | 'Em andamento' | 'Falha';

interface Backup {
  id: string;
  createdAt: string;
  size: string;
  type: string;
  status: BackupStatus;
  sha: string;
  message: string;
  url: string;
}

interface GhCommit {
  sha: string;
  commit: {
    message: string;
    author: { date: string; name: string };
  };
  html_url: string;
}

const STATUS_CLASS: Record<BackupStatus, string> = {
  'Concluído':     'bkp-badge--success',
  'Em andamento':  'bkp-badge--warning',
  'Falha':         'bkp-badge--error',
};

function ghCommitToBackup(c: GhCommit, index: number): Backup {
  const d = new Date(c.commit.author.date);
  const dateStr = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return {
    id: c.sha,
    createdAt: dateStr,
    size: '—',
    type: index === 0 ? 'Mais recente' : 'Completo',
    status: 'Concluído',
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split('\n')[0],
    url: c.html_url,
  };
}

export default function BackupsAdminPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const site = loadPortalSite(siteId ?? '');

  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  const githubOrg = 'astri-solutions';
  const repoName = site?.githubRepo ?? (site?.subdomain ? `portal-${site.subdomain}` : null);

  useEffect(() => {
    if (!repoName) return;
    setLoading(true);
    setError(null);
    fetch(`https://api.github.com/repos/${githubOrg}/${repoName}/commits?per_page=30`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then((data: GhCommit[]) => {
        setBackups(data.map((c, i) => ghCommitToBackup(c, i)));
        setLoading(false);
      })
      .catch(e => {
        setError(String(e));
        setLoading(false);
      });
  }, [repoName]);

  const { sorted: sortedBackups, col, dir, toggle } = useSort(backups);
  const lastBackup = backups[0];

  function handleRestore(id: string) {
    setRestoring(id);
    setTimeout(() => setRestoring(null), 2200);
  }

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

  return (
    <div className="page bkp-page">
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
        <span className="painel-breadcrumb__current">Backups</span>
      </div>

      <div className="bkp-header">
        <div>
          <h1 className="bkp-header__title">Backups</h1>
          <p className="bkp-header__sub">{site.link} · {site.cliente}</p>
        </div>
        {repoName && (
          <a
            className="btn-outline bkp-gh-link"
            href={`https://github.com/${githubOrg}/${repoName}/commits/main`}
            target="_blank"
            rel="noreferrer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Ver no GitHub
          </a>
        )}
      </div>

      {/* Info cards */}
      <div className="bkp-info-grid">
        <div className="bkp-info-card">
          <div className="bkp-info-card__icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
            </svg>
          </div>
          <div>
            <div className="bkp-info-card__label">Origem</div>
            <div className="bkp-info-card__value">GitHub</div>
          </div>
        </div>
        <div className="bkp-info-card">
          <div className="bkp-info-card__icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <div className="bkp-info-card__label">Último commit</div>
            <div className="bkp-info-card__value">{lastBackup?.createdAt ?? (loading ? 'Carregando…' : '—')}</div>
          </div>
        </div>
        <div className="bkp-info-card">
          <div className="bkp-info-card__icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <div className="bkp-info-card__label">Repositório</div>
            <div className="bkp-info-card__value">{repoName ?? '—'}</div>
          </div>
        </div>
        <div className="bkp-info-card">
          <div className="bkp-info-card__icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div>
            <div className="bkp-info-card__label">Total de commits</div>
            <div className="bkp-info-card__value">{loading ? '…' : backups.length}</div>
          </div>
        </div>
      </div>

      {!repoName && (
        <div className="page-placeholder">
          <h2>Repositório não vinculado</h2>
          <p>Este portal não possui repositório GitHub configurado.</p>
        </div>
      )}

      {repoName && (
        <div className="bkp-card">
          <div className="bkp-card__head">
            <span className="bkp-card__title">Histórico de commits</span>
            <span className="bkp-card__desc">Cada commit representa um estado salvo do portal</span>
          </div>
          {loading && <div className="bkp-loading">Carregando commits do GitHub…</div>}
          {error && <div className="bkp-error">Erro ao carregar: {error}</div>}
          {!loading && !error && (
            <table className="bkp-table">
              <thead>
                <tr>
                  <th className={`th-sort${col === 'createdAt' ? ' th-sort--active' : ''}`} onClick={() => toggle('createdAt')}><span className="th-sort-inner">Data / Hora <SortIcon dir={col === 'createdAt' ? dir : null} /></span></th>
                  <th>Mensagem</th>
                  <th className={`th-sort${col === 'sha' ? ' th-sort--active' : ''}`} onClick={() => toggle('sha')}><span className="th-sort-inner">SHA <SortIcon dir={col === 'sha' ? dir : null} /></span></th>
                  <th className={`th-sort${col === 'status' ? ' th-sort--active' : ''}`} onClick={() => toggle('status')}><span className="th-sort-inner">Status <SortIcon dir={col === 'status' ? dir : null} /></span></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedBackups.map(b => (
                  <tr key={b.id} className="bkp-row">
                    <td className="bkp-cell-date">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
                      </svg>
                      {b.createdAt}
                    </td>
                    <td className="bkp-cell-message" title={b.message}>{b.message}</td>
                    <td>
                      <a className="bkp-sha" href={b.url} target="_blank" rel="noreferrer">
                        {b.sha}
                      </a>
                    </td>
                    <td><span className={`bkp-badge ${STATUS_CLASS[b.status]}`}>{b.status}</span></td>
                    <td className="bkp-cell-actions">
                      <button
                        className={`db-row-btn${restoring === b.id ? ' bkp-btn--loading' : ''}`}
                        type="button"
                        title="Restaurar para este commit"
                        onClick={() => handleRestore(b.id)}
                        disabled={restoring !== null}
                      >
                        {restoring === b.id ? (
                          <span className="painel-spin painel-spin--sm"/>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
                          </svg>
                        )}
                      </button>
                      <a
                        className="db-row-btn"
                        href={b.url}
                        target="_blank"
                        rel="noreferrer"
                        title="Ver no GitHub"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                      </a>
                    </td>
                  </tr>
                ))}
                {backups.length === 0 && (
                  <tr><td colSpan={5} className="db-empty">Nenhum commit encontrado.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
