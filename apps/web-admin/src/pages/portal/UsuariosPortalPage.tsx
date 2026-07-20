import { useState, useRef, useEffect, useCallback } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import Modal from '../../components/Modal';
import SearchInput from '../../components/SearchInput';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  fetchPortalUsers,
  updatePortalUserStatus,
  updatePortalUserRole,
  deletePortalUser,
  type PortalUserRecord,
  type PortalUserRole,
} from '../../lib/portalUsersApi';
import '../admin/AdminPages.css';
import './UsuariosPortalPage.css';

interface Empresa {
  id: string;
  nome: string;
}

function loadEmpresas(portalId?: string): Empresa[] {
  try {
    const raw = localStorage.getItem(`portal_empresas_${portalId ?? 'default'}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

type Role = 'admin' | 'editor';

interface PortalUser {
  id: string;         // portal_users.id
  nome: string;
  email: string;
  role: Role;
  empresaIds: string[];
  ativo: boolean;
  criadoEm: string;
}

function recordToUser(r: PortalUserRecord): PortalUser {
  return {
    id: r.id,
    nome: r.nome,
    email: r.email,
    role: r.role === 'admin' ? 'admin' : 'editor',
    empresaIds: r.empresas ?? [],
    ativo: r.status === 'Ativo',
    criadoEm: r.createdAt ? new Date(r.createdAt).toLocaleDateString('pt-BR') : '',
  };
}

const FN_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : '';

async function getToken(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

const ROLE_LABEL: Record<Role, string> = { admin: 'Admin', editor: 'Editor' };

function initials(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function KebabMenu({ onEdit, onToggle, onDelete, ativo, isAdmin, canManage, isSuperAdmin }: {
  onEdit: () => void; onToggle: () => void; onDelete: () => void; ativo: boolean; isAdmin: boolean; canManage: boolean; isSuperAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div className="up-kebab" ref={ref}>
      <button className="up-kebab__trigger" type="button" onClick={() => setOpen(v => !v)} aria-label="Opções">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="5" r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="19" r="1.5" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div className="up-kebab__menu">
          {canManage && <button className="up-kebab__item" type="button" onClick={() => { setOpen(false); onEdit(); }}>Editar acesso</button>}
          {canManage && !isAdmin && <button className="up-kebab__item" type="button" onClick={() => { setOpen(false); onToggle(); }}>{ativo ? 'Desativar' : 'Ativar'}</button>}
          {canManage && (!isAdmin || isSuperAdmin) && <button className="up-kebab__item up-kebab__item--danger" type="button" onClick={() => { setOpen(false); onDelete(); }}>Remover</button>}
          {!canManage && <span className="up-kebab__item up-kebab__item--disabled">Sem permissão</span>}
        </div>
      )}
    </div>
  );
}

interface UserForm { nome: string; email: string; role: Role; empresaIds: string[]; allEmpresas: boolean; }
const EMPTY_FORM: UserForm = { nome: '', email: '', role: 'editor', empresaIds: [], allEmpresas: false };

interface UserCardProps {
  user: PortalUser;
  empresas: Empresa[];
  canManage: boolean;
  isSuperAdmin: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

function UserCard({ user, empresas, canManage, isSuperAdmin, onEdit, onToggle, onDelete }: UserCardProps) {
  const empresaNomes = user.empresaIds.length === 0
    ? null
    : user.empresaIds.map(id => empresas.find(e => e.id === id)?.nome ?? id);

  return (
    <div className={`up-user-card${!user.ativo ? ' up-user-card--inactive' : ''}`}>
      <div className="up-user-card__header">
        <div className="up-user-card__avatar">{initials(user.nome)}</div>
        <div className="up-user-card__info">
          <span className="up-user-card__name">{user.nome}</span>
          <span className="up-user-card__email">{user.email}</span>
        </div>
        <div className="up-user-card__badges">
          <span className={`badge ${user.role === 'admin' ? 'badge--admin' : 'badge--warning'}`}>
            {ROLE_LABEL[user.role]}
          </span>
          <span className={`badge ${user.ativo ? 'badge--success' : 'badge--error'}`}>
            {user.ativo ? 'Ativo' : 'Inativo'}
          </span>
          {user.criadoEm && <span className="up-user-card__date">{user.criadoEm}</span>}
        </div>
        <KebabMenu ativo={user.ativo} isAdmin={user.role === 'admin'} canManage={canManage} isSuperAdmin={isSuperAdmin} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
      </div>
      <div className="up-user-card__footer">
        <span className="up-user-card__footer-label">
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>business</span>
          Acesso
        </span>
        {empresaNomes === null ? (
          <span className="up-all-badge">Todas as empresas</span>
        ) : (
          <div className="up-user-card__chips">
            {empresaNomes.map(nome => (
              <span key={nome} className="up-tag">{nome}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function UsuariosPortalPage() {
  const { user, portalRole } = useAuth();
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  const portalName = (user?.portais ?? []).find(p => p.id === user?.activePortalId)?.nome
    ?? user?.portais?.[0]?.nome
    ?? 'este portal';

  useEffect(() => {
    setEmpresas(loadEmpresas(user?.activePortalId));
  }, [user?.activePortalId]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activePortalId = user?.activePortalId;
      if (!activePortalId) { setUsers([]); return; }
      const records = await fetchPortalUsers(activePortalId);
      setUsers(records.map(recordToUser));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [user?.activePortalId]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // super_admin tem acesso total; client_user depende do role no portal ativo
  const canInvite = user?.role === 'super_admin' || portalRole === 'admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const [search, setSearch] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PortalUser | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<PortalUser | null>(null);
  const [invited, setInvited] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const filtered = users.filter(u => {
    const matchSearch = !search || u.nome.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchEmpresa = !filterEmpresa || u.empresaIds.length === 0 || u.empresaIds.includes(filterEmpresa);
    return matchSearch && matchEmpresa;
  });

  function openCreate() {
    setEditing(null);
    // When the portal has a single empresa, pre-select it — a user must
    // always be tied to at least one empresa, never left unassigned.
    setForm({ ...EMPTY_FORM, empresaIds: empresas.length === 1 ? [empresas[0].id] : [] });
    setInvited(false);
    setModalOpen(true);
  }

  function openEdit(u: PortalUser) {
    setEditing(u);
    setForm({ nome: u.nome, email: u.email, role: u.role, empresaIds: u.empresaIds, allEmpresas: u.empresaIds.length === 0 });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setInvited(false);
    setInviteError('');
  }

  async function handleSave() {
    if (!form.nome.trim() || !form.email.trim() || form.empresaIds.length === 0) return;
    const empIds = form.empresaIds;

    // Edit existing user
    if (editing) {
      const role = form.role as PortalUserRole;
      setUsers(prev => prev.map(u => u.id === editing.id
        ? { ...u, role: form.role, empresaIds: empIds } : u));
      updatePortalUserRole(editing.id, role, empIds).catch(console.error);
      closeModal();
      return;
    }

    // Invite new user
    setInviting(true);
    setInviteError('');
    try {
      const token = await getToken();
      if (!token) throw new Error('Sessão não encontrada');
      const res = await fetch(
        `${FN_BASE}/invite-portal-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
          },
          body: JSON.stringify({
            email: form.email,
            nome: form.nome,
            portalId: user?.activePortalId,
            role: form.role,
            empresas: empIds,
            redirectTo: 'https://workr-lite-v1.vercel.app/definir-senha',
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? 'Erro ao enviar convite');
      }
      setInvited(true);
      setTimeout(() => fetchUsers(), 1500);
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : 'Erro ao enviar convite');
    } finally {
      setInviting(false);
    }
  }

  function toggleEmpresa(id: string) {
    setForm(f => ({
      ...f,
      empresaIds: f.empresaIds.includes(id) ? f.empresaIds.filter(e => e !== id) : [...f.empresaIds, id],
    }));
  }

  const ativos = users.filter(u => u.ativo).length;

  return (
    <div className="page">
      <StickyPageHeader
        title="Usuários do Portal"
        description={<>Usuários com acesso ao portal <strong>{portalName}</strong>.</>}
        action={
          canInvite ? (
            <button className="btn-primary" type="button" onClick={openCreate}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Convidar usuário
            </button>
          ) : undefined
        }
      />

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-card__number">{users.length}</span>
          <span className="stat-card__label">Usuários</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__number">{ativos}</span>
          <span className="stat-card__label">Ativos</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__number">{users.filter(u => u.role === 'editor').length}</span>
          <span className="stat-card__label">Editores</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__number">{users.filter(u => u.role === 'admin').length}</span>
          <span className="stat-card__label">Admins</span>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar__filters">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome ou e-mail…" />
          <div className="filter-wrap">
            <select
              className="filter-select"
              value={filterEmpresa}
              onChange={e => setFilterEmpresa(e.target.value)}
            >
              <option value="">Todas as empresas</option>
              {empresas.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
            <svg className="filter-wrap__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
        <div className="toolbar__actions">
          <span className="toolbar__count">{filtered.length} usuário{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
          Carregando usuários…
        </div>
      ) : error ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-danger)' }}>
          {error}
          <br />
          <button className="btn-outline" style={{ marginTop: '12px' }} onClick={fetchUsers}>Tentar novamente</button>
        </div>
      ) : (
        <div className="up-user-list">
          {filtered.length === 0 ? (
            <p className="up-empty">Nenhum usuário encontrado.</p>
          ) : filtered.map(u => (
            <UserCard
              key={u.id}
              user={u}
              empresas={empresas}
              canManage={canInvite}
              isSuperAdmin={isSuperAdmin}
              onEdit={() => openEdit(u)}
              onToggle={() => {
                const nextStatus = u.ativo ? 'Suspenso' : 'Ativo';
                setUsers(prev => prev.map(p => p.id === u.id ? { ...p, ativo: !p.ativo } : p));
                updatePortalUserStatus(u.id, nextStatus).catch(console.error);
              }}
              onDelete={() => setDeleteTarget(u)}
            />
          ))}
        </div>
      )}

      {canInvite && <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar acesso' : 'Convidar usuário'}
        size="sm"
        footer={
          invited ? (
            <button className="btn-primary" type="button" onClick={closeModal}>Fechar</button>
          ) : (
            <div className="modal-footer">
              <button className="btn-outline" type="button" onClick={closeModal}>Cancelar</button>
              <button className="btn-primary" type="button" onClick={handleSave}
                disabled={!form.nome.trim() || !form.email.trim() || form.empresaIds.length === 0 || inviting}>
                {inviting ? 'Enviando…' : editing ? 'Salvar' : 'Enviar convite'}
              </button>
            </div>
          )
        }
      >
        {inviteError && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '8px' }}>{inviteError}</p>}
        {invited ? (
          <div className="up-invited">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00D865" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" />
            </svg>
            <p>Convite enviado para <strong>{form.email}</strong>.</p>
          </div>
        ) : (
          <div className="up-form">
            <label className="up-form__label">
              Nome completo
              <input className="up-form__input" type="text" placeholder="Ex: João Silva" value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} autoFocus={!editing} />
            </label>
            <label className="up-form__label">
              E-mail
              <input className="up-form__input" type="email" placeholder="joao@empresa.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} readOnly={!!editing} />
            </label>
            <label className="up-form__label">
              Perfil de acesso
              <div className="filter-wrap">
                <select className="filter-select up-form__select" value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}>
                  <option value="editor">Editor — pode publicar e editar</option>
                </select>
                <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
              </div>
            </label>
            <div className="up-form__section">
              <span className="up-form__section-label">Acesso às empresas</span>
              <p className="up-form__hint">Selecione ao menos uma empresa — todo usuário deve estar vinculado a uma empresa do portal.</p>
              <div className="up-form__emp-list">
                {empresas.map(emp => (
                  <label key={emp.id} className="up-form__check">
                    <input type="checkbox" checked={form.empresaIds.includes(emp.id)}
                      onChange={() => toggleEmpresa(emp.id)} />
                    {emp.nome}
                  </label>
                ))}
              </div>
              {form.empresaIds.length === 0 && (
                <p className="up-form__error">Selecione ao menos uma empresa.</p>
              )}
            </div>
          </div>
        )}
      </Modal>}

      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} title="Remover usuário" size="sm"
          footer={
            <div className="modal-footer">
              <button className="btn-outline" type="button" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="btn-outline btn-outline--danger" type="button"
                onClick={() => {
                  deletePortalUser(deleteTarget.id).catch(console.error);
                  setUsers(p => p.filter(u => u.id !== deleteTarget.id));
                  setDeleteTarget(null);
                }}>
                Remover
              </button>
            </div>
          }
        >
          <p className="up-delete-text">
            Tem certeza que deseja remover <strong>{deleteTarget.nome}</strong> do portal? O acesso será revogado imediatamente.
          </p>
        </Modal>
      )}
    </div>
  );
}
