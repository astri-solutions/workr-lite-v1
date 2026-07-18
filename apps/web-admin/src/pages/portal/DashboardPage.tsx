import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PORTAL_LAYOUT_KEY } from '../../components/ClientLayout';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { pKey } from '../../utils/portalStorage';
import '../admin/AdminPages.css';
import './DashboardPage.css';


function readCount(key: string): number {
  try { return (JSON.parse(localStorage.getItem(key) ?? '[]') as unknown[]).length; } catch { return 0; }
}

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

const RECENT_ACTIVITY: { action: string; detail: string; time: string; type: string }[] = [];

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  doc: <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>description</span>,
  edit: <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit_note</span>,
  msg: <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>mail</span>,
  channel: <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>list</span>,
};

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
    const portals: Array<{ id: string; cliente: string; vercelUrl?: string; sites?: Array<{ link?: string; status?: string; plano?: string; updatedAt?: string }> }> = raw ? JSON.parse(raw) : [];
    const portal = portals.find(p => p.id === activePortalId) ?? portals[0];
    if (!portal) return { sites: [] };
    const layout = (localStorage.getItem(PORTAL_LAYOUT_KEY) ?? 'sidebar') as string;
    const LAYOUT_LABEL: Record<string, string> = { sidebar: 'Menu lateral', tabmenu: 'Tabs de conteúdo', banner: 'Banner' };
    const url = portal.vercelUrl ?? (portal.sites?.[0]?.link ? `https://${portal.sites[0].link}` : undefined);
    const sites: SiteInfo[] = (portal.sites ?? [{ link: portal.vercelUrl } ]).map(s => ({
      empresa: portal.cliente ?? '–',
      dominio: (s as { link?: string }).link ?? portal.vercelUrl ?? '–',
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

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !user?.activePortalId) return;
    supabase
      .from('portals')
      .select('vercel_url')
      .eq('portal_key', user.activePortalId)
      .single()
      .then(({ data }) => {
        if (data?.vercel_url) {
          setPortalUrl(data.vercel_url as string);
          // Sync back to localStorage so other pages get the correct URL too
          try {
            const raw = localStorage.getItem('workr_portais');
            if (raw) {
              const portals = JSON.parse(raw);
              const idx = portals.findIndex((p: { id: string }) => p.id === user.activePortalId);
              if (idx !== -1 && portals[idx].vercelUrl !== data.vercel_url) {
                portals[idx].vercelUrl = data.vercel_url;
                localStorage.setItem('workr_portais', JSON.stringify(portals));
              }
            }
          } catch { /* non-fatal */ }
        }
      });
  }, [user?.activePortalId]);

  const stats = useMemo(() => {
    const pid = user?.activePortalId;
    const docCount = readCount(pKey('portal_documentos', pid));
    const materiaCount = readFilteredCount(pKey('portal_materias', pid), i => i.status === 'publicado');
    const interCount = readFilteredCount(pKey('portal_interacoes', pid), i => i.status === 'novo');
    return [
      { label: 'Visitantes (30d)', value: '—', delta: 'Em breve', up: false },
      { label: 'Documentos publicados', value: String(docCount), delta: '', up: false },
      { label: 'Matérias ativas', value: String(materiaCount), delta: '', up: false },
      { label: 'Interações pendentes', value: String(interCount), delta: interCount > 0 ? 'Aguardando resposta' : '', up: false },
    ];
  }, [user?.activePortalId]);

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
            {RECENT_ACTIVITY.length === 0 ? (
              <p className="dash-activity-empty">Nenhuma atividade recente.</p>
            ) : RECENT_ACTIVITY.map((a, i) => (
              <div key={i} className="dash-activity-item">
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

        {/* Account manager — hidden until feature is ready */}
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
              <th>Plano</th>
            </tr>
          </thead>
          <tbody>
            {portalSites.length === 0 ? (
              <tr><td colSpan={6} className="table-empty">Nenhum site configurado ainda.</td></tr>
            ) : portalSites.map((s, i) => (
              <tr key={i}>
                <td>{s.empresa}</td>
                <td className="table-cell--muted">{s.dominio}</td>
                <td>{s.layout}</td>
                <td><span className="badge badge--success">{s.status}</span></td>
                <td className="table-cell--muted">{s.ultimaAtualizacao}</td>
                <td>{s.plano}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
