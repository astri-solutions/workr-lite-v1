import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Modal from './Modal';
import type { Theme } from '../hooks/useTheme';
import './UserMenu.css';

interface UserMenuProps {
  theme?: Theme;
  onToggleTheme?: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function UserMenu({ theme, onToggleTheme }: UserMenuProps) {
  const { user, logout, switchPortal, portalRole } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    await logout();
    navigate('/login');
  }

  function handleSwitchPortal(portalId: string) {
    if (portalId === user?.activePortalId) { setSwitchOpen(false); return; }
    setSwitchOpen(false);
    setSwitching(true);
    setTimeout(() => {
      switchPortal(portalId);
      setSwitching(false);
    }, 1100);
  }

  const location = useLocation();

  if (!user) return null;

  const initials = getInitials(user.name);
  const infoRoute = user.role === 'super_admin' ? '/admin/informacoes' : '/portal/informacoes';
  const portais = user.portais ?? [];
  const hasMultiplePortais = portais.length > 1 && user.role !== 'super_admin';
  // Fall back to first portal if activePortalId doesn't match (e.g. client_user with one portal)
  const rawActivePortal = portais.find(p => p.id === user.activePortalId) ?? (portais.length === 1 ? portais[0] : undefined);
  // On global admin routes, suppress the active portal so the admin doesn't
  // appear "logged into" a specific client's portal.
  const isAdminGlobal = location.pathname.startsWith('/admin');
  const activePortal = isAdminGlobal ? undefined : rawActivePortal;

  return (
    <>
      {switching && (
        <div className="um-switching-overlay">
          <div className="um-switching-box">
            <span className="um-switching-spinner" />
            <span className="um-switching-label">Trocando empresa…</span>
          </div>
        </div>
      )}

      <div className="user-menu" ref={menuRef}>
        <button
          className={`user-menu__trigger${open ? ' user-menu__trigger--open' : ''}`}
          type="button"
          aria-haspopup="true"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="user-menu__avatar">{initials}</span>
          <span className="user-menu__trigger-info">
            <span className="user-menu__email">
              {user.name}
              {activePortal && (
                <><span className="user-menu__email-sep"> | </span>{activePortal.nome}</>
              )}
            </span>
          </span>
          <span className={`material-symbols-outlined user-menu__caret${open ? ' user-menu__caret--open' : ''}`} style={{ fontSize: '16px' }}>expand_more</span>
        </button>

        {open && (
          <div className="user-menu__dropdown" role="menu">
            <div className="user-menu__identity">
              <span className="user-menu__identity-name">{user.name}</span>
              <span className="user-menu__identity-email">{user.email}</span>
              {activePortal && (
                <span className="user-menu__identity-portal">
                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>domain</span>
                  {activePortal.nome}
                  {portalRole && (
                    <span className="um-role-badge um-role-badge--inline">{portalRole}</span>
                  )}
                </span>
              )}
            </div>

            <div className="user-menu__divider" />

            {onToggleTheme && (
              <button className="user-menu__item um-mobile-only" type="button" role="menuitemcheckbox"
                aria-checked={theme === 'dark'} onClick={onToggleTheme}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {theme === 'dark' ? 'dark_mode' : 'light_mode'}
                </span>
                {theme === 'dark' ? 'Tema escuro' : 'Tema claro'}
              </button>
            )}

            <button className="user-menu__item um-mobile-only" type="button" role="menuitem">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>notifications</span>
              Alertas
            </button>

            {onToggleTheme && <div className="user-menu__divider um-mobile-only" />}

            <button className="user-menu__item" type="button" role="menuitem"
              onClick={() => { setOpen(false); navigate(infoRoute); }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person</span>
              Informações pessoais
            </button>

            {hasMultiplePortais && (
              <button className="user-menu__item" type="button" role="menuitem"
                onClick={() => { setOpen(false); setSwitchOpen(true); }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>swap_horiz</span>
                Trocar empresa
              </button>
            )}

            <div className="user-menu__divider" />

            <button className="user-menu__item user-menu__item--danger" type="button"
              role="menuitem" onClick={handleLogout}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
              Sair
            </button>
          </div>
        )}
      </div>

      {/* Switch portal modal */}
      <Modal
        open={switchOpen}
        onClose={() => setSwitchOpen(false)}
        title="Trocar empresa"
        description="Selecione a empresa que deseja acessar."
        size="sm"
        footer={
          <button className="modal-btn modal-btn--ghost" type="button" onClick={() => setSwitchOpen(false)}>
            Cancelar
          </button>
        }
      >
        <div className="um-portal-list">
          {portais.map(portal => {
            const isActive = portal.id === user.activePortalId;
            return (
              <button
                key={portal.id}
                type="button"
                className={`um-portal-item${isActive ? ' um-portal-item--active' : ''}`}
                onClick={() => handleSwitchPortal(portal.id)}
              >
                <span className="um-portal-item__icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>domain</span>
                </span>
                <span className="um-portal-item__name">{portal.nome}</span>
                {portal.role && (
                  <span className={`um-role-badge um-role-badge--${portal.role}`}>{portal.role}</span>
                )}
                {isActive && (
                  <span className="um-portal-item__check">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
