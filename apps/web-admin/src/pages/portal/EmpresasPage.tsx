import { useState } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import Modal from '../../components/Modal';
import PORTAL_CONFIG from '../../portalConfig';
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

const INITIAL: Empresa[] = [
  { id: 'imc', nome: 'International Meal Company', tipo: 'EMPRESA', cnpj: '10.629.105/0001-68', cvmCodigo: '23574', autoCvm: true, importarDesde: '', ativo: true },
  { id: 'imc-fii', nome: 'IMC Recebíveis FII', tipo: 'FUNDO', cnpj: '37.412.300/0001-55', cvmCodigo: '', autoCvm: false, importarDesde: '', ativo: true },
  { id: 'imc-ce', nome: 'IMC Crédito Estruturado FII', tipo: 'FUNDO', cnpj: '44.891.220/0001-12', cvmCodigo: '', autoCvm: false, importarDesde: '', ativo: false },
];

const TIPO_OPTIONS: Tipo[] = ['EMPRESA', 'FUNDO', 'OUTRO'];
const TIPO_LABEL: Record<Tipo, string> = { EMPRESA: 'Empresa', FUNDO: 'Fundo', OUTRO: 'Outro' };

interface EmpForm { nome: string; tipo: Tipo; cnpj: string; cvmCodigo: string; autoCvm: boolean; importarDesde: string; }
const EMPTY_FORM: EmpForm = { nome: '', tipo: 'EMPRESA', cnpj: '', cvmCodigo: '', autoCvm: false, importarDesde: '' };


export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>(INITIAL);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [form, setForm] = useState<EmpForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Empresa | null>(null);

  const filtered = empresas.filter(e =>
    e.nome.toLowerCase().includes(search.toLowerCase()) ||
    e.cnpj.includes(search)
  );

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

  function handleToggle(emp: Empresa) {
    setEmpresas(prev => prev.map(e => e.id === emp.id ? { ...e, ativo: !e.ativo } : e));
  }

  function handleDelete(emp: Empresa) {
    setEmpresas(prev => prev.filter(e => e.id !== emp.id));
    setDeleteTarget(null);
  }

  const ativos = empresas.filter(e => e.ativo).length;
  const comAutoCvm = empresas.filter(e => e.autoCvm).length;

  return (
    <div className="page">
      <StickyPageHeader
        title="Empresas"
        description={<>Entidades e fundos de <strong>{PORTAL_CONFIG.name}</strong>.</>}
        action={
          <button className="btn-primary" type="button" onClick={openCreate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova empresa
          </button>
        }
      />

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

      <div className="emp-search-wrap">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          className="emp-search"
          type="text"
          placeholder="Buscar por nome ou CNPJ…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo</th>
              <th>CNPJ</th>
              <th>CVM</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="table-empty">Nenhuma entidade encontrada.</td></tr>
            ) : (
              filtered.map(emp => (
                <tr key={emp.id}>
                  <td className="table-cell--bold">{emp.nome}</td>
                  <td>
                    <span className={`badge ${emp.tipo === 'FUNDO' ? 'badge--gray' : 'badge--success'}`}>
                      {TIPO_LABEL[emp.tipo]}
                    </span>
                  </td>
                  <td className="table-cell--muted">{emp.cnpj || '—'}</td>
                  <td>
                    {emp.autoCvm ? (
                      <span className="badge badge--cvm">Auto CVM</span>
                    ) : (
                      <span className="table-cell--muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${emp.ativo ? 'badge--success' : 'badge--error'}`}>
                      {emp.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-action btn-action--enter" type="button" onClick={() => openEdit(emp)}>Editar</button>
                      <button className="btn-action btn-action--enter" type="button" onClick={() => handleToggle(emp)}>
                        {emp.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button className="btn-action btn-action--danger" type="button" onClick={() => setDeleteTarget(emp)}>Remover</button>
                    </div>
                  </td>
                </tr>
              ))
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

          <label className="emp-form__label">
            Importar desde (retroativo)
            <input
              className="emp-form__input"
              type="date"
              value={form.importarDesde}
              onChange={e => setForm(f => ({ ...f, importarDesde: e.target.value }))}
            />
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
        </div>
      </Modal>

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal
          open
          onClose={() => setDeleteTarget(null)}
          title="Remover empresa"
          size="sm"
          footer={
            <div className="modal-footer">
              <button className="btn-outline" type="button" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="btn-outline btn-outline--danger" type="button" onClick={() => handleDelete(deleteTarget)}>Remover</button>
            </div>
          }
        >
          <p className="emp-delete-text">
            Tem certeza que deseja remover <strong>{deleteTarget.nome}</strong>? Esta ação não pode ser desfeita e todos os documentos vinculados serão desassociados.
          </p>
        </Modal>
      )}
    </div>
  );
}
