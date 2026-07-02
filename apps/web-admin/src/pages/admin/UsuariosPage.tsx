import { useState } from 'react';
import './AdminPages.css';
import StickyPageHeader from '../../components/StickyPageHeader';
import FilterBar from '../../components/FilterBar';
import InviteUserModal, { InviteFormData, PortalWithEmpresas } from '../../components/InviteUserModal';
import EditUserModal, { EditableUser } from '../../components/EditUserModal';
import Modal from '../../components/Modal';

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

const PORTAIS: PortalWithEmpresas[] = [
  {
    id: '1', nome: 'Construtora Aurora',
    empresas: [
      { id: '1a', nome: 'Aurora Incorporadora' },
      { id: '1b', nome: 'Aurora Imóveis' },
    ],
  },
  {
    id: '2', nome: 'International Meal Company',
    empresas: [
      { id: '2a', nome: 'IMC Brasil' },
      { id: '2b', nome: 'IMC São Paulo' },
      { id: '2c', nome: 'IMC Nordeste' },
    ],
  },
  { id: '3', nome: 'Vetra Energia' },
];

const FILTER_GROUPS = [
  {
    key: 'role',
    label: 'Tipo',
    options: [
      { value: 'all', label: 'Todos os tipos', shortLabel: 'Todos' },
      { value: 'super_admin', label: 'Admin' },
      { value: 'client_user', label: 'Cliente' },
    ],
  },
  {
    key: 'portal',
    label: 'Portal',
    options: [
      { value: 'all', label: 'Todos os portais', shortLabel: 'Todos' },
      ...PORTAIS.map((p) => ({ value: p.id, label: p.nome })),
    ],
  },
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'all', label: 'Todos os status', shortLabel: 'Todos' },
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
  const [desativarTarget, setDesativarTarget] = useState<UsuarioItem | null>(null);
  const [removerTarget, setRemoverTarget] = useState<UsuarioItem | null>(null);

  function handleFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleInvite(data: InviteFormData) {
    const newUser: UsuarioItem = {
      id: Math.random().toString(36).slice(2),
      nome: data.nome,
      email: data.email,
      role: data.perfil,
      portais: data.portaisIds,
      status: 'Ativo',
    };
    setUsuarios(prev => [...prev, newUser]);
  }

  function handleSaveRole(id: string, role: 'super_admin' | 'client_user', portais: string[]) {
    setUsuarios((list) => list.map((u) => u.id === id ? { ...u, role, portais } : u));
  }

  function handleToggleStatus(id: string) {
    setUsuarios((list) =>
      list.map((u) => u.id === id ? { ...u, status: u.status === 'Ativo' ? 'Suspenso' : 'Ativo' } : u)
    );
  }

  function confirmDesativar() {
    if (!desativarTarget) return;
    handleToggleStatus(desativarTarget.id);
    setDesativarTarget(null);
  }

  function confirmRemover() {
    if (!removerTarget) return;
    handleDelete(removerTarget.id);
    setRemoverTarget(null);
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

      {desativarTarget && (
        <Modal
          open
          onClose={() => setDesativarTarget(null)}
          title="Desativar usuário"
          size="sm"
          footer={
            <div className="modal-footer">
              <button className="btn-outline" type="button" onClick={() => setDesativarTarget(null)}>Cancelar</button>
              <button className="btn-danger" type="button" onClick={confirmDesativar}>Desativar</button>
            </div>
          }
        >
          <p className="ae-confirm-text">
            <strong>{desativarTarget.nome}</strong> perderá acesso imediato a todos os conteúdos do portal. Deseja continuar?
          </p>
        </Modal>
      )}

      {removerTarget && (
        <Modal
          open
          onClose={() => setRemoverTarget(null)}
          title="Remover usuário"
          size="sm"
          footer={
            <div className="modal-footer">
              <button className="btn-outline" type="button" onClick={() => setRemoverTarget(null)}>Cancelar</button>
              <button className="btn-danger" type="button" onClick={confirmRemover}>Remover</button>
            </div>
          }
        >
          <p className="ae-confirm-text">
            <strong>{removerTarget.nome}</strong> será removido permanentemente e perderá acesso a todos os conteúdos do portal. Essa ação não pode ser desfeita.
          </p>
        </Modal>
      )}

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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="badge badge--gray" style={{ fontSize: '11px' }}>
                          {PORTAIS_MAP[u.portais[0]] ?? u.portais[0]}
                        </span>
                        {u.portais.length > 1 && (
                          <span className="badge badge--gray" style={{ fontSize: '11px' }}>
                            +{u.portais.length - 1}
                          </span>
                        )}
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
                        onClick={() => u.status === 'Ativo' ? setDesativarTarget(u) : handleToggleStatus(u.id)}
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
                        onClick={() => setRemoverTarget(u)}
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
