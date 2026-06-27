import { useState } from 'react';
import Modal from './Modal';
import './InviteUserModal.css';

interface Portal {
  id: string;
  nome: string;
}

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  portais: Portal[];
  onSubmit: (data: InviteFormData) => void;
}

export interface InviteFormData {
  nome: string;
  email: string;
  perfil: 'super_admin' | 'client_user';
  portalId: string;
}

const PERFIS = [
  {
    value: 'super_admin' as const,
    label: 'Admin',
    desc: 'Acesso completo a todos os portais e configurações.',
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

const EMPTY: InviteFormData = {
  nome: '',
  email: '',
  perfil: 'client_user',
  portalId: '',
};

export default function InviteUserModal({ open, onClose, portais, onSubmit }: InviteUserModalProps) {
  const [form, setForm] = useState<InviteFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof InviteFormData, string>>>({});

  function set<K extends keyof InviteFormData>(key: K, val: InviteFormData[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.nome.trim()) next.nome = 'Nome é obrigatório.';
    if (!form.email.trim()) {
      next.email = 'Email é obrigatório.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Digite um email válido.';
    }
    if (form.perfil === 'client_user' && !form.portalId) {
      next.portalId = 'Selecione um portal para o cliente.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit(form);
    handleClose();
  }

  function handleClose() {
    onClose();
    setTimeout(() => { setForm(EMPTY); setErrors({}); }, 200);
  }

  const isClient = form.perfil === 'client_user';

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Convidar usuário"
      description="O usuário receberá um email com o link de acesso à plataforma."
      size="sm"
      footer={
        <>
          <button className="modal-btn modal-btn--ghost" type="button" onClick={handleClose}>
            Cancelar
          </button>
          <button className="modal-btn modal-btn--primary" type="button" onClick={handleSubmit}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 20-7z" />
            </svg>
            Enviar convite
          </button>
        </>
      }
    >
      {/* Nome */}
      <div className="mf">
        <label className="mf__label">Nome</label>
        <input
          className={`mf__input${errors.nome ? ' mf__input--error' : ''}`}
          type="text"
          placeholder="Nome completo"
          value={form.nome}
          onChange={(e) => set('nome', e.target.value)}
          autoFocus
          maxLength={80}
        />
        {errors.nome && <span className="mf__error">{errors.nome}</span>}
      </div>

      {/* Email */}
      <div className="mf">
        <label className="mf__label">Email</label>
        <div className="mf__icon-wrap">
          <svg className="mf__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          <input
            className={`mf__input mf__input--icon${errors.email ? ' mf__input--error' : ''}`}
            type="email"
            placeholder="usuario@empresa.com"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </div>
        {errors.email && <span className="mf__error">{errors.email}</span>}
      </div>

      {/* Perfil */}
      <div className="mf">
        <label className="mf__label">Perfil</label>
        <div className="mf__perfil-grid">
          {PERFIS.map((p) => {
            const active = form.perfil === p.value;
            return (
              <button
                key={p.value}
                type="button"
                className={`mf__perfil-card${active ? ' mf__perfil-card--active' : ''}`}
                onClick={() => {
                  set('perfil', p.value);
                  if (p.value === 'super_admin') set('portalId', '');
                }}
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

      {/* Portal — apenas para clientes */}
      {isClient && (
        <div className="mf">
          <label className="mf__label">Portal</label>
          <div className="mf__select-wrap">
            <select
              className={`mf__input mf__select${errors.portalId ? ' mf__input--error' : ''}`}
              value={form.portalId}
              onChange={(e) => set('portalId', e.target.value)}
            >
              <option value="">Selecione um portal…</option>
              {portais.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
            <svg className="mf__select-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          {errors.portalId && <span className="mf__error">{errors.portalId}</span>}
        </div>
      )}
    </Modal>
  );
}
