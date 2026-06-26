import './AdminPages.css';
import PageHeader from '../../components/PageHeader';

interface Portal {
  id: string;
  cliente: string;
  status: 'Ativo' | 'Suspenso';
  entidades: number;
  usuarios: number;
  convitesPendentes: number;
  criadoEm: string;
}

const PORTAIS: Portal[] = [
  { id: '1', cliente: 'Construtora Aurora', status: 'Ativo', entidades: 1, usuarios: 1, convitesPendentes: 1, criadoEm: '03/03/2026' },
  { id: '2', cliente: 'International Meal Company', status: 'Ativo', entidades: 3, usuarios: 2, convitesPendentes: 0, criadoEm: '12/02/2026' },
  { id: '3', cliente: 'Vetra Energia', status: 'Suspenso', entidades: 2, usuarios: 1, convitesPendentes: 0, criadoEm: '21/01/2026' },
];

export default function PortaisPage() {
  const totalPortais = PORTAIS.length;
  const ativos = PORTAIS.filter((p) => p.status === 'Ativo').length;
  const totalUsuarios = PORTAIS.reduce((sum, p) => sum + p.usuarios, 0);

  return (
    <div className="page">
      <PageHeader
        title="Portais"
        description="Os sites de RI dos clientes. Cada portal é um tenant isolado — criar um novo provisiona o banco, a entidade inicial e o convite do admin."
        action={
          <button className="btn-primary" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Novo Portal
          </button>
        }
      />

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-card__number">{totalPortais}</span>
          <span className="stat-card__label">Portais</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__number">{ativos}</span>
          <span className="stat-card__label">Ativos</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__number">{totalUsuarios}</span>
          <span className="stat-card__label">Usuários</span>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Status</th>
              <th>Entidades</th>
              <th>Usuários</th>
              <th>Convites Pendentes</th>
              <th>Criado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {PORTAIS.map((portal) => (
              <tr key={portal.id}>
                <td className="table-cell--bold">{portal.cliente}</td>
                <td>
                  <span className={`badge ${portal.status === 'Ativo' ? 'badge--success' : 'badge--error'}`}>
                    {portal.status}
                  </span>
                </td>
                <td>{portal.entidades}</td>
                <td>{portal.usuarios}</td>
                <td>
                  <span className={`badge ${portal.convitesPendentes > 0 ? 'badge--warning' : 'badge--gray'}`}>
                    {portal.convitesPendentes} Pendente{portal.convitesPendentes !== 1 ? 's' : ''}
                  </span>
                </td>
                <td className="table-cell--muted">{portal.criadoEm}</td>
                <td>
                  <div className="table-actions">
                    <button className="btn-action btn-action--enter" type="button">
                      Entrar
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                    <span className="tooltip-wrap">
                      <button className="btn-action btn-action--danger" type="button" aria-label="Suspender portal">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                      </button>
                      <span className="tooltip">Suspender portal</span>
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
