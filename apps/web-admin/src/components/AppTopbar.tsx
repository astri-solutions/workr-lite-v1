import UserMenu from './UserMenu';

interface AppTopbarProps {
  onMobileMenuOpen?: () => void;
}

export default function AppTopbar({ onMobileMenuOpen }: AppTopbarProps) {
  return (
    <header className="admin-topbar">
      <div className="admin-topbar__left">
        <button
          className="admin-topbar__hamburger"
          type="button"
          aria-label="Abrir menu"
          onClick={onMobileMenuOpen}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>menu</span>
        </button>
        <div className="admin-search" style={{ visibility: 'hidden' }}>
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
