import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '⬛' },
  { id: 'portais', label: 'Portais', icon: '🏢' },
  { id: 'documentos', label: 'Documentos', icon: '📄' },
  { id: 'paginas', label: 'Páginas', icon: '📑' },
  { id: 'configuracoes', label: 'Configurações', icon: '⚙️' },
]

const STATS = [
  { label: 'Portais Ativos', value: '—', sub: 'Em breve' },
  { label: 'Documentos', value: '—', sub: 'Em breve' },
  { label: 'Páginas Publicadas', value: '—', sub: 'Em breve' },
  { label: 'Usuários', value: '1', sub: 'Administrador' },
]

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('dashboard')

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="dash-root">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-logo">
          <span className="sidebar-logo-mark">W</span>
          <span className="sidebar-logo-text">Workr Lite</span>
        </div>

        <nav className="dash-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`dash-nav-item${activeNav === item.id ? ' active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="dash-sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user?.name?.[0] ?? 'A'}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name}</span>
              <span className="sidebar-user-email">{user?.email}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="dash-main">
        {/* Top bar */}
        <header className="dash-topbar">
          <div className="dash-topbar-left">
            <span className="topbar-portal-label">Portal</span>
            <span className="topbar-portal-name">— Nenhum portal selecionado</span>
          </div>
          <div className="dash-topbar-right">
            <span className="topbar-user-name">{user?.name}</span>
            <button className="btn-logout" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="dash-content">
          {/* Welcome card */}
          <div className="welcome-card">
            <div className="welcome-card-left">
              <h2>Bem-vindo ao Workr Lite CMS</h2>
              <p>
                Sua plataforma de gestão de conteúdo para Relações com Investidores.
                Selecione um módulo na barra lateral para começar.
              </p>
            </div>
            <div className="welcome-card-badge">RI</div>
          </div>

          {/* Stats grid */}
          <div className="stats-grid">
            {STATS.map((stat) => (
              <div key={stat.label} className="stat-card">
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
                <span className="stat-sub">{stat.sub}</span>
              </div>
            ))}
          </div>

          {/* Placeholder section */}
          <div className="dash-section">
            <div className="section-header">
              <h3>Atividade Recente</h3>
            </div>
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>Nenhuma atividade ainda.</p>
              <span>As ações realizadas no CMS aparecerão aqui.</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
