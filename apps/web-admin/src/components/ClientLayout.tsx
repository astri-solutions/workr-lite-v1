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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        ),
      },
      {
        to: '/portal/usuarios-portal',
        label: 'Usuários',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
        ),
      },
      {
        to: '/portal/documentos',
        label: 'Documentos',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        ),
      },
      {
        to: '/portal/midia',
        label: 'Biblioteca de Mídia',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        ),
      },
      {
        to: '/portal/canais',
        label: 'Árvore de canais',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 16 12 14 15 10 9 8 12 2 12" />
          </svg>
        ),
      },
      {
        to: '/portal/materias',
        label: 'Matérias',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22 6 12 13 2 6" />
          </svg>
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
          </svg>
        ),
      },
      {
        to: '/portal/cores',
        label: 'Cores',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" />
            <circle cx="8.5" cy="7.5" r=".5" /><circle cx="6.5" cy="12.5" r=".5" />
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
          </svg>
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
