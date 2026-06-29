import { useState, useRef, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
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

function EmpresasTags({ ids }: { ids: string[] }) {
  const names = ids.map(id => EMPRESAS.find(e => e.id === id)?.nome ?? id);
  if (names.length === 0) return <span className="up-all-tag">Todas</span>;
  return (
    <div className="up-tags">
      {names.map(n => <span key={n} className="up-tag">{n}</span>)}
    </div>
  );
}

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

export default function UsuariosPortalPage() {
  const [users, setUsers] = useState<PortalUser[]>(INITIAL_USERS);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PortalUser | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<PortalUser | null>(null);
  const [invited, setInvited] = useState(false);

  const filtered = users.filter(u =>
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
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
      return;
    }
    closeModal();
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
      <PageHeader
        title="Usuários do Portal"
        description="Gerencie quem tem acesso a este portal e quais empresas cada usuário pode ver."
        action={
          <button className="btn-primary" type="button" onClick={openCreate}>
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

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Acesso às empresas</th>
              <th>Status</th>
              <th>Criado em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="table-empty">Nenhum usuário encontrado.</td></tr>
            ) : (
              filtered.map(u => (
                <tr key={u.id}>
                  <td className="table-cell--bold">{u.nome}</td>
                  <td className="table-cell--muted">{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'editor' ? 'badge--warning' : 'badge--gray'}`}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td><EmpresasTags ids={u.empresaIds} /></td>
                  <td>
                    <span className={`badge ${u.ativo ? 'badge--success' : 'badge--error'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="table-cell--muted">{u.criadoEm}</td>
                  <td>
                    <KebabMenu
                      ativo={u.ativo}
                      onEdit={() => openEdit(u)}
                      onToggle={() => setUsers(prev => prev.map(p => p.id === u.id ? { ...p, ativo: !p.ativo } : p))}
                      onDelete={() => setDeleteTarget(u)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
            <div className="up-modal-footer">
              <button className="up-modal-cancel" type="button" onClick={closeModal}>Cancelar</button>
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
              <select className="up-form__input up-form__select" value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}>
                <option value="viewer">Visualizador — apenas leitura</option>
                <option value="editor">Editor — pode publicar e editar</option>
              </select>
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
            <div className="up-modal-footer">
              <button className="up-modal-cancel" type="button" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="up-modal-danger" type="button"
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
