import { useState, useEffect, useCallback } from 'react';
import { useSort } from '../../hooks/useSort';
import SortIcon from '../../components/SortIcon';
import StickyPageHeader from '../../components/StickyPageHeader';
import Modal from '../../components/Modal';
import SearchInput from '../../components/SearchInput';
import { usePortalName } from '../../hooks/usePortalName';
import { useAuth } from '../../contexts/AuthContext';
import { usePortalState } from '../../hooks/usePortalState';
import '../admin/AdminPages.css';
import './EmpresasPage.css';

type Tipo = 'EMPRESA' | 'FUNDO' | 'OUTRO';

interface Empresa {
  id: string;
  nome: string;
  tipo: Tipo;
  cnpj: string;
  cvmCodigo: string;
  autoCvm: boolean;
  importarDesde: string;
  ativo: boolean;
}

function empresasKey(portalId?: string) {
  return `portal_empresas_${portalId ?? 'default'}`;
}

const TIPO_OPTIONS: Tipo[] = ['EMPRESA', 'FUNDO', 'OUTRO'];
const TIPO_LABEL: Record<Tipo, string> = { EMPRESA: 'Empresa', FUNDO: 'Fundo', OUTRO: 'Outro' };

interface EmpForm { nome: string; tipo: Tipo; cnpj: string; cvmCodigo: string; autoCvm: boolean; importarDesde: string; }
const EMPTY_FORM: EmpForm = { nome: '', tipo: 'EMPRESA', cnpj: '', cvmCodigo: '', autoCvm: false, importarDesde: '' };

type DeleteMode = 'choose' | 'migrate' | 'destroy';

export default function EmpresasPage() {
  const portalName = usePortalName();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const activePortalId = user?.activePortalId;
  const storageKey = empresasKey(activePortalId);

  // Hook cache key is pKey('portal_empresas', portalId) → `portal_empresas_<id>`
  // when a portal is active, which matches what cross-file readers use.
  // Without a portal it would be bare `portal_empresas`, while readers expect
  // `portal_empresas_default` — mirror to that key so they keep working.
  const [empresas, setEmpresasRaw, { hydrated, saveError }] = usePortalState<Empresa[]>('portal_empresas', 'empresas', []);
  const setEmpresas = useCallback((next: Empresa[] | ((prev: Empresa[]) => Empresa[])) => {
    setEmpresasRaw(prev => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      if (!activePortalId) {
        try { localStorage.setItem(storageKey, JSON.stringify(resolved)); } catch { /* quota */ }
      }
      return resolved;
    });
  }, [setEmpresasRaw, activePortalId, storageKey]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [form, setForm] = useState<EmpForm>(EMPTY_FORM);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Empresa | null>(null);
  const [deleteMode, setDeleteMode] = useState<DeleteMode>('choose');
  const [migrateTargetId, setMigrateTargetId] = useState('');

  // Seed main company from portal name once the authoritative value has hydrated
  useEffect(() => {
    if (!hydrated || !activePortalId || !portalName) return;
    if (empresas.length > 0) return; // already has data
    const principalId = `principal-${activePortalId}`;
    setEmpresas([{
      id: principalId,
      nome: portalName,
      tipo: 'EMPRESA',
      cnpj: '',
      cvmCodigo: '',
      autoCvm: false,
      importarDesde: '',
      ativo: true,
    }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, activePortalId, portalName]);

  // Toggle (ativar/desativar) confirm state
  const [toggleTarget, setToggleTarget] = useState<Empresa | null>(null);

  const _filtered = empresas.filter(e =>
    e.nome.toLowerCase().includes(search.toLowerCase()) ||
    e.cnpj.includes(search)
  );
  const { sorted: filtered, col, dir, toggle } = useSort(_filtered);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(emp: Empresa) {
    setEditing(emp);
    setForm({ nome: emp.nome, tipo: emp.tipo, cnpj: emp.cnpj, cvmCodigo: emp.cvmCodigo, autoCvm: emp.autoCvm, importarDesde: emp.importarDesde ?? '' });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  function handleSave() {
    if (!form.nome.trim()) return;
    if (editing) {
      setEmpresas(prev => prev.map(e => e.id === editing.id ? { ...e, ...form } : e));
    } else {
      const id = form.nome.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
      setEmpresas(prev => [...prev, { id, ...form, ativo: true }]);
    }
    closeModal();
  }

  function confirmToggle() {
    if (!toggleTarget) return;
    setEmpresas(prev => prev.map(e => e.id === toggleTarget.id ? { ...e, ativo: !e.ativo } : e));
    setToggleTarget(null);
  }

  function openDelete(emp: Empresa) {
    setDeleteTarget(emp);
    setDeleteMode('choose');
    setMigrateTargetId('');
  }

  function closeDelete() {
    setDeleteTarget(null);
    setDeleteMode('choose');
    setMigrateTargetId('');
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setEmpresas(prev => prev.filter(e => e.id !== deleteTarget.id));
    closeDelete();
  }

  const ativos = empresas.filter(e => e.ativo).length;
  const comAutoCvm = empresas.filter(e => e.autoCvm).length;
  const principalId = empresas[0]?.id;

  // Empresas available for migration (all except the one being deleted)
  const migrateOptions = deleteTarget
    ? empresas.filter(e => e.id !== deleteTarget.id)
    : [];

  const colCount = isSuperAdmin ? 7 : 6;

  return (
    <div className="page">
      <StickyPageHeader
        title="Empresas"
        description={<>Entidades e fundos de <strong>{portalName}</strong>.</>}
        action={
          <button className="btn-primary" type="button" onClick={openCreate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova empresa
          </button>
        }
      />

      {saveError && (
        <div className="save-error-banner" role="alert">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
          <span>Alteração não foi salva no banco. Se você acabou de receber acesso a este portal, saia e entre novamente para renovar a sessão.</span>
        </div>
      )}

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-card__number">{empresas.length}</span>
          <span className="stat-card__label">Entidades</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__number">{ativos}</span>
          <span className="stat-card__label">Ativas</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__number">{empresas.filter(e => e.tipo === 'FUNDO').length}</span>
          <span className="stat-card__label">Fundos</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__number">{comAutoCvm}</span>
          <span className="stat-card__label">Auto CVM</span>
        </div>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome ou CNPJ…" className="emp-search-input" />

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th className={`th-sort${col === 'nome' ? ' th-sort--active' : ''}`} onClick={() => toggle('nome')}><span className="th-sort-inner">Nome <SortIcon dir={col === 'nome' ? dir : null} /></span></th>
              <th className={`th-sort${col === 'tipo' ? ' th-sort--active' : ''}`} onClick={() => toggle('tipo')}><span className="th-sort-inner">Tipo <SortIcon dir={col === 'tipo' ? dir : null} /></span></th>
              <th className={`th-sort${col === 'cnpj' ? ' th-sort--active' : ''}`} onClick={() => toggle('cnpj')}><span className="th-sort-inner">CNPJ <SortIcon dir={col === 'cnpj' ? dir : null} /></span></th>
              <th>CVM</th>
              <th className={`th-sort${col === 'ativo' ? ' th-sort--active' : ''}`} onClick={() => toggle('ativo')}><span className="th-sort-inner">Status <SortIcon dir={col === 'ativo' ? dir : null} /></span></th>
              <th>Ações</th>
              {isSuperAdmin && <th className="emp-col-excluir">Excluir empresa</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={colCount} className="table-empty">Nenhuma entidade encontrada.</td></tr>
            ) : (
              <>
                {/* Empresa principal */}
                <tr className="emp-group-header">
                  <td colSpan={colCount}>Empresa principal</td>
                </tr>
                {filtered.filter(e => e.id === principalId).map(emp => (
                  <tr key={emp.id}>
                    <td className="table-cell--bold">
                      {emp.nome}
                      <span className="emp-principal-badge">Principal</span>
                    </td>
                    <td><span className={`badge ${emp.tipo === 'FUNDO' ? 'badge--gray' : 'badge--success'}`}>{TIPO_LABEL[emp.tipo]}</span></td>
                    <td className="table-cell--muted">{emp.cnpj || '—'}</td>
                    <td>{emp.autoCvm ? <span className="badge badge--cvm">Auto CVM</span> : <span className="table-cell--muted">—</span>}</td>
                    <td><span className={`badge ${emp.ativo ? 'badge--success' : 'badge--error'}`}>{emp.ativo ? 'Ativa' : 'Inativa'}</span></td>
                    <td>
                      <div className="table-actions">
                        <button className="btn-action btn-action--enter" type="button" onClick={() => openEdit(emp)}>Editar</button>
                        <button className="btn-action btn-action--enter" type="button" onClick={() => setToggleTarget(emp)}>{emp.ativo ? 'Desativar' : 'Ativar'}</button>
                      </div>
                    </td>
                    {isSuperAdmin && (
                      <td className="emp-col-excluir">
                        <button className="btn-action btn-action--danger" type="button" disabled title="A empresa principal não pode ser excluída">Excluir</button>
                      </td>
                    )}
                  </tr>
                ))}

                {/* Subsidiárias */}
                {filtered.filter(e => e.id !== principalId).length > 0 && (
                  <tr className="emp-group-header">
                    <td colSpan={colCount}>Subsidiárias e fundos</td>
                  </tr>
                )}
                {filtered.filter(e => e.id !== principalId).map(emp => (
                  <tr key={emp.id}>
                    <td className="table-cell--bold">{emp.nome}</td>
                    <td><span className={`badge ${emp.tipo === 'FUNDO' ? 'badge--gray' : 'badge--success'}`}>{TIPO_LABEL[emp.tipo]}</span></td>
                    <td className="table-cell--muted">{emp.cnpj || '—'}</td>
                    <td>{emp.autoCvm ? <span className="badge badge--cvm">Auto CVM</span> : <span className="table-cell--muted">—</span>}</td>
                    <td><span className={`badge ${emp.ativo ? 'badge--success' : 'badge--error'}`}>{emp.ativo ? 'Ativa' : 'Inativa'}</span></td>
                    <td>
                      <div className="table-actions">
                        <button className="btn-action btn-action--enter" type="button" onClick={() => openEdit(emp)}>Editar</button>
                        <button className="btn-action btn-action--enter" type="button" onClick={() => setToggleTarget(emp)}>{emp.ativo ? 'Desativar' : 'Ativar'}</button>
                      </div>
                    </td>
                    {isSuperAdmin && (
                      <td className="emp-col-excluir">
                        <button className="btn-action btn-action--danger" type="button" onClick={() => openDelete(emp)}>Excluir</button>
                      </td>
                    )}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar empresa' : 'Nova empresa'}
        size="sm"
        footer={
          <div className="modal-footer">
            <button className="btn-outline" type="button" onClick={closeModal}>Cancelar</button>
            <button className="btn-primary" type="button" onClick={handleSave} disabled={!form.nome.trim()}>
              {editing ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        }
      >
        <div className="emp-form">
          <label className="emp-form__label">
            Nome da empresa / fundo
            <input
              className="emp-form__input"
              type="text"
              placeholder="Ex: Itaú Negócios"
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              autoFocus
            />
          </label>

          <label className="emp-form__label">
            Tipo
            <div className="filter-wrap">
              <select
                className="filter-select emp-form__select-full"
                value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value as Tipo }))}
              >
                {TIPO_OPTIONS.map(t => (
                  <option key={t} value={t}>{TIPO_LABEL[t]}</option>
                ))}
              </select>
              <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
            </div>
          </label>

          <label className="emp-form__label">
            CNPJ
            <input
              className={`emp-form__input${editing ? ' emp-form__input--readonly' : ''}`}
              type="text"
              placeholder="00.000.000/0001-00"
              value={form.cnpj}
              onChange={e => !editing && setForm(f => ({ ...f, cnpj: e.target.value }))}
              readOnly={!!editing}
            />
            {editing && (
              <span className="emp-form__hint">O CNPJ não pode ser alterado após o cadastro.</span>
            )}
          </label>

          <div className="emp-form__section">
            <span className="emp-form__label">Auto CVM</span>
            <div className="emp-cvm-radio-group">
              <label className="emp-cvm-radio">
                <input
                  type="radio"
                  name="autoCvm"
                  checked={form.autoCvm}
                  onChange={() => setForm(f => ({ ...f, autoCvm: true }))}
                />
                <span className="emp-cvm-radio__dot" />
                <span>Ativado</span>
                <span className="emp-cvm-radio__desc">Importa documentos da CVM automaticamente via CNPJ</span>
              </label>
              <label className="emp-cvm-radio">
                <input
                  type="radio"
                  name="autoCvm"
                  checked={!form.autoCvm}
                  onChange={() => setForm(f => ({ ...f, autoCvm: false }))}
                />
                <span className="emp-cvm-radio__dot" />
                <span>Desativado</span>
                <span className="emp-cvm-radio__desc">Sem importação automática</span>
              </label>
            </div>
          </div>

          {form.autoCvm && (
            <>
              <label className="emp-form__label">
                Importar desde (retroativo)
                <input
                  className="emp-form__input"
                  type="date"
                  value={form.importarDesde}
                  onChange={e => setForm(f => ({ ...f, importarDesde: e.target.value }))}
                />
              </label>

              <label className="emp-form__label">
                Código CVM
                <input
                  className="emp-form__input"
                  type="text"
                  placeholder="Ex: 23574"
                  value={form.cvmCodigo}
                  onChange={e => setForm(f => ({ ...f, cvmCodigo: e.target.value }))}
                />
              </label>
            </>
          )}
        </div>
      </Modal>

      {/* Ativar / Desativar confirm modal */}
      {toggleTarget && (
        <Modal
          open
          onClose={() => setToggleTarget(null)}
          title={toggleTarget.ativo ? 'Desativar empresa' : 'Ativar empresa'}
          size="sm"
          footer={
            <div className="modal-footer">
              <button className="btn-outline" type="button" onClick={() => setToggleTarget(null)}>Cancelar</button>
              <button
                className={toggleTarget.ativo ? 'btn-outline btn-outline--danger' : 'btn-primary'}
                type="button"
                onClick={confirmToggle}
              >
                {toggleTarget.ativo ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          }
        >
          {toggleTarget.ativo ? (
            <div className="emp-delete-body">
              <div className="emp-delete-warning">
                <span className="material-symbols-outlined emp-delete-warning__icon">visibility_off</span>
                <div>
                  <p className="emp-delete-warning__title">Empresa será desativada</p>
                  <p className="emp-delete-warning__text">
                    Ao desativar <strong>{toggleTarget.nome}</strong>:
                  </p>
                  <ul className="emp-toggle-list">
                    <li>Todos os documentos desta empresa deixarão de aparecer no site.</li>
                    <li>Não será possível publicar novos documentos ou resultados para esta empresa.</li>
                    <li>Os dados são preservados e a empresa pode ser reativada a qualquer momento.</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <p className="emp-delete-text">
              Ao ativar <strong>{toggleTarget.nome}</strong>, seus documentos voltarão a aparecer no portal e será possível publicar novos conteúdos para esta empresa.
            </p>
          )}
        </Modal>
      )}

      {/* Delete modal — super_admin only */}
      {deleteTarget && (
        <Modal
          open
          onClose={closeDelete}
          title="Excluir empresa"
          size="sm"
          footer={
            <div className="modal-footer">
              {deleteMode === 'choose' && (
                <>
                  <button className="btn-outline" type="button" onClick={closeDelete}>Cancelar</button>
                  <div className="emp-delete-actions">
                    <button className="btn-action btn-action--enter" type="button" onClick={() => setDeleteMode('migrate')}>
                      Migrar documentos
                    </button>
                    <button className="btn-outline btn-outline--danger" type="button" onClick={() => setDeleteMode('destroy')}>
                      Excluir tudo
                    </button>
                  </div>
                </>
              )}
              {deleteMode === 'migrate' && (
                <>
                  <button className="btn-outline" type="button" onClick={() => setDeleteMode('choose')}>Voltar</button>
                  <button
                    className="btn-outline btn-outline--danger"
                    type="button"
                    onClick={handleDelete}
                    disabled={!migrateTargetId}
                  >
                    Migrar e excluir
                  </button>
                </>
              )}
              {deleteMode === 'destroy' && (
                <>
                  <button className="btn-outline" type="button" onClick={() => setDeleteMode('choose')}>Voltar</button>
                  <button className="btn-outline btn-outline--danger" type="button" onClick={handleDelete}>
                    Confirmar exclusão
                  </button>
                </>
              )}
            </div>
          }
        >
          {deleteMode === 'choose' && (
            <div className="emp-delete-body">
              <div className="emp-delete-warning">
                <span className="material-symbols-outlined emp-delete-warning__icon">warning</span>
                <div>
                  <p className="emp-delete-warning__title">Atenção: ação irreversível</p>
                  <p className="emp-delete-warning__text">
                    Ao excluir <strong>{deleteTarget.nome}</strong>, todos os documentos, mídias e informações vinculadas a esta empresa serão <strong>permanentemente excluídos e não poderão ser recuperados</strong>.
                  </p>
                </div>
              </div>
              <p className="emp-delete-hint">
                Deseja migrar os documentos para outra empresa antes de excluir, ou excluir tudo permanentemente?
              </p>
            </div>
          )}

          {deleteMode === 'migrate' && (
            <div className="emp-delete-body">
              <p className="emp-delete-text">
                Selecione a empresa de destino para onde os documentos de <strong>{deleteTarget.nome}</strong> serão migrados. Após a migração, a empresa será excluída.
              </p>
              <div className="filter-wrap emp-delete-select-wrap">
                <select
                  className="filter-select emp-form__select-full"
                  value={migrateTargetId}
                  onChange={e => setMigrateTargetId(e.target.value)}
                >
                  <option value="">Selecionar empresa de destino…</option>
                  {migrateOptions.map(e => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
              </div>
            </div>
          )}

          {deleteMode === 'destroy' && (
            <div className="emp-delete-body">
              <div className="emp-delete-warning emp-delete-warning--danger">
                <span className="material-symbols-outlined emp-delete-warning__icon">delete_forever</span>
                <div>
                  <p className="emp-delete-warning__title">Exclusão permanente</p>
                  <p className="emp-delete-warning__text">
                    Todos os documentos, mídias e informações de <strong>{deleteTarget.nome}</strong> serão excluídos permanentemente. Esta ação <strong>não pode ser desfeita</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
