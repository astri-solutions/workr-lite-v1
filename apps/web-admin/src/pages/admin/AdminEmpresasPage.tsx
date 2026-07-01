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
  const [suspendTarget, setSuspendTarget] = useState<AdminEmpresa | null>(null);
  const [encerrarTarget, setEncerrarTarget] = useState<AdminEmpresa | null>(null);

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

            {/* Card header */}
            <div className="ae-card__header">
              <div className="portal-card__info">
                <div className="ae-card__name-row">
                  <span className="portal-card__name">{empresa.nome}</span>
                  <span className={`badge ${STATUS_BADGE[empresa.status]}`}>{STATUS_LABEL[empresa.status]}</span>
                </div>
                <span className="portal-card__meta">
                  CNPJ {empresa.cnpj} · Responsável: {empresa.responsavel} · {empresa.email} · Cadastro: {empresa.criadoEm}
                </span>
              </div>
              <div className="ae-card__header-actions">
                {empresa.status !== 'encerrada' && (
                  <button
                    className={`ae-toggle-btn${empresa.status === 'suspensa' ? ' ae-toggle-btn--ativar' : ''}`}
                    type="button"
                    onClick={() => setSuspendTarget(empresa)}
                  >
                    {empresa.status === 'ativa' ? 'Suspender conta' : 'Reativar conta'}
                  </button>
                )}
                <EmpresaKebabMenu
                  onEditar={() => {}}
                  onEncerrar={() => setEncerrarTarget(empresa)}
                />
              </div>
            </div>

            {/* Portais vinculados */}
            <div className="portal-card__sites">
              {empresa.portais.map(portal => (
                <div key={portal.id} className="portal-site-row">
                  <div className="portal-site-row__left">
                    <span className={`badge ${portal.ativo ? 'badge--success' : 'badge--error'}`}>
                      {portal.ativo ? 'Ativo' : 'Suspenso'}
                    </span>
                    <a
                      className={`portal-site-row__link${!portal.ativo ? ' portal-site-row__link--disabled' : ''}`}
                      href={portal.ativo ? `https://${portal.link}` : undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {portal.link}
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>open_in_new</span>
                    </a>
                  </div>
                  <div className="portal-site-row__right">
                    <span className="ae-portal-hint">
                      {empresa.status !== 'ativa'
                        ? 'Portal suspenso junto com a conta'
                        : 'Portal ativo'}
                    </span>
                  </div>
                </div>
              ))}
              {empresa.portais.length === 0 && (
                <p className="ae-no-portais">Nenhum portal configurado.</p>
              )}
            </div>
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
