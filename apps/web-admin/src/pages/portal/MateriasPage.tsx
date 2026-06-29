import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import '../admin/AdminPages.css';
import './MateriasPage.css';

type Status = 'publicado' | 'rascunho' | 'agendado';

interface Materia {
  id: string;
  titulo: string;
  categoria: string;
  status: Status;
  data: string;
  autor: string;
}

const CATEGORIAS = ['Resultados', 'Governança', 'Comunicados', 'Eventos', 'Press Release'];

const INITIAL: Materia[] = [
  { id: 'a1', titulo: 'IMC reporta crescimento de 12% no EBITDA do 2T25', categoria: 'Resultados', status: 'publicado', data: '10/06/2026', autor: 'Carlos Souza' },
  { id: 'a2', titulo: 'Calendário de eventos corporativos — 2º semestre 2026', categoria: 'Eventos', status: 'publicado', data: '01/06/2026', autor: 'Ana Lima' },
  { id: 'a3', titulo: 'Convocação: Assembleia Geral Ordinária 2026', categoria: 'Governança', status: 'agendado', data: '20/06/2026', autor: 'Carlos Souza' },
  { id: 'a4', titulo: 'Nota ao mercado: aquisição estratégica no segmento de fast food', categoria: 'Comunicados', status: 'rascunho', data: '12/06/2026', autor: 'Ana Lima' },
];

const STATUS_LABEL: Record<Status, string> = { publicado: 'Publicado', rascunho: 'Rascunho', agendado: 'Agendado' };
const STATUS_BADGE: Record<Status, string> = { publicado: 'badge--success', rascunho: 'badge--gray', agendado: 'badge--warning' };

interface MateriaForm { titulo: string; categoria: string; status: Status; }
const EMPTY: MateriaForm = { titulo: '', categoria: CATEGORIAS[0], status: 'rascunho' };

export default function MateriasPage() {
  const [materias, setMaterias] = useState<Materia[]>(INITIAL);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<Status | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Materia | null>(null);
  const [form, setForm] = useState<MateriaForm>(EMPTY);

  const filtered = materias.filter(m => {
    if (search && !m.titulo.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && m.status !== filterStatus) return false;
    return true;
  });

  function openCreate() { setEditing(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(m: Materia) {
    setEditing(m);
    setForm({ titulo: m.titulo, categoria: m.categoria, status: m.status });
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditing(null); setForm(EMPTY); }

  function handleSave() {
    if (!form.titulo.trim()) return;
    if (editing) {
      setMaterias(prev => prev.map(m => m.id === editing.id ? { ...m, ...form } : m));
    } else {
      const nova: Materia = {
        id: 'a' + Date.now(),
        titulo: form.titulo,
        categoria: form.categoria,
        status: form.status,
        data: new Date().toLocaleDateString('pt-BR'),
        autor: 'Você',
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
          <button className="btn-primary" type="button" onClick={openCreate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova matéria
          </button>
        }
      />

      <div className="mat-toolbar">
        <div className="mat-search-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input className="mat-search" type="text" placeholder="Buscar matéria..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="mat-filter" value={filterStatus} onChange={e => setFilterStatus(e.target.value as Status | '')}>
          <option value="">Todos os status</option>
          <option value="publicado">Publicados</option>
          <option value="rascunho">Rascunhos</option>
          <option value="agendado">Agendados</option>
        </select>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Categoria</th>
              <th>Status</th>
              <th>Data</th>
              <th>Autor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="table-empty">Nenhuma matéria encontrada.</td></tr>
            ) : (
              filtered.map(m => (
                <tr key={m.id}>
                  <td className="table-cell--bold">{m.titulo}</td>
                  <td className="table-cell--muted">{m.categoria}</td>
                  <td><span className={`badge ${STATUS_BADGE[m.status]}`}>{STATUS_LABEL[m.status]}</span></td>
                  <td className="table-cell--muted">{m.data}</td>
                  <td className="table-cell--muted">{m.autor}</td>
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
            Categoria
            <select className="mat-form__input mat-form__select" value={form.categoria}
              onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
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
