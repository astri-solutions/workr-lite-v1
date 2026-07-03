import UserMenu from './UserMenu';

interface AppTopbarProps {
  onMobileMenuOpen?: () => void;
  contextLabel?: string;
}

export default function AppTopbar({ onMobileMenuOpen, contextLabel }: AppTopbarProps) {
  return (
    <header className="admin-topbar">
      <div className="admin-topbar__left">
        <button
          className="admin-topbar__hamburger"
          type="button"
          aria-label="Abrir menu"
          onClick={onMobileMenuOpen}
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
            <rect x="1" y="1" width="16" height="2" rx="1" fill="currentColor" />
            <rect x="1" y="6" width="16" height="2" rx="1" fill="currentColor" />
            <rect x="1" y="11" width="16" height="2" rx="1" fill="currentColor" />
          </svg>
        </button>
        {contextLabel && (
          <span className="admin-topbar__context-label">{contextLabel}</span>
        )}
      </div>
      <div className="admin-topbar__right">
        <span className="admin-topbar__version">Workr Lite v1.0</span>
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
