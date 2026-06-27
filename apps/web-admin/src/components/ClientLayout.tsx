import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './ClientLayout.css';

interface NavItem {
  to: string;
  label: string;
  emoji: string;
  badge?: number;
}

const NAV_CONTEUDO: NavItem[] = [
  { to: '/portal/central-de-resultados', label: 'Central de Resultados', emoji: '📊' },
  { to: '/portal/documentos', label: 'Documentos', emoji: '📄' },
  { to: '/portal/midia', label: 'Biblioteca de Mídia', emoji: '🖼' },
  { to: '/portal/canais', label: 'Árvore de canais', emoji: '🌿' },
  { to: '/portal/materias', label: 'Matérias', emoji: '📰' },
];

const NAV_RELACIONAMENTO: NavItem[] = [
  { to: '/portal/interacoes', label: 'Interações', emoji: '✉', badge: 2 },
];

const NAV_PERSONALIZAR: NavItem[] = [
  { to: '/portal/layout', label: 'Layout', emoji: '🎨' },
  { to: '/portal/cores', label: 'Cores', emoji: '🎨' },
  { to: '/portal/fontes', label: 'Font-Family', emoji: '🔤' },
  { to: '/portal/logotipo', label: 'Logotipo', emoji: '🏷' },
  { to: '/portal/favicon', label: 'Favicon', emoji: '⭐' },
  { to: '/portal/banner', label: 'Banner', emoji: '🖼' },
];

function NavSection({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <div className="client-sidebar__section">
      <p className="client-sidebar__section-label">{label}</p>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `client-nav-item${isActive ? ' client-nav-item--active' : ''}`
          }
        >
          <span className="client-nav-item__emoji">{item.emoji}</span>
          <span className="client-nav-item__label">{item.label}</span>
          {item.badge !== undefined && (
            <span className="client-nav-item__badge">{item.badge}</span>
          )}
        </NavLink>
      ))}
    </div>
  );
}

export default function ClientLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const initials = user?.name
    ? user.name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '?';

  return (
    <div className="client-shell">
      <aside className="client-sidebar">
        <div className="client-sidebar__logo">
          <span className="client-sidebar__logo-text">Astri</span>
        </div>

        <nav className="client-sidebar__nav">
          <NavSection label="CONTEÚDO" items={NAV_CONTEUDO} />
          <NavSection label="RELACIONAMENTO" items={NAV_RELACIONAMENTO} />
          <NavSection label="PERSONALIZAR" items={NAV_PERSONALIZAR} />
        </nav>
      </aside>

      <div className="client-content">
        <header className="client-topbar">
          <div className="client-topbar__site">
            <span className="client-topbar__site-name">IMC Investor Relations</span>
          </div>
          <div className="client-topbar__user">
            <div className="client-topbar__avatar">{initials}</div>
            <span className="client-topbar__name">{user?.name}</span>
            <button className="client-topbar__logout" type="button" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </header>

        <main className="client-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
