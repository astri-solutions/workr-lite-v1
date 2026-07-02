import { useState } from 'react';
import Modal from './Modal';
import './InviteUserModal.css';

export interface PortalWithEmpresas {
  id: string;
  nome: string;
  empresas?: { id: string; nome: string }[];
}

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  portais: PortalWithEmpresas[];
  onSubmit: (data: InviteFormData) => void;
}

export interface InviteFormData {
  nome: string;
  email: string;
  perfil: 'super_admin' | 'client_user';
  portaisIds: string[];
  empresasIds: string[];
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
  empresasIds: [],
};

export default function InviteUserModal({ open, onClose, portais, onSubmit }: InviteUserModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<InviteFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [sent, setSent] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedPortalId, setExpandedPortalId] = useState<string | null>(null);

  function setField<K extends keyof InviteFormData>(key: K, val: InviteFormData[K]) {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  function validateStep1(): boolean {
    const next: Record<string, string> = {};
    if (!form.nome.trim()) next.nome = 'Nome é obrigatório.';
    if (!form.email.trim()) {
      next.email = 'Email é obrigatório.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Digite um email válido.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateStep2(): boolean {
    if (form.portaisIds.length === 0 && form.empresasIds.length === 0) {
      setErrors({ portais: 'Selecione ao menos um portal ou empresa.' });
      return false;
    }
    return true;
  }

  function handleNext() {
    if (!validateStep1()) return;
    if (form.perfil === 'super_admin') {
      onSubmit(form);
      setSent(true);
    } else {
      setStep(2);
    }
  }

  function handleSubmit() {
    if (!validateStep2()) return;
    onSubmit(form);
    setSent(true);
  }

  function handleClose() {
    onClose();
    setTimeout(() => {
      setForm(EMPTY); setErrors({}); setSent(false);
      setStep(1); setSearch(''); setExpandedPortalId(null);
    }, 200);
  }

  /* ── Selection helpers ── */
  function isPortalFullySelected(portal: PortalWithEmpresas): boolean {
    const emp = portal.empresas ?? [];
    if (emp.length === 0) return form.portaisIds.includes(portal.id);
    return emp.every(e => form.empresasIds.includes(e.id));
  }

  function isPortalPartiallySelected(portal: PortalWithEmpresas): boolean {
    const emp = portal.empresas ?? [];
    if (emp.length === 0) return false;
    const count = emp.filter(e => form.empresasIds.includes(e.id)).length;
    return count > 0 && count < emp.length;
  }

  function togglePortal(portal: PortalWithEmpresas) {
    setErrors(e => ({ ...e, portais: undefined }));
    const emp = portal.empresas ?? [];
    if (emp.length === 0) {
      const next = form.portaisIds.includes(portal.id)
        ? form.portaisIds.filter(id => id !== portal.id)
        : [...form.portaisIds, portal.id];
      setField('portaisIds', next);
      return;
    }
    // Expand and toggle all empresas
    setExpandedPortalId(portal.id);
    const allChecked = emp.every(e => form.empresasIds.includes(e.id));
    const empIds = emp.map(e => e.id);
    const nextEmp = allChecked
      ? form.empresasIds.filter(id => !empIds.includes(id))
      : [...new Set([...form.empresasIds, ...empIds])];
    const nextPortais = allChecked
      ? form.portaisIds.filter(id => id !== portal.id)
      : [...new Set([...form.portaisIds, portal.id])];
    setForm(f => ({ ...f, empresasIds: nextEmp, portaisIds: nextPortais }));
  }

  function toggleEmpresa(portal: PortalWithEmpresas, empresaId: string) {
    setErrors(e => ({ ...e, portais: undefined }));
    const emp = portal.empresas ?? [];
    const nextEmp = form.empresasIds.includes(empresaId)
      ? form.empresasIds.filter(id => id !== empresaId)
      : [...form.empresasIds, empresaId];
    const anyLeft = nextEmp.some(id => emp.some(e => e.id === id));
    const nextPortais = anyLeft
      ? [...new Set([...form.portaisIds, portal.id])]
      : form.portaisIds.filter(id => id !== portal.id);
    setForm(f => ({ ...f, empresasIds: nextEmp, portaisIds: nextPortais }));
  }

  const filteredPortais = portais.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    (p.empresas ?? []).some(e => e.nome.toLowerCase().includes(search.toLowerCase()))
  );

  const totalSelecionados = (() => {
    let n = 0;
    for (const p of portais) {
      const emp = p.empresas ?? [];
      if (emp.length === 0 && form.portaisIds.includes(p.id)) n++;
      else n += emp.filter(e => form.empresasIds.includes(e.id)).length;
    }
    return n;
  })();

  /* ── Success ── */
  if (sent) {
    return (
      <Modal open={open} onClose={handleClose} title="" size="sm" footer={null}>
        <div className="invite-success">
          <div className="invite-success__icon">
            <svg className="invite-success__svg" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle className="invite-success__circle" cx="26" cy="26" r="23" stroke="currentColor" strokeWidth="2.5" fill="none" />
              <polyline className="invite-success__check" points="14,26 22,34 38,18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
          <h3 className="invite-success__title">Convite enviado!</h3>
          <p className="invite-success__desc">
            Um email foi enviado para <strong>{form.email}</strong> com o link de acesso.
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

  /* ── Step 1: Dados ── */
  if (step === 1) {
    return (
      <Modal
        open={open} onClose={handleClose}
        title="Convidar usuário"
        description="O usuário receberá um email com o link de acesso à plataforma."
        size="sm"
        footer={
          <>
            <button className="modal-btn modal-btn--ghost" type="button" onClick={handleClose}>Cancelar</button>
            <button className="modal-btn modal-btn--primary" type="button" onClick={handleNext}>
              {form.perfil === 'super_admin' ? (
                <><span className="material-symbols-outlined" style={{ fontSize: '15px' }}>send</span>Enviar convite</>
              ) : (
                <>Próximo<span className="material-symbols-outlined" style={{ fontSize: '15px' }}>arrow_forward</span></>
              )}
            </button>
          </>
        }
      >
        {/* Step indicator — only for clients */}
        {form.perfil === 'client_user' && (
          <div className="invite-steps">
            <div className="invite-step invite-step--active">
              <span className="invite-step__dot">1</span>
              <span className="invite-step__label">Dados</span>
            </div>
            <div className="invite-step__line" />
            <div className="invite-step">
              <span className="invite-step__dot">2</span>
              <span className="invite-step__label">Acesso</span>
            </div>
          </div>
        )}

        <div className="mf">
          <label className="mf__label">Nome</label>
          <input className={`mf__input${errors.nome ? ' mf__input--error' : ''}`}
            type="text" placeholder="Nome completo"
            value={form.nome} onChange={e => setField('nome', e.target.value)}
            autoFocus maxLength={80} />
          {errors.nome && <span className="mf__error">{errors.nome}</span>}
        </div>

        <div className="mf">
          <label className="mf__label">Email</label>
          <div className="mf__icon-wrap">
            <span className="material-symbols-outlined mf__icon" style={{ fontSize: '16px' }}>mail</span>
            <input className={`mf__input mf__input--icon${errors.email ? ' mf__input--error' : ''}`}
              type="email" placeholder="usuario@empresa.com"
              value={form.email} onChange={e => setField('email', e.target.value)} />
          </div>
          {errors.email && <span className="mf__error">{errors.email}</span>}
        </div>

        <div className="mf">
          <label className="mf__label">Perfil</label>
          <div className="mf__perfil-grid">
            {PERFIS.map(p => {
              const active = form.perfil === p.value;
              return (
                <button key={p.value} type="button"
                  className={`mf__perfil-card${active ? ' mf__perfil-card--active' : ''}`}
                  onClick={() => {
                    setField('perfil', p.value);
                    if (p.value === 'super_admin') {
                      setForm(f => ({ ...f, perfil: p.value, portaisIds: [], empresasIds: [] }));
                    }
                  }}
                >
                  <span className={`mf__perfil-icon${active ? ' mf__perfil-icon--active' : ''}`}>{p.icon}</span>
                  <span className="mf__perfil-label">{p.label}</span>
                  <span className="mf__perfil-desc">{p.desc}</span>
                  <div className={`mf__perfil-check${active ? ' mf__perfil-check--active' : ''}`}>
                    {active && <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>check</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Modal>
    );
  }

  /* ── Step 2: Acesso ── */
  return (
    <Modal
      open={open} onClose={handleClose}
      title="Portais com acesso"
      description="Selecione a quais portais e empresas este usuário terá acesso."
      size="sm"
      footer={
        <>
          <button className="modal-btn modal-btn--ghost" type="button"
            onClick={() => { setStep(1); setErrors({}); }}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>arrow_back</span>
            Voltar
          </button>
          <button className="modal-btn modal-btn--primary" type="button" onClick={handleSubmit}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>send</span>
            Enviar convite
          </button>
        </>
      }
    >
      {/* Step indicator */}
      <div className="invite-steps">
        <div className="invite-step invite-step--done">
          <span className="invite-step__dot">
            <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>check</span>
          </span>
          <span className="invite-step__label">Dados</span>
        </div>
        <div className="invite-step__line invite-step__line--done" />
        <div className="invite-step invite-step--active">
          <span className="invite-step__dot">2</span>
          <span className="invite-step__label">Acesso</span>
        </div>
      </div>

      {/* User summary */}
      <div className="invite-user-summary">
        <span className="material-symbols-outlined invite-user-summary__icon" style={{ fontSize: '16px' }}>person</span>
        <span className="invite-user-summary__name">{form.nome}</span>
        <span className="invite-user-summary__email">{form.email}</span>
        <span className={`badge ${form.perfil === 'super_admin' ? 'badge--info' : 'badge--gray'}`} style={{ fontSize: '11px' }}>
          {form.perfil === 'super_admin' ? 'Admin' : 'Cliente'}
        </span>
      </div>

      {/* Search */}
      <div className="invite-search-wrap">
        <span className="material-symbols-outlined invite-search__icon" style={{ fontSize: '16px' }}>search</span>
        <input className="invite-search__input" type="text"
          placeholder="Buscar portal ou empresa…"
          value={search} onChange={e => setSearch(e.target.value)} autoFocus />
        {search && (
          <button className="invite-search__clear" type="button" onClick={() => setSearch('')}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
          </button>
        )}
      </div>

      {/* Portal list */}
      <div className="invite-portal-list">
        {filteredPortais.length === 0 && (
          <p className="invite-portal-empty">Nenhum portal encontrado.</p>
        )}
        {filteredPortais.map(portal => {
          const emp = portal.empresas ?? [];
          const isExpanded = expandedPortalId === portal.id;
          const selected = isPortalFullySelected(portal);
          const partial = isPortalPartiallySelected(portal);

          return (
            <div key={portal.id} className="invite-portal-item">
              <div className={`invite-portal-row${selected || partial ? ' invite-portal-row--active' : ''}`}>
                <div className="invite-portal-row__left" onClick={() => togglePortal(portal)}>
                  <span className={`invite-cb${selected ? ' invite-cb--checked' : partial ? ' invite-cb--partial' : ''}`}>
                    {selected && <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>check</span>}
                    {!selected && partial && <span className="invite-cb__dash" />}
                  </span>
                  <span className="invite-portal-row__name">{portal.nome}</span>
                </div>
                {emp.length > 0 && (
                  <button type="button" className="invite-portal-row__chevron"
                    onClick={() => setExpandedPortalId(isExpanded ? null : portal.id)}>
                    <span className="material-symbols-outlined"
                      style={{ fontSize: '18px', transition: 'transform 0.18s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                      expand_more
                    </span>
                  </button>
                )}
              </div>

              {emp.length > 0 && isExpanded && (
                <div className="invite-empresas">
                  {emp.map(empresa => {
                    const checked = form.empresasIds.includes(empresa.id);
                    return (
                      <div key={empresa.id} className="invite-empresa-row" onClick={() => toggleEmpresa(portal, empresa.id)}>
                        <span className={`invite-cb invite-cb--sm${checked ? ' invite-cb--checked' : ''}`}>
                          {checked && <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>check</span>}
                        </span>
                        <span className="invite-empresa-row__name">{empresa.nome}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {errors.portais && <span className="mf__error">{errors.portais}</span>}

      {totalSelecionados > 0 && (
        <div className="invite-summary">
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-primary-500)' }}>check_circle</span>
          <span>{totalSelecionados} {totalSelecionados === 1 ? 'item selecionado' : 'itens selecionados'}</span>
        </div>
      )}
    </Modal>
  );
}
