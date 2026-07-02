import { useState, useEffect } from 'react';
import Modal from './Modal';
import './InviteUserModal.css';
import './EditUserModal.css';

export interface EditableUser {
  id: string;
  nome: string;
  email: string;
  role: 'super_admin' | 'client_user';
  portais: string[];
  status: 'Ativo' | 'Suspenso';
}

export interface PortalWithEmpresas {
  id: string;
  nome: string;
  empresas?: { id: string; nome: string }[];
}

const PORTAIS_LIST: PortalWithEmpresas[] = [
  {
    id: '1', nome: 'Construtora Aurora',
    empresas: [
      { id: '1a', nome: 'Aurora Incorporadora' },
      { id: '1b', nome: 'Aurora Imóveis' },
    ],
  },
  {
    id: '2', nome: 'International Meal Company',
    empresas: [
      { id: '2a', nome: 'IMC Brasil' },
      { id: '2b', nome: 'IMC São Paulo' },
      { id: '2c', nome: 'IMC Nordeste' },
    ],
  },
  { id: '3', nome: 'Vetra Energia' },
];

interface EditUserModalProps {
  user: EditableUser | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, role: 'super_admin' | 'client_user', portais: string[]) => void;
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
  const [tab, setTab] = useState<'info' | 'acesso'>('info');
  const [role, setRole] = useState<'super_admin' | 'client_user'>('client_user');
  const [portaisIds, setPortaisIds] = useState<string[]>([]);
  const [empresasIds, setEmpresasIds] = useState<string[]>([]);
  const [expandedPortalId, setExpandedPortalId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (user) {
      setRole(user.role);
      setPortaisIds(user.portais);
      setEmpresasIds([]);
      setConfirmDelete(false);
      setTab('info');
      setSearch('');
      setExpandedPortalId(null);
    }
  }, [user]);

  function handleClose() {
    onClose();
    setTimeout(() => setConfirmDelete(false), 200);
  }

  function handleSave() {
    if (!user) return;
    onSave(user.id, role, role === 'super_admin' ? [] : portaisIds);
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

  /* ── Portal selection helpers (mirrors InviteUserModal) ── */
  function isPortalFullySelected(portal: PortalWithEmpresas): boolean {
    const emp = portal.empresas ?? [];
    if (emp.length === 0) return portaisIds.includes(portal.id);
    return emp.every(e => empresasIds.includes(e.id));
  }

  function isPortalPartiallySelected(portal: PortalWithEmpresas): boolean {
    const emp = portal.empresas ?? [];
    if (emp.length === 0) return false;
    const count = emp.filter(e => empresasIds.includes(e.id)).length;
    return count > 0 && count < emp.length;
  }

  function togglePortal(portal: PortalWithEmpresas) {
    const emp = portal.empresas ?? [];
    if (emp.length === 0) {
      setPortaisIds(prev => prev.includes(portal.id) ? prev.filter(id => id !== portal.id) : [...prev, portal.id]);
      return;
    }
    setExpandedPortalId(portal.id);
    const allChecked = emp.every(e => empresasIds.includes(e.id));
    const empIds = emp.map(e => e.id);
    setEmpresasIds(prev => allChecked ? prev.filter(id => !empIds.includes(id)) : [...new Set([...prev, ...empIds])]);
    setPortaisIds(prev => allChecked ? prev.filter(id => id !== portal.id) : [...new Set([...prev, portal.id])]);
  }

  function toggleEmpresa(portal: PortalWithEmpresas, empresaId: string) {
    const emp = portal.empresas ?? [];
    const nextEmp = empresasIds.includes(empresaId)
      ? empresasIds.filter(id => id !== empresaId)
      : [...empresasIds, empresaId];
    const anyLeft = nextEmp.some(id => emp.some(e => e.id === id));
    setEmpresasIds(nextEmp);
    setPortaisIds(prev => anyLeft
      ? [...new Set([...prev, portal.id])]
      : prev.filter(id => id !== portal.id)
    );
  }

  const filteredPortais = PORTAIS_LIST.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    (p.empresas ?? []).some(e => e.nome.toLowerCase().includes(search.toLowerCase()))
  );

  const totalSelecionados = (() => {
    let n = 0;
    for (const p of PORTAIS_LIST) {
      const emp = p.empresas ?? [];
      if (emp.length === 0 && portaisIds.includes(p.id)) n++;
      else n += emp.filter(e => empresasIds.includes(e.id)).length;
    }
    return n;
  })();

  if (!user) return null;

  const isSuspended = user.status === 'Suspenso';
  const portaisChanged = role === 'client_user' &&
    JSON.stringify([...portaisIds].sort()) !== JSON.stringify([...user.portais].sort());
  const hasChanges = role !== user.role || portaisChanged;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Editar usuário"
      size="sm"
      footer={
        hasChanges ? (
          <>
            <button className="modal-btn modal-btn--ghost" type="button" onClick={handleClose}>Cancelar</button>
            <button className="modal-btn modal-btn--primary" type="button" onClick={handleSave}>Salvar alterações</button>
          </>
        ) : (
          <button className="modal-btn modal-btn--ghost" type="button" onClick={handleClose}>Fechar</button>
        )
      }
    >
      {/* User info header */}
      <div className="eu-user-info">
        <div className="eu-user-info__avatar">{user.nome.charAt(0).toUpperCase()}</div>
        <div>
          <div className="eu-user-info__name">{user.nome}</div>
          <div className="eu-user-info__email">{user.email}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="eu-tabs">
        <button
          type="button"
          className={`eu-tab${tab === 'info' ? ' eu-tab--active' : ''}`}
          onClick={() => setTab('info')}
        >
          Informações
        </button>
        <button
          type="button"
          className={`eu-tab${tab === 'acesso' ? ' eu-tab--active' : ''}`}
          onClick={() => setTab('acesso')}
        >
          Acesso a portais
          {portaisIds.length > 0 && role === 'client_user' && (
            <span className="eu-tab__count">{portaisIds.length}</span>
          )}
        </button>
      </div>

      {/* ── Tab: Informações ── */}
      {tab === 'info' && (
        <>
          <div className="mf">
            <label className="mf__label">Tipo de usuário</label>
            <div className="mf__perfil-grid">
              {PERFIS.map((p) => {
                const active = role === p.value;
                return (
                  <button key={p.value} type="button"
                    className={`mf__perfil-card${active ? ' mf__perfil-card--active' : ''}`}
                    onClick={() => setRole(p.value)}
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

          <div className="eu-divider" />
          <div className="eu-actions">
            <button
              type="button"
              className={`eu-action-btn${isSuspended ? ' eu-action-btn--activate' : ' eu-action-btn--suspend'}`}
              onClick={handleToggleStatus}
            >
              {isSuspended ? (
                <><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>play_circle</span>Ativar acesso</>
              ) : (
                <><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>pause_circle</span>Suspender acesso</>
              )}
            </button>

            {!confirmDelete ? (
              <button type="button" className="eu-action-btn eu-action-btn--delete" onClick={() => setConfirmDelete(true)}>
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
                  <button className="modal-btn modal-btn--ghost eu-confirm__cancel" type="button" onClick={() => setConfirmDelete(false)}>Cancelar</button>
                  <button className="modal-btn eu-confirm__delete" type="button" onClick={handleDelete}>Sim, excluir</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Tab: Acesso a portais ── */}
      {tab === 'acesso' && (
        <>
          {role === 'super_admin' ? (
            <div className="eu-admin-notice">
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-primary-500)' }}>info</span>
              <p>Usuários Admin têm acesso completo a todos os portais automaticamente.</p>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="invite-search-wrap">
                <span className="material-symbols-outlined invite-search__icon" style={{ fontSize: '16px' }}>search</span>
                <input className="invite-search__input" type="text"
                  placeholder="Buscar portal ou empresa…"
                  value={search} onChange={e => setSearch(e.target.value)} />
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
                            const checked = empresasIds.includes(empresa.id);
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

              {totalSelecionados > 0 && (
                <div className="invite-summary">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-primary-500)' }}>check_circle</span>
                  <span>{totalSelecionados} {totalSelecionados === 1 ? 'item selecionado' : 'itens selecionados'}</span>
                </div>
              )}
            </>
          )}
        </>
      )}
    </Modal>
  );
}
