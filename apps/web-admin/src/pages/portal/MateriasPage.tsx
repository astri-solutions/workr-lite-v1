import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSort } from '../../hooks/useSort';
import SortIcon from '../../components/SortIcon';
import StickyPageHeader from '../../components/StickyPageHeader';
import Modal from '../../components/Modal';
import FilterBar from '../../components/FilterBar';
import SearchInput from '../../components/SearchInput';
import { usePortalName } from '../../hooks/usePortalName';
import { Canal, DEFAULT_CANAIS, CANAIS_KEY } from '../../components/ChannelEditor';
import { loadMaterias, deleteMateria as deleteMateriaFromStore, type StoredMateria } from '../../hooks/useMateriasStore';
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

function loadCanais(): Canal[] {
  try {
    const raw = localStorage.getItem(CANAIS_KEY);
    return raw ? (JSON.parse(raw) as Canal[]) : DEFAULT_CANAIS;
  } catch {
    return DEFAULT_CANAIS;
  }
}

interface PaginaOption {
  value: string;
  label: string;
}

function buildPaginaOptions(canais: Canal[]): PaginaOption[] {
  const result: PaginaOption[] = [];
  for (const c of canais) {
    for (const s of c.children) {
      result.push({ value: s.label, label: `${c.label} → ${s.label}` });
      for (const ss of s.children ?? []) {
        result.push({ value: ss.label, label: `${c.label} → ${s.label} → ${ss.label}` });
      }
    }
  }
  return result;
}

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
    id: 'tabela' as const,
    label: 'Tabela',
    desc: 'Planilha com colunas e linhas editáveis, ideal para dados tabulares.',
    icon: 'table',
  },
  {
    id: 'formulario' as const,
    label: 'Formulário',
    desc: 'Página com formulário de contato configurável e e-mail de recebimento.',
    icon: 'assignment',
  },
];

function buildMatFilters(paginaOptions: PaginaOption[]) {
  return [
    {
      key: 'pagina',
      label: 'Página',
      options: [
        { value: '', label: 'Todas as páginas', shortLabel: 'Todas' },
        ...paginaOptions.map(p => ({ value: p.value, label: p.label })),
      ],
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: '', label: 'Todos os status', shortLabel: 'Todos' },
        { value: 'publicado', label: 'Publicados' },
        { value: 'rascunho', label: 'Rascunhos' },
        { value: 'agendado', label: 'Agendados' },
      ],
    },
  ];
}

function mergeWithStored(): Materia[] {
  const stored = loadMaterias();
  const storedIds = new Set(stored.map(m => m.id));
  const initial = INITIAL.filter(m => !storedIds.has(m.id));
  const fromStore: Materia[] = stored.map((m: StoredMateria) => ({
    id: m.id,
    titulo: m.titulo,
    pagina: m.pageLabel,
    status: m.status,
    data: m.data,
    autor: m.autor,
    ultimaEdicao: m.ultimaEdicao,
    ultimoEditor: m.ultimoEditor,
  }));
  return [...initial, ...fromStore];
}

export default function MateriasPage() {
  const portalName = usePortalName();
  const navigate = useNavigate();
  const [materias, setMaterias] = useState<Materia[]>(mergeWithStored);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ pagina: '', status: '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'show' | 'galeria' | 'tabela' | 'formulario'>('show');

  const matFilters = buildMatFilters(buildPaginaOptions(loadCanais()));

  const _filtered = materias.filter(m => {
    if (search && !m.titulo.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.status && m.status !== filters.status) return false;
    if (filters.pagina && m.pagina !== filters.pagina) return false;
    return true;
  });
  const { sorted: filtered, col, dir, toggle } = useSort(_filtered);

  function confirmDelete() {
    if (!deleteId) return;
    deleteMateriaFromStore(deleteId);
    setMaterias(prev => prev.filter(m => m.id !== deleteId));
    setDeleteId(null);
  }

  return (
    <div className="page">
      <StickyPageHeader
        title="Matérias"
        description={<>Comunicados e artigos do portal <strong>{portalName}</strong>.</>}
        action={
          <button className="btn-primary" type="button" onClick={() => { setSelectedType('show'); setTypePickerOpen(true); }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
            Nova matéria
          </button>
        }
      />

      <div className="toolbar">
        <div className="toolbar__filters">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar matéria..." />
          <FilterBar groups={matFilters} value={filters} onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th className={`th-sort${col === 'titulo' ? ' th-sort--active' : ''}`} onClick={() => toggle('titulo')}><span className="th-sort-inner">Título <SortIcon dir={col === 'titulo' ? dir : null} /></span></th>
              <th className={`th-sort${col === 'pagina' ? ' th-sort--active' : ''}`} onClick={() => toggle('pagina')}><span className="th-sort-inner">Página <SortIcon dir={col === 'pagina' ? dir : null} /></span></th>
              <th className={`th-sort${col === 'status' ? ' th-sort--active' : ''}`} onClick={() => toggle('status')}><span className="th-sort-inner">Status <SortIcon dir={col === 'status' ? dir : null} /></span></th>
              <th className={`th-sort${col === 'data' ? ' th-sort--active' : ''}`} onClick={() => toggle('data')}><span className="th-sort-inner">Publicação <SortIcon dir={col === 'data' ? dir : null} /></span></th>
              <th className={`th-sort${col === 'autor' ? ' th-sort--active' : ''}`} onClick={() => toggle('autor')}><span className="th-sort-inner">Autor <SortIcon dir={col === 'autor' ? dir : null} /></span></th>
              <th className={`th-sort${col === 'ultimaEdicao' ? ' th-sort--active' : ''}`} onClick={() => toggle('ultimaEdicao')}><span className="th-sort-inner">Editado em <SortIcon dir={col === 'ultimaEdicao' ? dir : null} /></span></th>
              <th className={`th-sort${col === 'ultimoEditor' ? ' th-sort--active' : ''}`} onClick={() => toggle('ultimoEditor')}><span className="th-sort-inner">Editor <SortIcon dir={col === 'ultimoEditor' ? dir : null} /></span></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="table-empty">Nenhuma matéria encontrada.</td></tr>
            ) : (
              filtered.map(m => (
                <tr key={m.id}>
                  <td className="table-cell--bold mat-cell-titulo" data-label="Título">{m.titulo}</td>
                  <td className="table-cell--muted" data-label="Página">{m.pagina}</td>
                  <td data-label="Status"><span className={`badge ${STATUS_BADGE[m.status]}`}>{STATUS_LABEL[m.status]}</span></td>
                  <td className="table-cell--muted" data-label="Publicação">{m.data}</td>
                  <td className="table-cell--muted" data-label="Autor">{m.autor}</td>
                  <td className="table-cell--muted" data-label="Editado em">{m.ultimaEdicao}</td>
                  <td className="table-cell--muted" data-label="Editor">{m.ultimoEditor}</td>
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
        title="Nova matéria"
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
