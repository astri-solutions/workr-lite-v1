import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import '../admin/AdminPages.css';
import './MateriasPage.css';

type Status = 'publicado' | 'rascunho' | 'agendado';

interface Materia {
  id: string;
  titulo: string;
  pagina: string;
  status: Status;
  data: string;
  autor: string;
  ultimaEdicao: string;
  ultimoEditor: string;
}

const PAGINAS = ['Início', 'Resultados', 'Governança', 'Comunicados', 'Eventos', 'Press Release', 'Sobre'];

const INITIAL: Materia[] = [
  { id: 'a1', titulo: 'IMC reporta crescimento de 12% no EBITDA do 2T25', pagina: 'Resultados', status: 'publicado', data: '10/06/2026', autor: 'Carlos Souza', ultimaEdicao: '11/06/2026', ultimoEditor: 'Carlos Souza' },
  { id: 'a2', titulo: 'Calendário de eventos corporativos — 2º semestre 2026', pagina: 'Eventos', status: 'publicado', data: '01/06/2026', autor: 'Ana Lima', ultimaEdicao: '05/06/2026', ultimoEditor: 'Ana Lima' },
  { id: 'a3', titulo: 'Convocação: Assembleia Geral Ordinária 2026', pagina: 'Governança', status: 'agendado', data: '20/06/2026', autor: 'Carlos Souza', ultimaEdicao: '20/06/2026', ultimoEditor: 'Ana Lima' },
  { id: 'a4', titulo: 'Nota ao mercado: aquisição estratégica no segmento de fast food', pagina: 'Comunicados', status: 'rascunho', data: '12/06/2026', autor: 'Ana Lima', ultimaEdicao: '14/06/2026', ultimoEditor: 'Carlos Souza' },
];

const STATUS_LABEL: Record<Status, string> = { publicado: 'Publicado', rascunho: 'Rascunho', agendado: 'Agendado' };
const STATUS_BADGE: Record<Status, string> = { publicado: 'badge--success', rascunho: 'badge--gray', agendado: 'badge--warning' };

interface MateriaForm { titulo: string; pagina: string; status: Status; }
const EMPTY: MateriaForm = { titulo: '', pagina: PAGINAS[0], status: 'rascunho' };

export default function MateriasPage() {
  const navigate = useNavigate();
  const [materias, setMaterias] = useState<Materia[]>(INITIAL);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<Status | ''>('');
  const [filterPagina, setFilterPagina] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Materia | null>(null);
  const [form, setForm] = useState<MateriaForm>(EMPTY);

  const filtered = materias.filter(m => {
    if (search && !m.titulo.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && m.status !== filterStatus) return false;
    if (filterPagina && m.pagina !== filterPagina) return false;
    return true;
  });


  function openEdit(m: Materia) {
    setEditing(m);
    setForm({ titulo: m.titulo, pagina: m.pagina, status: m.status });
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditing(null); setForm(EMPTY); }

  function handleSave() {
    if (!form.titulo.trim()) return;
    const hoje = new Date().toLocaleDateString('pt-BR');
    if (editing) {
      setMaterias(prev => prev.map(m => m.id === editing.id
        ? { ...m, ...form, ultimaEdicao: hoje, ultimoEditor: 'Você' }
        : m));
    } else {
      const nova: Materia = {
        id: 'a' + Date.now(),
        titulo: form.titulo,
        pagina: form.pagina,
        status: form.status,
        data: hoje,
        autor: 'Você',
        ultimaEdicao: hoje,
        ultimoEditor: 'Você',
      };
      setMaterias(prev => [nova, ...prev]);
    }
    closeModal();
  }

  function handleDelete(id: string) {
    setMaterias(prev => prev.filter(m => m.id !== id));
  }

  return (
    <div className="page">
      <PageHeader
        title="Matérias"
        description="Publique comunicados, notas e artigos de Relações com Investidores."
        action={
          <button className="btn-primary" type="button" onClick={() => navigate('/portal/materias/nova')}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
            Nova matéria
          </button>
        }
      />

      <div className="mat-toolbar">
        <div className="mat-search-wrap">
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>search</span>
          <input className="mat-search" type="text" placeholder="Buscar matéria..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-wrap">
          <select className="filter-select" value={filterPagina} onChange={e => setFilterPagina(e.target.value)}>
            <option value="">Todas as páginas</option>
            {PAGINAS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
        </div>
        <div className="filter-wrap">
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value as Status | '')}>
            <option value="">Todos os status</option>
            <option value="publicado">Publicados</option>
            <option value="rascunho">Rascunhos</option>
            <option value="agendado">Agendados</option>
          </select>
          <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Página</th>
              <th>Status</th>
              <th>Data</th>
              <th>Autor</th>
              <th>Última edição</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="table-empty">Nenhuma matéria encontrada.</td></tr>
            ) : (
              filtered.map(m => (
                <tr key={m.id}>
                  <td className="table-cell--bold">{m.titulo}</td>
                  <td className="table-cell--muted">{m.pagina}</td>
                  <td><span className={`badge ${STATUS_BADGE[m.status]}`}>{STATUS_LABEL[m.status]}</span></td>
                  <td className="table-cell--muted">{m.data}</td>
                  <td className="table-cell--muted">{m.autor}</td>
                  <td>
                    <div className="mat-last-edit">
                      <span className="mat-last-edit__date">{m.ultimaEdicao}</span>
                      <span className="mat-last-edit__user">{m.ultimoEditor}</span>
                    </div>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-action btn-action--enter" type="button" onClick={() => openEdit(m)}>Editar</button>
                      <button className="btn-action btn-action--danger" type="button" onClick={() => handleDelete(m.id)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar matéria' : 'Nova matéria'}
        size="sm"
        footer={
          <div className="mat-modal-footer">
            <button className="mat-modal-cancel" type="button" onClick={closeModal}>Cancelar</button>
            <button className="btn-primary" type="button" onClick={handleSave} disabled={!form.titulo.trim()}>
              {editing ? 'Salvar' : 'Criar matéria'}
            </button>
          </div>
        }
      >
        <div className="mat-form">
          <label className="mat-form__label">
            Título
            <input className="mat-form__input" type="text" autoFocus value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              placeholder="Ex: IMC reporta crescimento no 2T25" />
          </label>
          <label className="mat-form__label">
            Página
            <select className="mat-form__input mat-form__select" value={form.pagina}
              onChange={e => setForm(f => ({ ...f, pagina: e.target.value }))}>
              {PAGINAS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="mat-form__label">
            Status
            <select className="mat-form__input mat-form__select" value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}>
              <option value="rascunho">Rascunho</option>
              <option value="publicado">Publicado</option>
              <option value="agendado">Agendado</option>
            </select>
          </label>
        </div>
      </Modal>
    </div>
  );
}
