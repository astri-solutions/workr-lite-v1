import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppSidebar, { NavSection } from './AppSidebar';
import AppTopbar from './AppTopbar';
import './AdminLayout.css';

export const PORTAL_LAYOUT_KEY = 'portal_layout';
export type PortalLayout = 'sidebar' | 'tabmenu' | 'banner';

// Logo paths follow the convention /logos/tenants/{tenantId}/logotipo.svg
// When the portal upload feature is complete, these files will be served
// from storage and the paths below will resolve automatically.
function useTenantLogo() {
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? 'default';
  return {
    logoSrc: `/logos/tenants/${tenantId}/logotipo.svg`,
    logoAlt: user?.name ?? 'Portal',
  };
}

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
        to: '/portal/mailing',
        label: 'Mailing',
        icon: (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>contact_mail</span>
        ),
      },
    ],
  },
  {
    label: 'Personalizar',
    items: [
      {
        to: '/portal/layout',
        label: 'Layout',
        icon: (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>dashboard</span>
        ),
      },
      {
        to: '/portal/cores',
        label: 'Cores',
        icon: (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>palette</span>
        ),
      },
      {
        to: '/portal/fontes',
        label: 'Font-Family',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
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
    ],
  },
];

export default function ClientLayout() {
  const { logoSrc, logoAlt } = useTenantLogo();
  const [portalLayout, setPortalLayout] = useState<PortalLayout>(
    () => (localStorage.getItem(PORTAL_LAYOUT_KEY) as PortalLayout) ?? 'sidebar'
  );

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

  const sections: NavSection[] = SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (item.to === '/portal/banner') return hasBanner;
      return true;
    }),
  }));

  return (
    <div className="admin-shell">
      <AppTopbar />
      <div className="admin-body">
        <AppSidebar
          sections={sections}
          logoSrc={logoSrc}
          logoAlt={logoAlt}
        />
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
