import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import UserMenu from './UserMenu';
import './AdminLayout.css';

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`admin-shell${collapsed ? ' admin-shell--collapsed' : ''}`}>
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
        <aside className={`admin-sidebar${collapsed ? ' admin-sidebar--collapsed' : ''}`}>

          {/* Logo */}
          <div className="admin-sidebar__logo">
            <img
              src={collapsed ? '/logos/logo-original.svg' : '/logos/logotipo-original.svg'}
              alt="Astri"
              className="admin-sidebar__logo-img"
            />
          </div>

          {/* Nav */}
          <nav className="admin-sidebar__nav">
            {!collapsed && <p className="admin-sidebar__section-label">Plataforma</p>}

            <NavLink to="/admin/portais" className={({ isActive }) => `admin-nav-item${isActive ? ' admin-nav-item--active' : ''}`} title={collapsed ? 'Portais' : undefined}>
              <svg className="admin-nav-item__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
              </svg>
              {!collapsed && <span className="admin-nav-item__label">Portais</span>}
            </NavLink>

            <NavLink to="/admin/usuarios" className={({ isActive }) => `admin-nav-item${isActive ? ' admin-nav-item--active' : ''}`} title={collapsed ? 'Usuários' : undefined}>
              <svg className="admin-nav-item__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {!collapsed && <span className="admin-nav-item__label">Usuários</span>}
            </NavLink>

            <NavLink to="/admin/auto-cvm" className={({ isActive }) => `admin-nav-item${isActive ? ' admin-nav-item--active' : ''}`} title={collapsed ? 'Auto CVM' : undefined}>
              <svg className="admin-nav-item__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              {!collapsed && <span className="admin-nav-item__label">Auto CVM</span>}
            </NavLink>
          </nav>

          {/* Collapse toggle */}
          <button
            className="admin-sidebar__toggle"
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {!collapsed && <span>Recolher</span>}
          </button>

        </aside>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
