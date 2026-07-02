import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './AdminPages.css';
import './PainelControlePage.css';


interface SiteData {
  id: string;
  portalId: string;
  cliente: string;
  link: string;
  ip: string;
  status: 'Ativo' | 'Suspenso';
  criadoEm: string;
  disco: { usado: number; total: number };
  cpu: number;
  memoria: number;
  inodes: { usado: number; total: number };
  phpVersion: string;
  ssl: boolean;
  cdn: boolean;
}

const SITES_DB: SiteData[] = [
  {
    id: 's1', portalId: '1', cliente: 'Construtora Aurora',
    link: 'aurora.workr.com.br', ip: '177.71.142.53', status: 'Ativo',
    criadoEm: '2026-03-03',    disco: { usado: 0.82, total: 50 }, cpu: 3, memoria: 42,
    inodes: { usado: 8200, total: 200000 },
    phpVersion: '8.2', ssl: true, cdn: true,
  },
  {
    id: 's2', portalId: '2', cliente: 'International Meal Company',
    link: 'imc.workr.com.br', ip: '177.71.142.54', status: 'Ativo',
    criadoEm: '2026-02-12',    disco: { usado: 2.4, total: 50 }, cpu: 7, memoria: 128,
    inodes: { usado: 24000, total: 200000 },
    phpVersion: '8.2', ssl: true, cdn: true,
  },
  {
    id: 's3', portalId: '2', cliente: 'International Meal Company',
    link: 'imc-en.workr.com.br', ip: '177.71.142.55', status: 'Ativo',
    criadoEm: '2026-02-12',    disco: { usado: 1.1, total: 50 }, cpu: 2, memoria: 38,
    inodes: { usado: 11000, total: 200000 },
    phpVersion: '8.2', ssl: true, cdn: false,
  },
  {
    id: 's4', portalId: '3', cliente: 'Vetra Energia',
    link: 'vetra.workr.com.br', ip: '177.71.142.56', status: 'Suspenso',
    criadoEm: '2026-01-21',    disco: { usado: 0.52, total: 20 }, cpu: 1, memoria: 25,
    inodes: { usado: 6450, total: 200000 },
    phpVersion: '8.1', ssl: true, cdn: false,
  },
];


function StatBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct > 80 ? 'var(--color-error-500)' : pct > 60 ? 'var(--color-warning-500)' : 'var(--color-primary-500)';
  return (
    <div className="painel-bar">
      <div className="painel-bar__fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function PainelControlePage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const [cacheClearing, setCacheClearing] = useState(false);
  const [cacheDone, setCacheDone] = useState(false);
  const [siteStatus, setSiteStatus] = useState<'Ativo' | 'Suspenso' | null>(null);

  const site = SITES_DB.find((s) => s.id === siteId);

  if (!site) {
    return (
      <div className="page">
        <div className="page-placeholder">
          <h2>Site não encontrado</h2>
          <p>O site solicitado não existe ou foi removido.</p>
          <button className="btn-primary" type="button" onClick={() => navigate('/admin/portais')}>
            Voltar para Portais
          </button>
        </div>
      </div>
    );
  }

  async function handleLimparCache() {
    setCacheClearing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setCacheClearing(false);
    setCacheDone(true);
    setTimeout(() => setCacheDone(false), 3000);
  }

  const effectiveStatus = siteStatus ?? site.status;
  const discoPercent = Math.round((site.disco.usado / site.disco.total) * 100);
  const inodesPercent = Math.round((site.inodes.usado / site.inodes.total) * 100);

  return (
    <div className="page painel-page">
      <div className="painel-breadcrumb">
        <button className="painel-breadcrumb__back" type="button" onClick={() => navigate('/admin/portais')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Portais
        </button>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="painel-breadcrumb__sep">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="painel-breadcrumb__current">{site.link}</span>
      </div>

      <div className="painel-header">
        <div className="painel-header__left">
          <div className="painel-header__site-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <div>
            <div className="painel-header__title">
              <a className="painel-header__link" href={`https://${site.link}`} target="_blank" rel="noreferrer">
                {site.link}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
            <div className="painel-header__meta">
              {site.cliente} · Criado em: {site.criadoEm}
            </div>
          </div>
        </div>
        <div className="painel-header__badges">
          {site.ssl && (
            <span className="painel-badge painel-badge--success">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              SSL
            </span>
          )}
          {site.cdn && (
            <span className="painel-badge painel-badge--success">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              CDN
            </span>
          )}
          <span className={`painel-badge ${effectiveStatus === 'Ativo' ? 'painel-badge--success' : 'painel-badge--error'}`}>
            {effectiveStatus}
          </span>
          <button
            className={`painel-suspend-btn${effectiveStatus === 'Suspenso' ? ' painel-suspend-btn--reativar' : ''}`}
            type="button"
            onClick={() => setSiteStatus(s => (s ?? site.status) === 'Ativo' ? 'Suspenso' : 'Ativo')}
          >
            {effectiveStatus === 'Ativo' ? 'Suspender site' : 'Reativar site'}
          </button>
        </div>
      </div>

      <div className="painel-grid">
        <div className="painel-card painel-essenciais">
          <div className="painel-card__title">Essenciais</div>
          <div className="painel-essenciais__list">

            <div className="painel-item">
              <div className="painel-item__icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              </div>
              <div className="painel-item__content">
                <span className="painel-item__label">Banco de dados</span>
                <span className="painel-item__sub">Gerencie o banco de dados</span>
              </div>
              <button className="painel-item__btn" type="button">Gerenciar</button>
            </div>

            <div className="painel-item">
              <div className="painel-item__icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 .49-4.5" />
                </svg>
              </div>
              <div className="painel-item__content">
                <span className="painel-item__label">Backups</span>
                <span className="painel-item__sub">Semanal</span>
              </div>
              <button className="painel-item__btn painel-item__btn--chevron" type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <div className="painel-item">
              <div className="painel-item__icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="painel-item__content">
                <span className="painel-item__label">Gerenciador de arquivos</span>
                <span className="painel-item__sub">Edite seus arquivos</span>
              </div>
              <button className="painel-item__btn painel-item__btn--external" type="button">
                Abrir
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
            </div>

            <div className="painel-item">
              <div className="painel-item__icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="painel-item__content">
                <span className="painel-item__label">Cache</span>
                <span className="painel-item__sub">Veja as alterações mais recentes</span>
              </div>
              <div className="painel-item__cache-actions">
                <button
                  className={`painel-item__btn${cacheClearing ? ' painel-item__btn--loading' : ''}`}
                  type="button"
                  onClick={handleLimparCache}
                  disabled={cacheClearing}
                >
                  {cacheClearing ? (
                    <><span className="painel-spin" /> Limpando…</>
                  ) : cacheDone ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Limpo
                    </>
                  ) : 'Limpar cache'}
                </button>
              </div>
            </div>

            <div className="painel-item painel-item--last painel-item--clickable" onClick={() => navigate(`/admin/portais/${siteId}/analytics`)}>
              <div className="painel-item__icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div className="painel-item__content">
                <span className="painel-item__label">Analytics</span>
                <span className="painel-item__sub">Solicitações, IPs, banda e países de acesso</span>
              </div>
              <button className="painel-item__btn painel-item__btn--chevron" type="button" onClick={(e) => { e.stopPropagation(); navigate(`/admin/portais/${siteId}/analytics`); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

          </div>
        </div>

        <div className="painel-right">

          <div className="painel-card painel-saude">
            <div className="painel-card__header-row">
              <div className="painel-card__title">Saúde do site</div>
              <span className={`painel-badge ${site.status === 'Ativo' ? 'painel-badge--success' : 'painel-badge--error'}`} style={{ fontSize: 'var(--text-xs)' }}>
                {site.status === 'Ativo' ? 'Operacional' : 'Suspenso'}
              </span>
            </div>
            <div className="painel-saude__rows">
              <div className="painel-saude__row">
                <span className="painel-saude__label">PHP</span>
                <span className="painel-saude__value">{site.phpVersion}</span>
              </div>
              <div className="painel-saude__row">
                <span className="painel-saude__label">IP do servidor</span>
                <span className="painel-saude__value painel-saude__value--mono">{site.ip}</span>
              </div>
              <div className="painel-saude__row">
                <span className="painel-saude__label">SSL</span>
                <span className={`painel-saude__value ${site.ssl ? 'painel-saude__value--ok' : 'painel-saude__value--warn'}`}>
                  {site.ssl ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="painel-saude__row painel-saude__row--last">
                <span className="painel-saude__label">CDN</span>
                <span className={`painel-saude__value ${site.cdn ? 'painel-saude__value--ok' : 'painel-saude__value--muted'}`}>
                  {site.cdn ? 'Ativo' : 'Não configurado'}
                </span>
              </div>
            </div>
          </div>

          <div className="painel-card painel-recursos">
            <div className="painel-card__header-row">
              <div className="painel-card__title">Consumo de recursos</div>
              <span className="painel-recursos__hint">Últimas 24 horas</span>
            </div>

            <div className="painel-recursos__grid">
              <div className="painel-recurso">
                <div className="painel-recurso__header">
                  <span className="painel-recurso__label">Uso de disco</span>
                  <span className={`painel-recurso__value ${discoPercent > 80 ? 'painel-recurso__value--warn' : 'painel-recurso__value--primary'}`}>
                    {site.disco.usado} GB / {site.disco.total} GB
                  </span>
                </div>
                <StatBar value={site.disco.usado} max={site.disco.total} />
              </div>

              <div className="painel-recurso">
                <div className="painel-recurso__header">
                  <span className="painel-recurso__label">CPU</span>
                  <span className="painel-recurso__value painel-recurso__value--primary">{site.cpu}%</span>
                </div>
                <StatBar value={site.cpu} max={100} />
              </div>

              <div className="painel-recurso">
                <div className="painel-recurso__header">
                  <span className="painel-recurso__label">Inodes</span>
                  <span className={`painel-recurso__value ${inodesPercent > 80 ? 'painel-recurso__value--warn' : 'painel-recurso__value--primary'}`}>
                    {(site.inodes.usado / 1000).toFixed(1)}K / {(site.inodes.total / 1000).toFixed(0)}K
                  </span>
                </div>
                <StatBar value={site.inodes.usado} max={site.inodes.total} />
              </div>

              <div className="painel-recurso">
                <div className="painel-recurso__header">
                  <span className="painel-recurso__label">Memória</span>
                  <span className="painel-recurso__value painel-recurso__value--primary">{site.memoria} MB</span>
                </div>
                <StatBar value={site.memoria} max={512} />
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
