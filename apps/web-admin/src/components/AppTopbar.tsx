import UserMenu from './UserMenu';

export default function AppTopbar() {
  return (
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
  );
}
