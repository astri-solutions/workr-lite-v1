import './AdminPages.css';
import PageHeader from '../../components/PageHeader';

interface UsuarioItem {
  id: string;
  nome: string;
  email: string;
  role: 'super_admin' | 'client_user';
  portal: string;
  status: 'Ativo' | 'Suspenso';
}

const USUARIOS: UsuarioItem[] = [
  { id: '1', nome: 'G. Santos', email: 'g.santos@astri.solutions', role: 'super_admin', portal: '—', status: 'Ativo' },
  { id: '2', nome: 'Rafael Lima', email: 'rafael@astri.solutions', role: 'super_admin', portal: '—', status: 'Ativo' },
  { id: '3', nome: 'Ana Souza', email: 'ana@construtoraaurora.com', role: 'client_user', portal: 'Construtora Aurora', status: 'Ativo' },
  { id: '4', nome: 'Carlos Melo', email: 'carlos@imc.com.br', role: 'client_user', portal: 'International Meal Company', status: 'Ativo' },
  { id: '5', nome: 'Fernanda Costa', email: 'fcosta@vetraenergia.com', role: 'client_user', portal: 'Vetra Energia', status: 'Suspenso' },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Admin',
  client_user: 'Cliente',
};

export default function UsuariosPage() {
  return (
    <div className="page">
      <PageHeader
        title="Usuários"
        description="Gerencie usuários e convites da plataforma. Super admins têm acesso a todos os portais; clientes acessam apenas o seu portal."
        action={
          <button className="btn-primary" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Convidar Usuário
          </button>
        }
      />

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Role</th>
              <th>Portal</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {USUARIOS.map((u) => (
              <tr key={u.id}>
                <td className="table-cell--bold">{u.nome}</td>
                <td className="table-cell--muted">{u.email}</td>
                <td>
                  <span className={`badge ${u.role === 'super_admin' ? 'badge--info' : 'badge--gray'}`}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td className="table-cell--muted">{u.portal}</td>
                <td>
                  <span className={`badge ${u.status === 'Ativo' ? 'badge--success' : 'badge--error'}`}>
                    {u.status}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <button className="btn-action btn-action--enter" type="button">
                      Convidar
                    </button>
                    <button className="btn-action btn-action--danger" type="button">
                      Suspender
                    </button>
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
