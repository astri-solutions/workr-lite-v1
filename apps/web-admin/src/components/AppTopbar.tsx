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
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <rect y="0" width="16" height="2" rx="1" fill="currentColor" />
            <rect y="5" width="16" height="2" rx="1" fill="currentColor" />
            <rect y="10" width="16" height="2" rx="1" fill="currentColor" />
          </svg>
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
