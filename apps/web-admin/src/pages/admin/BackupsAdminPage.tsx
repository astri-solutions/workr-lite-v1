import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './AdminPages.css';
import './BackupsAdminPage.css';

interface SiteData { id: string; link: string; cliente: string; }

const SITES_DB: SiteData[] = [
  { id: 's1', link: 'aurora.workr.com.br',   cliente: 'Construtora Aurora' },
  { id: 's2', link: 'imc.workr.com.br',      cliente: 'International Meal Company' },
  { id: 's3', link: 'imc-en.workr.com.br',   cliente: 'International Meal Company' },
  { id: 's4', link: 'vetra.workr.com.br',     cliente: 'Vetra Energia' },
];

type BackupType = 'Completo' | 'Banco de dados' | 'Arquivos';
type BackupStatus = 'Concluído' | 'Em andamento' | 'Falha';

interface Backup {
  id: string;
  createdAt: string;
  size: string;
  type: BackupType;
  status: BackupStatus;
}

const BACKUPS_DB: Record<string, Backup[]> = {
  s1: [
    { id: 'b1', createdAt: '2026-07-05 03:00',  size: '48.2 MB', type: 'Completo',      status: 'Concluído' },
    { id: 'b2', createdAt: '2026-06-28 03:00',  size: '47.8 MB', type: 'Completo',      status: 'Concluído' },
    { id: 'b3', createdAt: '2026-06-21 03:00',  size: '47.1 MB', type: 'Completo',      status: 'Concluído' },
    { id: 'b4', createdAt: '2026-06-14 03:00',  size: '46.5 MB', type: 'Completo',      status: 'Concluído' },
    { id: 'b5', createdAt: '2026-07-04 12:30',  size: '42.7 MB', type: 'Banco de dados', status: 'Concluído' },
    { id: 'b6', createdAt: '2026-07-03 12:30',  size: '42.5 MB', type: 'Banco de dados', status: 'Concluído' },
  ],
  s2: [
    { id: 'b1', createdAt: '2026-07-05 03:00',  size: '112.4 MB', type: 'Completo', status: 'Concluído' },
    { id: 'b2', createdAt: '2026-06-28 03:00',  size: '110.8 MB', type: 'Completo', status: 'Concluído' },
    { id: 'b3', createdAt: '2026-06-21 03:00',  size: '108.2 MB', type: 'Completo', status: 'Falha' },
  ],
  s3: [
    { id: 'b1', createdAt: '2026-07-05 03:00',  size: '84.6 MB', type: 'Completo', status: 'Concluído' },
    { id: 'b2', createdAt: '2026-06-28 03:00',  size: '83.1 MB', type: 'Completo', status: 'Concluído' },
  ],
  s4: [
    { id: 'b1', createdAt: '2026-07-05 03:00',  size: '18.4 MB', type: 'Completo', status: 'Concluído' },
    { id: 'b2', createdAt: '2026-06-28 03:00',  size: '18.1 MB', type: 'Completo', status: 'Concluído' },
  ],
};

const FREQ_LABELS: Record<string, string> = {
  s1: 'Semanal', s2: 'Semanal', s3: 'Semanal', s4: 'Semanal',
};

const STATUS_CLASS: Record<BackupStatus, string> = {
  'Concluído':     'bkp-badge--success',
  'Em andamento':  'bkp-badge--warning',
  'Falha':         'bkp-badge--error',
};

const TYPE_CLASS: Record<BackupType, string> = {
  'Completo':        'bkp-type--full',
  'Banco de dados':  'bkp-type--db',
  'Arquivos':        'bkp-type--files',
};

export default function BackupsAdminPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const site = SITES_DB.find(s => s.id === siteId) ?? SITES_DB[0];
  const backups = BACKUPS_DB[site.id] ?? [];
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  function handleCreate() {
    setCreating(true);
    setTimeout(() => { setCreating(false); setCreated(true); setTimeout(() => setCreated(false), 3000); }, 2400);
  }

  function handleRestore(id: string) {
    setRestoring(id);
    setTimeout(() => setRestoring(null), 2200);
  }

  const lastBackup = backups[0];

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
        <button
          className={`btn-primary${creating ? ' bkp-btn--loading' : ''}`}
          type="button"
          onClick={handleCreate}
          disabled={creating}
        >
          {creating ? (
            <><span className="painel-spin"/> Criando…</>
          ) : created ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Backup criado
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Criar backup agora
            </>
          )}
        </button>
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
            <div className="bkp-info-card__label">Frequência</div>
            <div className="bkp-info-card__value">{FREQ_LABELS[site.id] ?? 'Semanal'}</div>
          </div>
        </div>
        <div className="bkp-info-card">
          <div className="bkp-info-card__icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <div className="bkp-info-card__label">Último backup</div>
            <div className="bkp-info-card__value">{lastBackup?.createdAt ?? '—'}</div>
          </div>
        </div>
        <div className="bkp-info-card">
          <div className="bkp-info-card__icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <div className="bkp-info-card__label">Retenção</div>
            <div className="bkp-info-card__value">30 dias</div>
          </div>
        </div>
        <div className="bkp-info-card">
          <div className="bkp-info-card__icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div>
            <div className="bkp-info-card__label">Total backups</div>
            <div className="bkp-info-card__value">{backups.length}</div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bkp-card">
        <div className="bkp-card__head">
          <span className="bkp-card__title">Histórico</span>
        </div>
        <table className="bkp-table">
          <thead>
            <tr>
              <th>Data / Hora</th>
              <th>Tipo</th>
              <th className="bkp-th--num">Tamanho</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {backups.map(b => (
              <tr key={b.id} className="bkp-row">
                <td className="bkp-cell-date">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
                  </svg>
                  {b.createdAt}
                </td>
                <td><span className={`bkp-type-badge ${TYPE_CLASS[b.type]}`}>{b.type}</span></td>
                <td className="bkp-cell-num">{b.size}</td>
                <td><span className={`bkp-badge ${STATUS_CLASS[b.status]}`}>{b.status}</span></td>
                <td className="bkp-cell-actions">
                  {b.status === 'Concluído' && (
                    <>
                      <button
                        className={`db-row-btn${restoring === b.id ? ' bkp-btn--loading' : ''}`}
                        type="button"
                        title="Restaurar"
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
                      <button className="db-row-btn" type="button" title="Download">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
