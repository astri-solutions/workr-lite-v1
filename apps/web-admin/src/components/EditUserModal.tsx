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
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    value: 'client_user' as const,
    label: 'Cliente',
    desc: 'Acesso restrito ao portal associado.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
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
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
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
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 8 12 12 14 14" />
              </svg>
              Ativar acesso
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
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
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
            Excluir usuário
          </button>
        ) : (
          <div className="eu-confirm">
            <div className="eu-confirm__alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
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
