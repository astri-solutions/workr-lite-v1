import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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

  function handleLogout() {
    setOpen(false);
    logout();
    navigate('/login');
  }

  if (!user) return null;

  const initials = getInitials(user.name);
  const infoRoute = user.role === 'super_admin' ? '/admin/informacoes' : '/portal/informacoes';

  return (
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
        <span className={`material-symbols-outlined user-menu__caret${open ? ' user-menu__caret--open' : ''}`} style={{ fontSize: '16px' }}>expand_more</span>
      </button>

      {open && (
        <div className="user-menu__dropdown" role="menu">
          <div className="user-menu__identity">
            <span className="user-menu__identity-name">{user.name}</span>
            <span className="user-menu__identity-email">{user.email}</span>
          </div>

          <div className="user-menu__divider" />

          <button className="user-menu__item" type="button" role="menuitem"
            onClick={() => { setOpen(false); navigate(infoRoute); }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person</span>
            Informações pessoais
          </button>

          <div className="user-menu__divider" />

          <button className="user-menu__item user-menu__item--danger" type="button"
            role="menuitem" onClick={handleLogout}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
