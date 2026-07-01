import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../admin/AdminPages.css';
import './DashboardPage.css';

const ACCOUNT_MANAGER = {
  name: 'Luísa Carvalho',
  role: 'Gerente de Conta',
  email: 'luisa.carvalho@astri.solutions',
  phone: '+55 (11) 91234-5678',
  avatar: 'LC',
};

const STATS = [
  { label: 'Visitantes (30d)', value: '4.821', delta: '+12%', up: true },
  { label: 'Documentos publicados', value: '38', delta: '+3 este mês', up: true },
  { label: 'Matérias ativas', value: '14', delta: '2 rascunhos', up: false },
  { label: 'Interações pendentes', value: '7', delta: 'Responder', up: false },
];

const QUICK_LINKS = [
  { to: '/portal/central-de-resultados', label: 'Resultados', icon: (
    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>show_chart</span>
  )},
  { to: '/portal/documentos', label: 'Documentos', icon: (
    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>description</span>
  )},
  { to: '/portal/materias', label: 'Matérias', icon: (
    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit_note</span>
  )},
  { to: '/portal/interacoes', label: 'Interações', icon: (
    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>mail</span>
  )},
  { to: '/portal/midia', label: 'Mídia', icon: (
    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>image</span>
  )},
  { to: '/portal/canais', label: 'Canais', icon: (
    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>list</span>
  )},
];

const RECENT_ACTIVITY = [
  { action: 'Documento publicado', detail: 'Apresentação 2T25.pdf', time: 'Há 2 horas', type: 'doc' },
  { action: 'Nova matéria criada', detail: 'Resultado do 2º trimestre 2025', time: 'Há 5 horas', type: 'edit' },
  { action: 'Interação recebida', detail: 'Pergunta de acionista sobre dividendos', time: 'Há 1 dia', type: 'msg' },
  { action: 'Documento publicado', detail: 'Release 1T25.pdf', time: 'Há 3 dias', type: 'doc' },
  { action: 'Canal atualizado', detail: 'Governança — 2 novas páginas', time: 'Há 4 dias', type: 'channel' },
];

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  doc: <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>description</span>,
  edit: <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit_note</span>,
  msg: <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>mail</span>,
  channel: <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>list</span>,
};

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'bem-vindo';

  return (
    <div className="page dash-page">
      {/* Welcome header */}
      <div className="dash-welcome">
        <div>
          <h1 className="dash-welcome__title">Olá, {firstName} 👋</h1>
          <p className="dash-welcome__sub">Aqui está um resumo do seu portal de Relações com Investidores.</p>
        </div>
        <a href="#" className="btn-primary dash-visit-btn" target="_blank" rel="noreferrer">
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>open_in_new</span>
          Ver portal
        </a>
      </div>

      {/* Stat cards */}
      <div className="dash-stats">
        {STATS.map(s => (
          <div key={s.label} className="dash-stat-card">
            <span className="dash-stat-card__value">{s.value}</span>
            <span className="dash-stat-card__label">{s.label}</span>
            <span className={`dash-stat-card__delta${s.up ? ' dash-stat-card__delta--up' : ''}`}>{s.delta}</span>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        {/* Quick links */}
        <div className="dash-block">
          <h2 className="dash-block__title">Acesso rápido</h2>
          <div className="dash-quick-links">
            {QUICK_LINKS.map(l => (
              <Link key={l.to} to={l.to} className="dash-quick-link">
                <span className="dash-quick-link__icon">{l.icon}</span>
                <span className="dash-quick-link__label">{l.label}</span>
                <span className="material-symbols-outlined dash-quick-link__arrow" style={{ fontSize: '16px' }}>chevron_right</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="dash-block">
          <h2 className="dash-block__title">Atividade recente</h2>
          <div className="dash-activity">
            {RECENT_ACTIVITY.map((a, i) => (
              <div key={i} className="dash-activity-item">
                <span className="dash-activity-item__icon">{ACTIVITY_ICONS[a.type]}</span>
                <div className="dash-activity-item__body">
                  <span className="dash-activity-item__action">{a.action}</span>
                  <span className="dash-activity-item__detail">{a.detail}</span>
                </div>
                <span className="dash-activity-item__time">{a.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Account manager */}
        <div className="dash-block dash-account-block">
          <h2 className="dash-block__title">Seu atendimento</h2>
          <div className="dash-account">
            <div className="dash-account__header">
              <div className="dash-account__avatar">{ACCOUNT_MANAGER.avatar}</div>
              <div>
                <p className="dash-account__name">{ACCOUNT_MANAGER.name}</p>
                <p className="dash-account__role">{ACCOUNT_MANAGER.role}</p>
              </div>
            </div>
            <ul className="dash-account__contacts">
              <li className="dash-account__contact-item">
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>mail</span>
                <a href={`mailto:${ACCOUNT_MANAGER.email}`}>{ACCOUNT_MANAGER.email}</a>
              </li>
              <li className="dash-account__contact-item">
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>phone</span>
                <a href={`tel:${ACCOUNT_MANAGER.phone}`}>{ACCOUNT_MANAGER.phone}</a>
              </li>
            </ul>
            <Link to="/portal/atendimento" className="btn-primary dash-account__btn">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>support_agent</span>
              Entrar em contato
            </Link>
          </div>
        </div>
      </div>

      {/* Site info */}
      <div className="dash-block dash-info-block">
        <h2 className="dash-block__title">Informações do portal</h2>
        <div className="dash-info-scroll"><table className="dash-info-table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Domínio</th>
              <th>Layout</th>
              <th>Status</th>
              <th>Última atualização</th>
              <th>Plano</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Empresa">IMC S.A.</td>
              <td data-label="Domínio">ri.imc.com.br</td>
              <td data-label="Layout">Banner com menu</td>
              <td data-label="Status"><span className="badge badge--success">Publicado</span></td>
              <td data-label="Última atualização">29/06/2026</td>
              <td data-label="Plano">Workr Lite Pro</td>
            </tr>
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
