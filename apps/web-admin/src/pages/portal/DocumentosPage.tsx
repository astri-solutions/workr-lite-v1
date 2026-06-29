import { useState } from 'react';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import '../admin/AdminPages.css';
import './DocumentosPage.css';

interface Entity {
  id: string;
  name: string;
  tipo: 'EMPRESA' | 'FUNDO';
}

const ENTITIES: Entity[] = [
  { id: 'imc', name: 'International Meal Company', tipo: 'EMPRESA' },
  { id: 'imc-fii', name: 'IMC Recebíveis FII', tipo: 'FUNDO' },
  { id: 'imc-ce', name: 'IMC Crédito Estruturado FII', tipo: 'FUNDO' },
];

type DocStatus = 'Publicado' | 'Rascunho';

interface DocRow {
  id: number;
  nome: string;
  tipo: string;
  status: DocStatus;
  dataPub: string;
  pagina: string;
  idiomas: string[];
  tags: string[];
  publicadoPor: string;
  ultimaEdicao: string;
}

const MOCK_DOCS: DocRow[] = [
  {
    id: 1,
    nome: 'Fato Relevante — Aquisição de Controlada',
    tipo: 'Fatos Relevantes',
    status: 'Publicado',
    dataPub: '23/03/2026',
    pagina: 'Fatos Relevantes',
    idiomas: ['PT', 'EN', 'ES'],
    tags: ['CVM', '2 canais'],
    publicadoPor: 'MA',
    ultimaEdicao: '23/03/2026',
  },
  {
    id: 2,
    nome: 'Fato Relevante — Reorganização Societária',
    tipo: 'Fatos Relevantes',
    status: 'Publicado',
    dataPub: '10/02/2026',
    pagina: 'Fatos Relevantes',
    idiomas: ['PT', 'EN', 'ES'],
    tags: ['CVM'],
    publicadoPor: 'CT',
    ultimaEdicao: '10/02/2026',
  },
  {
    id: 3,
    nome: 'Comunicado ao Mercado — Esclarecimento sobre Notícia',
    tipo: 'Comunicados ao Mercado',
    status: 'Publicado',
    dataPub: '05/03/2026',
    pagina: 'Comunicados ao Mercado',
    idiomas: ['PT', 'EN', 'ES'],
    tags: ['CVM'],
    publicadoPor: 'DS',
    ultimaEdicao: '05/03/2026',
  },
  {
    id: 4,
    nome: 'Aviso aos Acionistas — Pagamento de Dividendos',
    tipo: 'Avisos aos Acionistas',
    status: 'Publicado',
    dataPub: '18/02/2026',
    pagina: 'Avisos aos Acionistas',
    idiomas: ['PT', 'EN', 'ES'],
    tags: ['CVM'],
    publicadoPor: 'MA',
    ultimaEdicao: '18/02/2026',
  },
  {
    id: 5,
    nome: 'Estatuto Social Consolidado',
    tipo: 'Documentos Societários',
    status: 'Publicado',
    dataPub: '30/04/2026',
    pagina: 'Documentos Societários',
    idiomas: ['PT', 'EN', 'ES'],
    tags: [],
    publicadoPor: 'CT',
    ultimaEdicao: '30/04/2026',
  },
  {
    id: 6,
    nome: 'Política de Negociação de Valores Mobiliários',
    tipo: 'Documentos Societários',
    status: 'Rascunho',
    dataPub: '30/04/2026',
    pagina: '—',
    idiomas: ['PT', 'EN', 'ES'],
    tags: [],
    publicadoPor: 'DS',
    ultimaEdicao: '30/04/2026',
  },
  {
    id: 7,
    nome: 'Relatório Anual 2024',
    tipo: 'Relatórios',
    status: 'Publicado',
    dataPub: '15/04/2026',
    pagina: 'Relatórios',
    idiomas: ['PT', 'EN'],
    tags: [],
    publicadoPor: 'MA',
    ultimaEdicao: '15/04/2026',
  },
  {
    id: 8,
    nome: 'Release de Resultados 4T24',
    tipo: 'Relatórios',
    status: 'Publicado',
    dataPub: '12/03/2026',
    pagina: 'Relatórios',
    idiomas: ['PT', 'EN'],
    tags: [],
    publicadoPor: 'CT',
    ultimaEdicao: '14/03/2026',
  },
  {
    id: 9,
    nome: 'Apresentação para Investidores 1T25',
    tipo: 'Apresentações',
    status: 'Rascunho',
    dataPub: '28/04/2026',
    pagina: '—',
    idiomas: ['PT', 'EN'],
    tags: [],
    publicadoPor: 'DS',
    ultimaEdicao: '28/04/2026',
  },
  {
    id: 10,
    nome: 'ITR 1T25',
    tipo: 'Informações Periódicas',
    status: 'Publicado',
    dataPub: '14/05/2026',
    pagina: 'Informações Periódicas',
    idiomas: ['PT'],
    tags: ['CVM'],
    publicadoPor: 'MA',
    ultimaEdicao: '14/05/2026',
  },
];

export default function DocumentosPage() {
  const [activeEntity, setActiveEntity] = useState('imc');
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterAno, setFilterAno] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [docs, setDocs] = useState<DocRow[]>(MOCK_DOCS);

  const filtered = docs.filter((d) => {
    if (search && !d.nome.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTipo && d.tipo !== filterTipo) return false;
    if (filterAno && !d.dataPub.includes(filterAno)) return false;
    if (filterStatus && d.status !== filterStatus) return false;
    return true;
  });

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((d) => d.id)));
    }
  }

  function handleDelete() {
    setDocs((prev) => prev.filter((d) => !selected.has(d.id)));
    setSelected(new Set());
    setDeleteModalOpen(false);
  }

  const tipoOptions = Array.from(new Set(docs.map((d) => d.tipo)));

  return (
    <div className="page docs-page">
      <PageHeader
        title="Documentos"
        description="Gerencie os documentos publicados no portal de Relações com Investidores."
        action={
          <button type="button" className="btn-primary">+ Novo documento</button>
        }
      />

      {/* Entity selector */}
      <div className="docs-entities">
        {ENTITIES.map((e) => (
          <button
            key={e.id}
            type="button"
            className={`cdr-entity-card${activeEntity === e.id ? ' cdr-entity-card--active' : ''}`}
            onClick={() => { setActiveEntity(e.id); setSelected(new Set()); }}
          >
            <span className="cdr-entity-card__name">{e.name}</span>
            <span className="cdr-entity-card__tipo">{e.tipo}</span>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="docs-filterbar">
        <div className="docs-filterbar__left">
          <div className="docs-search">
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>search</span>
            <input
              type="text"
              placeholder="Pesquisar por título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-wrap">
            <select
              className="filter-select"
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
            >
              <option value="">Tipo</option>
              {tipoOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
          </div>
          <div className="filter-wrap">
            <select
              className="filter-select"
              value={filterAno}
              onChange={(e) => setFilterAno(e.target.value)}
            >
              <option value="">Ano</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
            <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
          </div>
          <div className="filter-wrap">
            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Status</option>
              <option value="Publicado">Publicado</option>
              <option value="Rascunho">Rascunho</option>
            </select>
            <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
          </div>
        </div>

        <div className="docs-filterbar__right">
          <button type="button" className="docs-btn-outline">Despublicar</button>
          <button type="button" className="docs-btn-outline docs-btn-outline--success">Publicar</button>
          <button
            type="button"
            className="docs-btn-outline docs-btn-outline--danger"
            disabled={selected.size === 0}
            onClick={() => setDeleteModalOpen(true)}
          >
            Excluir
          </button>
          <span className="docs-count">
            {selected.size > 0 ? `${selected.size} de ` : ''}{filtered.length} doc{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleAll}
                />
              </th>
              <th>Status</th>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Data de publicação</th>
              <th>Página</th>
              <th>Publicado por</th>
              <th>Última edição</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="table-empty">Nenhum documento encontrado.</td>
              </tr>
            ) : (
              filtered.map((doc) => (
                <tr key={doc.id} className={selected.has(doc.id) ? 'docs-row--selected' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(doc.id)}
                      onChange={() => toggleSelect(doc.id)}
                    />
                  </td>
                  <td>
                    <span className={`badge ${doc.status === 'Publicado' ? 'badge--success' : 'badge--warning'}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="docs-cell-nome">
                    <span className="docs-nome-title">{doc.nome}</span>
                  </td>
                  <td className="docs-cell-tipo table-cell--muted">{doc.tipo}</td>
                  <td className="table-cell--muted">{doc.dataPub}</td>
                  <td className="table-cell--muted">{doc.pagina}</td>
                  <td>
                    <div className="docs-avatar" title={doc.publicadoPor}>{doc.publicadoPor}</div>
                  </td>
                  <td className="table-cell--muted">{doc.ultimaEdicao}</td>
                  <td>
                    <button type="button" className="btn-action btn-action--enter">Editar</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Excluir documentos"
        size="sm"
        footer={
          <div className="cdr-modal-footer">
            <button
              type="button"
              className="cdr-modal-footer__cancel"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="docs-btn-confirm-delete"
              onClick={handleDelete}
            >
              Excluir
            </button>
          </div>
        }
      >
        <p className="docs-delete-msg">
          Tem certeza que deseja excluir{' '}
          <strong>{selected.size} documento{selected.size !== 1 ? 's' : ''}</strong>? Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
}
