import { useState, useRef, useEffect } from 'react';
import './AdminPages.css';
import './AdminEmpresasPage.css';
import StickyPageHeader from '../../components/StickyPageHeader';
import Modal from '../../components/Modal';

type ContaStatus = 'ativa' | 'suspensa' | 'encerrada';

interface Portal {
  id: string;
  link: string;
  ativo: boolean;
}

interface AdminEmpresa {
  id: string;
  nome: string;
  cnpj: string;
  codigoCvm: string;
  responsavel: string;
  email: string;
  criadoEm: string;
  status: ContaStatus;
  portais: Portal[];
}

const EMPRESAS_DATA: AdminEmpresa[] = [
  {
    id: 'aurora',
    nome: 'Construtora Aurora',
    cnpj: '12.345.678/0001-90',
    codigoCvm: '21234',
    responsavel: 'Marcos Oliveira',
    email: 'marcos@aurora.com.br',
    criadoEm: '03/03/2026',
    status: 'ativa',
    portais: [{ id: 's1', link: 'aurora.workr.com.br', ativo: true }],
  },
  {
    id: 'imc',
    nome: 'International Meal Company',
    cnpj: '17.314.329/0001-20',
    codigoCvm: '8133',
    responsavel: 'Carlos Souza',
    email: 'carlos@imc.com.br',
    criadoEm: '12/02/2026',
    status: 'ativa',
    portais: [
      { id: 's2', link: 'imc.workr.com.br', ativo: true },
      { id: 's3', link: 'imc-en.workr.com.br', ativo: true },
    ],
  },
  {
    id: 'vetra',
    nome: 'Vetra Energia',
    cnpj: '98.765.432/0001-10',
    codigoCvm: '',
    responsavel: 'Patrícia Mendes',
    email: 'patricia@vetra.com.br',
    criadoEm: '21/01/2026',
    status: 'suspensa',
    portais: [{ id: 's4', link: 'vetra.workr.com.br', ativo: false }],
  },
];

const STATUS_LABEL: Record<ContaStatus, string> = {
  ativa: 'Ativa',
  suspensa: 'Suspensa',
  encerrada: 'Encerrada',
};

const STATUS_BADGE: Record<ContaStatus, string> = {
  ativa: 'badge--success',
  suspensa: 'badge--warning',
  encerrada: 'badge--error',
};

function EmpresaKebabMenu({ onEditar, onEncerrar }: { onEditar: () => void; onEncerrar: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div className="ae-kebab" ref={ref}>
      <button className="ae-kebab__trigger" type="button" aria-label="Mais opções" onClick={() => setOpen(v => !v)}>
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>more_vert</span>
      </button>
      {open && (
        <div className="ae-kebab__menu">
          <button className="ae-kebab__item" type="button" onClick={() => { setOpen(false); onEditar(); }}>Editar dados</button>
          <button className="ae-kebab__item ae-kebab__item--danger" type="button" onClick={() => { setOpen(false); onEncerrar(); }}>Encerrar conta</button>
        </div>
      )}
    </div>
  );
}

export default function AdminEmpresasPage() {
  const [empresas, setEmpresas] = useState<AdminEmpresa[]>(EMPRESAS_DATA);
  const [search, setSearch] = useState('');
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(['aurora']));
  const [suspendTarget, setSuspendTarget] = useState<AdminEmpresa | null>(null);
  const [suspendPortalTarget, setSuspendPortalTarget] = useState<{ empresa: AdminEmpresa; portal: Portal } | null>(null);
  const [encerrarTarget, setEncerrarTarget] = useState<AdminEmpresa | null>(null);
  const [editTarget, setEditTarget] = useState<AdminEmpresa | null>(null);
  const [editForm, setEditForm] = useState({ nome: '', cnpj: '', codigoCvm: '' });

  const filtered = empresas.filter(e =>
    e.nome.toLowerCase().includes(search.toLowerCase()) ||
    e.cnpj.includes(search) ||
    e.portais.some(p => p.link.toLowerCase().includes(search.toLowerCase()))
  );

  function toggleStatus(empresa: AdminEmpresa) {
    const next: ContaStatus = empresa.status === 'ativa' ? 'suspensa' : 'ativa';
    setEmpresas(prev => prev.map(e => {
      if (e.id !== empresa.id) return e;
      return {
        ...e,
        status: next,
        portais: e.portais.map(p => ({ ...p, ativo: next === 'ativa' })),
      };
    }));
    setSuspendTarget(null);
  }

  function togglePortal(empresaId: string, portalId: string) {
    setEmpresas(prev => prev.map(e => {
      if (e.id !== empresaId) return e;
      return { ...e, portais: e.portais.map(p => p.id !== portalId ? p : { ...p, ativo: !p.ativo }) };
    }));
    setSuspendPortalTarget(null);
  }

  function openEdit(empresa: AdminEmpresa) {
    setEditTarget(empresa);
    setEditForm({ nome: empresa.nome, cnpj: empresa.cnpj, codigoCvm: empresa.codigoCvm });
  }

  function saveEdit() {
    if (!editTarget) return;
    setEmpresas(prev => prev.map(e => e.id !== editTarget.id ? e : {
      ...e,
      nome: editForm.nome.trim(),
      cnpj: editForm.cnpj.trim(),
      codigoCvm: editForm.codigoCvm.trim(),
    }));
    setEditTarget(null);
  }

  function encerrarConta(empresa: AdminEmpresa) {
    setEmpresas(prev => prev.map(e => e.id !== empresa.id ? e : {
      ...e,
      status: 'encerrada',
      portais: e.portais.map(p => ({ ...p, ativo: false })),
    }));
    setEncerrarTarget(null);
  }

  const ativas = empresas.filter(e => e.status === 'ativa').length;
  const suspensas = empresas.filter(e => e.status === 'suspensa').length;
  const totalPortais = empresas.reduce((s, e) => s + e.portais.length, 0);

  return (
    <div className="page">
      <StickyPageHeader
        title="Empresas"
        description="Gestão de contas dos clientes. Ativar ou suspender uma empresa afeta todos os portais vinculados."
        action={undefined}
      />

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-card__number">{empresas.length}</span>
          <span className="stat-card__label">Empresas</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__number">{ativas}</span>
          <span className="stat-card__label">Ativas</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__number">{suspensas}</span>
          <span className="stat-card__label">Suspensas</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__number">{totalPortais}</span>
          <span className="stat-card__label">Portais</span>
        </div>
      </div>

      <div className="portais-search-wrap">
        <span className="material-symbols-outlined portais-search-icon" style={{ fontSize: '16px' }}>search</span>
        <input
          className="portais-search"
          type="search"
          placeholder="Buscar por empresa, CNPJ ou domínio…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="portais-list">
        {filtered.map(empresa => (
          <div key={empresa.id} className={`ae-card${empresa.status === 'encerrada' ? ' ae-card--encerrada' : ''}`}>

            {/* Card header — same 3-col grid as portal rows */}
            <div
              className="ae-card__header ae-portal-row ae-portal-row--empresa-header ae-card__header--accordion"
              onClick={() => setOpenIds(prev => { const s = new Set(prev); s.has(empresa.id) ? s.delete(empresa.id) : s.add(empresa.id); return s; })}
            >
              <div className="portal-card__info">
                <span className="portal-card__name">{empresa.nome}</span>
                <div className="ae-empresa-meta">
                  <span><span className="ae-empresa-meta__label">CNPJ</span> {empresa.cnpj}</span>
                  <span className="ae-empresa-meta__sep">·</span>
                  <span><span className="ae-empresa-meta__label">Responsável</span> {empresa.responsavel}</span>
                  <span className="ae-empresa-meta__sep">·</span>
                  <span>{empresa.email}</span>
                  <span className="ae-empresa-meta__sep">·</span>
                  <span><span className="ae-empresa-meta__label">Cadastro</span> {empresa.criadoEm}</span>
                </div>
              </div>
              <span className={`badge ae-badge-col ${STATUS_BADGE[empresa.status]}`}>{STATUS_LABEL[empresa.status]}</span>
              <div className="ae-portal-row__action" onClick={e => e.stopPropagation()}>
                <span className={`badge ae-badge-mobile ${STATUS_BADGE[empresa.status]}`}>{STATUS_LABEL[empresa.status]}</span>
                {empresa.status !== 'encerrada' && (
                  <button
                    className={`ae-toggle-btn ae-toggle-btn--sm${empresa.status === 'suspensa' ? ' ae-toggle-btn--ativar' : ''}`}
                    type="button"
                    onClick={() => setSuspendTarget(empresa)}
                  >
                    {empresa.status === 'ativa' ? 'Suspender conta' : 'Reativar conta'}
                  </button>
                )}
                <EmpresaKebabMenu
                  onEditar={() => openEdit(empresa)}
                  onEncerrar={() => setEncerrarTarget(empresa)}
                />
              </div>
              <button
                type="button"
                className="ae-accordion-chevron-btn"
                onClick={e => { e.stopPropagation(); setOpenIds(prev => { const s = new Set(prev); s.has(empresa.id) ? s.delete(empresa.id) : s.add(empresa.id); return s; }); }}
                aria-label={openIds.has(empresa.id) ? 'Recolher' : 'Expandir'}
              >
                <span
                  className="material-symbols-outlined ae-accordion-chevron"
                  style={{ fontSize: '18px', transform: openIds.has(empresa.id) ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                >
                  expand_more
                </span>
              </button>
            </div>

            {/* Portais vinculados */}
            {openIds.has(empresa.id) && <div className="portal-card__sites">
              {empresa.portais.length > 0 && (
                <div className="ae-portal-row ae-portal-row--header">
                  <span>Domínio</span>
                  <span>Status</span>
                  <span />
                </div>
              )}
              {empresa.portais.map(portal => (
                <div key={portal.id} className="ae-portal-row">
                  <a
                    className={`portal-site-row__link${!portal.ativo ? ' portal-site-row__link--disabled' : ''}`}
                    href={portal.ativo ? `https://${portal.link}` : undefined}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {portal.link}
                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>open_in_new</span>
                  </a>
                  <span className={`badge ${portal.ativo ? 'badge--success' : 'badge--error'}`}>
                    {portal.ativo ? 'Ativo' : 'Suspenso'}
                  </span>
                  <div className="ae-portal-row__action">
                    {empresa.status !== 'ativa' ? (
                      <span className="ae-portal-hint">Suspenso com a conta</span>
                    ) : (
                      <button
                        className={`ae-toggle-btn ae-toggle-btn--sm${!portal.ativo ? ' ae-toggle-btn--ativar' : ''}`}
                        type="button"
                        onClick={() => setSuspendPortalTarget({ empresa, portal })}
                      >
                        {portal.ativo ? 'Suspender' : 'Reativar'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {empresa.portais.length === 0 && (
                <p className="ae-no-portais">Nenhum portal configurado.</p>
              )}
            </div>}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="page-placeholder">
            <span className="material-symbols-outlined page-placeholder__icon" style={{ fontSize: '40px' }}>search</span>
            <h2>Nenhuma empresa encontrada</h2>
            <p>Tente buscar por outro nome, CNPJ ou domínio.</p>
          </div>
        )}
      </div>

      {/* Confirmar suspender / reativar */}
      {suspendTarget && (
        <Modal
          open
          onClose={() => setSuspendTarget(null)}
          title={suspendTarget.status === 'ativa' ? 'Suspender conta' : 'Reativar conta'}
          size="sm"
          footer={
            <div className="modal-footer">
              <button className="btn-outline" type="button" onClick={() => setSuspendTarget(null)}>Cancelar</button>
              <button
                className={suspendTarget.status === 'ativa' ? 'btn-outline btn-outline--danger' : 'btn-primary'}
                type="button"
                onClick={() => toggleStatus(suspendTarget)}
              >
                {suspendTarget.status === 'ativa' ? 'Suspender' : 'Reativar'}
              </button>
            </div>
          }
        >
          {suspendTarget.status === 'ativa' ? (
            <p className="ae-confirm-text">
              Suspender <strong>{suspendTarget.nome}</strong> desativará automaticamente todos os{' '}
              <strong>{suspendTarget.portais.length} portal{suspendTarget.portais.length !== 1 ? 'is' : ''}</strong> vinculados.
              O acesso do cliente ao portal será bloqueado imediatamente.
            </p>
          ) : (
            <p className="ae-confirm-text">
              Reativar <strong>{suspendTarget.nome}</strong> restaurará o acesso a todos os portais vinculados.
            </p>
          )}
        </Modal>
      )}

      {/* Confirmar suspender / reativar portal */}
      {suspendPortalTarget && (
        <Modal
          open
          onClose={() => setSuspendPortalTarget(null)}
          title={suspendPortalTarget.portal.ativo ? 'Suspender portal' : 'Reativar portal'}
          size="sm"
          footer={
            <div className="modal-footer">
              <button className="btn-outline" type="button" onClick={() => setSuspendPortalTarget(null)}>Cancelar</button>
              <button
                className={suspendPortalTarget.portal.ativo ? 'btn-outline btn-outline--danger' : 'btn-primary'}
                type="button"
                onClick={() => togglePortal(suspendPortalTarget.empresa.id, suspendPortalTarget.portal.id)}
              >
                {suspendPortalTarget.portal.ativo ? 'Suspender' : 'Reativar'}
              </button>
            </div>
          }
        >
          {suspendPortalTarget.portal.ativo ? (
            <p className="ae-confirm-text">
              Suspender o portal <strong>{suspendPortalTarget.portal.link}</strong> bloqueará o acesso imediatamente.
            </p>
          ) : (
            <p className="ae-confirm-text">
              Reativar o portal <strong>{suspendPortalTarget.portal.link}</strong> restaurará o acesso dos usuários.
            </p>
          )}
        </Modal>
      )}

      {/* Editar dados */}
      {editTarget && (
        <Modal
          open
          onClose={() => setEditTarget(null)}
          title="Editar dados"
          size="md"
          footer={
            <div className="modal-footer">
              <button className="btn-outline" type="button" onClick={() => setEditTarget(null)}>Cancelar</button>
              <button className="btn-primary" type="button" disabled={!editForm.nome.trim()} onClick={saveEdit}>Salvar</button>
            </div>
          }
        >
          <div className="np-step__body">
            <div className="np-field">
              <label className="np-label">Nome da empresa</label>
              <input
                className="np-input"
                type="text"
                placeholder="Ex: Construtora Aurora"
                value={editForm.nome}
                onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="np-field">
              <label className="np-label">CNPJ</label>
              <input
                className="np-input"
                type="text"
                placeholder="00.000.000/0000-00"
                value={editForm.cnpj}
                onChange={e => setEditForm(f => ({ ...f, cnpj: e.target.value }))}
              />
            </div>
            <div className="np-field">
              <label className="np-label">Código CVM</label>
              <input
                className="np-input"
                type="text"
                placeholder="Ex: 21234"
                value={editForm.codigoCvm}
                onChange={e => setEditForm(f => ({ ...f, codigoCvm: e.target.value }))}
              />
              <p className="np-field__hint">Código de registro da empresa na Comissão de Valores Mobiliários.</p>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmar encerrar */}
      {encerrarTarget && (
        <Modal
          open
          onClose={() => setEncerrarTarget(null)}
          title="Encerrar conta"
          size="sm"
          footer={
            <div className="modal-footer">
              <button className="btn-outline" type="button" onClick={() => setEncerrarTarget(null)}>Cancelar</button>
              <button className="btn-outline btn-outline--danger" type="button" onClick={() => encerrarConta(encerrarTarget)}>
                Encerrar conta
              </button>
            </div>
          }
        >
          <p className="ae-confirm-text">
            Encerrar a conta de <strong>{encerrarTarget.nome}</strong> é uma ação permanente. Todos os portais serão
            desativados e o acesso do cliente será revogado. Esta ação não pode ser desfeita.
          </p>
        </Modal>
      )}
    </div>
  );
}
