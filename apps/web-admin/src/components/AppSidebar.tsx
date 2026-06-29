import { useState } from 'react';
import { NavLink } from 'react-router-dom';

export interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

interface AppSidebarProps {
  sections: NavSection[];
  /** Full logo shown when sidebar is expanded */
  logoSrc: string;
  /** Optional compact logo (icon-only) shown when sidebar is collapsed.
   *  Falls back to logoSrc if not provided. */
  logoCollapsedSrc?: string;
  logoAlt?: string;
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
        <img
          src={currentLogo}
          alt={logoAlt}
          className="admin-sidebar__logo-img"
        />
      </NavLink>

      <nav className="admin-sidebar__nav">
        {sections.map((section) => (
          <div key={section.label} className="admin-sidebar__section">
            {!collapsed && (
              <p className="admin-sidebar__section-label">{section.label}</p>
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.to}
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
            ))}
          </div>
        ))}
      </nav>

      <button
        className="admin-sidebar__toggle"
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px', transform: collapsed ? 'scaleX(-1)' : 'none', transition: 'transform 0.22s', display: 'inline-block' }}>menu_open</span>
        {!collapsed && <span>Recolher</span>}
      </button>
    </aside>
  );
}
