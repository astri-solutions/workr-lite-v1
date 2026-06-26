import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';
import InformacoesModal from './InformacoesModal';
import './UserMenu.css';

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function handleLogout() {
    setOpen(false);
    logout();
    navigate('/login');
  }

  if (!user) return null;

  const initials = getInitials(user.name);

  return (
    <>
    <div className="user-menu" ref={menuRef}>
      <button
        className={`user-menu__trigger${open ? ' user-menu__trigger--open' : ''}`}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="user-menu__avatar">{initials}</span>
        <span className="user-menu__email">{user.email}</span>
        <svg
          className={`user-menu__caret${open ? ' user-menu__caret--open' : ''}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="user-menu__dropdown" role="menu">
          {/* Identity header */}
          <div className="user-menu__identity">
            <span className="user-menu__identity-name">{user.name}</span>
            <span className="user-menu__identity-email">{user.email}</span>
          </div>

          <div className="user-menu__divider" />

          {/* Menu items */}
          <button className="user-menu__item" type="button" role="menuitem"
            onClick={() => { setOpen(false); setInfoOpen(true); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Informações pessoais
          </button>

          <button className="user-menu__item" type="button" role="menuitem"
            onClick={() => { setOpen(false); setChangePwOpen(true); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Mudar senha
          </button>

          <div className="user-menu__divider" />

          <button className="user-menu__item user-menu__item--danger" type="button"
            role="menuitem" onClick={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sair
          </button>
        </div>
      )}
    </div>

    <ChangePasswordModal open={changePwOpen} onClose={() => setChangePwOpen(false)} />
    <InformacoesModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  );
}
