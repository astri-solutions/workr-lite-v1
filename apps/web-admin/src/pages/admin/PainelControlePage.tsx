import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import type { AdminOutletContext } from '../../components/AdminLayout';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { loadPortalSiteAsync } from '../../utils/loadPortalSite';
import { deletePortal, updateSiteStatus } from '../../lib/portalsApi';
import Modal from '../../components/Modal';
import './AdminPages.css';
import './PainelControlePage.css';

interface SiteData {
  id: string;
  portalId: string;
  portalKey: string;
  cliente: string;
  link: string;
  ip: string;
  status: 'Ativo' | 'Suspenso';
  criadoEm: string;
  githubRepo?: string;
  vercelUrl?: string;
  vercelCreated?: boolean;
  hostingProvider?: 'vercel' | 'cloudflare';
  cloudflareUrl?: string;
  cloudflareCreated?: boolean;
  subdomain?: string;
  suporteNome?: string;
  suporteEmail?: string;
  suporteUserId?: string;
}

interface SuporteOption {
  id: string;
  nome: string;
  email: string;
}

const FN_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : '';


export default function PainelControlePage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const { setPortalCtx } = useOutletContext<AdminOutletContext>();
  const { loading: authLoading } = useAuth();
  const [cacheClearing, setCacheClearing] = useState(false);
  const [cacheDone, setCacheDone] = useState(false);
  const [siteStatus, setSiteStatus] = useState<'Ativo' | 'Suspenso' | null>(null);
  const [suspendConfirm, setSuspendConfirm] = useState(false);
  const [suspendUpdating, setSuspendUpdating] = useState(false);
  const [suspendError, setSuspendError] = useState<string | null>(null);
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceUpdating, setMaintenanceUpdating] = useState(false);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);
  const [maintenanceWarning, setMaintenanceWarning] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [dangerInput1, setDangerInput1] = useState('');
  const [dangerInput2, setDangerInput2] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteGhWarn, setDeleteGhWarn] = useState<string | null>(null);
  const [site, setSite] = useState<SiteData | null | undefined>(undefined);
  const dangerRef = useRef<HTMLDivElement>(null);

  // setSiteStatus alone only updated local component state (never actually
  // written anywhere) — the badge looked updated but reverted to the old
  // status on reload since portal_sites.status was never touched.
  async function handleSetSiteStatus(next: 'Ativo' | 'Suspenso') {
    if (!site) return;
    setSuspendUpdating(true);
    setSuspendError(null);
    try {
      await updateSiteStatus(site.id, next);
      setSiteStatus(next);
    } catch (e) {
      setSuspendError(`Não foi possível ${next === 'Suspenso' ? 'suspender' : 'reativar'} o site: ${e instanceof Error ? e.message : String(e)}`);
    }
    setSuspendUpdating(false);
    setSuspendConfirm(false);
  }

  async function handleToggleMaintenance() {
    if (!site || !isSupabaseConfigured || !supabase) return;
    const next = !maintenance;
    setMaintenanceUpdating(true);
    setMaintenanceError(null);
    setMaintenanceWarning(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Sessão expirada');
      const res = await fetch(`${FN_BASE}/set-maintenance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        },
        body: JSON.stringify({ portalId: site.portalKey, maintenance: next }),
      });
      const json = await res.json().catch(() => ({})) as { ok?: boolean; sitePatched?: boolean; warning?: string; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setMaintenance(next);
      if (json.warning) setMaintenanceWarning(json.warning);
    } catch (e) {
      setMaintenanceError(`Não foi possível ${next ? 'ativar' : 'desativar'} o modo de manutenção: ${e instanceof Error ? e.message : String(e)}`);
    }
    setMaintenanceUpdating(false);
  }

  // Admin invite state
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null); // null = loading
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteNome, setInviteNome] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<'ok' | 'err' | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Atendimento (support rep) assignment state
  const [suporteOptions, setSuporteOptions] = useState<SuporteOption[]>([]);
  const [suporteSelected, setSuporteSelected] = useState('');
  const [savingSuporte, setSavingSuporte] = useState(false);
  const [suporteSaved, setSuporteSaved] = useState(false);
  const [suporteError, setSuporteError] = useState<string | null>(null);

  // Real Vercel data (deploy status + domain/SSL verification) — disco, CPU,
  // memória, inodes e versão do PHP não têm equivalente na Vercel (hosting
  // serverless) e por isso não aparecem mais aqui em vez de serem inventados.
  const [deployState, setDeployState] = useState<string | null>(null);
  const [deployCreatedAt, setDeployCreatedAt] = useState<string | null>(null);
  const [domainVerified, setDomainVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    (async () => {
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      try {
        const res = await fetch(`${FN_BASE}/list-users`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json() as { users?: Array<{ id: string; nome: string; email: string; role: string }>; error?: string };
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        setSuporteOptions((json.users ?? []).filter(u => u.role === 'super_admin').map(u => ({ id: u.id, nome: u.nome, email: u.email })));
      } catch { /* non-fatal — picker just stays empty */ }
    })();
  }, []);

  useEffect(() => {
    setSuporteSelected(site?.suporteUserId ?? '');
  }, [site?.suporteUserId]);

  async function handleSalvarSuporte() {
    if (!site?.portalId || !isSupabaseConfigured || !supabase) return;
    setSavingSuporte(true);
    setSuporteError(null);
    try {
      const chosen = suporteOptions.find(o => o.id === suporteSelected);
      const { error } = await supabase
        .from('portals')
        .update({
          suporte_user_id: chosen?.id ?? null,
          suporte_nome: chosen?.nome ?? null,
          suporte_email: chosen?.email ?? null,
        })
        .eq('id', site.portalId);
      if (error) throw error;
      setSite(s => s ? { ...s, suporteUserId: chosen?.id, suporteNome: chosen?.nome, suporteEmail: chosen?.email } : s);
      setSuporteSaved(true);
      setTimeout(() => setSuporteSaved(false), 2500);
    } catch (e) {
      setSuporteError(String(e));
    } finally {
      setSavingSuporte(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!siteId) { setSite(null); return; }
    loadPortalSiteAsync(siteId).then(info => {
      if (!info) { setSite(null); return; }
      setSite({
        id: info.siteId,
        portalId: info.portalId,
        portalKey: info.portalKey,
        cliente: info.cliente,
        link: info.link,
        ip: info.ip,
        status: info.status,
        criadoEm: info.criadoEm,
        githubRepo: info.githubRepo,
        vercelUrl: info.vercelUrl,
        vercelCreated: info.vercelCreated,
        hostingProvider: info.hostingProvider,
        cloudflareUrl: info.cloudflareUrl,
        cloudflareCreated: info.cloudflareCreated,
        subdomain: info.subdomain,
        suporteNome: info.suporteNome,
        suporteEmail: info.suporteEmail,
        suporteUserId: info.suporteUserId,
      });
    });
  }, [siteId, authLoading]);

  useEffect(() => {
    if (site) setPortalCtx({ name: site.cliente, backTo: '/admin/portais' });
    return () => setPortalCtx(null);
  }, [site?.id]);

  useEffect(() => {
    if (!site?.portalId || !isSupabaseConfigured || !supabase) return;
    supabase
      .from('portal_config')
      .select('maintenance')
      .eq('portal_id', site.portalId)
      .maybeSingle()
      .then(({ data }) => setMaintenance(Boolean(data?.maintenance)));
  }, [site?.portalId]);

  useEffect(() => {
    if (!site || !isSupabaseConfigured || !supabase) return;
    // get-site-status only knows how to query the Vercel API — for a
    // Cloudflare-hosted portal it would call Vercel with a project name that
    // either matches nothing (silent no-op) or, worse, some unrelated Vercel
    // project. Skip it here; the card just shows "—" until this endpoint
    // also supports Cloudflare Pages deploy status.
    if (site.hostingProvider === 'cloudflare') return;
    const projectName = site.vercelUrl
      ? site.vercelUrl.replace(/^https?:\/\//, '').replace(/\.vercel\.app.*$/, '')
      : site.githubRepo;
    if (!projectName) return;
    (async () => {
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      try {
        const res = await fetch(`${FN_BASE}/get-site-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
          },
          body: JSON.stringify({ projectName }),
        });
        const json = await res.json().catch(() => ({})) as { deployState?: string | null; deployCreatedAt?: string | null; domainVerified?: boolean | null };
        if (res.ok) {
          setDeployState(json.deployState ?? null);
          setDeployCreatedAt(json.deployCreatedAt ?? null);
          setDomainVerified(json.domainVerified ?? null);
        }
      } catch { /* non-fatal — Saúde do site card just falls back to "—" */ }
    })();
  }, [site?.id]);

  // Check if this portal has at least one admin user
  useEffect(() => {
    if (!site?.portalId || !isSupabaseConfigured || !supabase) return;
    supabase
      .from('portal_users')
      .select('id', { count: 'exact', head: true })
      .eq('portal_id', site.portalId)
      .eq('role', 'admin')
      .then(({ count }) => setHasAdmin((count ?? 0) > 0));
  }, [site?.portalId]);

  if (site === undefined) {
    return (
      <div className="page">
        <div className="page-placeholder">
          <span className="material-symbols-outlined page-placeholder__icon" style={{ fontSize: '40px' }}>sync</span>
          <h2>Carregando…</h2>
        </div>
      </div>
    );
  }

  if (site === null) {
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

  async function handleExcluirPortal() {
    if (!site) return;
    setDeleting(true);
    setDeleteError(null);
    setDeleteGhWarn(null);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          const isCloudflare = site.hostingProvider === 'cloudflare';
          const vercelProjectName = site.vercelUrl
            ? site.vercelUrl.replace(/^https?:\/\//, '').replace(/\.vercel\.app.*$/, '')
            : site.subdomain ?? site.githubRepo?.replace(/^portal-/, '');
          const delRes = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-portal`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
              },
              body: JSON.stringify({
                repoName: site.githubRepo ?? undefined,
                ...(isCloudflare
                  ? { cloudflareProjectName: site.githubRepo ?? undefined }
                  : { vercelProjectName: vercelProjectName ?? undefined }),
                portalId: site.portalId,
              }),
            }
          );
          const delData = await delRes.json().catch(() => ({})) as {
            ok?: boolean;
            results?: { github?: string; vercel?: string; db?: string };
          };
          if (delData.results?.github?.startsWith('error:')) {
            const ghErr = delData.results.github.replace('error:', '');
            // 404 = já deletado manualmente — ok
            // 403 = token sem delete_repo — avisa mas continua (não bloqueia)
            if (!ghErr.includes('404')) {
              setDeleteGhWarn(
                site.githubRepo
                  ? `Repositório GitHub (${site.githubRepo}) não deletado automaticamente. Delete manualmente em github.com/astri-solutions/${site.githubRepo} → Settings → Danger Zone.`
                  : 'Repositório GitHub não deletado automaticamente. Verifique se já foi removido.'
              );
            }
          }
          if (delData.results?.db?.startsWith('error:')) {
            throw new Error(`Erro ao excluir portal do banco de dados: ${delData.results.db}`);
          }
        }
      }

      // Remove from localStorage using portalKey (= portal_key / localStorage id)
      await deletePortal(site.portalKey);

      setDeleteModalOpen(false);
      navigate('/admin/portais');
    } catch (e) {
      setDeleteError(String(e));
      setDeleting(false);
    }
  }

  async function handleInviteAdmin() {
    if (!inviteEmail || !site) return;
    setInviting(true);
    setInviteResult(null);
    setInviteError(null);
    try {
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Sessão expirada');
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-portal-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
          },
          body: JSON.stringify({
            email: inviteEmail,
            nome: inviteNome || undefined,
            portalId: site.portalId,
            portalKey: site.portalKey,
            role: 'admin',
            resend: true,
            redirectTo: 'https://workr.dev.br/definir-senha',
          }),
        }
      );
      const body = await res.json().catch(() => ({})) as { id?: string; error?: string; emailError?: string };
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      if (body.emailError) {
        // The invite record was created but the e-mail never reached the admin —
        // keep the "sem administrador vinculado" banner up so it's obvious the
        // admin still can't actually access the CMS.
        throw new Error(`Falha no envio do e-mail: ${body.emailError}`);
      }
      setInviteResult('ok');
      setHasAdmin(true);
      setInviteEmail('');
      setInviteNome('');
    } catch (e) {
      setInviteResult('err');
      setInviteError(String(e));
    } finally {
      setInviting(false);
    }
  }

  async function handleLimparCache() {
    setCacheClearing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setCacheClearing(false);
    setCacheDone(true);
    setTimeout(() => setCacheDone(false), 3000);
  }

  const effectiveStatus = siteStatus ?? site.status;
  const deployCreatedLabel = deployCreatedAt
    ? new Date(deployCreatedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;
  const deployStateLabel: Record<string, string> = {
    READY: 'No ar', ERROR: 'Falhou', BUILDING: 'Em deploy', QUEUED: 'Na fila', CANCELED: 'Cancelado', INITIALIZING: 'Iniciando',
  };

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
        <span className="painel-breadcrumb__current">{site.cliente}</span>
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
              <a className="painel-header__link" href={(site.hostingProvider === 'cloudflare' ? site.cloudflareUrl : site.vercelUrl) ?? `https://${site.link}`} target="_blank" rel="noreferrer">
                {(site.hostingProvider === 'cloudflare' ? site.cloudflareUrl : site.vercelUrl)?.replace(/^https?:\/\//, '') ?? site.link}
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
          {domainVerified && (
            <span className="painel-badge painel-badge--success">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              SSL
            </span>
          )}
          <span className={`painel-badge ${effectiveStatus === 'Ativo' ? 'painel-badge--success' : 'painel-badge--error'}`}>
            {effectiveStatus}
          </span>
        </div>
      </div>

      {site.githubRepo && site.hostingProvider !== 'cloudflare' && !site.vercelCreated && (
        <div className="painel-vercel-banner">
          <div className="painel-vercel-banner__icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="painel-vercel-banner__text">
            <strong>Deploy Vercel não configurado.</strong> O repositório GitHub foi criado, mas o projeto Vercel ainda não existe. Importe o repositório no Vercel para ativar o deploy automático.
          </div>
          <button
            className="btn-outline painel-vercel-banner__btn"
            type="button"
            onClick={() => window.open(`https://vercel.com/new/import?s=https://github.com/astri-solutions/${site.githubRepo}`, '_blank', 'noreferrer')}
          >
            Importar no Vercel
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </button>
        </div>
      )}

      {hasAdmin === false && (
        <div className="painel-vercel-banner painel-vercel-banner--warning">
          <div className="painel-vercel-banner__icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div className="painel-vercel-banner__text" style={{ flex: 1 }}>
            <strong>Sem administrador vinculado.</strong> Convide o admin do portal para que ele possa acessar o CMS.
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Nome (opcional)"
                value={inviteNome}
                onChange={e => setInviteNome(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid var(--color-gray-300)', borderRadius: '6px', fontSize: '13px', width: '160px' }}
              />
              <input
                type="email"
                placeholder="E-mail do admin"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid var(--color-gray-300)', borderRadius: '6px', fontSize: '13px', width: '210px' }}
              />
              <button
                className="btn-primary"
                type="button"
                disabled={!inviteEmail || inviting}
                onClick={handleInviteAdmin}
                style={{ fontSize: '13px' }}
              >
                {inviting ? 'Enviando…' : 'Convidar admin'}
              </button>
              {inviteResult === 'ok' && <span style={{ color: 'var(--color-success-600)', fontSize: '13px' }}>✓ Convite enviado!</span>}
              {inviteResult === 'err' && <span style={{ color: 'var(--color-error-600)', fontSize: '13px' }}>{inviteError}</span>}
            </div>
          </div>
        </div>
      )}

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
              <button className="painel-item__btn" type="button" onClick={() => navigate(`/admin/portais/${siteId}/banco-de-dados`)}>Gerenciar</button>
            </div>

            <div className="painel-item painel-item--clickable" onClick={() => navigate(`/admin/portais/${siteId}/backups`)}>
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
              <button className="painel-item__btn painel-item__btn--chevron" type="button" onClick={() => navigate(`/admin/portais/${siteId}/backups`)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <div className="painel-item painel-item--clickable" onClick={() => navigate(`/admin/portais/${siteId}/dominios`)}>
              <div className="painel-item__icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <div className="painel-item__content">
                <span className="painel-item__label">Domínios</span>
                <span className="painel-item__sub">Subdomínios, estacionados e redirecionamentos</span>
              </div>
              <button className="painel-item__btn painel-item__btn--chevron" type="button" onClick={e => { e.stopPropagation(); navigate(`/admin/portais/${siteId}/dominios`); }}>
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
                <span className="painel-item__sub">{site.githubRepo ?? 'Repositório GitHub do portal'}</span>
              </div>
              <button className="painel-item__btn painel-item__btn--external" type="button" onClick={() => window.open(`https://github.com/astri-solutions/${site.githubRepo}`, '_blank', 'noreferrer')}>
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
                <span className="painel-saude__label">Último deploy</span>
                <span className={`painel-saude__value ${deployState === 'READY' ? 'painel-saude__value--ok' : deployState === 'ERROR' ? 'painel-saude__value--warn' : ''}`}>
                  {deployState ? (deployStateLabel[deployState] ?? deployState) : '—'}
                </span>
              </div>
              <div className="painel-saude__row">
                <span className="painel-saude__label">Publicado em</span>
                <span className="painel-saude__value painel-saude__value--mono">{deployCreatedLabel ?? '—'}</span>
              </div>
              <div className="painel-saude__row painel-saude__row--last">
                <span className="painel-saude__label">SSL / Domínio</span>
                <span className={`painel-saude__value ${domainVerified ? 'painel-saude__value--ok' : 'painel-saude__value--muted'}`}>
                  {domainVerified === null ? '—' : domainVerified ? 'Verificado' : 'Pendente'}
                </span>
              </div>
            </div>
          </div>

          <div className="painel-card painel-suporte">
            <div className="painel-card__header-row">
              <div className="painel-card__title">Atendimento</div>
            </div>
            <div className="painel-card__body">
              <p className="painel-recursos__hint" style={{ marginBottom: 'var(--space-3)' }}>
                Astri responsável pelo suporte deste portal — aparece no Dashboard do cliente com um link para a página Atendimento.
              </p>
              <div className="painel-suporte__row">
                <select
                  className="filter-select painel-suporte__select"
                  value={suporteSelected}
                  onChange={e => setSuporteSelected(e.target.value)}
                >
                  <option value="">Nenhum responsável definido</option>
                  {suporteOptions.map(o => (
                    <option key={o.id} value={o.id}>{o.nome} — {o.email}</option>
                  ))}
                </select>
                <button
                  className="btn-primary painel-suporte__save"
                  type="button"
                  disabled={savingSuporte || suporteSelected === (site.suporteUserId ?? '')}
                  onClick={handleSalvarSuporte}
                  style={{ fontSize: '13px' }}
                >
                  {savingSuporte ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
              {suporteSaved && <p style={{ color: 'var(--color-success-600)', fontSize: '13px', marginTop: 'var(--space-2)' }}>✓ Atendimento atualizado</p>}
              {suporteError && <p style={{ color: 'var(--color-error-600)', fontSize: '13px', marginTop: 'var(--space-2)' }}>{suporteError}</p>}
            </div>
          </div>

        </div>
      </div>

      {/* ── Maintenance mode ────────────────────────────── */}
      <div className={`painel-maintenance-card${maintenance ? ' painel-maintenance-card--active' : ''}`}>
        <div className="painel-maintenance-card__body">
          <div className="painel-maintenance-card__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <div className="painel-maintenance-card__text">
            <p className="painel-maintenance-card__title">Modo de manutenção</p>
            <p className="painel-maintenance-card__desc">
              {maintenance
                ? 'O site está em manutenção. Visitantes verão uma página de aviso.'
                : 'Ative para exibir uma página de aviso enquanto realiza atualizações.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          className={`painel-toggle${maintenance ? ' painel-toggle--on' : ''}`}
          role="switch"
          aria-checked={maintenance}
          onClick={handleToggleMaintenance}
          disabled={maintenanceUpdating}
          aria-label="Alternar modo de manutenção"
        >
          <span className="painel-toggle__thumb" />
        </button>
      </div>

      {maintenanceError && (
        <div className="save-error-banner" role="alert">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
          <span>{maintenanceError}</span>
        </div>
      )}
      {maintenanceWarning && (
        <div className="save-error-banner" role="alert">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>warning</span>
          <span>{maintenanceWarning}</span>
        </div>
      )}

      {/* ── Suspend / Reactivate block ──────────────────── */}
      {suspendError && (
        <div className="save-error-banner" role="alert">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
          <span>{suspendError}</span>
        </div>
      )}

      {effectiveStatus === 'Ativo' ? (
        <div className={`painel-suspend-card${suspendConfirm ? ' painel-suspend-card--confirming' : ''}`}>
          {!suspendConfirm ? (
            <>
              <div className="painel-suspend-card__body">
                <div className="painel-suspend-card__icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div>
                  <p className="painel-suspend-card__title">Suspender site</p>
                  <p className="painel-suspend-card__desc">
                    O site ficará indisponível para visitantes. Todos os dados são preservados e o site pode ser reativado a qualquer momento.
                  </p>
                </div>
              </div>
              <button className="painel-suspend-card__btn" type="button" onClick={() => setSuspendConfirm(true)}>
                Suspender site
              </button>
            </>
          ) : (
            <>
              <div className="painel-suspend-card__body">
                <div className="painel-suspend-card__icon painel-suspend-card__icon--warn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <p className="painel-suspend-card__title painel-suspend-card__title--warn">Confirmar suspensão</p>
                  <p className="painel-suspend-card__desc">
                    Tem certeza? O site <strong>{site.vercelUrl ? site.vercelUrl.replace(/^https?:\/\//, '') : site.link}</strong> ficará offline imediatamente para todos os visitantes.
                  </p>
                </div>
              </div>
              <div className="painel-suspend-card__confirm-actions">
                <button className="painel-suspend-card__btn-cancel" type="button" onClick={() => setSuspendConfirm(false)}>
                  Cancelar
                </button>
                <button className="painel-suspend-card__btn painel-suspend-card__btn--confirm" type="button" disabled={suspendUpdating} onClick={() => handleSetSiteStatus('Suspenso')}>
                  Sim, suspender
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="painel-suspend-card painel-suspend-card--suspended">
          {!suspendConfirm ? (
            <>
              <div className="painel-suspend-card__body">
                <div className="painel-suspend-card__icon painel-suspend-card__icon--off">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                </div>
                <div>
                  <p className="painel-suspend-card__title painel-suspend-card__title--off">Site suspenso</p>
                  <p className="painel-suspend-card__desc">
                    Este site está offline. Reative-o para que os visitantes possam acessá-lo novamente.
                  </p>
                </div>
              </div>
              <button className="painel-suspend-card__btn painel-suspend-card__btn--reativar" type="button" onClick={() => setSuspendConfirm(true)}>
                Reativar site
              </button>
            </>
          ) : (
            <>
              <div className="painel-suspend-card__body">
                <div className="painel-suspend-card__icon painel-suspend-card__icon--off">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <p className="painel-suspend-card__title painel-suspend-card__title--off">Confirmar reativação</p>
                  <p className="painel-suspend-card__desc">
                    O site <strong>{site.vercelUrl ? site.vercelUrl.replace(/^https?:\/\//, '') : site.link}</strong> voltará a estar disponível para os visitantes imediatamente.
                  </p>
                </div>
              </div>
              <div className="painel-suspend-card__confirm-actions">
                <button className="painel-suspend-card__btn-cancel" type="button" onClick={() => setSuspendConfirm(false)}>
                  Cancelar
                </button>
                <button className="painel-suspend-card__btn painel-suspend-card__btn--reativar" type="button" disabled={suspendUpdating} onClick={() => handleSetSiteStatus('Ativo')}>
                  Sim, reativar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Danger zone ────────────────────────────────── */}
      <div className="painel-danger-zone" ref={dangerRef}>
        <div className="painel-danger-zone__header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Zona de Perigo
        </div>

        <div className="painel-danger-item">
          <div className="painel-danger-item__text">
            <p className="painel-danger-item__title">Excluir portal permanentemente</p>
            <p className="painel-danger-item__desc">
              Esta ação é irreversível. O repositório GitHub{site.githubRepo ? ` (${site.githubRepo})` : ''} e o projeto Vercel vinculados a este portal serão removidos permanentemente.
            </p>
          </div>
          <div>
            <button
              type="button"
              className="painel-danger-btn-outline"
              onClick={() => {
                setDangerInput1('');
                setDangerInput2('');
                setDeleteError(null);
                setDeleteModalOpen(true);
              }}
            >
              Excluir portal
            </button>
          </div>
        </div>
      </div>

      {/* ── Delete confirmation modal ───────────────────── */}
      <Modal
        open={deleteModalOpen}
        onClose={() => { if (!deleting) setDeleteModalOpen(false); }}
        title="Excluir portal"
        size="sm"
        description={`Isso irá excluir permanentemente o portal e todos os recursos relacionados como Repositório GitHub, Projeto Vercel e Domínios.`}
        footer={
          <div className="modal-footer">
            <button
              type="button"
              className="btn-outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="painel-danger-btn"
              disabled={
                deleting ||
                dangerInput1.trim() !== site.cliente ||
                dangerInput2.trim() !== 'excluir meu portal'
              }
              onClick={handleExcluirPortal}
            >
              {deleting ? (
                <><span className="painel-spin painel-spin--white" /> Excluindo…</>
              ) : (
                'Excluir portal'
              )}
            </button>
          </div>
        }
      >
        <div className="painel-danger-inputs" style={{ maxWidth: 'none' }}>
          <div className="painel-danger-input-group">
            <label className="painel-danger-label">
              Para confirmar, digite <strong>{site.cliente}</strong>
            </label>
            <input
              className={`painel-danger-input${dangerInput1.length > 0 && dangerInput1.trim() !== site.cliente ? ' painel-danger-input--invalid' : ''}`}
              type="text"
              placeholder={site.cliente}
              value={dangerInput1}
              onChange={e => setDangerInput1(e.target.value)}
              disabled={deleting}
              autoComplete="off"
            />
            {dangerInput1.length > 0 && dangerInput1.trim() !== site.cliente && (
              <p className="painel-danger-input-hint">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                O valor não corresponde a <em>{site.cliente}</em>
              </p>
            )}
          </div>

          <div className="painel-danger-input-group">
            <label className="painel-danger-label">
              Para confirmar, digite <strong>excluir meu portal</strong>
            </label>
            <input
              className="painel-danger-input"
              type="text"
              placeholder="excluir meu portal"
              value={dangerInput2}
              onChange={e => setDangerInput2(e.target.value)}
              disabled={deleting}
              autoComplete="off"
            />
          </div>

          <div className="painel-danger-warning">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Excluir <strong>{site.cliente}</strong> não pode ser desfeito.
          </div>

          {deleteGhWarn && (
            <p className="painel-danger-error" style={{ background: 'var(--color-warning-100)', borderColor: 'var(--color-warning-500)', color: 'var(--color-warning-700)', whiteSpace: 'pre-line' }}>{deleteGhWarn}</p>
          )}
          {deleteError && (
            <p className="painel-danger-error" style={{ whiteSpace: 'pre-line' }}>{deleteError}</p>
          )}
        </div>
      </Modal>

    </div>
  );
}
