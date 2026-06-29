import { useState, useMemo } from 'react';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import '../admin/AdminPages.css';
import './CalendarioPage.css';

type EventStatus = 'publicado' | 'rascunho' | 'agendado';

interface CalEvent {
  id: string;
  titulo: string;
  data: string;       // ISO date YYYY-MM-DD
  hora: string;       // HH:MM
  local: string;
  tipo: string;
  status: EventStatus;
  exibirHome: boolean;
}

const TIPOS = ['Conference Call', 'Assembleia', 'Road Show', 'Divulgação de Resultados', 'Teleconferência', 'Outro'];

const STATUS_LABEL: Record<EventStatus, string> = { publicado: 'Publicado', rascunho: 'Rascunho', agendado: 'Agendado' };
const STATUS_BADGE: Record<EventStatus, string> = { publicado: 'badge--success', rascunho: 'badge--gray', agendado: 'badge--warning' };

const INITIAL: CalEvent[] = [
  // upcoming
  { id: 'e1', titulo: 'Divulgação de resultados do 2T26', data: '2026-08-04', hora: '08:00', local: 'São Paulo (remoto)', tipo: 'Divulgação de Resultados', status: 'publicado', exibirHome: true },
  { id: 'e2', titulo: 'Conference Call do 2T26', data: '2026-08-05', hora: '10:00', local: 'São Paulo (remoto)', tipo: 'Conference Call', status: 'publicado', exibirHome: true },
  { id: 'e3', titulo: 'Divulgação de resultados do 3T26', data: '2026-11-10', hora: '08:00', local: 'São Paulo (remoto)', tipo: 'Divulgação de Resultados', status: 'agendado', exibirHome: false },
  { id: 'e4', titulo: 'Assembleia Geral Ordinária 2027', data: '2027-04-15', hora: '14:00', local: 'São Paulo — Sede IMC', tipo: 'Assembleia', status: 'rascunho', exibirHome: false },
  // past
  { id: 'e5', titulo: 'Divulgação de resultados do 1T26', data: '2026-05-06', hora: '08:00', local: 'São Paulo (remoto)', tipo: 'Divulgação de Resultados', status: 'publicado', exibirHome: false },
  { id: 'e6', titulo: 'Conference Call do 1T26', data: '2026-05-07', hora: '10:00', local: 'São Paulo (remoto)', tipo: 'Conference Call', status: 'publicado', exibirHome: false },
  { id: 'e7', titulo: 'Assembleia Geral Ordinária 2026', data: '2026-04-10', hora: '14:00', local: 'São Paulo — Sede IMC', tipo: 'Assembleia', status: 'publicado', exibirHome: false },
  { id: 'e8', titulo: 'Road Show — Europa', data: '2026-03-18', hora: '09:00', local: 'Londres / Paris', tipo: 'Road Show', status: 'publicado', exibirHome: false },
];

function formatDate(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function emptyForm() {
  return { titulo: '', data: '', hora: '', local: '', tipo: '', status: 'rascunho' as EventStatus, exibirHome: false };
}

export default function CalendarioPage() {
  const [events, setEvents] = useState<CalEvent[]>(INITIAL);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<EventStatus | ''>('');
  const [filterTipo, setFilterTipo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [pastOpen, setPastOpen] = useState(false);

  const TODAY = '2026-06-29';

  const { upcoming, past } = useMemo(() => {
    const all = events.filter(e => {
      if (search && !e.titulo.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus && e.status !== filterStatus) return false;
      if (filterTipo && e.tipo !== filterTipo) return false;
      return true;
    });
    return {
      upcoming: all.filter(e => e.data >= TODAY).sort((a, b) => a.data.localeCompare(b.data)),
      past: all.filter(e => e.data < TODAY).sort((a, b) => b.data.localeCompare(a.data)),
    };
  }, [events, search, filterStatus, filterTipo]);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(e: CalEvent) {
    setEditingId(e.id);
    setForm({ titulo: e.titulo, data: e.data, hora: e.hora, local: e.local, tipo: e.tipo, status: e.status, exibirHome: e.exibirHome });
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.titulo.trim() || !form.data) return;
    if (editingId) {
      setEvents(prev => prev.map(e => e.id === editingId ? { ...e, ...form } : e));
    } else {
      setEvents(prev => [...prev, { id: Math.random().toString(36).slice(2), ...form }]);
    }
    setModalOpen(false);
  }

  function confirmDelete() {
    if (!deleteId) return;
    setEvents(prev => prev.filter(e => e.id !== deleteId));
    setDeleteId(null);
  }

  function toggleHome(id: string) {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, exibirHome: !e.exibirHome } : e));
  }

  const patch = (k: keyof typeof form, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="page">
      <PageHeader
        title="Calendário"
        description="Eventos corporativos publicados na página Calendário de Eventos."
        action={
          <button className="btn-primary" type="button" onClick={openNew}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
            Novo evento
          </button>
        }
      />

      {/* Toolbar */}
      <div className="cal-toolbar">
        <div className="mat-search-wrap">
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>search</span>
          <input className="mat-search" type="text" placeholder="Buscar evento..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-wrap">
          <select className="filter-select" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
            <option value="">Todos os tipos</option>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
        </div>
        <div className="filter-wrap">
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value as EventStatus | '')}>
            <option value="">Todos os status</option>
            <option value="publicado">Publicados</option>
            <option value="rascunho">Rascunhos</option>
            <option value="agendado">Agendados</option>
          </select>
          <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
        </div>
      </div>

      {/* Upcoming events table */}
      <p className="cal-section-heading">Próximos eventos</p>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Evento</th>
              <th>Data</th>
              <th>Hora</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Exibir na home</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {upcoming.length === 0 ? (
              <tr><td colSpan={7} className="table-empty">Nenhum evento encontrado.</td></tr>
            ) : upcoming.map(e => (
              <tr key={e.id}>
                <td className="table-cell--bold">{e.titulo}</td>
                <td className="table-cell--muted">{formatDate(e.data)}</td>
                <td className="table-cell--muted">{e.hora}</td>
                <td className="table-cell--muted">{e.tipo}</td>
                <td><span className={`badge ${STATUS_BADGE[e.status]}`}>{STATUS_LABEL[e.status]}</span></td>
                <td>
                  <button type="button" className={`cal-home-toggle${e.exibirHome ? ' cal-home-toggle--on' : ''}`}
                    onClick={() => toggleHome(e.id)} title={e.exibirHome ? 'Remover da home' : 'Exibir na home'}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>home</span>
                    {e.exibirHome ? 'Na home' : 'Oculto'}
                  </button>
                </td>
                <td>
                  <div className="table-actions">
                    <button className="btn-action btn-action--enter" type="button" onClick={() => openEdit(e)}>Editar</button>
                    <button className="btn-action btn-action--danger" type="button" onClick={() => setDeleteId(e.id)}>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Past events — collapsible */}
      <button type="button" className="cal-past-toggle" onClick={() => setPastOpen(o => !o)}>
        <span className="cal-past-toggle__label">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>history</span>
          Eventos realizados
          <span className="cal-past-toggle__count">{past.length}</span>
        </span>
        <span className="material-symbols-outlined cal-past-toggle__chevron" style={{ fontSize: '18px', transform: pastOpen ? 'rotate(180deg)' : 'none' }}>
          expand_more
        </span>
      </button>

      {pastOpen && (
        <div className="table-wrapper">
          <table className="data-table cal-past-table">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Data</th>
                <th>Hora</th>
                <th>Tipo</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {past.length === 0 ? (
                <tr><td colSpan={6} className="table-empty">Nenhum evento realizado.</td></tr>
              ) : past.map(e => (
                <tr key={e.id} className="cal-past-row">
                  <td className="table-cell--bold">{e.titulo}</td>
                  <td className="table-cell--muted">{formatDate(e.data)}</td>
                  <td className="table-cell--muted">{e.hora}</td>
                  <td className="table-cell--muted">{e.tipo}</td>
                  <td><span className={`badge ${STATUS_BADGE[e.status]}`}>{STATUS_LABEL[e.status]}</span></td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-action btn-action--enter" type="button" onClick={() => openEdit(e)}>Editar</button>
                      <button className="btn-action btn-action--danger" type="button" onClick={() => setDeleteId(e.id)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar evento' : 'Novo evento'}
        size="sm"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <button className="btn-action btn-action--secondary" type="button" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" type="button" onClick={handleSave}>Salvar</button>
          </div>
        }
      >
        <div className="mat-form">
          <label className="mat-form__label">
            Título do evento *
            <input className="mat-form__input" type="text" placeholder="Ex: Conference Call do 2T26" value={form.titulo} onChange={e => patch('titulo', e.target.value)} />
          </label>
          <div className="cal-form-row">
            <label className="mat-form__label">
              Data *
              <input className="mat-form__input" type="date" value={form.data} onChange={e => patch('data', e.target.value)} />
            </label>
            <label className="mat-form__label">
              Hora
              <input className="mat-form__input" type="time" value={form.hora} onChange={e => patch('hora', e.target.value)} />
            </label>
          </div>
          <label className="mat-form__label">
            Local / Formato
            <input className="mat-form__input" type="text" placeholder="Ex: São Paulo (remoto)" value={form.local} onChange={e => patch('local', e.target.value)} />
          </label>
          <label className="mat-form__label">
            Tipo
            <select className="mat-form__input mat-form__select" value={form.tipo} onChange={e => patch('tipo', e.target.value)}>
              <option value="">Selecionar...</option>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="mat-form__label">
            Status
            <select className="mat-form__input mat-form__select" value={form.status} onChange={e => patch('status', e.target.value as EventStatus)}>
              <option value="rascunho">Rascunho</option>
              <option value="publicado">Publicado</option>
              <option value="agendado">Agendado</option>
            </select>
          </label>
          <label className="cal-home-check">
            <input type="checkbox" checked={form.exibirHome} onChange={e => patch('exibirHome', e.target.checked)} />
            <span>Exibir na seção de próximos eventos da home</span>
          </label>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Excluir evento"
        size="sm"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <button className="btn-action btn-action--secondary" type="button" onClick={() => setDeleteId(null)}>Cancelar</button>
            <button className="btn-action btn-action--danger" type="button" onClick={confirmDelete}>Excluir</button>
          </div>
        }
      >
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', lineHeight: '1.5' }}>
          Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
}
