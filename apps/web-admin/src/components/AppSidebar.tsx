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
}

export default function AppSidebar({ sections }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`admin-sidebar${collapsed ? ' admin-sidebar--collapsed' : ''}`}>
      <div className="admin-sidebar__logo">
        <img
          src={collapsed ? '/logos/logo-original.svg' : '/logos/logotipo-original.svg'}
          alt="Astri"
          className="admin-sidebar__logo-img"
        />
      </div>

      <nav className="admin-sidebar__nav">
        {sections.map((section) => (
          <div key={section.label}>
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
        <svg
          width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {!collapsed && <span>Recolher</span>}
      </button>
    </aside>
  );
}
