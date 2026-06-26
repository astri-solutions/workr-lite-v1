import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import './AdminPages.css';

const PORTAIS = [
  { id: 1, nome: 'IMC Capital', dominio: 'imc.workr.com.br', status: 'Ativo', plano: 'Pro', criadoEm: '12/01/2025' },
  { id: 2, nome: 'Aurora Investimentos', dominio: 'aurora.workr.com.br', status: 'Ativo', plano: 'Starter', criadoEm: '03/02/2025' },
  { id: 3, nome: 'Vetra Asset', dominio: 'vetra.workr.com.br', status: 'Suspenso', plano: 'Pro', criadoEm: '17/03/2025' },
  { id: 4, nome: 'Nora Capital', dominio: 'nora.workr.com.br', status: 'Pendente', plano: 'Starter', criadoEm: '22/04/2025' },
];

const STATUS_BADGE: Record<string, string> = {
  Ativo: 'badge badge--success',
  Suspenso: 'badge badge--error',
  Pendente: 'badge badge--warning',
};

export default function PortaisPage() {
  const [portais] = useState(PORTAIS);

  return (
    <div className="page">
      <PageHeader
        title="Portais"
        description="Gerencie os portais de Relações com Investidores dos seus clientes. Cada portal é um tenant isolado — criar um novo provisiona o banco, a entidade inicial e o convite do admin."
        action={
          <button className="btn-primary" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo portal
          </button>
        }
      />

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Portal</th>
              <th>Domínio</th>
              <th>Status</th>
              <th>Plano</th>
              <th>Criado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {portais.map((portal) => (
              <tr key={portal.id}>
                <td className="table-cell--bold">{portal.nome}</td>
                <td className="table-cell--muted">{portal.dominio}</td>
                <td><span className={STATUS_BADGE[portal.status] ?? 'badge'}>{portal.status}</span></td>
                <td>{portal.plano}</td>
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
