import { useState, useRef, useEffect } from 'react';
import './AdminPages.css';
import './PortaisPage.css';
import PageHeader from '../../components/PageHeader';

interface Site {
  id: string;
  link: string;
  status: 'Ativo' | 'Suspenso';
}

interface Portal {
  id: string;
  cliente: string;
  criadoEm: string;
  sites: Site[];
}

const PORTAIS: Portal[] = [
  {
    id: '1',
    cliente: 'Construtora Aurora',
    criadoEm: '03/03/2026',
    sites: [{ id: 's1', link: 'aurora.workr.com.br', status: 'Ativo' }],
  },
  {
    id: '2',
    cliente: 'International Meal Company',
    criadoEm: '12/02/2026',
    sites: [
      { id: 's2', link: 'imc.workr.com.br', status: 'Ativo' },
      { id: 's3', link: 'imc-en.workr.com.br', status: 'Ativo' },
    ],
  },
  {
    id: '3',
    cliente: 'Vetra Energia',
    criadoEm: '21/01/2026',
    sites: [{ id: 's4', link: 'vetra.workr.com.br', status: 'Suspenso' }],
  },
];

const FERRAMENTAS = [
  'Gerenciador de arquivos',
  'Bancos de dados',
  'Editor de código',
  'Variáveis de ambiente',
  'Logs de acesso',
  'Certificados SSL',
  'DNS',
];

function FerramentasDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  return (
    <div className="portais-dropdown" ref={ref}>
      <button
        className="portais-btn portais-btn--tools"
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        Ferramentas
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="portais-dropdown__menu">
          {FERRAMENTAS.map((tool) => (
            <button key={tool} className="portais-dropdown__item" type="button">
              {tool}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function KebabMenu({ portalId }: { portalId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  return (
    <div className="portais-kebab" ref={ref}>
      <button
        className="portais-kebab__trigger"
        type="button"
        aria-label="Mais opções"
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="5" r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="19" r="1.5" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div className="portais-kebab__menu">
          <button className="portais-kebab__item portais-kebab__item--danger" type="button"
            onClick={() => setOpen(false)}>
            Suspender portal
          </button>
          <button className="portais-kebab__item portais-kebab__item--danger" type="button"
            onClick={() => setOpen(false)}>
            Excluir portal
          </button>
        </div>
      )}
    </div>
  );
}

export default function PortaisPage() {
  const [search, setSearch] = useState('');

  const totalPortais = PORTAIS.length;
  const ativos = PORTAIS.filter((p) => p.sites.some((s) => s.status === 'Ativo')).length;
  const totalSites = PORTAIS.reduce((sum, p) => sum + p.sites.length, 0);

  const filtered = PORTAIS.filter((p) =>
    p.cliente.toLowerCase().includes(search.toLowerCase()) ||
    p.sites.some((s) => s.link.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="page">
      <PageHeader
        title="Portais"
        description="Os sites de RI dos clientes. Cada portal é um tenant isolado."
        action={
          <button className="btn-primary" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Novo Portal
          </button>
        }
      />

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-card__number">{totalPortais}</span>
          <span className="stat-card__label">Portais</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__number">{ativos}</span>
          <span className="stat-card__label">Ativos</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__number">{totalSites}</span>
          <span className="stat-card__label">Sites</span>
        </div>
      </div>

      {/* Search */}
      <div className="portais-search-wrap">
        <svg className="portais-search-icon" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="portais-search"
          type="search"
          placeholder="Buscar por cliente ou domínio…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Cards */}
      <div className="portais-list">
        {filtered.map((portal) => (
          <div key={portal.id} className="portal-card">
            {/* Card header */}
            <div className="portal-card__header">
              <div className="portal-card__info">
                <span className="portal-card__name">{portal.cliente}</span>
                <span className="portal-card__meta">Criado em: {portal.criadoEm}</span>
              </div>
              <div className="portal-card__actions">
                <button className="portais-btn portais-btn--add" type="button">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Adicionar site
                </button>
                <KebabMenu portalId={portal.id} />
              </div>
            </div>

            {/* Sites rows */}
            <div className="portal-card__sites">
              {portal.sites.map((site) => (
                <div key={site.id} className="portal-site-row">
                  <div className="portal-site-row__left">
                    <span className={`badge ${site.status === 'Ativo' ? 'badge--success' : 'badge--error'}`}>
                      {site.status}
                    </span>
                    <a
                      className="portal-site-row__link"
                      href={`https://${site.link}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {site.link}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </div>
                  <div className="portal-site-row__right">
                    <button className="portais-btn portais-btn--panel" type="button">
                      Painel de controle
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                    <FerramentasDropdown />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="page-placeholder">
            <svg className="page-placeholder__icon" width="40" height="40" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <h2>Nenhum portal encontrado</h2>
            <p>Tente buscar por outro cliente ou domínio.</p>
          </div>
        )}
      </div>
    </div>
  );
}
