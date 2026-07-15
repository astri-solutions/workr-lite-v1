import { useState } from 'react';
import { useSort } from '../../hooks/useSort';
import SortIcon from '../../components/SortIcon';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import './AcessoAreaRestritaPage.css';

interface AcrUser {
  id: string;
  nome: string;
  email: string;
  status: 'Ativo' | 'Suspenso';
  desde: string;
}

const DEFAULT_USERS: AcrUser[] = [
  { id: '1', nome: 'Carlos Mendes', email: 'carlos.mendes@email.com', status: 'Ativo', desde: '2026-01-15' },
  { id: '2', nome: 'Priya Sharma', email: 'priya.sharma@email.com', status: 'Ativo', desde: '2026-02-03' },
  { id: '3', nome: 'Rafael Costa', email: 'rafael.costa@email.com', status: 'Suspenso', desde: '2026-03-20' },
  { id: '4', nome: 'Lívia Torres', email: 'livia.torres@email.com', status: 'Ativo', desde: '2026-04-10' },
];

const ACR_KEY = 'portal_acesso_area_restrita';

function loadUsers(): AcrUser[] {
  try {
    const raw = localStorage.getItem(ACR_KEY);
    return raw ? (JSON.parse(raw) as AcrUser[]) : DEFAULT_USERS;
  } catch { return DEFAULT_USERS; }
}

export default function AcessoAreaRestritaPage() {
  const [users, setUsers] = useState<AcrUser[]>(loadUsers);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const _filtered = users.filter(u =>
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );
  const { sorted: filtered, col, dir, toggle } = useSort(_filtered);

  function persist(next: AcrUser[]) {
    setUsers(next);
    localStorage.setItem(ACR_KEY, JSON.stringify(next));
  }

  function toggleStatus(id: string) {
    persist(users.map(u =>
      u.id === id ? { ...u, status: u.status === 'Ativo' ? 'Suspenso' : 'Ativo' } : u
    ));
  }

  function removeUser(id: string) {
    persist(users.filter(u => u.id !== id));
    setConfirmRemoveId(null);
  }

  function handleInvite() {
    if (!newNome.trim() || !newEmail.trim()) return;
    setInviteSent(true);
  }

  function handleInviteClose() {
    const today = new Date().toISOString().slice(0, 10);
    const next = [...users, {
      id: String(Date.now()),
      nome: newNome.trim(),
      email: newEmail.trim(),
      status: 'Ativo' as const,
      desde: today,
    }];
    persist(next);
    setNewNome('');
    setNewEmail('');
    setInviteSent(false);
    setModalOpen(false);
  }

  return (
    <div className="page">
      <PageHeader
        title="Acesso à Área Restrita"
        description="Gerencie os usuários com acesso ao conteúdo restrito do portal."
      />

      <div className="toolbar">
        <div className="toolbar__filters">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: 10, fontSize: '16px', color: 'var(--color-gray-400)', pointerEvents: 'none' }}>search</span>
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 34, paddingRight: 12, height: 36, border: '1px solid var(--color-gray-300)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)', color: 'var(--color-gray-800)', background: '#fff', outline: 'none', width: 260 }}
            />
          </div>
        </div>
        <div className="toolbar__actions">
          <span className="toolbar__count">{filtered.length} usuário{filtered.length !== 1 ? 's' : ''}</span>
          <button className="btn-primary" onClick={() => setModalOpen(true)}>+ Novo acesso</button>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th className={`th-sort${col === 'nome' ? ' th-sort--active' : ''}`} onClick={() => toggle('nome')}><span className="th-sort-inner">Usuário <SortIcon dir={col === 'nome' ? dir : null} /></span></th>
            <th className={`th-sort${col === 'status' ? ' th-sort--active' : ''}`} onClick={() => toggle('status')}><span className="th-sort-inner">Status <SortIcon dir={col === 'status' ? dir : null} /></span></th>
            <th className={`th-sort${col === 'desde' ? ' th-sort--active' : ''}`} onClick={() => toggle('desde')}><span className="th-sort-inner">Desde <SortIcon dir={col === 'desde' ? dir : null} /></span></th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(u => (
            <tr key={u.id}>
              <td>
                <p className="acr-user-name">{u.nome}</p>
                <p className="acr-user-email">{u.email}</p>
              </td>
              <td>
                <span className={`badge ${u.status === 'Ativo' ? 'badge--success' : 'badge--warning'}`}>
                  {u.status}
                </span>
              </td>
              <td className="table-cell--muted">{u.desde}</td>
              <td>
                <div className="table-actions">
                  {u.status === 'Ativo' ? (
                    <button className="btn-action btn-action--secondary" onClick={() => toggleStatus(u.id)}>Suspender</button>
                  ) : (
                    <button className="btn-action btn-action--enter" onClick={() => toggleStatus(u.id)}>Reativar</button>
                  )}
                  <button className="btn-action btn-action--danger" onClick={() => setConfirmRemoveId(u.id)}>Remover</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        open={confirmRemoveId !== null}
        onClose={() => setConfirmRemoveId(null)}
        title="Remover acesso"
        description={`Tem certeza que deseja remover o acesso de ${users.find(u => u.id === confirmRemoveId)?.nome ?? ''}? Esta ação não pode ser desfeita.`}
        size="sm"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={() => setConfirmRemoveId(null)}>Cancelar</button>
            <button type="button" className="btn-action btn-action--danger" onClick={() => removeUser(confirmRemoveId!)}>Remover</button>
          </div>
        }
      >
        <></>
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setInviteSent(false); setNewNome(''); setNewEmail(''); }}
        title={inviteSent ? 'Convite enviado' : 'Convidar para Área Restrita'}
        size="sm"
        footer={
          inviteSent ? (
            <div className="modal-footer">
              <button type="button" className="btn-primary" onClick={handleInviteClose}>Concluir</button>
            </div>
          ) : (
            <div className="modal-footer">
              <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button type="button" className="btn-primary" onClick={handleInvite} disabled={!newNome.trim() || !newEmail.trim()}>
                Enviar convite
              </button>
            </div>
          )
        }
      >
        {inviteSent ? (
          <div className="acr-invite-sent">
            <div className="acr-invite-sent__icon">
              <span className="material-symbols-outlined">mark_email_read</span>
            </div>
            <p className="acr-invite-sent__text">
              Um link de boas-vindas foi enviado para <strong>{newEmail}</strong>.<br />
              {newNome} poderá criar sua senha e acessar a área restrita pelo link recebido.
            </p>
          </div>
        ) : (
          <div className="acr-modal-form">
            <p className="acr-invite-hint">
              O usuário receberá um e-mail com um link para criar sua senha no primeiro acesso.
            </p>
            <div className="acr-field">
              <label className="acr-label">Nome</label>
              <input
                className="acr-input"
                type="text"
                placeholder="Nome completo"
                value={newNome}
                onChange={e => setNewNome(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="acr-field">
              <label className="acr-label">Email</label>
              <input
                className="acr-input"
                type="email"
                placeholder="email@exemplo.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                required
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
