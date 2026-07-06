import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AppSidebar, { NavSection } from './AppSidebar';
import AppTopbar from './AppTopbar';
import './AdminLayout.css';

export interface AdminOutletContext {
  setPortalCtx: (ctx: { name: string; backTo: string } | null) => void;
}

const SECTIONS: NavSection[] = [
  {
    label: 'Plataforma',
    items: [
      {
        to: '/admin/portais',
        label: 'Portais',
        icon: <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>corporate_fare</span>,
      },
      {
        to: '/admin/usuarios',
        label: 'Contas',
        icon: <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>group</span>,
      },
    ],
  },
];

export default function AdminLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [portalCtx, setPortalCtx] = useState<{ name: string; backTo: string } | null>(null);
  const navigate = useNavigate();

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
        <AppTopbar
          onMobileMenuOpen={() => setMobileNavOpen(true)}
          portalName={portalCtx?.name}
          onBack={portalCtx ? () => navigate(portalCtx.backTo) : undefined}
        />
        <main className="admin-main">
          <div className="admin-content">
            <Outlet context={{ setPortalCtx } satisfies AdminOutletContext} />
          </div>
        </main>
      </div>
    </div>
  );
}
