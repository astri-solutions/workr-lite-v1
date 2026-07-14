import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export interface NavItem {
  to?: string;
  end?: boolean;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  children?: NavItem[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

interface AppSidebarProps {
  sections: NavSection[];
  logoSrc: string;
  logoCollapsedSrc?: string;
  logoAlt?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  footerContent?: React.ReactNode;
}

function SidebarNavItem({
  item,
  collapsed,
  onMobileClose,
}: {
  item: NavItem;
  collapsed: boolean;
  onMobileClose?: () => void;
}) {
  const location = useLocation();

  const childPaths = (item.children ?? []).map((c) => c.to).filter(Boolean) as string[];
  const isChildActive = childPaths.some((p) => location.pathname.startsWith(p));

  const [open, setOpen] = useState(() => isChildActive);

  if (item.children && item.children.length > 0) {
    return (
      <>
        <button
          type="button"
          className={`admin-nav-item admin-nav-item--parent${isChildActive ? ' admin-nav-item--child-active' : ''}`}
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
          title={collapsed ? item.label : undefined}
        >
          <span className="admin-nav-item__icon">{item.icon}</span>
          {!collapsed && (
            <>
              <span className="admin-nav-item__label">{item.label}</span>
              <span
                className="material-symbols-outlined admin-nav-item__chevron"
                style={{
                  fontSize: '14px',
                  transition: 'transform 0.2s',
                  transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              >
                expand_more
              </span>
            </>
          )}
        </button>
        {open && !collapsed && (
          <div className="admin-nav-children">
            {item.children.map((child) =>
              child.to ? (
                <NavLink
                  key={child.to}
                  to={child.to}
                  end={child.end}
                  onClick={onMobileClose}
                  className={({ isActive }) =>
                    `admin-nav-item admin-nav-item--child${isActive ? ' admin-nav-item--active' : ''}`
                  }
                >
                  <span className="admin-nav-item__icon">{child.icon}</span>
                  <span className="admin-nav-item__label">{child.label}</span>
                </NavLink>
              ) : null
            )}
          </div>
        )}
      </>
    );
  }

  if (!item.to) return null;

  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      onClick={onMobileClose}
      className={({ isActive }) =>
        `admin-nav-item${isActive ? ' admin-nav-item--active' : ''}`
      }
    >
      <span className="admin-nav-item__icon">{item.icon}</span>
      {!collapsed && (
        <>
          <span className="admin-nav-item__label">{item.label}</span>
          {item.badge !== undefined && (
            <span className="nav-badge">{item.badge}</span>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function AppSidebar({
  sections,
  logoSrc,
  logoCollapsedSrc,
  logoAlt = 'Logo',
  mobileOpen = false,
  onMobileClose,
  footerContent,
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  const currentLogo = collapsed ? (logoCollapsedSrc ?? logoSrc) : logoSrc;

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
    : '?';

  return (
    <aside className={`admin-sidebar${collapsed ? ' admin-sidebar--collapsed' : ''}${mobileOpen ? ' admin-sidebar--mobile-open' : ''}`}>

      {/* Mobile-only header: user profile + close */}
      <div className="admin-sidebar__mobile-header">
        <div className="admin-sidebar__mobile-user">
          <div className="admin-sidebar__mobile-avatar">{initials}</div>
          <div className="admin-sidebar__mobile-info">
            <span className="admin-sidebar__mobile-name">{user?.name ?? 'Usuário'}</span>
            <span className="admin-sidebar__mobile-email">{user?.email ?? ''}</span>
          </div>
        </div>
        <button
          type="button"
          className="admin-sidebar__mobile-close"
          onClick={onMobileClose}
          aria-label="Fechar menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Desktop logo */}
      <NavLink to="/portal/dashboard" className="admin-sidebar__logo">
        <img src={currentLogo} alt={logoAlt} className="admin-sidebar__logo-img" />
      </NavLink>

      <div className="admin-sidebar__scroll">
        <nav className="admin-sidebar__nav">
          {sections.map((section) => (
            <div key={section.label} className="admin-sidebar__section">
              {!collapsed && (
                <p className="admin-sidebar__section-label">{section.label}</p>
              )}
              {section.items.map((item) => (
                <SidebarNavItem
                  key={item.to ?? item.label}
                  item={item}
                  collapsed={collapsed}
                  onMobileClose={onMobileClose}
                />
              ))}
            </div>
          ))}
        </nav>
      </div>

      <div className="admin-sidebar__footer">
        {footerContent && <div className="admin-sidebar__footer-slot">{footerContent}</div>}
        <button
          className="admin-sidebar__toggle"
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '18px',
              transform: collapsed ? 'scaleX(-1)' : 'none',
              transition: 'transform 0.22s',
              display: 'inline-block',
            }}
          >
            menu_open
          </span>
          {!collapsed && <span>Recolher</span>}
        </button>
        {!collapsed && (
          <div className="admin-sidebar__version">Workr Lite v1.0</div>
        )}
      </div>
    </aside>
  );
}
