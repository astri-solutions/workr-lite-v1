import { useState } from 'react';
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

const INIT_USERS: AcrUser[] = [
  { id: '1', nome: 'Carlos Mendes', email: 'carlos.mendes@email.com', status: 'Ativo', desde: '2026-01-15' },
  { id: '2', nome: 'Priya Sharma', email: 'priya.sharma@email.com', status: 'Ativo', desde: '2026-02-03' },
  { id: '3', nome: 'Rafael Costa', email: 'rafael.costa@email.com', status: 'Suspenso', desde: '2026-03-20' },
  { id: '4', nome: 'Lívia Torres', email: 'livia.torres@email.com', status: 'Ativo', desde: '2026-04-10' },
];

export default function AcessoAreaRestritaPage() {
  const [users, setUsers] = useState<AcrUser[]>(INIT_USERS);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const filtered = users.filter(u =>
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  function toggleStatus(id: string) {
    setUsers(prev => prev.map(u =>
      u.id === id ? { ...u, status: u.status === 'Ativo' ? 'Suspenso' : 'Ativo' } : u
    ));
  }

  function removeUser(id: string) {
    setUsers(prev => prev.filter(u => u.id !== id));
    setConfirmRemoveId(null);
  }

  function handleInvite() {
    if (!newNome.trim() || !newEmail.trim()) return;
    setInviteSent(true);
  }

  function handleInviteClose() {
    const today = new Date().toISOString().slice(0, 10);
    setUsers(prev => [...prev, {
      id: String(Date.now()),
      nome: newNome.trim(),
      email: newEmail.trim(),
      status: 'Ativo',
      desde: today,
    }]);
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
            <th>Usuário</th>
            <th>Status</th>
            <th>Desde</th>
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
              <td style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)' }}>{u.desde}</td>
              <td>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {u.status === 'Ativo' ? (
                    <button className="btn-action btn-action--secondary" onClick={() => toggleStatus(u.id)}>Suspender</button>
                  ) : (
                    <button className="btn-action btn-action--enter" onClick={() => toggleStatus(u.id)}>Reativar</button>
                  )}
                  {confirmRemoveId === u.id ? (
                    <>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)' }}>Remover?</span>
                      <button className="btn-action btn-action--danger" onClick={() => removeUser(u.id)}>Sim</button>
                      <button className="btn-action btn-action--secondary" onClick={() => setConfirmRemoveId(null)}>Não</button>
                    </>
                  ) : (
                    <button className="btn-action btn-action--danger" onClick={() => setConfirmRemoveId(u.id)}>Remover</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
