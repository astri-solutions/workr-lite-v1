import UserMenu from './UserMenu';

export default function AppTopbar() {
  return (
    <header className="admin-topbar">
      <div className="admin-topbar__left">
        <div className="admin-search">
          <span className="material-symbols-outlined admin-search__icon" style={{ fontSize: '18px' }}>search</span>
          <input className="admin-search__input" type="text" placeholder="Buscar..." />
        </div>
      </div>
      <div className="admin-topbar__right">
        <button className="admin-topbar__alert-btn" type="button" aria-label="Alertas">
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications</span>
          <span>Alertas</span>
        </button>
        <div className="admin-topbar__separator" />
        <UserMenu />
      </div>
    </header>
  );
}
