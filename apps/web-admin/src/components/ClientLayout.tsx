import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import AppSidebar, { NavSection } from './AppSidebar';
import AppTopbar from './AppTopbar';
import './AdminLayout.css';

export const PORTAL_LAYOUT_KEY = 'portal_layout';
export type PortalLayout = 'sidebar' | 'tabmenu' | 'banner';


const SECTIONS: NavSection[] = [
  {
    label: 'Gestão',
    items: [
      {
        to: '/portal/empresas',
        label: 'Empresas',
        icon: (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>home</span>
        ),
      },
      {
        to: '/portal/usuarios-portal',
        label: 'Usuários',
        icon: (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>group</span>
        ),
      },
      {
        to: '/portal/auto-cvm',
        label: 'Auto CVM',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        ),
      },
      {
        to: '/portal/log',
        label: 'Log de Atividades',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Conteúdo',
    items: [
      {
        to: '/portal/central-de-resultados',
        label: 'Resultados',
        icon: (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>dashboard</span>
        ),
      },
      {
        to: '/portal/documentos',
        label: 'Documentos',
        icon: (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>description</span>
        ),
      },
      {
        to: '/portal/midia',
        label: 'Biblioteca de Mídia',
        icon: (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>image</span>
        ),
      },
      {
        to: '/portal/canais',
        label: 'Árvore de canais',
        icon: (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>show_chart</span>
        ),
      },
      {
        to: '/portal/materias',
        label: 'Matérias',
        icon: (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>menu</span>
        ),
      },
    ],
  },
  {
    label: 'Relacionamento',
    items: [
      {
        to: '/portal/interacoes',
        label: 'Interações',
        badge: 2,
        icon: (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>mail</span>
        ),
      },
      {
        to: '/portal/atendimento',
        label: 'Atendimento',
        icon: (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>support_agent</span>
        ),
      },
    ],
  },
  {
    label: 'Personalizar',
    items: [
      {
        label: 'Layout',
        icon: (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>dashboard_customize</span>
        ),
        children: [
          {
            to: '/portal/layout',
            label: 'Template',
            icon: (
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>dashboard</span>
            ),
          },
          {
            to: '/portal/cores',
            label: 'Cores',
            icon: (
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>palette</span>
            ),
          },
          {
            to: '/portal/fontes',
            label: 'Font-Family',
            icon: (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4 7 4 4 20 4 20 7" />
                <line x1="9" y1="20" x2="15" y2="20" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
            ),
          },
          {
            to: '/portal/logotipo',
            label: 'Logotipo',
            icon: (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            ),
          },
        ],
      },
      {
        to: '/portal/ticker',
        label: 'Ticker de Cotação',
        icon: (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>show_chart</span>
        ),
      },
      {
        to: '/portal/favicon',
        label: 'Favicon',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ),
      },
      {
        to: '/portal/splash',
        label: 'Splash',
        icon: (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>campaign</span>
        ),
      },
      {
        to: '/portal/banner',
        label: 'Banner',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
          </svg>
        ),
      },
      {
        to: '/portal/footer',
        label: 'Footer',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 15h18" />
          </svg>
        ),
      },
      {
        to: '/portal/cookies',
        label: 'Cookies',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="9" cy="10" r="1" fill="currentColor" />
            <circle cx="14" cy="8" r="1" fill="currentColor" />
            <circle cx="15" cy="14" r="1" fill="currentColor" />
            <circle cx="10" cy="15" r="1" fill="currentColor" />
          </svg>
        ),
      },
    ],
  },
];

const PLATAFORMA_SECTION: NavSection = {
  label: 'Plataforma',
  items: [
    {
      to: '/admin/portais',
      label: 'Portais',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
    },
    {
      to: '/admin/usuarios',
      label: 'Contas',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
  ],
};

export default function ClientLayout() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const [portalLayout, setPortalLayout] = useState<PortalLayout>(
    () => (localStorage.getItem(PORTAL_LAYOUT_KEY) as PortalLayout) ?? 'sidebar'
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'ok' | 'err'>('idle');

  async function handlePublicar() {
    setPublishing(true);
    setPublishStatus('idle');
    try {
      // Aggregate CMS settings from localStorage
      const cores = (() => { try { return JSON.parse(localStorage.getItem('portal_cores') ?? 'null'); } catch { return null; } })();
      const fontes = (() => { try { return JSON.parse(localStorage.getItem('portal_fontes') ?? 'null'); } catch { return null; } })();
      const footer = (() => { try { return JSON.parse(localStorage.getItem('portal_footer') ?? 'null'); } catch { return null; } })();
      const ticker = (() => { try { return JSON.parse(localStorage.getItem('portal_ticker') ?? 'null'); } catch { return null; } })();
      const activePortal = (user?.portais ?? []).find(p => p.id === user?.activePortalId) ?? user?.portais?.[0];
      const canais = (() => { try { return JSON.parse(localStorage.getItem(`portal_canais_${activePortal?.id ?? 'default'}`) ?? 'null'); } catch { return null; } })();

      // Get githubRepo from the stored portal record
      const portaisRaw = localStorage.getItem('workr_portais');
      const portaisArr = portaisRaw ? JSON.parse(portaisRaw) : [];
      const portalRecord = portaisArr.find((p: { id: string }) => p.id === activePortal?.id);
      const repoName: string | undefined = portalRecord?.githubRepo;

      if (!isSupabaseConfigured || !supabase) {
        // Dev mode: just simulate success
        setPublishStatus('ok');
        setTimeout(() => setPublishStatus('idle'), 3000);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setPublishStatus('err'); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publish-config`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
          },
          body: JSON.stringify({
            repoName,
            portalNome: activePortal?.nome ?? '',
            layout: localStorage.getItem('portal_layout') ?? 'banner',
            colors: cores ?? { primary: '#0B5B68', secondary: '#00D865', tertiary: '#F4A261' },
            fonts: fontes ? { display: fontes.heading, body: fontes.body } : { display: 'Plus Jakarta Sans', body: 'Inter' },
            footer: footer ?? null,
            ticker: ticker ?? null,
            canais: canais ?? [],
          }),
        }
      );

      if (res.ok) {
        setPublishStatus('ok');
        setTimeout(() => setPublishStatus('idle'), 4000);
      } else {
        setPublishStatus('err');
        setTimeout(() => setPublishStatus('idle'), 4000);
      }
    } catch {
      setPublishStatus('err');
      setTimeout(() => setPublishStatus('idle'), 4000);
    } finally {
      setPublishing(false);
    }
  }

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === PORTAL_LAYOUT_KEY) {
        setPortalLayout((e.newValue as PortalLayout) ?? 'sidebar');
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const portalSections: NavSection[] = SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (item.to === '/portal/banner') return portalLayout === 'banner';
      return true;
    }),
  }));
  const sections: NavSection[] = isSuperAdmin
    ? [PLATAFORMA_SECTION, ...portalSections]
    : portalSections;

  return (
    <div className="admin-shell">
      <div
        className={`admin-sidebar-backdrop${mobileNavOpen ? ' admin-sidebar-backdrop--visible' : ''}`}
        onClick={() => setMobileNavOpen(false)}
      />
      <AppSidebar
        sections={sections}
        logoSrc="/logos/logotipo-original.svg"
        logoCollapsedSrc="/logos/logo-original.svg"
        logoAlt="Workr Lite"
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        footerContent={
          <button
            className={`sidebar-publish-btn${publishing ? ' sidebar-publish-btn--loading' : ''}${publishStatus === 'ok' ? ' sidebar-publish-btn--ok' : ''}${publishStatus === 'err' ? ' sidebar-publish-btn--err' : ''}`}
            type="button"
            onClick={handlePublicar}
            disabled={publishing}
          >
            {publishStatus === 'ok' ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                Publicado!
              </>
            ) : publishStatus === 'err' ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                Erro ao publicar
              </>
            ) : publishing ? (
              'Publicando…'
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
                Publicar site
              </>
            )}
          </button>
        }
      />
      <div className="admin-right">
        <AppTopbar
          onMobileMenuOpen={() => setMobileNavOpen(true)}
          portalName={(user?.portais ?? []).find(p => p.id === user?.activePortalId)?.nome ?? user?.portais?.[0]?.nome}
        />
        <main className="admin-main">
          <div className="admin-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
