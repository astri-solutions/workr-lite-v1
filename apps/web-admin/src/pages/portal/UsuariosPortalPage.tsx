import { useState, useRef, useEffect } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import Modal from '../../components/Modal';
import PORTAL_CONFIG from '../../portalConfig';
import '../admin/AdminPages.css';
import './UsuariosPortalPage.css';

interface Empresa {
  id: string;
  nome: string;
}

const EMPRESAS: Empresa[] = [
  { id: 'imc', nome: 'International Meal Company' },
  { id: 'imc-fii', nome: 'IMC Recebíveis FII' },
  { id: 'imc-ce', nome: 'IMC Crédito Estruturado FII' },
];

type Role = 'editor' | 'viewer';

interface PortalUser {
  id: string;
  nome: string;
  email: string;
  role: Role;
  empresaIds: string[];
  ativo: boolean;
  criadoEm: string;
}

const INITIAL_USERS: PortalUser[] = [
  { id: 'u1', nome: 'Carlos Souza', email: 'carlos@imc.com.br', role: 'editor', empresaIds: ['imc', 'imc-fii'], ativo: true, criadoEm: '10/03/2026' },
  { id: 'u2', nome: 'Ana Lima', email: 'ana@imc.com.br', role: 'viewer', empresaIds: ['imc'], ativo: true, criadoEm: '15/03/2026' },
  { id: 'u3', nome: 'Fernanda Costa', email: 'fernanda@imc.com.br', role: 'viewer', empresaIds: ['imc-fii', 'imc-ce'], ativo: false, criadoEm: '20/03/2026' },
];

const ROLE_LABEL: Record<Role, string> = { editor: 'Editor', viewer: 'Visualizador' };

function KebabMenu({ onEdit, onToggle, onDelete, ativo }: {
  onEdit: () => void; onToggle: () => void; onDelete: () => void; ativo: boolean;
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
          <button className="up-kebab__item" type="button" onClick={() => { setOpen(false); onEdit(); }}>Editar acesso</button>
          <button className="up-kebab__item" type="button" onClick={() => { setOpen(false); onToggle(); }}>{ativo ? 'Desativar' : 'Ativar'}</button>
          <button className="up-kebab__item up-kebab__item--danger" type="button" onClick={() => { setOpen(false); onDelete(); }}>Remover</button>
        </div>
      )}
    </div>
  );
}

interface UserForm { nome: string; email: string; role: Role; empresaIds: string[]; allEmpresas: boolean; }
const EMPTY_FORM: UserForm = { nome: '', email: '', role: 'viewer', empresaIds: [], allEmpresas: true };

function usersForEmpresa(users: PortalUser[], empresaId: string) {
  return users.filter(u => u.empresaIds.length === 0 || u.empresaIds.includes(empresaId));
}

interface EmpresaSectionProps {
  empresa: Empresa;
  users: PortalUser[];
  search: string;
  onEdit: (u: PortalUser) => void;
  onToggle: (id: string) => void;
  onDelete: (u: PortalUser) => void;
  onInvite: (empresaId: string) => void;
}

function EmpresaSection({ empresa, users, search, onEdit, onToggle, onDelete, onInvite }: EmpresaSectionProps) {
  const [open, setOpen] = useState(true);

  const filtered = users.filter(u =>
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const ativos = filtered.filter(u => u.ativo).length;

  return (
    <div className="up-empresa-block">
      <button type="button" className="up-empresa-header" onClick={() => setOpen(o => !o)}>
        <div className="up-empresa-header__left">
          <span className="material-symbols-outlined up-empresa-header__icon" style={{ fontSize: '18px' }}>business</span>
          <span className="up-empresa-header__name">{empresa.nome}</span>
          <span className="up-empresa-header__count">
            {filtered.length} {filtered.length === 1 ? 'usuário' : 'usuários'}
          </span>
          <span className="up-empresa-header__ativos">{ativos} ativo{ativos !== 1 ? 's' : ''}</span>
        </div>
        <div className="up-empresa-header__right">
          <button
            type="button"
            className="up-empresa-invite"
            onClick={e => { e.stopPropagation(); onInvite(empresa.id); }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Convidar
          </button>
          <span
            className="material-symbols-outlined up-empresa-header__chevron"
            style={{ fontSize: '18px', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            expand_more
          </span>
        </div>
      </button>

      {open && (
        <div className="up-empresa-body">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Status</th>
                <th>Criado em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="table-empty">Nenhum usuário encontrado.</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="up-user-name-cell">
                      <span className="table-cell--bold">{u.nome}</span>
                      {u.empresaIds.length === 0 && (
                        <span className="up-all-badge">Acesso total</span>
                      )}
                    </div>
                  </td>
                  <td className="table-cell--muted">{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'editor' ? 'badge--warning' : 'badge--gray'}`}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.ativo ? 'badge--success' : 'badge--error'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="table-cell--muted">{u.criadoEm}</td>
                  <td>
                    <KebabMenu
                      ativo={u.ativo}
                      onEdit={() => onEdit(u)}
                      onToggle={() => onToggle(u.id)}
                      onDelete={() => onDelete(u)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function UsuariosPortalPage() {
  const [users, setUsers] = useState<PortalUser[]>(INITIAL_USERS);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PortalUser | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<PortalUser | null>(null);
  const [invited, setInvited] = useState(false);

  function openCreate(empresaId?: string) {
    setEditing(null);
    setForm(empresaId
      ? { ...EMPTY_FORM, allEmpresas: false, empresaIds: [empresaId] }
      : EMPTY_FORM
    );
    setInvited(false);
    setModalOpen(true);
  }

  function openEdit(u: PortalUser) {
    setEditing(u);
    setForm({
      nome: u.nome,
      email: u.email,
      role: u.role,
      empresaIds: u.empresaIds,
      allEmpresas: u.empresaIds.length === 0,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setInvited(false);
  }

  function handleSave() {
    if (!form.nome.trim() || !form.email.trim()) return;
    const empIds = form.allEmpresas ? [] : form.empresaIds;
    if (editing) {
      setUsers(prev => prev.map(u => u.id === editing.id ? { ...u, ...form, empresaIds: empIds } : u));
      closeModal();
    } else {
      const newUser: PortalUser = {
        id: 'u' + Date.now(),
        nome: form.nome,
        email: form.email,
        role: form.role,
        empresaIds: empIds,
        ativo: true,
        criadoEm: new Date().toLocaleDateString('pt-BR'),
      };
      setUsers(prev => [...prev, newUser]);
      setInvited(true);
    }
  }

  function toggleEmpresa(id: string) {
    setForm(f => ({
      ...f,
      empresaIds: f.empresaIds.includes(id)
        ? f.empresaIds.filter(e => e !== id)
        : [...f.empresaIds, id],
    }));
  }

  const ativos = users.filter(u => u.ativo).length;

  return (
    <div className="page">
      <StickyPageHeader
        title="Usuários do Portal"
        description={<>Usuários com acesso ao portal <strong>{PORTAL_CONFIG.name}</strong>.</>}
        action={
          <button className="btn-primary" type="button" onClick={() => openCreate()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Convidar usuário
          </button>
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
          <span className="stat-card__number">{EMPRESAS.length}</span>
          <span className="stat-card__label">Empresas</span>
        </div>
      </div>

      <div className="up-search-wrap">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          className="up-search"
          type="text"
          placeholder="Buscar por nome ou e-mail…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="up-empresas-list">
        {EMPRESAS.map(emp => (
          <EmpresaSection
            key={emp.id}
            empresa={emp}
            users={usersForEmpresa(users, emp.id)}
            search={search}
            onEdit={openEdit}
            onToggle={id => setUsers(prev => prev.map(u => u.id === id ? { ...u, ativo: !u.ativo } : u))}
            onDelete={u => setDeleteTarget(u)}
            onInvite={openCreate}
          />
        ))}
      </div>

      {/* Create / Edit modal */}
      <Modal
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
              <button
                className="btn-primary"
                type="button"
                onClick={handleSave}
                disabled={!form.nome.trim() || !form.email.trim()}
              >
                {editing ? 'Salvar' : 'Enviar convite'}
              </button>
            </div>
          )
        }
      >
        {invited ? (
          <div className="up-invited">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00D865" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="9 12 11 14 15 10" />
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
                  <option value="viewer">Visualizador — apenas leitura</option>
                  <option value="editor">Editor — pode publicar e editar</option>
                </select>
                <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
              </div>
            </label>

            <div className="up-form__section">
              <span className="up-form__section-label">Acesso às empresas</span>
              <label className="up-form__check">
                <input type="checkbox" checked={form.allEmpresas}
                  onChange={e => setForm(f => ({ ...f, allEmpresas: e.target.checked, empresaIds: [] }))} />
                Todas as empresas do portal
              </label>
              {!form.allEmpresas && (
                <div className="up-form__emp-list">
                  {EMPRESAS.map(emp => (
                    <label key={emp.id} className="up-form__check">
                      <input type="checkbox" checked={form.empresaIds.includes(emp.id)}
                        onChange={() => toggleEmpresa(emp.id)} />
                      {emp.nome}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal
          open
          onClose={() => setDeleteTarget(null)}
          title="Remover usuário"
          size="sm"
          footer={
            <div className="modal-footer">
              <button className="btn-outline" type="button" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="btn-outline btn-outline--danger" type="button"
                onClick={() => { setUsers(p => p.filter(u => u.id !== deleteTarget.id)); setDeleteTarget(null); }}>
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
