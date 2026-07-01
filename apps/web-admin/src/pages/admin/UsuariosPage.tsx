import { useState } from 'react';
import './AdminPages.css';
import StickyPageHeader from '../../components/StickyPageHeader';
import FilterBar from '../../components/FilterBar';
import InviteUserModal, { InviteFormData } from '../../components/InviteUserModal';
import EditUserModal, { EditableUser } from '../../components/EditUserModal';

interface UsuarioItem {
  id: string;
  nome: string;
  email: string;
  role: 'super_admin' | 'client_user';
  portais: string[];
  status: 'Ativo' | 'Suspenso';
}

const PORTAIS_MAP: Record<string, string> = {
  '1': 'Construtora Aurora',
  '2': 'International Meal Company',
  '3': 'Vetra Energia',
};

const INITIAL_USUARIOS: UsuarioItem[] = [
  { id: '1', nome: 'G. Santos', email: 'g.santos@astri.solutions', role: 'super_admin', portais: [], status: 'Ativo' },
  { id: '2', nome: 'Rafael Lima', email: 'rafael@astri.solutions', role: 'super_admin', portais: [], status: 'Ativo' },
  { id: '3', nome: 'Ana Souza', email: 'ana@construtoraaurora.com', role: 'client_user', portais: ['1'], status: 'Ativo' },
  { id: '4', nome: 'Carlos Melo', email: 'carlos@imc.com.br', role: 'client_user', portais: ['2'], status: 'Ativo' },
  { id: '5', nome: 'Fernanda Costa', email: 'fcosta@vetraenergia.com', role: 'client_user', portais: ['3'], status: 'Suspenso' },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Admin',
  client_user: 'Cliente',
};

const PORTAIS = [
  { id: '1', nome: 'Construtora Aurora' },
  { id: '2', nome: 'International Meal Company' },
  { id: '3', nome: 'Vetra Energia' },
];

const FILTER_GROUPS = [
  {
    key: 'role',
    label: 'Tipo',
    options: [
      { value: 'all', label: 'Todos' },
      { value: 'super_admin', label: 'Admin' },
      { value: 'client_user', label: 'Cliente' },
    ],
  },
  {
    key: 'portal',
    label: 'Portal',
    options: [
      { value: 'all', label: 'Todos' },
      ...PORTAIS.map((p) => ({ value: p.id, label: p.nome })),
    ],
  },
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'all', label: 'Todos' },
      { value: 'Ativo', label: 'Ativo' },
      { value: 'Suspenso', label: 'Suspenso' },
    ],
  },
];

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>(INITIAL_USUARIOS);
  const [filters, setFilters] = useState<Record<string, string>>({ role: 'all', portal: 'all', status: 'all' });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EditableUser | null>(null);

  function handleFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleInvite(data: InviteFormData) {
    console.log('Convidar usuário:', data);
  }

  function handleSaveRole(id: string, role: 'super_admin' | 'client_user', portais: string[]) {
    setUsuarios((list) => list.map((u) => u.id === id ? { ...u, role, portais } : u));
  }

  function handleToggleStatus(id: string) {
    setUsuarios((list) =>
      list.map((u) => u.id === id ? { ...u, status: u.status === 'Ativo' ? 'Suspenso' : 'Ativo' } : u)
    );
  }

  function handleDelete(id: string) {
    setUsuarios((list) => list.filter((u) => u.id !== id));
  }

  const filtered = usuarios.filter((u) => {
    if (filters.role !== 'all' && u.role !== filters.role) return false;
    if (filters.portal !== 'all' && !u.portais.includes(filters.portal)) return false;
    if (filters.status !== 'all' && u.status !== filters.status) return false;
    return true;
  });

  return (
    <div className="page">
      <StickyPageHeader
        title="Usuários"
        description="Gerencie usuários e convites da plataforma. Super admins têm acesso a todos os portais; clientes acessam apenas o seu portal."
        action={
          <button className="btn-primary" type="button" onClick={() => setInviteOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Convidar Usuário
          </button>
        }
      />

      <FilterBar groups={FILTER_GROUPS} value={filters} onChange={handleFilter} />

      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        portais={PORTAIS}
        onSubmit={handleInvite}
      />

      <EditUserModal
        user={editTarget}
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveRole}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
      />

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Tipo</th>
              <th>Portal</th>
              <th>Status</th>
              <th>Ações</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((u) => (
                <tr key={u.id}>
                  <td className="table-cell--bold">{u.nome}</td>
                  <td className="table-cell--muted">{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'super_admin' ? 'badge--info' : 'badge--gray'}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td>
                    {u.role === 'super_admin' ? (
                      <span className="table-cell--muted">Todos</span>
                    ) : u.portais.length === 0 ? (
                      <span className="table-cell--muted">—</span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {u.portais.map(pid => (
                          <span key={pid} className="badge badge--gray" style={{ fontSize: '11px' }}>{PORTAIS_MAP[pid] ?? pid}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${u.status === 'Ativo' ? 'badge--success' : 'badge--error'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="btn-action btn-action--enter"
                        type="button"
                        onClick={() => setEditTarget({ id: u.id, nome: u.nome, email: u.email, role: u.role, portais: u.portais, status: u.status })}
                      >
                        Editar
                      </button>
                      <button
                        className={`btn-action ${u.status === 'Suspenso' ? 'btn-action--activate' : 'btn-action--secondary'}`}
                        type="button"
                        onClick={() => handleToggleStatus(u.id)}
                      >
                        {u.status === 'Suspenso' ? 'Ativar' : 'Desativar'}
                      </button>
                    </div>
                  </td>
                  <td>
                    {u.role !== 'super_admin' && (
                      <button
                        className="btn-action btn-action--danger"
                        type="button"
                        onClick={() => handleDelete(u.id)}
                      >
                        Remover
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="table-empty">Nenhum usuário encontrado para os filtros selecionados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
