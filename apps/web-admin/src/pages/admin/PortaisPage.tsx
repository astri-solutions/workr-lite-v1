import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import './AdminPages.css';
import './PortaisPage.css';
import StickyPageHeader from '../../components/StickyPageHeader';
import Modal from '../../components/Modal';
import { fetchPortais, deletePortal, updateEmpresaStatus, updateEmpresaData, type Portal, type SiteTipo } from '../../lib/portalsApi';

const TIPO_BADGE: Record<SiteTipo, string> = {
  'RI': 'badge--info',
  'Institucional': 'badge--gray',
  'Fundo': 'badge--warning',
  'Landing Page': 'badge--purple',
};

function SiteKebabMenu({
  onDetalhes,
  onAlterarDominio: _onAlterarDominio,
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
          {/* Alterar domínio: oculto enquanto domínios customizados não estão disponíveis */}
        </div>
      )}
    </div>
  );
}

function DetalhesModal({ site, onClose }: { site: { link: string; ip: string }; onClose: () => void }) {
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

interface EditEmpresaModalProps {
  portal: Portal;
  onClose: () => void;
  onSave: (data: { cnpj: string; responsavel: string; email: string }) => void;
}

function EditEmpresaModal({ portal, onClose, onSave }: EditEmpresaModalProps) {
  const [cnpj,        setCnpj]        = useState(portal.empresa.cnpj        || '');
  const [responsavel, setResponsavel] = useState(portal.empresa.responsavel || '');
  const [email,       setEmail]       = useState(portal.empresa.email       || '');
  const [saving,      setSaving]      = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave({ cnpj, responsavel, email });
    setSaving(false);
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Editar dados da empresa"
      size="sm"
      footer={
        <div className="modal-footer">
          <button className="btn-outline" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--color-gray-700)' }}>
          CNPJ
          <input
            style={{ padding: '8px 12px', border: '1px solid var(--color-gray-300)', borderRadius: '6px', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' } as React.CSSProperties}
            type="text"
            value={cnpj}
            placeholder="00.000.000/0000-00"
            maxLength={18}
            onChange={e => setCnpj(e.target.value)}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--color-gray-700)' }}>
          Responsável
          <input
            style={{ padding: '8px 12px', border: '1px solid var(--color-gray-300)', borderRadius: '6px', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' } as React.CSSProperties}
            type="text"
            value={responsavel}
            placeholder="Nome do responsável"
            onChange={e => setResponsavel(e.target.value)}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--color-gray-700)' }}>
          E-mail
          <input
            style={{ padding: '8px 12px', border: '1px solid var(--color-gray-300)', borderRadius: '6px', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' } as React.CSSProperties}
            type="email"
            value={email}
            placeholder="email@empresa.com"
            onChange={e => setEmail(e.target.value)}
          />
        </label>
      </div>
    </Modal>
  );
}

export default function PortaisPage() {
  const navigate = useNavigate();
  const { enterPortal, loading: authLoading } = useAuth();
  const [portais, setPortais] = useState<Portal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedPortalId, setExpandedPortalId] = useState<string | null>(null);
  const [detalhesSite, setDetalhesSite] = useState<{ link: string; ip: string } | null>(null);
  const [alterarSite, setAlterarSite] = useState<boolean>(false);
  const [editEmpresaPortal, setEditEmpresaPortal] = useState<Portal | null>(null);
  const [deletePortalTarget, setDeletePortalTarget] = useState<Portal | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadPortais = () => {
    setLoading(true);
    setFetchError(null);
    fetchPortais().then(data => {
      setPortais(data);
      setLoading(false);
    }).catch((e: unknown) => {
      setFetchError(String(e));
      setLoading(false);
    });
  };

  useEffect(() => {
    if (authLoading) return; // wait for Supabase session to restore before querying
    loadPortais();
  }, [authLoading]);

  function toggleExpand(portalId: string) {
    setExpandedPortalId(prev => prev === portalId ? null : portalId);
  }

  async function handleEditEmpresa(portalId: string, data: { cnpj: string; responsavel: string; email: string }) {
    setPortais(prev => prev.map(p => p.id !== portalId ? p : {
      ...p,
      empresa: { ...p.empresa, ...data },
    }));
    await updateEmpresaData(portalId, data);
  }

  async function toggleEmpresaStatus(portalId: string) {
    const portal = portais.find(p => p.id === portalId);
    if (!portal) return;
    const newStatus = portal.empresa.status === 'Ativa' ? 'Suspensa' as const : 'Ativa' as const;
    setPortais(prev => prev.map(p => p.id !== portalId ? p : {
      ...p,
      empresa: { ...p.empresa, status: newStatus },
    }));
    await updateEmpresaStatus(portalId, newStatus);
  }

  async function handleDeletePortal() {
    if (!deletePortalTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const portal = deletePortalTarget;
      if (isSupabaseConfigured && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          const vercelProjectName = portal.vercelUrl
            ? portal.vercelUrl.replace(/^https?:\/\//, '').replace(/\.vercel\.app.*$/, '')
            : portal.subdomain ?? portal.githubRepo?.replace(/^portal-/, '');
          const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-portal`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
              },
              body: JSON.stringify({
                repoName: portal.githubRepo ?? undefined,
                vercelProjectName: vercelProjectName ?? undefined,
                portalId: portal.id,
              }),
            }
          );
          const data = await res.json().catch(() => ({})) as { results?: { db?: string } };
          if (data.results?.db?.startsWith('error:')) {
            throw new Error(`Erro ao excluir do banco: ${data.results.db}`);
          }
        }
      }
      await deletePortal(portal.id);
      setPortais(prev => prev.filter(p => p.id !== portal.id));
      setDeletePortalTarget(null);
      setDeleteConfirmInput('');
    } catch (e) {
      setDeleteError(String(e));
    } finally {
      setDeleting(false);
    }
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
        {loading && (
          <div className="page-placeholder">
            <span className="material-symbols-outlined page-placeholder__icon" style={{ fontSize: '40px' }}>sync</span>
            <h2>Carregando portais…</h2>
          </div>
        )}

        {!loading && filtered.map((portal) => {
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
                  <button
                    className="portais-kebab__trigger"
                    type="button"
                    aria-label={isExpanded ? 'Recolher' : 'Expandir empresa'}
                    onClick={() => toggleExpand(portal.id)}
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
                    <span>CNPJ {portal.empresa.cnpj || '—'}</span>
                    <span className="portal-empresa-detail__dot">·</span>
                    <span>Responsável {portal.empresa.responsavel || '—'}</span>
                    <span className="portal-empresa-detail__dot">·</span>
                    <a href={`mailto:${portal.empresa.email}`} className="portal-empresa-detail__email">{portal.empresa.email || '—'}</a>
                    <span className="portal-empresa-detail__dot">·</span>
                    <span>Cadastro {portal.criadoEm}</span>
                  </div>
                  <div className="portal-empresa-detail__actions">
                    <button
                      className="portais-btn portais-btn--outline-sm"
                      type="button"
                      onClick={() => setEditEmpresaPortal(portal)}
                    >
                      Editar dados
                    </button>
                    <button
                      className="portais-btn portais-btn--outline-sm"
                      type="button"
                      onClick={() => toggleEmpresaStatus(portal.id)}
                    >
                      {portal.empresa.status === 'Ativa' ? 'Suspender conta' : 'Reativar conta'}
                    </button>
                    <button
                      className="portais-btn portais-btn--danger-sm"
                      type="button"
                      onClick={() => { setDeletePortalTarget(portal); setDeleteConfirmInput(''); setDeleteError(null); }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>delete</span>
                      Excluir portal
                    </button>
                  </div>
                </div>
              )}

              <div className="portal-card__sites">
                {portal.sites.length === 0 && (
                  <div className="portal-site-row portal-site-row--pending">
                    <div className="portal-site-row__left">
                      <span className="badge badge--warning">Configurando</span>
                      <span style={{ fontSize: '13px', color: '#6F6F6F' }}>
                        {portal.vercelUrl
                          ? portal.vercelUrl.replace(/^https?:\/\//, '')
                          : portal.githubRepo ?? 'Aguardando provisionamento'}
                      </span>
                    </div>
                    <div className="portal-site-row__right">
                      <button
                        className="portais-btn portais-btn--panel"
                        type="button"
                        onClick={async () => {
                          if (!isSupabaseConfigured || !supabase) return;
                          const link = portal.vercelUrl
                            ? portal.vercelUrl.replace(/^https?:\/\//, '')
                            : `${portal.githubRepo ?? portal.id}.vercel.app`;
                          const { data: newSite } = await supabase
                            .from('portal_sites')
                            .upsert({
                              portal_id: portal.dbId ?? portal.id,
                              link,
                              status: 'Ativo',
                              ip: '',
                              tipo: 'RI',
                            }, { onConflict: 'portal_id' })
                            .select('id')
                            .single();
                          if (newSite?.id) navigate(`/admin/portais/${newSite.id}/painel`);
                        }}
                      >
                        Painel de controle
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>arrow_forward</span>
                      </button>
                    </div>
                  </div>
                )}
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
                        onDetalhes={() => setDetalhesSite({ link: site.link, ip: site.ip })}
                        onAlterarDominio={() => setAlterarSite(true)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {!loading && fetchError && (
          <div className="page-placeholder">
            <span className="material-symbols-outlined page-placeholder__icon" style={{ fontSize: '40px', color: 'var(--color-danger)' }}>error</span>
            <h2>Erro ao carregar portais</h2>
            <p style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-gray-500)', maxWidth: '400px', wordBreak: 'break-all' }}>{fetchError}</p>
            <button className="btn-outline" type="button" onClick={loadPortais} style={{ marginTop: '12px' }}>
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !fetchError && portais.length === 0 && (
          <div className="page-placeholder">
            <span className="material-symbols-outlined page-placeholder__icon" style={{ fontSize: '40px' }}>language</span>
            <h2>Nenhum portal cadastrado</h2>
            <p>Crie o primeiro portal clicando em <strong>Novo Portal</strong>.</p>
            <button className="btn-outline" type="button" onClick={loadPortais} style={{ marginTop: '12px' }}>
              Recarregar
            </button>
          </div>
        )}

        {!loading && portais.length > 0 && filtered.length === 0 && (
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
        <AlterarDominioModal onClose={() => setAlterarSite(false)} />
      )}
      {editEmpresaPortal && (
        <EditEmpresaModal
          portal={editEmpresaPortal}
          onClose={() => setEditEmpresaPortal(null)}
          onSave={(data) => handleEditEmpresa(editEmpresaPortal.id, data)}
        />
      )}
      {deletePortalTarget && (
        <Modal
          open
          title="Excluir portal"
          onClose={() => { if (!deleting) { setDeletePortalTarget(null); setDeleteConfirmInput(''); setDeleteError(null); } }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '14px', color: 'var(--color-gray-700)', margin: 0 }}>
              Esta ação é <strong>irreversível</strong>. O portal <strong>{deletePortalTarget.cliente}</strong>, seu repositório GitHub e projeto Vercel serão excluídos permanentemente.
            </p>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--color-gray-700)' }}>
              Digite <strong>{deletePortalTarget.cliente}</strong> para confirmar
              <input
                style={{ padding: '8px 12px', border: '1px solid var(--color-gray-300)', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                type="text"
                value={deleteConfirmInput}
                onChange={e => setDeleteConfirmInput(e.target.value)}
                placeholder={deletePortalTarget.cliente}
                disabled={deleting}
                autoFocus
              />
            </label>
            {deleteError && <p style={{ fontSize: '13px', color: 'var(--color-error-500)', margin: 0 }}>{deleteError}</p>}
            <div className="modal-footer">
              <button className="btn-outline" type="button" onClick={() => { setDeletePortalTarget(null); setDeleteConfirmInput(''); setDeleteError(null); }} disabled={deleting}>
                Cancelar
              </button>
              <button
                className="btn-action btn-action--danger"
                type="button"
                disabled={deleteConfirmInput !== deletePortalTarget.cliente || deleting}
                onClick={handleDeletePortal}
              >
                {deleting ? 'Excluindo…' : 'Excluir portal'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
