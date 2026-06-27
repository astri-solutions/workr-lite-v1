import { Outlet } from 'react-router-dom';
import AppSidebar, { NavSection } from './AppSidebar';
import UserMenu from './UserMenu';
import './AdminLayout.css';

const SECTIONS: NavSection[] = [
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
      <header className="admin-topbar">
        <div className="admin-topbar__left">
          <div className="admin-search">
            <svg className="admin-search__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input className="admin-search__input" type="text" placeholder="Buscar..." />
          </div>
        </div>
        <div className="admin-topbar__right">
          <button className="admin-topbar__alert-btn" type="button" aria-label="Alertas">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span>Alertas</span>
          </button>
          <div className="admin-topbar__separator" />
          <UserMenu />
        </div>
      </header>

      <div className="admin-body">
        <AppSidebar sections={SECTIONS} />
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
