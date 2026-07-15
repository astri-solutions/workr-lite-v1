import { useState, useMemo } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import SearchInput from '../../components/SearchInput';
import Modal from '../../components/Modal';
import { useSort } from '../../hooks/useSort';
import SortIcon from '../../components/SortIcon';
import { usePortalName } from '../../hooks/usePortalName';
import '../admin/AdminPages.css';
import './MailingPage.css';

export const MAILING_KEY = 'portal_mailing';

type OrigemType = 'formulario' | 'importacao' | 'manual';
type StatusType = 'ativo' | 'cancelado';

interface Contato {
  id: string;
  nome: string;
  email: string;
  origem: OrigemType;
  status: StatusType;
  inscritoEm: string; // ISO date
}

const ORIGEM_LABEL: Record<OrigemType, string> = {
  formulario: 'Formulário',
  importacao: 'Importação',
  manual: 'Manual',
};

const MOCK_CONTATOS: Contato[] = [
  { id: 'm001', nome: 'Ricardo Alves',    email: 'ricardo.alves@fundo.com.br',  origem: 'formulario', status: 'ativo',     inscritoEm: '2026-07-14' },
  { id: 'm002', nome: 'Beatriz Moura',    email: 'bmoura@gestora.com.br',       origem: 'formulario', status: 'ativo',     inscritoEm: '2026-07-12' },
  { id: 'm003', nome: 'Felipe Teixeira',  email: 'fteixeira@investfund.com',    origem: 'importacao', status: 'ativo',     inscritoEm: '2026-07-10' },
  { id: 'm004', nome: 'Carla Nunes',      email: 'cnunes@btg.com.br',           origem: 'importacao', status: 'ativo',     inscritoEm: '2026-07-08' },
  { id: 'm005', nome: 'André Fonseca',    email: 'afonseca@xp.com.br',          origem: 'manual',     status: 'ativo',     inscritoEm: '2026-07-05' },
  { id: 'm006', nome: 'Juliana Rocha',    email: 'juliana.rocha@itau.com.br',   origem: 'formulario', status: 'ativo',     inscritoEm: '2026-07-03' },
  { id: 'm007', nome: 'Marcelo Santos',   email: 'msantos@credit-suisse.com',   origem: 'importacao', status: 'cancelado', inscritoEm: '2026-06-28' },
  { id: 'm008', nome: 'Priscila Lima',    email: 'p.lima@icatu.com.br',         origem: 'formulario', status: 'ativo',     inscritoEm: '2026-06-25' },
  { id: 'm009', nome: 'Eduardo Campos',   email: 'ecampos@bradesco.com.br',     origem: 'manual',     status: 'ativo',     inscritoEm: '2026-06-20' },
  { id: 'm010', nome: 'Fernanda Araújo',  email: 'faraújo@santander.com.br',    origem: 'importacao', status: 'cancelado', inscritoEm: '2026-06-15' },
  { id: 'm011', nome: 'Gabriel Pinto',    email: 'gabriel.pinto@gauss.com.br',  origem: 'formulario', status: 'ativo',     inscritoEm: '2026-06-10' },
  { id: 'm012', nome: 'Vanessa Correia',  email: 'vcorreia@kinea.com.br',       origem: 'formulario', status: 'ativo',     inscritoEm: '2026-06-05' },
];

function loadContatos(): Contato[] {
  try {
    const raw = localStorage.getItem(MAILING_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fall through */ }
  return MOCK_CONTATOS;
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');
}

function initials(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export default function MailingPage() {
  const portalName = usePortalName();
  const [contatos, setContatos] = useState<Contato[]>(loadContatos);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOrigem, setFilterOrigem] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Contato | null>(null);
  const [addNome, setAddNome] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addError, setAddError] = useState('');

  const { sorted, col, dir, toggle } = useSort<Contato>(contatos, 'inscritoEm', 'desc');

  const filtered = useMemo(() => {
    return sorted.filter(c => {
      if (filterStatus && c.status !== filterStatus) return false;
      if (filterOrigem && c.origem !== filterOrigem) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.nome.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [sorted, search, filterStatus, filterOrigem]);

  const ativos = contatos.filter(c => c.status === 'ativo').length;

  function persist(next: Contato[]) {
    setContatos(next);
    localStorage.setItem(MAILING_KEY, JSON.stringify(next));
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (filtered.every(c => selected.has(c.id))) {
      setSelected(prev => { const n = new Set(prev); filtered.forEach(c => n.delete(c.id)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); filtered.forEach(c => n.add(c.id)); return n; });
    }
  }

  function handleRemoveSelected() {
    persist(contatos.filter(c => !selected.has(c.id)));
    setSelected(new Set());
  }

  function handleRemoveOne(c: Contato) {
    setRemoveTarget(c);
  }

  function confirmRemove() {
    if (!removeTarget) return;
    persist(contatos.filter(c => c.id !== removeTarget.id));
    setSelected(prev => { const n = new Set(prev); n.delete(removeTarget.id); return n; });
    setRemoveTarget(null);
  }

  function handleToggleStatus(id: string) {
    persist(contatos.map(c => c.id === id ? { ...c, status: c.status === 'ativo' ? 'cancelado' : 'ativo' } : c));
  }

  function handleAdd() {
    setAddError('');
    if (!addEmail.trim()) { setAddError('Email é obrigatório.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addEmail.trim())) { setAddError('Email inválido.'); return; }
    if (contatos.some(c => c.email.toLowerCase() === addEmail.toLowerCase().trim())) {
      setAddError('Este email já está na lista.'); return;
    }
    const novoContato: Contato = {
      id: `m${Date.now()}`,
      nome: addNome.trim() || addEmail.trim(),
      email: addEmail.trim().toLowerCase(),
      origem: 'manual',
      status: 'ativo',
      inscritoEm: new Date().toISOString().slice(0, 10),
    };
    persist([novoContato, ...contatos]);
    setAddNome('');
    setAddEmail('');
    setAddOpen(false);
  }

  const allSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id));
  const someSelected = selected.size > 0;

  return (
    <div className="page">
      <StickyPageHeader
        title="Mailing"
        description={<>Lista de contatos do mailing de <strong>{portalName}</strong>.</>}
      />

      <div className="mailing-stats">
        <div className="mailing-stat">
          <span className="mailing-stat__num">{contatos.length}</span>
          <span className="mailing-stat__label">Total de contatos</span>
        </div>
        <div className="mailing-stat">
          <span className="mailing-stat__num mailing-stat__num--green">{ativos}</span>
          <span className="mailing-stat__label">Ativos</span>
        </div>
        <div className="mailing-stat">
          <span className="mailing-stat__num mailing-stat__num--muted">{contatos.length - ativos}</span>
          <span className="mailing-stat__label">Cancelados</span>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar__filters">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome ou email…" />

          <div className="filter-wrap">
            <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Todos os status</option>
              <option value="ativo">Ativos</option>
              <option value="cancelado">Cancelados</option>
            </select>
            <svg className="filter-wrap__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
          </div>

          <div className="filter-wrap">
            <select className="filter-select" value={filterOrigem} onChange={e => setFilterOrigem(e.target.value)}>
              <option value="">Todas as origens</option>
              <option value="formulario">Formulário</option>
              <option value="importacao">Importação</option>
              <option value="manual">Manual</option>
            </select>
            <svg className="filter-wrap__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        </div>
        <div className="toolbar__actions">
          {someSelected && (
            <button className="btn-action btn-action--danger" onClick={handleRemoveSelected}>
              Remover selecionados ({selected.size})
            </button>
          )}
          <span className="toolbar__count">{filtered.length} contato{filtered.length !== 1 ? 's' : ''}</span>
          <button className="btn-primary" onClick={() => setAddOpen(true)}>+ Adicionar contato</button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Selecionar todos"
                />
              </th>
              <th className="th-sort" onClick={() => toggle('nome')}>
                <span className="th-sort-inner">Nome <SortIcon dir={col === 'nome' ? dir : null} /></span>
              </th>
              <th className="th-sort" onClick={() => toggle('email')}>
                <span className="th-sort-inner">Email <SortIcon dir={col === 'email' ? dir : null} /></span>
              </th>
              <th className="th-sort" onClick={() => toggle('origem')}>
                <span className="th-sort-inner">Origem <SortIcon dir={col === 'origem' ? dir : null} /></span>
              </th>
              <th className="th-sort" onClick={() => toggle('inscritoEm')}>
                <span className="th-sort-inner">Inscrito em <SortIcon dir={col === 'inscritoEm' ? dir : null} /></span>
              </th>
              <th className="th-sort" onClick={() => toggle('status')}>
                <span className="th-sort-inner">Status <SortIcon dir={col === 'status' ? dir : null} /></span>
              </th>
              <th style={{ width: 100 }} />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="log-empty">Nenhum contato encontrado para os filtros selecionados.</td>
              </tr>
            ) : filtered.map(c => (
              <tr key={c.id} className={selected.has(c.id) ? 'row--selected' : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    aria-label={`Selecionar ${c.nome}`}
                  />
                </td>
                <td>
                  <div className="mailing-contact">
                    <span className="mailing-contact__avatar">{initials(c.nome)}</span>
                    <span className="mailing-contact__name">{c.nome}</span>
                  </div>
                </td>
                <td className="mailing-email">{c.email}</td>
                <td>
                  <span className={`mailing-origem mailing-origem--${c.origem}`}>
                    {ORIGEM_LABEL[c.origem]}
                  </span>
                </td>
                <td className="mailing-date">{fmtDate(c.inscritoEm)}</td>
                <td>
                  <span className={`badge ${c.status === 'ativo' ? 'badge--success' : 'badge--gray'}`}>
                    {c.status === 'ativo' ? 'Ativo' : 'Cancelado'}
                  </span>
                </td>
                <td>
                  <div className="mailing-actions">
                    <button
                      className="mailing-btn-toggle"
                      title={c.status === 'ativo' ? 'Cancelar inscrição' : 'Reativar inscrição'}
                      onClick={() => handleToggleStatus(c.id)}
                    >
                      {c.status === 'ativo' ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </button>
                    <button
                      className="mailing-btn-remove"
                      title="Remover contato"
                      onClick={() => handleRemoveOne(c)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add contact modal */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setAddError(''); setAddNome(''); setAddEmail(''); }} title="Adicionar contato">
        <div className="mailing-add-form">
          <label className="mailing-add-label">
            Nome (opcional)
            <input
              className="mailing-add-input"
              type="text"
              value={addNome}
              onChange={e => setAddNome(e.target.value)}
              placeholder="Ex: João Silva"
              autoFocus
            />
          </label>
          <label className="mailing-add-label">
            Email <span className="mailing-add-required">*</span>
            <input
              className={`mailing-add-input${addError ? ' mailing-add-input--error' : ''}`}
              type="email"
              value={addEmail}
              onChange={e => { setAddEmail(e.target.value); setAddError(''); }}
              placeholder="Ex: joao@empresa.com.br"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            {addError && <span className="mailing-add-error">{addError}</span>}
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn-outline" onClick={() => { setAddOpen(false); setAddError(''); setAddNome(''); setAddEmail(''); }}>Cancelar</button>
          <button className="btn-primary" onClick={handleAdd}>Adicionar</button>
        </div>
      </Modal>

      {/* Remove confirm modal */}
      <Modal open={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remover contato">
        <p className="mailing-remove-msg">
          Tem certeza que deseja remover <strong>{removeTarget?.nome}</strong> ({removeTarget?.email}) da lista de mailing?
        </p>
        <div className="modal-footer">
          <button className="btn-outline" onClick={() => setRemoveTarget(null)}>Cancelar</button>
          <button className="btn-action btn-action--danger" onClick={confirmRemove}>Remover</button>
        </div>
      </Modal>
    </div>
  );
}
