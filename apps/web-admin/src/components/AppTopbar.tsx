import UserMenu from './UserMenu';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';

interface AppTopbarProps {
  onMobileMenuOpen?: () => void;
  portalName?: string;
  onBack?: () => void;
}

export default function AppTopbar({ onMobileMenuOpen, portalName, onBack }: AppTopbarProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isImpersonating = user?.role === 'super_admin' && !!portalName;

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
            {isImpersonating && (
              <span className="admin-topbar__role-badge" title="Visualizando como administrador">Admin</span>
            )}
          </div>
        )}
      </div>
      <div className="admin-topbar__right">
        <button
          className="admin-topbar__theme-toggle"
          type="button"
          role="switch"
          aria-checked={theme === 'dark'}
          aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          onClick={toggleTheme}
        >
          <span className="admin-topbar__theme-icon admin-topbar__theme-icon--sun" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="5" fill="currentColor" />
              <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </g>
            </svg>
          </span>
          <span className="admin-topbar__theme-knob" aria-hidden="true" />
          <span className="admin-topbar__theme-icon admin-topbar__theme-icon--moon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.5 14.7A8.5 8.5 0 0 1 9.3 3.5a.5.5 0 0 0-.6-.7A10 10 0 1 0 21.2 15.3a.5.5 0 0 0-.7-.6z" />
            </svg>
          </span>
        </button>
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
