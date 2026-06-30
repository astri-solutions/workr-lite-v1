import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export interface NavItem {
  to?: string;
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
}

function SidebarNavItem({
  item,
  collapsed,
}: {
  item: NavItem;
  collapsed: boolean;
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
          onClick={() => setOpen((o) => !o)}
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
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const currentLogo = collapsed ? (logoCollapsedSrc ?? logoSrc) : logoSrc;

  return (
    <aside className={`admin-sidebar${collapsed ? ' admin-sidebar--collapsed' : ''}`}>
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
                />
              ))}
            </div>
          ))}
        </nav>
      </div>

      <div className="admin-sidebar__footer">
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
      </div>
    </aside>
  );
}
