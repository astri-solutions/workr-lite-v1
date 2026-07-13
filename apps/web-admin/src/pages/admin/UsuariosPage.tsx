import { useState, useMemo } from 'react';
import { useSort } from '../../hooks/useSort';
import SortIcon from '../../components/SortIcon';
import './AdminPages.css';
import StickyPageHeader from '../../components/StickyPageHeader';
import FilterBar from '../../components/FilterBar';
import SearchInput from '../../components/SearchInput';
import InviteUserModal, { InviteFormData, PortalWithEmpresas } from '../../components/InviteUserModal';
import EditUserModal, { EditableUser } from '../../components/EditUserModal';
import Modal from '../../components/Modal';
import { useAuth } from '../../contexts/AuthContext';

interface UsuarioItem {
  id: string;
  nome: string;
  email: string;
  role: 'super_admin' | 'client_user';
  portais: string[];
  status: 'Ativo' | 'Suspenso';
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Admin',
  client_user: 'Cliente',
};

const USUARIOS_STORAGE_KEY = 'workr_usuarios';

function loadPortaisFromStorage(): PortalWithEmpresas[] {
  try {
    const raw = localStorage.getItem('workr_portais');
    const portais: Array<{ id: string; cliente: string }> = raw ? JSON.parse(raw) : [];
    return portais.map(p => ({ id: p.id, nome: p.cliente, empresas: [] }));
  } catch {
    return [];
  }
}

function loadUsuariosFromStorage(): UsuarioItem[] {
  try {
    const raw = localStorage.getItem(USUARIOS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUsuarios(list: UsuarioItem[]) {
  localStorage.setItem(USUARIOS_STORAGE_KEY, JSON.stringify(list));
}

export default function UsuariosPage() {
  const { user: authUser } = useAuth();
  const portais = useMemo(() => loadPortaisFromStorage(), []);
  const portaisMap = useMemo(() => Object.fromEntries(portais.map(p => [p.id, p.nome])), [portais]);

  // Seed the list with the logged-in super_admin if not already stored
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>(() => {
    const stored = loadUsuariosFromStorage();
    if (authUser && !stored.find(u => u.email === authUser.email)) {
      const me: UsuarioItem = {
        id: 'me',
        nome: authUser.name || authUser.email,
        email: authUser.email,
        role: 'super_admin',
        portais: [],
        status: 'Ativo',
      };
      const withMe = [me, ...stored];
      saveUsuarios(withMe);
      return withMe;
    }
    return stored;
  });

  const filterGroups = useMemo(() => [
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
        ...portais.map((p) => ({ value: p.id, label: p.nome })),
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
  ], [portais]);
  const [search, setSearch] = useState('');
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
    setUsuarios(prev => { const next = [...prev, newUser]; saveUsuarios(next); return next; });
  }

  function handleSaveRole(id: string, role: 'super_admin' | 'client_user', portaisIds: string[]) {
    setUsuarios((list) => { const next = list.map((u) => u.id === id ? { ...u, role, portais: portaisIds } : u); saveUsuarios(next); return next; });
  }

  function handleToggleStatus(id: string) {
    setUsuarios((list) => {
      const next = list.map((u) => u.id === id ? { ...u, status: u.status === 'Ativo' ? 'Suspenso' as const : 'Ativo' as const } : u);
      saveUsuarios(next);
      return next;
    });
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
    setUsuarios((list) => { const next = list.filter((u) => u.id !== id); saveUsuarios(next); return next; });
  }

  const _filtered = usuarios.filter((u) => {
    if (search) {
      const q = search.toLowerCase();
      if (!u.nome.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    if (filters.role !== 'all' && u.role !== filters.role) return false;
    if (filters.portal !== 'all' && !u.portais.includes(filters.portal)) return false;
    if (filters.status !== 'all' && u.status !== filters.status) return false;
    return true;
  });
  const { sorted: filtered, col, dir, toggle } = useSort(_filtered);

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

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome ou e-mail…" className="usu-admin-search" />
      <FilterBar groups={filterGroups} value={filters} onChange={handleFilter} />

      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        portais={portais}
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
              <th className={`th-sort${col === 'nome' ? ' th-sort--active' : ''}`} onClick={() => toggle('nome')}><span className="th-sort-inner">Nome <SortIcon dir={col === 'nome' ? dir : null} /></span></th>
              <th className={`th-sort${col === 'email' ? ' th-sort--active' : ''}`} onClick={() => toggle('email')}><span className="th-sort-inner">Email <SortIcon dir={col === 'email' ? dir : null} /></span></th>
              <th>Organização</th>
              <th className={`th-sort${col === 'role' ? ' th-sort--active' : ''}`} onClick={() => toggle('role')}><span className="th-sort-inner">Tipo <SortIcon dir={col === 'role' ? dir : null} /></span></th>
              <th>Portal</th>
              <th className={`th-sort${col === 'status' ? ' th-sort--active' : ''}`} onClick={() => toggle('status')}><span className="th-sort-inner">Status <SortIcon dir={col === 'status' ? dir : null} /></span></th>
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
                    {u.role === 'super_admin' ? (
                      <span className="badge badge--astri">Astri</span>
                    ) : (
                      <span className="table-cell--muted" style={{ fontSize: '13px' }}>
                        {u.portais.length === 0
                          ? '—'
                          : (portaisMap[u.portais[0]] ?? u.portais[0])}
                      </span>
                    )}
                  </td>
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
                          {portaisMap[u.portais[0]] ?? u.portais[0]}
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
                <td colSpan={8} className="table-empty">
                  {usuarios.length === 0
                    ? 'Nenhum usuário cadastrado. Convide o primeiro usuário com o botão acima.'
                    : 'Nenhum usuário encontrado para os filtros selecionados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
