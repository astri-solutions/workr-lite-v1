import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import StickyPageHeader from '../../components/StickyPageHeader';
import './AdminPages.css';
import './AdminDashboardPage.css';

interface PortalCard {
  id: string;
  cliente: string;
  status: 'Ativo' | 'Suspenso';
  sites: number;
  empresa: string;
}

const ALL_PORTAIS: PortalCard[] = [
  { id: '1', cliente: 'Construtora Aurora', status: 'Ativo', sites: 1, empresa: 'Aurora S.A.' },
  { id: '2', cliente: 'International Meal Company', status: 'Ativo', sites: 2, empresa: 'IMC S.A.' },
  { id: '3', cliente: 'Vetra Energia', status: 'Suspenso', sites: 1, empresa: 'Vetra Energia S.A.' },
];

export default function AdminDashboardPage() {
  const { user, enterPortal } = useAuth();
  const navigate = useNavigate();

  const portais: PortalCard[] =
    user?.role === 'super_admin'
      ? ALL_PORTAIS
      : ALL_PORTAIS.filter((p) => user?.portais?.some((up) => up.id === p.id));

  const totalAtivos = ALL_PORTAIS.filter((p) => p.status === 'Ativo').length;
  const totalSites = ALL_PORTAIS.reduce((acc, p) => acc + p.sites, 0);

  function handleAdminSite(portal: PortalCard) {
    enterPortal(portal.id, portal.cliente);
    navigate('/portal/empresas');
  }

  return (
    <div className="page">
      <StickyPageHeader
        title="Dashboard"
        description={`Bem-vindo, ${user?.name ?? ''}.`}
      />

      <div className="dashboard-stats">
        <div className="stat-card">
          <span className="stat-card__value">{ALL_PORTAIS.length}</span>
          <span className="stat-card__label">Total Portais</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{totalAtivos}</span>
          <span className="stat-card__label">Portais Ativos</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{totalSites}</span>
          <span className="stat-card__label">Total Sites</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">5</span>
          <span className="stat-card__label">Total Usuários</span>
        </div>
      </div>

      <section className="dashboard-portais-section">
        <h2 className="dashboard-section-title">Seus Portais</h2>
        <div className="dashboard-portais-grid">
          {portais.map((portal) => (
            <div key={portal.id} className="dashboard-portal-card">
              <div className="dashboard-portal-card__header">
                <span className="dashboard-portal-card__name">{portal.cliente}</span>
                <span className={`badge ${portal.status === 'Ativo' ? 'badge--success' : 'badge--error'}`}>
                  {portal.status}
                </span>
              </div>
              <div className="dashboard-portal-card__meta">
                <span className="dashboard-portal-card__empresa">{portal.empresa}</span>
                <span className="dashboard-portal-card__sites">
                  {portal.sites} {portal.sites === 1 ? 'site' : 'sites'}
                </span>
              </div>
              <div className="dashboard-portal-card__actions">
                <button
                  className="btn-action btn-action--enter"
                  onClick={() => navigate('/admin/portais')}
                >
                  Ver portais
                </button>
                <button
                  className="btn-action btn-action--publish"
                  onClick={() => handleAdminSite(portal)}
                >
                  Admin Site
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
