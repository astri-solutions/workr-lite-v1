import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PORTAL_LAYOUT_KEY } from '../../components/ClientLayout';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { resolvePortalId } from '../../lib/portalDb';
import { pKey } from '../../utils/portalStorage';
import '../admin/AdminPages.css';
import './DashboardPage.css';


function readFilteredCount(key: string, pred: (item: Record<string, unknown>) => boolean): number {
  try {
    const arr = JSON.parse(localStorage.getItem(key) ?? '[]') as Record<string, unknown>[];
    return arr.filter(pred).length;
  } catch { return 0; }
}

const QUICK_LINKS = [
  { to: '/portal/central-de-resultados', label: 'Resultados', icon: (
    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>show_chart</span>
  )},
  { to: '/portal/documentos', label: 'Documentos', icon: (
    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>description</span>
  )},
  { to: '/portal/materias', label: 'Matérias', icon: (
    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit_note</span>
  )},
  { to: '/portal/interacoes', label: 'Interações', icon: (
    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>mail</span>
  )},
  { to: '/portal/midia', label: 'Mídia', icon: (
    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>image</span>
  )},
  { to: '/portal/canais', label: 'Canais', icon: (
    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>list</span>
  )},
];

interface RecentActivity { id: string; action: string; detail: string; time: string; type: string }

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  documento: <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>description</span>,
  materia: <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit_note</span>,
  usuario: <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person</span>,
  configuracao: <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>settings</span>,
  midia: <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>image</span>,
  layout: <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>palette</span>,
  cvm: <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>sync</span>,
  backup: <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>backup</span>,
};

const ACTION_LABEL: Record<string, string> = {
  publicou: 'Publicou', agendou: 'Agendou', editou: 'Editou', removeu: 'Removeu',
  adicionou: 'Adicionou', pausou: 'Pausou', ativou: 'Ativou', sincronizou: 'Sincronizou',
  importou: 'Importou', enviou: 'Enviou', convidou: 'Convidou', alterou: 'Alterou',
  gerou: 'Gerou', fez_upload: 'Fez upload de',
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

interface SiteInfo {
  empresa: string;
  dominio: string;
  layout: string;
  status: string;
  ultimaAtualizacao: string;
  plano: string;
}

function getPortalInfo(activePortalId?: string): { url?: string; sites: SiteInfo[] } {
  try {
    const raw = localStorage.getItem('workr_portais');
    const portals: Array<{ id: string; cliente: string; cloudflareUrl?: string; sites?: Array<{ link?: string; status?: string; plano?: string; updatedAt?: string }> }> = raw ? JSON.parse(raw) : [];
    const portal = portals.find(p => p.id === activePortalId) ?? portals[0];
    if (!portal) return { sites: [] };
    const layout = (localStorage.getItem(PORTAL_LAYOUT_KEY) ?? 'sidebar') as string;
    const LAYOUT_LABEL: Record<string, string> = { sidebar: 'Menu lateral', tabmenu: 'Tabs de conteúdo', banner: 'Banner' };
    const url = (portal.sites?.[0]?.link ? `https://${portal.sites[0].link}` : undefined) ?? portal.cloudflareUrl;
    const sites: SiteInfo[] = (portal.sites ?? [{ link: portal.cloudflareUrl } ]).map(s => ({
      empresa: portal.cliente ?? '–',
      dominio: (s as { link?: string }).link ?? portal.cloudflareUrl ?? '–',
      layout: LAYOUT_LABEL[layout] ?? layout,
      status: (s as { status?: string }).status ?? 'Ativo',
      ultimaAtualizacao: (s as { updatedAt?: string }).updatedAt ?? '–',
      plano: (s as { plano?: string }).plano ?? 'Lite',
    }));
    return { url, sites: sites.length > 0 ? sites : [{ empresa: portal.cliente ?? '–', dominio: url ?? '–', layout: LAYOUT_LABEL[layout] ?? layout, status: 'Ativo', ultimaAtualizacao: '–', plano: 'Lite' }] };
  } catch {
    return { sites: [] };
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'bem-vindo';
  const { url: localUrl, sites: portalSites } = getPortalInfo(user?.activePortalId);
  const [portalUrl, setPortalUrl] = useState<string | undefined>(localUrl);
  const [suporte, setSuporte] = useState<{ nome: string; email: string } | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !user?.activePortalId) return;
    supabase
      .from('portals')
      .select('cloudflare_url, suporte_nome, suporte_email')
      .eq('portal_key', user.activePortalId)
      .single()
      .then(({ data }) => {
        if (data?.suporte_nome && data?.suporte_email) {
          setSuporte({ nome: data.suporte_nome as string, email: data.suporte_email as string });
        }
        // Cloudflare is the only hosting platform now, so the live URL always
        // comes straight from cloudflare_url (falling back to portal_sites.link
        // above when this hasn't been populated yet).
        const liveUrl = data?.cloudflare_url as string | undefined;
        if (liveUrl) {
          setPortalUrl(liveUrl);
          // Sync back to localStorage so other pages get the correct URL too
          try {
            const raw = localStorage.getItem('workr_portais');
            if (raw) {
              const portals = JSON.parse(raw);
              const idx = portals.findIndex((p: { id: string }) => p.id === user.activePortalId);
              if (idx !== -1 && portals[idx].cloudflareUrl !== liveUrl) {
                portals[idx].cloudflareUrl = liveUrl;
                localStorage.setItem('workr_portais', JSON.stringify(portals));
              }
            }
          } catch { /* non-fatal */ }
        }
      });
  }, [user?.activePortalId]);

  // Documentos and Matérias were migrated to Supabase-backed pages a while
  // ago and no longer mirror to the localStorage keys these counters read —
  // so they always showed 0 regardless of real usage. Interações still
  // caches to localStorage via usePortalState, so it's left as-is.
  const [dbCounts, setDbCounts] = useState({ docCount: 0, materiaCount: 0 });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    const portalKey = user?.activePortalId;
    if (!portalKey || !isSupabaseConfigured || !supabase) return;
    let cancelled = false;
    resolvePortalId(portalKey).then(async portalDbId => {
      if (cancelled || !portalDbId || !supabase) return;
      const [docsRes, materiasRes, activityRes] = await Promise.all([
        supabase.from('portal_documents').select('id', { count: 'exact', head: true })
          .eq('portal_id', portalDbId).eq('status', 'Publicado'),
        supabase.from('portal_materias').select('id', { count: 'exact', head: true })
          .eq('portal_id', portalDbId).eq('status', 'publicado'),
        supabase.from('portal_activity_log').select('*')
          .eq('portal_id', portalDbId).order('created_at', { ascending: false }).limit(6),
      ]);
      if (cancelled) return;
      setDbCounts({ docCount: docsRes.count ?? 0, materiaCount: materiasRes.count ?? 0 });
      setRecentActivity((activityRes.data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        action: `${ACTION_LABEL[r.action as string] ?? (r.action as string)} ${(r.entity as string) ?? ''}`.trim(),
        detail: (r.detail as string) ?? '',
        time: timeAgo(r.created_at as string),
        type: (r.category as string) ?? 'configuracao',
      })));
    });
    return () => { cancelled = true; };
  }, [user?.activePortalId]);

  const stats = useMemo(() => {
    const pid = user?.activePortalId;
    const interCount = readFilteredCount(pKey('portal_interacoes', pid), i => i.status === 'novo');
    return [
      { label: 'Visitantes (30d)', value: '—', delta: 'Em breve', up: false },
      { label: 'Documentos publicados', value: String(dbCounts.docCount), delta: '', up: false },
      { label: 'Matérias ativas', value: String(dbCounts.materiaCount), delta: '', up: false },
      { label: 'Interações pendentes', value: String(interCount), delta: interCount > 0 ? 'Aguardando resposta' : '', up: false },
    ];
  }, [user?.activePortalId, dbCounts]);

  return (
    <div className="page dash-page">
      {/* Welcome header */}
      <div className="dash-welcome">
        <div>
          <h1 className="dash-welcome__title">Olá, {firstName} 👋</h1>
          <p className="dash-welcome__sub">Aqui está um resumo do seu portal de Relações com Investidores.</p>
        </div>
        {portalUrl ? (
          <a href={portalUrl} className="btn-primary dash-visit-btn" target="_blank" rel="noreferrer">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>open_in_new</span>
            Ver portal
          </a>
        ) : (
          <span className="btn-primary dash-visit-btn dash-visit-btn--disabled" aria-disabled="true">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>open_in_new</span>
            Ver portal
          </span>
        )}
      </div>

      {/* Stat cards */}
      <div className="dash-stats">
        {stats.map(s => (
          <div key={s.label} className="dash-stat-card">
            <span className="dash-stat-card__value">{s.value}</span>
            <span className="dash-stat-card__label">{s.label}</span>
            {s.delta && <span className={`dash-stat-card__delta${s.up ? ' dash-stat-card__delta--up' : ''}`}>{s.delta}</span>}
          </div>
        ))}
      </div>

      <div className="dash-grid">
        {/* Quick links */}
        <div className="dash-block">
          <h2 className="dash-block__title">Acesso rápido</h2>
          <div className="dash-quick-links">
            {QUICK_LINKS.map(l => (
              <Link key={l.to} to={l.to} className="dash-quick-link">
                <span className="dash-quick-link__icon">{l.icon}</span>
                <span className="dash-quick-link__label">{l.label}</span>
                <span className="material-symbols-outlined dash-quick-link__arrow" style={{ fontSize: '16px' }}>chevron_right</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="dash-block">
          <h2 className="dash-block__title">Atividade recente</h2>
          <div className="dash-activity">
            {recentActivity.length === 0 ? (
              <p className="dash-activity-empty">Nenhuma atividade recente.</p>
            ) : recentActivity.map(a => (
              <div key={a.id} className="dash-activity-item">
                <span className="dash-activity-item__icon">{ACTIVITY_ICONS[a.type]}</span>
                <div className="dash-activity-item__body">
                  <span className="dash-activity-item__action">{a.action}</span>
                  <span className="dash-activity-item__detail">{a.detail}</span>
                </div>
                <span className="dash-activity-item__time">{a.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Support contact */}
        <div className="dash-block dash-account-block">
          <h2 className="dash-block__title">Seu atendimento</h2>
          <div className="dash-account">
            {suporte ? (
              <>
                <div className="dash-account__header">
                  <div className="dash-account__avatar">
                    {suporte.nome.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                  </div>
                  <div>
                    <p className="dash-account__name">{suporte.nome}</p>
                    <p className="dash-account__role">Responsável pelo seu portal</p>
                  </div>
                </div>
                <ul className="dash-account__contacts">
                  <li className="dash-account__contact-item">
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>mail</span>
                    <a href={`mailto:${suporte.email}`}>{suporte.email}</a>
                  </li>
                </ul>
              </>
            ) : (
              <p className="dash-activity-empty">Nenhum atendimento designado ainda.</p>
            )}
            <Link to="/portal/atendimento" className="btn-outline dash-account__btn">
              Entrar em contato
            </Link>
          </div>
        </div>
      </div>

      {/* Site info */}
      <div className="dash-block dash-info-block">
        <h2 className="dash-block__title">Informações do portal</h2>
        <div className="dash-info-scroll"><table className="dash-info-table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Domínio</th>
              <th>Layout</th>
              <th>Status</th>
              <th>Última atualização</th>
            </tr>
          </thead>
          <tbody>
            {portalSites.length === 0 ? (
              <tr><td colSpan={5} className="table-empty">Nenhum site configurado ainda.</td></tr>
            ) : portalSites.map((s, i) => (
              <tr key={i}>
                <td>{s.empresa}</td>
                <td className="table-cell--muted">{s.dominio}</td>
                <td>{s.layout}</td>
                <td><span className="badge badge--success">{s.status}</span></td>
                <td className="table-cell--muted">{s.ultimaAtualizacao}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
