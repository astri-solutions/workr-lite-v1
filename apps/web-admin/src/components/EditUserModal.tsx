import { useState, useEffect } from 'react';
import Modal from './Modal';
import './InviteUserModal.css';
import './EditUserModal.css';

export interface EditableUser {
  id: string;
  nome: string;
  email: string;
  role: 'super_admin' | 'client_user';
  portal: string;
  status: 'Ativo' | 'Suspenso';
}

interface EditUserModalProps {
  user: EditableUser | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, role: 'super_admin' | 'client_user') => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}

const PERFIS = [
  {
    value: 'super_admin' as const,
    label: 'Admin',
    desc: 'Acesso completo a todos os portais.',
    icon: <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>shield</span>,
  },
  {
    value: 'client_user' as const,
    label: 'Cliente',
    desc: 'Acesso restrito ao portal associado.',
    icon: <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person</span>,
  },
];

export default function EditUserModal({
  user, open, onClose, onSave, onToggleStatus, onDelete,
}: EditUserModalProps) {
  const [role, setRole] = useState<'super_admin' | 'client_user'>('client_user');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (user) { setRole(user.role); setConfirmDelete(false); }
  }, [user]);

  function handleClose() {
    onClose();
    setTimeout(() => setConfirmDelete(false), 200);
  }

  function handleSave() {
    if (!user) return;
    onSave(user.id, role);
    handleClose();
  }

  function handleToggleStatus() {
    if (!user) return;
    onToggleStatus(user.id);
    handleClose();
  }

  function handleDelete() {
    if (!user) return;
    onDelete(user.id);
    handleClose();
  }

  if (!user) return null;

  const isSuspended = user.status === 'Suspenso';
  const hasChanges = role !== user.role;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Editar usuário"
      size="sm"
      footer={
        hasChanges ? (
          <>
            <button className="modal-btn modal-btn--ghost" type="button" onClick={handleClose}>
              Cancelar
            </button>
            <button className="modal-btn modal-btn--primary" type="button" onClick={handleSave}>
              Salvar alterações
            </button>
          </>
        ) : (
          <button className="modal-btn modal-btn--ghost" type="button" onClick={handleClose}>
            Fechar
          </button>
        )
      }
    >
      {/* User info */}
      <div className="eu-user-info">
        <div className="eu-user-info__avatar">
          {user.nome.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="eu-user-info__name">{user.nome}</div>
          <div className="eu-user-info__email">{user.email}</div>
        </div>
      </div>

      {/* Perfil */}
      <div className="mf">
        <label className="mf__label">Tipo de usuário</label>
        <div className="mf__perfil-grid">
          {PERFIS.map((p) => {
            const active = role === p.value;
            return (
              <button
                key={p.value}
                type="button"
                className={`mf__perfil-card${active ? ' mf__perfil-card--active' : ''}`}
                onClick={() => setRole(p.value)}
              >
                <span className={`mf__perfil-icon${active ? ' mf__perfil-icon--active' : ''}`}>
                  {p.icon}
                </span>
                <span className="mf__perfil-label">{p.label}</span>
                <span className="mf__perfil-desc">{p.desc}</span>
                <div className={`mf__perfil-check${active ? ' mf__perfil-check--active' : ''}`}>
                  {active && (
                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>check</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="eu-divider" />
      <div className="eu-actions">

        {/* Activate / Suspend */}
        <button
          type="button"
          className={`eu-action-btn${isSuspended ? ' eu-action-btn--activate' : ' eu-action-btn--suspend'}`}
          onClick={handleToggleStatus}
        >
          {isSuspended ? (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>play_circle</span>
              Ativar acesso
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>pause_circle</span>
              Suspender acesso
            </>
          )}
        </button>

        {/* Delete */}
        {!confirmDelete ? (
          <button
            type="button"
            className="eu-action-btn eu-action-btn--delete"
            onClick={() => setConfirmDelete(true)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
            Excluir usuário
          </button>
        ) : (
          <div className="eu-confirm">
            <div className="eu-confirm__alert">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>warning</span>
              <span>Tem certeza? Essa ação não pode ser desfeita.</span>
            </div>
            <div className="eu-confirm__btns">
              <button className="modal-btn modal-btn--ghost eu-confirm__cancel" type="button" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </button>
              <button className="modal-btn eu-confirm__delete" type="button" onClick={handleDelete}>
                Sim, excluir
              </button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
}
