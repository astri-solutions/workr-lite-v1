import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSort } from '../../hooks/useSort';
import SortIcon from '../../components/SortIcon';
import './AdminPages.css';
import StickyPageHeader from '../../components/StickyPageHeader';
import FilterBar from '../../components/FilterBar';
import SearchInput from '../../components/SearchInput';
import InviteUserModal, { InviteFormData, PortalWithEmpresas } from '../../components/InviteUserModal';
import EditUserModal, { EditableUser } from '../../components/EditUserModal';
import Modal from '../../components/Modal';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface UsuarioItem {
  id: string;
  nome: string;
  email: string;
  role: 'super_admin' | 'client_user';
  portais: string[];
  portaisNomes?: string[];
  status: 'Ativo' | 'Suspenso';
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Admin',
  client_user: 'Cliente',
};

const FN_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : '';

async function getToken(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function loadPortaisFromStorage(): PortalWithEmpresas[] {
  try {
    const raw = localStorage.getItem('workr_portais');
    const portais: Array<{ id: string; cliente: string; sites?: Array<{ id: string }> }> = raw ? JSON.parse(raw) : [];

    // Load empresas from admin_empresas store (keyed by portal id)
    let adminEmpresas: Array<{ id: string; portalId?: string; nome: string }> = [];
    try {
      const aeRaw = localStorage.getItem('admin_empresas');
      if (aeRaw) adminEmpresas = JSON.parse(aeRaw);
    } catch { /* ignore */ }

    return portais.map(p => {
      const empresas = adminEmpresas
        .filter(e => e.portalId === p.id)
        .map(e => ({ id: e.id, nome: e.nome }));
      return { id: p.id, nome: p.cliente, empresas };
    });
  } catch {
    return [];
  }
}

export default function UsuariosPage() {
  const portais = useMemo(() => loadPortaisFromStorage(), []);
  const portaisMap = useMemo(() => Object.fromEntries(portais.map(p => [p.id, p.nome])), [portais]);

  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const [desativarPortais, setDesativarPortais] = useState<string[]>([]); // selected portal ids to suspend from
  const [removerTarget, setRemoverTarget] = useState<UsuarioItem | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError('Sessão não encontrada. Faça login novamente.');
        return;
      }
      const res = await fetch(`${FN_BASE}/list-users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { users?: UsuarioItem[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setUsuarios(json.users ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  async function callManageUser(body: Record<string, unknown>) {
    const token = await getToken();
    if (!token) throw new Error('Sessão expirada');
    const res = await fetch(`${FN_BASE}/manage-user`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json() as { ok?: boolean; error?: string };
    if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  }

  function handleFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function handleInvite(data: InviteFormData) {
    try {
      const token = await getToken();
      if (!token) return;
      // Build per-portal role + empresa vinculation so the invited client_user
      // is never left without an empresa tied to their access.
      const portaisConfig = data.portaisIds.map(portalId => {
        const portal = portais.find(p => p.id === portalId);
        const portalEmpresaIds = (portal?.empresas ?? []).map(e => e.id);
        return {
          portalId,
          role: data.portalRoles[portalId] ?? 'viewer',
          empresas: data.empresasIds.filter(id => portalEmpresaIds.includes(id)),
        };
      });
      await fetch(`${FN_BASE}/invite-user`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          nome: data.nome,
          role: data.perfil,
          portaisConfig,
          redirectTo: 'https://workr-lite-v1.vercel.app/definir-senha',
        }),
      });
      // Refresh list after a short delay to allow Supabase to process the invite
      setTimeout(() => fetchUsuarios(), 1500);
    } catch {
      // Invite modal already shows success state — silently refresh
      setTimeout(() => fetchUsuarios(), 1500);
    }
  }

  async function handleSaveRole(id: string, role: 'super_admin' | 'client_user', portaisIds: string[]) {
    setActionLoading(id);
    try {
      await callManageUser({ action: 'update', userId: id, role, portais: portaisIds });
      await fetchUsuarios();
    } catch { /* ignore — table stays as-is */ }
    setActionLoading(null);
  }

  async function handleToggleStatus(id: string) {
    const u = usuarios.find(u => u.id === id);
    if (!u) return;
    setActionLoading(id);
    try {
      await callManageUser({ action: u.status === 'Ativo' ? 'ban' : 'unban', userId: id });
      await fetchUsuarios();
    } catch { /* ignore */ }
    setActionLoading(null);
  }

  function openDesativar(u: UsuarioItem) {
    setDesativarTarget(u);
    // Pre-select all portals the user belongs to
    setDesativarPortais(u.portais);
  }

  async function confirmDesativar() {
    if (!desativarTarget) return;
    const target = desativarTarget;
    setDesativarTarget(null);
    if (target.portais.length > 1 && desativarPortais.length < target.portais.length) {
      // Partial suspension: update portais to remove selected ones
      const remaining = target.portais.filter(id => !desativarPortais.includes(id));
      await handleSaveRole(target.id, target.role, remaining);
    } else {
      await handleToggleStatus(target.id);
    }
  }

  async function confirmRemover() {
    if (!removerTarget) return;
    const target = removerTarget;
    setRemoverTarget(null);
    setActionLoading(target.id);
    try {
      await callManageUser({ action: 'delete', userId: target.id });
      await fetchUsuarios();
    } catch { /* ignore */ }
    setActionLoading(null);
  }

  async function handleDelete(id: string) {
    setActionLoading(id);
    try {
      await callManageUser({ action: 'delete', userId: id });
      await fetchUsuarios();
    } catch { /* ignore */ }
    setActionLoading(null);
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
        portais={portais}
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
              <button
                className="btn-outline btn-outline--danger"
                type="button"
                disabled={desativarTarget.portais.length > 1 && desativarPortais.length === 0}
                onClick={confirmDesativar}
              >
                {desativarTarget.portais.length > 1 && desativarPortais.length < desativarTarget.portais.length
                  ? 'Remover acesso'
                  : 'Desativar'}
              </button>
            </div>
          }
        >
          {desativarTarget.portais.length > 1 ? (
            <>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', marginBottom: '12px' }}>
                <strong>{desativarTarget.nome}</strong> está cadastrado em {desativarTarget.portais.length} portais.
                Selecione de quais portais deseja remover o acesso:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                {desativarTarget.portais.map(pid => {
                  const checked = desativarPortais.includes(pid);
                  const nome = portaisMap[pid] ?? pid;
                  return (
                    <label key={pid} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--text-sm)' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setDesativarPortais(prev =>
                          checked ? prev.filter(id => id !== pid) : [...prev, pid]
                        )}
                      />
                      {nome}
                    </label>
                  );
                })}
              </div>
              {desativarPortais.length === desativarTarget.portais.length && (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-danger)', lineHeight: 1.5 }}>
                  Ao remover todos os portais, o usuário será desativado completamente.
                </p>
              )}
            </>
          ) : (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', lineHeight: 1.5 }}>
              <strong>{desativarTarget.nome}</strong> perderá acesso imediato a todos os conteúdos do portal. Deseja continuar?
            </p>
          )}
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
        {loading ? (
          <div className="table-empty" style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
            Carregando usuários…
          </div>
        ) : error ? (
          <div className="table-empty" style={{ padding: '32px', textAlign: 'center', color: 'var(--color-danger)' }}>
            {error}
            <br />
            <button className="btn-outline" style={{ marginTop: '12px' }} onClick={fetchUsuarios}>Tentar novamente</button>
          </div>
        ) : (
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
                filtered.map((u) => {
                  const isLoading = actionLoading === u.id;
                  return (
                    <tr key={u.id} style={{ opacity: isLoading ? 0.5 : 1 }}>
                      <td className="table-cell--bold">{u.nome}</td>
                      <td className="table-cell--muted">{u.email}</td>
                      <td>
                        {u.role === 'super_admin' ? (
                          <span className="badge badge--astri">Astri</span>
                        ) : (
                          <span className="table-cell--muted" style={{ fontSize: '13px' }}>
                            {u.portais.length === 0
                              ? '—'
                              : (u.portaisNomes?.[0] ?? portaisMap[u.portais[0]] ?? u.portais[0])}
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
                            <span
                              className="badge badge--gray"
                              style={{ fontSize: '11px' }}
                              title={u.portaisNomes?.[0] ?? portaisMap[u.portais[0]] ?? u.portais[0]}
                            >
                              {u.portaisNomes?.[0] ?? portaisMap[u.portais[0]] ?? u.portais[0]}
                            </span>
                            {u.portais.length > 1 && (
                              <span
                                className="badge badge--info"
                                style={{ fontSize: '11px', cursor: 'default' }}
                                title={(u.portaisNomes ?? u.portais.map(id => portaisMap[id] ?? id)).slice(1).join('\n')}
                              >
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
                            disabled={isLoading}
                            onClick={() => setEditTarget({ id: u.id, nome: u.nome, email: u.email, role: u.role, portais: u.portais, status: u.status })}
                          >
                            Editar
                          </button>
                          <button
                            className={`btn-action ${u.status === 'Suspenso' ? 'btn-action--activate' : 'btn-action--secondary'}`}
                            type="button"
                            disabled={isLoading}
                            onClick={() => u.status === 'Ativo' ? openDesativar(u) : handleToggleStatus(u.id)}
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
                            disabled={isLoading}
                            onClick={() => setRemoverTarget(u)}
                          >
                            Remover
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
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
        )}
      </div>
    </div>
  );
}
