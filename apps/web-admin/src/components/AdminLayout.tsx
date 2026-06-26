import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './AdminLayout.css';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

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
          <div className="admin-topbar__user">
            <span className="admin-topbar__avatar">GS</span>
            <span className="admin-topbar__email">{user?.email}</span>
          </div>
          <button className="admin-topbar__logout" onClick={handleLogout} type="button">
            Sair
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      <div className="admin-body">
        <aside className="admin-sidebar">
          <div className="admin-sidebar__logo">
            <img src="/logos/logotipo-original.svg" alt="Astri" className="admin-sidebar__logo-img" />
          </div>
          <nav className="admin-sidebar__nav">
            <p className="admin-sidebar__section-label">Plataforma</p>
            <NavLink to="/admin/portais" className={({ isActive }) => `admin-nav-item${isActive ? ' admin-nav-item--active' : ''}`}>
              <svg className="admin-nav-item__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
              </svg>
              <span className="admin-nav-item__label">Portais</span>
              <svg className="admin-nav-item__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </NavLink>
            <NavLink to="/admin/usuarios" className={({ isActive }) => `admin-nav-item${isActive ? ' admin-nav-item--active' : ''}`}>
              <svg className="admin-nav-item__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className="admin-nav-item__label">Usuários</span>
              <svg className="admin-nav-item__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </NavLink>
            <NavLink to="/admin/auto-cvm" className={({ isActive }) => `admin-nav-item${isActive ? ' admin-nav-item--active' : ''}`}>
              <svg className="admin-nav-item__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span className="admin-nav-item__label">Auto CVM</span>
              <svg className="admin-nav-item__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </NavLink>
          </nav>
        </aside>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
