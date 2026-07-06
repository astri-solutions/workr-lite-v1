import UserMenu from './UserMenu';

interface AppTopbarProps {
  onMobileMenuOpen?: () => void;
  portalName?: string;
  onBack?: () => void;
}

export default function AppTopbar({ onMobileMenuOpen, portalName, onBack }: AppTopbarProps) {
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
        {portalName && (
          <div className="admin-topbar__portal-ctx">
            {onBack && (
              <button className="admin-topbar__back-btn" type="button" onClick={onBack} aria-label="Voltar">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
                <span>Portais</span>
              </button>
            )}
            <span className="admin-topbar__portal-sep" aria-hidden="true">/</span>
            <span className="admin-topbar__context-label">
              <span className="material-symbols-outlined" style={{ fontSize: '16px', opacity: 0.6 }}>corporate_fare</span>
              {portalName}
            </span>
          </div>
        )}
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
