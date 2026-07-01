import { Outlet } from 'react-router-dom';
import AppSidebar, { NavSection } from './AppSidebar';
import AppTopbar from './AppTopbar';
import './AdminLayout.css';

const SECTIONS: NavSection[] = [
  {
    label: 'Gestão',
    items: [
      {
        to: '/admin/empresas',
        label: 'Empresas',
        icon: (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>home</span>
        ),
      },
      {
        to: '/admin/usuarios-portal',
        label: 'Usuários do Portal',
        icon: (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>group</span>
        ),
      },
    ],
  },
  {
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
      {
        to: '/admin/auto-cvm',
        label: 'Auto CVM',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        ),
      },
    ],
  },
];

export default function AdminLayout() {
  return (
    <div className="admin-shell">
      <AppSidebar
        sections={SECTIONS}
        logoSrc="/logos/logotipo-original.svg"
        logoCollapsedSrc="/logos/logo-original.svg"
        logoAlt="Astri"
      />
      <div className="admin-right">
        <AppTopbar />
        <main className="admin-main">
          <div className="admin-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
