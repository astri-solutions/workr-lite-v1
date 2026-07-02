import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const PORTAIS: Portal[] = [
  {
    id: '1',
    cliente: 'Construtora Aurora',
    criadoEm: '03/03/2026',
    empresa: { cnpj: '12.345.678/0001-90', responsavel: 'Marcos Oliveira', email: 'marcos@aurora.com.br', status: 'Ativa' },
    sites: [{ id: 's1', link: 'aurora.workr.com.br', status: 'Ativo', ip: '177.71.142.53', tipo: 'RI' }],
  },
  {
    id: '2',
    cliente: 'International Meal Company',
    criadoEm: '12/02/2026',
    empresa: { cnpj: '05.583.665/0001-10', responsavel: 'Ana Paula Ramos', email: 'ana@imc.com.br', status: 'Ativa' },
    sites: [
      { id: 's2', link: 'imc.workr.com.br', status: 'Ativo', ip: '177.71.142.54', tipo: 'RI' },
      { id: 's3', link: 'imc-en.workr.com.br', status: 'Ativo', ip: '177.71.142.55', tipo: 'Institucional' },
    ],
  },
  {
    id: '3',
    cliente: 'Vetra Energia',
    criadoEm: '21/01/2026',
    empresa: { cnpj: '29.117.035/0001-82', responsavel: 'Felipe Carvalho', email: 'fcarvalho@vetra.com.br', status: 'Suspensa' },
    sites: [{ id: 's4', link: 'vetra.workr.com.br', status: 'Suspenso', ip: '177.71.142.56', tipo: 'RI' }],
  },
];

const SITE_TIPOS: SiteTipo[] = ['RI', 'Institucional', 'Fundo', 'Landing Page'];

const TIPO_BADGE: Record<SiteTipo, string> = {
  'RI': 'badge--info',
  'Institucional': 'badge--gray',
  'Fundo': 'badge--warning',
  'Landing Page': 'badge--purple',
};

const FERRAMENTAS = [
  'Gerenciador de arquivos',
  'Bancos de dados',
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
        <span className="material-symbols-outlined" style={{ fontSize: '15px', transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s', display: 'inline-block' }}>expand_more</span>
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

function SiteKebabMenu({
  onDetalhes,
  onAlterarDominio,
  onAlterarTipo,
}: {
  onDetalhes: () => void;
  onAlterarDominio: () => void;
  onAlterarTipo: () => void;
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
          <button className="portais-kebab__item" type="button" onClick={() => { setOpen(false); onAlterarTipo(); }}>
            Alterar tipo de site
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
        <>
          <button className="portais-modal-btn-cancel" type="button" onClick={handleClose}>
            Cancelar
          </button>
          <button
            className={`portais-modal-btn-confirm${confirmed ? ' portais-modal-btn-confirm--active' : ''}`}
            type="button"
            disabled={!confirmed}
            onClick={handleClose}
          >
            Alterar
          </button>
        </>
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
  const [portais, setPortais] = useState(PORTAIS);
  const [search, setSearch] = useState('');
  const [expandedPortalId, setExpandedPortalId] = useState<string | null>(null);
  const [detalhesSite, setDetalhesSite] = useState<Site | null>(null);
  const [alterarSite, setAlterarSite] = useState<Site | null>(null);
  const [tipoTarget, setTipoTarget] = useState<{ portalId: string; site: Site } | null>(null);
  const [tipoEdit, setTipoEdit] = useState<SiteTipo>('RI');

  function toggleExpand(portalId: string) {
    setExpandedPortalId(prev => prev === portalId ? null : portalId);
  }

  function toggleEmpresaStatus(portalId: string) {
    setPortais(prev => prev.map(p => p.id !== portalId ? p : {
      ...p,
      empresa: { ...p.empresa, status: p.empresa.status === 'Ativa' ? 'Suspensa' : 'Ativa' },
    }));
  }

  function openTipo(portalId: string, site: Site) {
    setTipoTarget({ portalId, site });
    setTipoEdit(site.tipo);
  }

  function saveTipo() {
    if (!tipoTarget) return;
    setPortais(prev => prev.map(p => p.id !== tipoTarget.portalId ? p : {
      ...p,
      sites: p.sites.map(s => s.id !== tipoTarget.site.id ? s : { ...s, tipo: tipoEdit }),
    }));
    setTipoTarget(null);
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
                    <span>CNPJ {portal.empresa.cnpj}</span>
                    <span className="portal-empresa-detail__dot">·</span>
                    <span>Responsável {portal.empresa.responsavel}</span>
                    <span className="portal-empresa-detail__dot">·</span>
                    <a href={`mailto:${portal.empresa.email}`} className="portal-empresa-detail__email">{portal.empresa.email}</a>
                    <span className="portal-empresa-detail__dot">·</span>
                    <span>Cadastro {portal.criadoEm}</span>
                  </div>
                  <div className="portal-empresa-detail__actions">
                    <span className={`badge ${portal.empresa.status === 'Ativa' ? 'badge--success' : 'badge--error'}`}>
                      {portal.empresa.status}
                    </span>
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
                        onClick={() => window.open('/portal/empresas', '_blank')}
                      >
                        Admin Site
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>open_in_new</span>
                      </button>
                      <FerramentasDropdown />
                      <SiteKebabMenu
                        onDetalhes={() => setDetalhesSite(site)}
                        onAlterarDominio={() => setAlterarSite(site)}
                        onAlterarTipo={() => openTipo(portal.id, site)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
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

      {tipoTarget && (
        <Modal
          open
          onClose={() => setTipoTarget(null)}
          title="Alterar tipo de site"
          size="sm"
          footer={
            <div className="modal-footer">
              <button className="btn-outline" type="button" onClick={() => setTipoTarget(null)}>Cancelar</button>
              <button className="btn-primary" type="button" onClick={saveTipo}>Salvar</button>
            </div>
          }
        >
          <div className="portais-tipo-list">
            {SITE_TIPOS.map((t) => (
              <button
                key={t}
                type="button"
                className={`portais-tipo-option${tipoEdit === t ? ' portais-tipo-option--selected' : ''}`}
                onClick={() => setTipoEdit(t)}
              >
                <span className={`badge ${TIPO_BADGE[t]}`}>{t}</span>
                <div className={`portais-tipo-option__check${tipoEdit === t ? ' portais-tipo-option__check--active' : ''}`}>
                  {tipoEdit === t && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
