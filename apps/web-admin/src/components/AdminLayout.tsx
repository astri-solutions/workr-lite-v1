import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar, { NavSection } from './AppSidebar';
import AppTopbar from './AppTopbar';
import './AdminLayout.css';

const SECTIONS: NavSection[] = [
  {
    label: 'Plataforma',
    items: [
      {
        to: '/admin/portais',
        label: 'Portais',
        icon: <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>grid_view</span>,
      },
      {
        to: '/admin/usuarios',
        label: 'Usuários',
        icon: <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>group</span>,
      },
    ],
  },
];

export default function AdminLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="admin-shell">
      <div
        className={`admin-sidebar-backdrop${mobileNavOpen ? ' admin-sidebar-backdrop--visible' : ''}`}
        onClick={() => setMobileNavOpen(false)}
      />
      <AppSidebar
        sections={SECTIONS}
        logoSrc="/logos/logotipo-original.svg"
        logoCollapsedSrc="/logos/logo-original.svg"
        logoAlt="Astri"
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <div className="admin-right">
        <AppTopbar onMobileMenuOpen={() => setMobileNavOpen(true)} contextLabel="Dashboard" />
        <main className="admin-main">
          <div className="admin-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
