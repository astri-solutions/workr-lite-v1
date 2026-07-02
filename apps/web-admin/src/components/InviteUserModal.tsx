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
  portaisIds: string[];
}

const PERFIS = [
  {
    value: 'super_admin' as const,
    label: 'Admin',
    desc: 'Acesso completo a todos os portais e configurações.',
    icon: <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>shield</span>,
  },
  {
    value: 'client_user' as const,
    label: 'Cliente',
    desc: 'Acesso restrito ao portal associado.',
    icon: <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person</span>,
  },
];

const EMPTY: InviteFormData = {
  nome: '',
  email: '',
  perfil: 'client_user',
  portaisIds: [],
};

export default function InviteUserModal({ open, onClose, portais, onSubmit }: InviteUserModalProps) {
  const [form, setForm] = useState<InviteFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [sent, setSent] = useState(false);

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
    if (form.perfil === 'client_user' && form.portaisIds.length === 0) {
      next.portaisIds = 'Selecione ao menos um portal para o cliente.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit(form);
    setSent(true);
  }

  function handleClose() {
    onClose();
    setTimeout(() => { setForm(EMPTY); setErrors({}); setSent(false); }, 200);
  }

  const isClient = form.perfil === 'client_user';

  /* ── Success state ── */
  if (sent) {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title=""
        size="sm"
        footer={
          <button className="modal-btn modal-btn--primary" type="button" onClick={handleClose}>
            Fechar
          </button>
        }
      >
        <div className="invite-success">
          <div className="invite-success__icon">
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>check_circle</span>
          </div>
          <h3 className="invite-success__title">Convite enviado!</h3>
          <p className="invite-success__desc">
            Um email foi enviado para <strong>{form.email}</strong> com o link de acesso à plataforma.
          </p>
          <div className="invite-success__detail">
            <span className="invite-success__name">{form.nome}</span>
            <span className={`badge ${form.perfil === 'super_admin' ? 'badge--info' : 'badge--gray'}`}>
              {form.perfil === 'super_admin' ? 'Admin' : 'Cliente'}
            </span>
          </div>
        </div>
      </Modal>
    );
  }

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
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>send</span>
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
          <span className="material-symbols-outlined mf__icon" style={{ fontSize: '16px' }}>mail</span>
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
                  if (p.value === 'super_admin') set('portaisIds', []);
                }}
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

      {/* Portais — apenas para clientes */}
      {isClient && (
        <div className="mf">
          <label className="mf__label">Portais com acesso</label>
          <div className="eu-portais-list">
            {portais.map((p) => (
              <label key={p.id} className="eu-portal-check">
                <input
                  type="checkbox"
                  checked={form.portaisIds.includes(p.id)}
                  onChange={() => {
                    const next = form.portaisIds.includes(p.id)
                      ? form.portaisIds.filter(id => id !== p.id)
                      : [...form.portaisIds, p.id];
                    set('portaisIds', next);
                  }}
                />
                {p.nome}
              </label>
            ))}
          </div>
          {errors.portaisIds && <span className="mf__error">{errors.portaisIds}</span>}
        </div>
      )}
    </Modal>
  );
}
