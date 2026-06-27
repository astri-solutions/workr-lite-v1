import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './ClientLayout.css';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

function NavIcon({ children }: { children: React.ReactNode }) {
  return <span className="cl-nav-icon">{children}</span>;
}

const CONTENT_NAV: NavItem[] = [
  {
    to: '/portal/central-de-resultados',
    label: 'Central de Resultados',
    icon: (
      <NavIcon>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
        </svg>
      </NavIcon>
    ),
  },
  {
    to: '/portal/documentos',
    label: 'Documentos',
    icon: (
      <NavIcon>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      </NavIcon>
    ),
  },
  {
    to: '/portal/midia',
    label: 'Biblioteca de Mídia',
    icon: (
      <NavIcon>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </NavIcon>
    ),
  },
  {
    to: '/portal/canais',
    label: 'Árvore de canais',
    icon: (
      <NavIcon>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 16 12 14 15 10 9 8 12 2 12" />
        </svg>
      </NavIcon>
    ),
  },
  {
    to: '/portal/materias',
    label: 'Matérias',
    icon: (
      <NavIcon>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </NavIcon>
    ),
  },
];

const RELATIONSHIP_NAV: NavItem[] = [
  {
    to: '/portal/interacoes',
    label: 'Interações',
    badge: 2,
    icon: (
      <NavIcon>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22 6 12 13 2 6" />
        </svg>
      </NavIcon>
    ),
  },
];

const CUSTOMIZE_NAV: NavItem[] = [
  {
    to: '/portal/layout',
    label: 'Layout',
    icon: (
      <NavIcon>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      </NavIcon>
    ),
  },
  {
    to: '/portal/cores',
    label: 'Cores',
    icon: (
      <NavIcon>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" />
          <circle cx="8.5" cy="7.5" r=".5" /><circle cx="6.5" cy="12.5" r=".5" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
        </svg>
      </NavIcon>
    ),
  },
  {
    to: '/portal/fontes',
    label: 'Font-Family',
    icon: (
      <NavIcon>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="9" y1="20" x2="15" y2="20" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
      </NavIcon>
    ),
  },
  {
    to: '/portal/logotipo',
    label: 'Logotipo',
    icon: (
      <NavIcon>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      </NavIcon>
    ),
  },
  {
    to: '/portal/favicon',
    label: 'Favicon',
    icon: (
      <NavIcon>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </NavIcon>
    ),
  },
  {
    to: '/portal/banner',
    label: 'Banner',
    icon: (
      <NavIcon>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
        </svg>
      </NavIcon>
    ),
  },
];

export default function ClientLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function renderNav(items: NavItem[]) {
    return items.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) => `cl-nav-item${isActive ? ' cl-nav-item--active' : ''}`}
      >
        {item.icon}
        <span className="cl-nav-label">{item.label}</span>
        {item.badge !== undefined && (
          <span className="cl-nav-badge">{item.badge}</span>
        )}
      </NavLink>
    ));
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <div className="cl-shell">
      <aside className="cl-sidebar">
        <div className="cl-sidebar__logo">
          <img src="/logos/logotipo-original.svg" alt="Workr" className="cl-sidebar__logo-img" />
        </div>

        <nav className="cl-sidebar__nav">
          <p className="cl-sidebar__section-label">Conteúdo</p>
          {renderNav(CONTENT_NAV)}

          <p className="cl-sidebar__section-label">Relacionamento</p>
          {renderNav(RELATIONSHIP_NAV)}

          <p className="cl-sidebar__section-label">Personalizar</p>
          {renderNav(CUSTOMIZE_NAV)}
        </nav>
      </aside>

      <div className="cl-body">
        <header className="cl-topbar">
          <span className="cl-topbar__portal">IMC Investor Relations</span>
          <div className="cl-topbar__user">
            <div className="cl-topbar__avatar">{initials}</div>
            <span className="cl-topbar__name">{user?.name}</span>
            <button className="cl-topbar__logout" type="button" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </header>

        <main className="cl-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
