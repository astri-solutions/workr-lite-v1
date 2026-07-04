import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
        to: '/portal/backup',
        label: 'Backup',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><polyline points="3 3 3 8 8 8" />
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
        label: 'Central de Resultados',
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
      {
        to: '/portal/calendario',
        label: 'Calendário',
        icon: (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>calendar_month</span>
        ),
      },
      {
        to: '/portal/planilha-dinamica',
        label: 'Planilha Dinâmica',
        icon: (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>table_chart</span>
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
        label: 'Mailing',
        icon: (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>contact_mail</span>
        ),
        children: [
          {
            to: '/portal/mailing',
            label: 'Minhas Campanhas',
            icon: <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>campaign</span>,
          },
          {
            to: '/portal/mailing/contatos',
            label: 'Contatos',
            icon: <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>contacts</span>,
          },
          {
            to: '/portal/mailing/lista-de-envio',
            label: 'Lista de Envio',
            icon: <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>list</span>,
          },
          {
            to: '/portal/mailing/opt-out',
            label: 'Opt-Out',
            icon: <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>block</span>,
          },
          {
            to: '/portal/mailing/templates',
            label: 'Templates',
            icon: <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>description</span>,
          },
        ],
      },
      {
        to: '/portal/transmissoes',
        label: 'Transmissões',
        icon: (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>live_tv</span>
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
      label: 'Usuários',
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

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === PORTAL_LAYOUT_KEY) {
        setPortalLayout((e.newValue as PortalLayout) ?? 'sidebar');
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const hasBanner = portalLayout === 'tabmenu' || portalLayout === 'banner';

  const portalSections: NavSection[] = SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (item.to === '/portal/banner') return hasBanner;
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
      />
      <div className="admin-right">
        <AppTopbar
          onMobileMenuOpen={() => setMobileNavOpen(true)}
          contextLabel={(user?.portais ?? []).find(p => p.id === user?.activePortalId)?.nome ?? user?.portais?.[0]?.nome}
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
