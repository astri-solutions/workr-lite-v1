import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './AdminPages.css';
import './PortaisPage.css';
import StickyPageHeader from '../../components/StickyPageHeader';
import Modal from '../../components/Modal';

type SiteTipo = 'RI' | 'Institucional' | 'Fundo' | 'Landing Page';

interface Site {
  id: string;
  link: string;
  status: 'Ativo' | 'Suspenso';
  ip: string;
  tipo: SiteTipo;
}

interface Empresa {
  cnpj: string;
  responsavel: string;
  email: string;
  status: 'Ativa' | 'Suspensa';
}

interface Portal {
  id: string;
  cliente: string;
  criadoEm: string;
  empresa: Empresa;
  sites: Site[];
}

const PORTAIS_STORAGE_KEY = 'workr_portais';

function loadPortais(): Portal[] {
  try {
    const raw = localStorage.getItem(PORTAIS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const TIPO_BADGE: Record<SiteTipo, string> = {
  'RI': 'badge--info',
  'Institucional': 'badge--gray',
  'Fundo': 'badge--warning',
  'Landing Page': 'badge--purple',
};

function SiteKebabMenu({
  onDetalhes,
  onAlterarDominio,
}: {
  onDetalhes: () => void;
  onAlterarDominio: () => void;
}) {
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
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>more_vert</span>
      </button>
      {open && (
        <div className="portais-kebab__menu">
          <button className="portais-kebab__item" type="button" onClick={() => { setOpen(false); onDetalhes(); }}>
            Detalhes do site
          </button>
          <button className="portais-kebab__item" type="button" onClick={() => { setOpen(false); onAlterarDominio(); }}>
            Alterar domínio
          </button>

        </div>
      )}
    </div>
  );
}

function DetalhesModal({ site, onClose }: { site: Site; onClose: () => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Detalhes do site"
      description="Veja detalhes importantes sobre seu site e como acessá-lo."
      size="md"
      footer={
        <button className="portais-modal-btn-close" type="button" onClick={onClose}>
          Fechar
        </button>
      }
    >
      <div className="portais-detalhes">
        <div className="portais-detalhes__section-title">Detalhes de acesso ao site</div>
        <div className="portais-detalhes__rows">
          <div className="portais-detalhes__row">
            <span className="portais-detalhes__label">Acesse seu site em</span>
            <a className="portais-detalhes__link" href={`https://${site.link}`} target="_blank" rel="noreferrer">
              https://{site.link}
            </a>
          </div>
          <div className="portais-detalhes__row">
            <span className="portais-detalhes__label">Acesse seu site com www</span>
            <a className="portais-detalhes__link" href={`https://www.${site.link}`} target="_blank" rel="noreferrer">
              https://www.{site.link}
            </a>
          </div>
          <div className="portais-detalhes__row">
            <span className="portais-detalhes__label">Endereço IP do site</span>
            <span className="portais-detalhes__value portais-detalhes__value--bold">{site.ip}</span>
          </div>
          <div className="portais-detalhes__row">
            <span className="portais-detalhes__label">Visualize seu site em</span>
            <button className="portais-btn portais-btn--outline-sm" type="button">
              Adicionar domínio de prévia
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function AlterarDominioModal({ onClose }: { onClose: () => void }) {
  const [confirmed, setConfirmed] = useState(false);

  function handleClose() {
    setConfirmed(false);
    onClose();
  }

  return (
    <Modal
      open
      onClose={handleClose}
      title="Alterar Domínio do Site"
      size="sm"
      footer={
        <div className="modal-footer">
          <button className="btn-outline" type="button" onClick={handleClose}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            type="button"
            disabled={!confirmed}
            onClick={handleClose}
          >
            Alterar
          </button>
        </div>
      }
    >
      <div className="portais-alterar">
        <p className="portais-alterar__intro">Ao alterar seu domínio atual para um novo:</p>
        <ul className="portais-alterar__list">
          <li>Seu plano de e-mail grátis será redefinido e quaisquer contas vinculadas serão excluídas.</li>
          <li>Todos os subdomínios associados serão removidos, mas os arquivos não serão afetados.</li>
          <li>Os backups existentes do site serão perdidos e não poderão ser restaurados.</li>
        </ul>
        <label className={`portais-alterar__check${confirmed ? ' portais-alterar__check--checked' : ''}`}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>
            Entendo que e-mails, subdomínios e backups vinculados ao domínio atual serão perdidos.
          </span>
        </label>
      </div>
    </Modal>
  );
}

export default function PortaisPage() {
  const navigate = useNavigate();
  const { enterPortal } = useAuth();
  const [portais, setPortais] = useState<Portal[]>(loadPortais);
  const [search, setSearch] = useState('');
  const [expandedPortalId, setExpandedPortalId] = useState<string | null>(null);
  const [detalhesSite, setDetalhesSite] = useState<Site | null>(null);
  const [alterarSite, setAlterarSite] = useState<Site | null>(null);

  function toggleExpand(portalId: string) {
    setExpandedPortalId(prev => prev === portalId ? null : portalId);
  }

  function toggleEmpresaStatus(portalId: string) {
    setPortais(prev => {
      const updated = prev.map(p => p.id !== portalId ? p : {
        ...p,
        empresa: { ...p.empresa, status: p.empresa.status === 'Ativa' ? 'Suspensa' as const : 'Ativa' as const },
      });
      localStorage.setItem(PORTAIS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  const totalPortais = portais.length;
  const ativos = portais.filter((p) => p.sites.some((s) => s.status === 'Ativo')).length;
  const totalSites = portais.reduce((sum, p) => sum + p.sites.length, 0);

  const filtered = portais.filter((p) =>
    p.cliente.toLowerCase().includes(search.toLowerCase()) ||
    p.sites.some((s) => s.link.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="page">
      <StickyPageHeader
        title="Portais"
        description="Os sites de RI dos clientes. Cada portal é um tenant isolado."
        action={
          <button className="btn-primary" type="button" onClick={() => navigate('/admin/portais/novo')}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
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

      <div className="portais-search-wrap">
        <span className="material-symbols-outlined portais-search-icon" style={{ fontSize: '16px' }}>search</span>
        <input
          className="portais-search"
          type="search"
          placeholder="Buscar por cliente ou domínio…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="portais-list">
        {filtered.map((portal) => {
          const isExpanded = expandedPortalId === portal.id;
          return (
            <div key={portal.id} className="portal-card">
              <div className="portal-card__header">
                <div className="portal-card__info">
                  <span className="portal-card__name">{portal.cliente}</span>
                  {!isExpanded && (
                    <span className="portal-card__meta">Criado em: {portal.criadoEm}</span>
                  )}
                </div>
                <div className="portal-card__actions">
                  {!isExpanded && (
                    <button className="portais-btn portais-btn--add" type="button" onClick={() => navigate('/admin/portais/novo', { state: { empresaNome: portal.cliente, portalId: portal.id } })}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                      Adicionar site
                    </button>
                  )}
                  <button
                    className="portais-kebab__trigger"
                    type="button"
                    aria-label={isExpanded ? 'Recolher' : 'Expandir empresa'}
                    onClick={() => toggleExpand(portal.id)}
                    style={{ marginLeft: '4px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>
                      expand_more
                    </span>
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="portal-empresa-detail">
                  <div className="portal-empresa-detail__meta">
                    <span className={`badge ${portal.empresa.status === 'Ativa' ? 'badge--success' : 'badge--error'}`}>
                      {portal.empresa.status}
                    </span>
                    <span>CNPJ {portal.empresa.cnpj}</span>
                    <span className="portal-empresa-detail__dot">·</span>
                    <span>Responsável {portal.empresa.responsavel}</span>
                    <span className="portal-empresa-detail__dot">·</span>
                    <a href={`mailto:${portal.empresa.email}`} className="portal-empresa-detail__email">{portal.empresa.email}</a>
                    <span className="portal-empresa-detail__dot">·</span>
                    <span>Cadastro {portal.criadoEm}</span>
                  </div>
                  <div className="portal-empresa-detail__actions">
                    <button
                      className="portais-btn portais-btn--outline-sm"
                      type="button"
                      onClick={() => toggleEmpresaStatus(portal.id)}
                    >
                      {portal.empresa.status === 'Ativa' ? 'Suspender conta' : 'Reativar conta'}
                    </button>
                    <button className="portais-btn portais-btn--add" type="button" onClick={() => navigate('/admin/portais/novo', { state: { empresaNome: portal.cliente, portalId: portal.id } })}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                      Adicionar site
                    </button>
                  </div>
                </div>
              )}

              <div className="portal-card__sites">
                {portal.sites.map((site) => (
                  <div key={site.id} className="portal-site-row">
                    <div className="portal-site-row__left">
                      <span className={`badge ${site.status === 'Ativo' ? 'badge--success' : 'badge--error'}`}>
                        {site.status}
                      </span>
                      <span className={`badge ${TIPO_BADGE[site.tipo]}`}>{site.tipo}</span>
                      <a
                        className="portal-site-row__link"
                        href={`https://${site.link}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {site.link}
                        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>open_in_new</span>
                      </a>
                    </div>
                    <div className="portal-site-row__right">
                      <button className="portais-btn portais-btn--panel" type="button" onClick={() => navigate(`/admin/portais/${site.id}/painel`)}>
                        Painel de controle
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>arrow_forward</span>
                      </button>
                      <button
                        className="portais-btn portais-btn--admin-site"
                        type="button"
                        onClick={() => { enterPortal(portal.id, portal.cliente); navigate('/portal/empresas'); }}
                      >
                        Admin Site
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>login</span>
                      </button>
                      <SiteKebabMenu
                        onDetalhes={() => setDetalhesSite(site)}
                        onAlterarDominio={() => setAlterarSite(site)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {portais.length === 0 && (
          <div className="page-placeholder">
            <span className="material-symbols-outlined page-placeholder__icon" style={{ fontSize: '40px' }}>language</span>
            <h2>Nenhum portal cadastrado</h2>
            <p>Crie o primeiro portal clicando em <strong>Novo Portal</strong>.</p>
          </div>
        )}

        {portais.length > 0 && filtered.length === 0 && (
          <div className="page-placeholder">
            <span className="material-symbols-outlined page-placeholder__icon" style={{ fontSize: '40px' }}>search</span>
            <h2>Nenhum portal encontrado</h2>
            <p>Tente buscar por outro cliente ou domínio.</p>
          </div>
        )}
      </div>

      {detalhesSite && (
        <DetalhesModal site={detalhesSite} onClose={() => setDetalhesSite(null)} />
      )}
      {alterarSite && (
        <AlterarDominioModal onClose={() => setAlterarSite(null)} />
      )}

    </div>
  );
}
