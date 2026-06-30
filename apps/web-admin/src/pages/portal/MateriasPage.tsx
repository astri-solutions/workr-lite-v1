import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StickyPageHeader from '../../components/StickyPageHeader';
import Modal from '../../components/Modal';
import PORTAL_CONFIG from '../../portalConfig';
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

const PAGE_TYPES = [
  {
    id: 'show' as const,
    label: 'Show',
    desc: 'Conteúdo rico com blocos de texto, imagens, colunas e galerias.',
    icon: 'article',
  },
  {
    id: 'galeria' as const,
    label: 'Galeria',
    desc: 'Cards com título, descrição, data, link e imagem opcional.',
    icon: 'grid_view',
  },
  {
    id: 'formulario' as const,
    label: 'Formulário',
    desc: 'Página com formulário de contato configurável e e-mail de recebimento.',
    icon: 'assignment',
  },
];

export default function MateriasPage() {
  const navigate = useNavigate();
  const [materias, setMaterias] = useState<Materia[]>(INITIAL);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<Status | ''>('');
  const [filterPagina, setFilterPagina] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'show' | 'galeria' | 'formulario'>('show');

  const filtered = materias.filter(m => {
    if (search && !m.titulo.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && m.status !== filterStatus) return false;
    if (filterPagina && m.pagina !== filterPagina) return false;
    return true;
  });

  function confirmDelete() {
    if (!deleteId) return;
    setMaterias(prev => prev.filter(m => m.id !== deleteId));
    setDeleteId(null);
  }

  return (
    <div className="page">
      <StickyPageHeader
        title="Matérias"
        description={<>Comunicados e artigos do portal <strong>{PORTAL_CONFIG.name}</strong>.</>}
        action={
          <button className="btn-primary" type="button" onClick={() => { setSelectedType('show'); setTypePickerOpen(true); }}>
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
              <th>Publicação</th>
              <th>Autor</th>
              <th>Editado em</th>
              <th>Editor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="table-empty">Nenhuma matéria encontrada.</td></tr>
            ) : (
              filtered.map(m => (
                <tr key={m.id}>
                  <td className="table-cell--bold">{m.titulo}</td>
                  <td className="table-cell--muted">{m.pagina}</td>
                  <td><span className={`badge ${STATUS_BADGE[m.status]}`}>{STATUS_LABEL[m.status]}</span></td>
                  <td className="table-cell--muted">{m.data}</td>
                  <td className="table-cell--muted">{m.autor}</td>
                  <td className="table-cell--muted">{m.ultimaEdicao}</td>
                  <td className="table-cell--muted">{m.ultimoEditor}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-action btn-action--enter" type="button"
                        onClick={() => navigate('/portal/materias/nova', { state: { editing: m } })}>
                        Editar
                      </button>
                      <button className="btn-action btn-action--danger" type="button" onClick={() => setDeleteId(m.id)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={typePickerOpen}
        onClose={() => setTypePickerOpen(false)}
        title="Tipo de página"
        description="Escolha como o conteúdo desta matéria será estruturado."
        size="sm"
        footer={
          <div className="modal-footer">
            <button className="btn-outline" type="button" onClick={() => setTypePickerOpen(false)}>Cancelar</button>
            <button className="btn-primary" type="button" onClick={() => {
              setTypePickerOpen(false);
              if (selectedType === 'formulario') {
                navigate('/portal/materias/formulario');
              } else {
                navigate('/portal/materias/nova', { state: { pageType: selectedType } });
              }
            }}>
              Continuar
            </button>
          </div>
        }
      >
        <div className="mat-type-picker">
          {PAGE_TYPES.map(t => (
            <button
              key={t.id}
              type="button"
              className={`mat-type-card${selectedType === t.id ? ' mat-type-card--active' : ''}`}
              onClick={() => setSelectedType(t.id)}
            >
              <span className="material-symbols-outlined mat-type-card__icon">{t.icon}</span>
              <div className="mat-type-card__info">
                <span className="mat-type-card__label">{t.label}</span>
                <span className="mat-type-card__desc">{t.desc}</span>
              </div>
              {selectedType === t.id && (
                <span className="mat-type-card__check">
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>check</span>
                </span>
              )}
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Excluir matéria"
        size="sm"
        footer={
          <div className="modal-footer">
            <button className="btn-outline" type="button" onClick={() => setDeleteId(null)}>Cancelar</button>
            <button className="btn-outline btn-outline--danger" type="button" onClick={confirmDelete}>Excluir</button>
          </div>
        }
      >
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', lineHeight: '1.5' }}>
          Tem certeza que deseja excluir esta matéria? Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
}
