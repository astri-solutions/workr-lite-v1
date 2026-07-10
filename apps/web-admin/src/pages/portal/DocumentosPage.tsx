import { useState, useRef } from 'react';
import { useSort } from '../../hooks/useSort';
import SortIcon from '../../components/SortIcon';
import Modal from '../../components/Modal';
import LangTabs from '../../components/LangTabs';
import StickyPageHeader from '../../components/StickyPageHeader';
import FileDropzone from '../../components/FileDropzone';
import FilterBar from '../../components/FilterBar';
import SearchInput from '../../components/SearchInput';
import PORTAL_CONFIG, { LocaleCode } from '../../portalConfig';
import { usePortalName } from '../../hooks/usePortalName';
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
  entityId: string;
  nome: string;
  tipo: string;
  status: DocStatus;
  dataPub: string;
  pagina: string;
  idiomas: string[];
  tags: string[];
  publicadoPor: string;
  ultimaEdicao: string;
  ultimoEditor: string;
  fromCvm?: boolean;
  externalLink?: string;
}

const MOCK_DOCS: DocRow[] = [
  { id: 1, entityId: 'imc', nome: 'Fato Relevante — Aquisição de Controlada', tipo: 'Fatos Relevantes', status: 'Publicado', dataPub: '23/03/2026', pagina: 'Fatos Relevantes', idiomas: ['PT', 'EN', 'ES'], tags: ['CVM', '2 canais'], publicadoPor: 'CVM', ultimaEdicao: '23/03/2026', ultimoEditor: 'MA', fromCvm: true },
  { id: 2, entityId: 'imc', nome: 'Fato Relevante — Reorganização Societária', tipo: 'Fatos Relevantes', status: 'Publicado', dataPub: '10/02/2026', pagina: 'Fatos Relevantes', idiomas: ['PT', 'EN', 'ES'], tags: ['CVM'], publicadoPor: 'CVM', ultimaEdicao: '10/02/2026', ultimoEditor: 'CT', fromCvm: true },
  { id: 3, entityId: 'imc', nome: 'Comunicado ao Mercado — Esclarecimento sobre Notícia', tipo: 'Comunicados ao Mercado', status: 'Publicado', dataPub: '05/03/2026', pagina: 'Comunicados ao Mercado', idiomas: ['PT', 'EN', 'ES'], tags: ['CVM'], publicadoPor: 'CVM', ultimaEdicao: '05/03/2026', ultimoEditor: 'DS', fromCvm: true },
  { id: 4, entityId: 'imc', nome: 'Aviso aos Acionistas — Pagamento de Dividendos', tipo: 'Avisos aos Acionistas', status: 'Publicado', dataPub: '18/02/2026', pagina: 'Avisos aos Acionistas', idiomas: ['PT', 'EN', 'ES'], tags: ['CVM'], publicadoPor: 'CVM', ultimaEdicao: '18/02/2026', ultimoEditor: 'CT', fromCvm: true },
  { id: 5, entityId: 'imc', nome: 'Estatuto Social Consolidado', tipo: 'Documentos Societários', status: 'Publicado', dataPub: '30/04/2026', pagina: 'Documentos Societários', idiomas: ['PT', 'EN', 'ES'], tags: [], publicadoPor: 'CT', ultimaEdicao: '30/04/2026', ultimoEditor: 'DS' },
  { id: 6, entityId: 'imc', nome: 'Política de Negociação de Valores Mobiliários', tipo: 'Documentos Societários', status: 'Rascunho', dataPub: '30/04/2026', pagina: '—', idiomas: ['PT', 'EN', 'ES'], tags: [], publicadoPor: 'DS', ultimaEdicao: '30/04/2026', ultimoEditor: 'DS' },
  { id: 7, entityId: 'imc', nome: 'Relatório Anual 2024', tipo: 'Relatórios', status: 'Publicado', dataPub: '15/04/2026', pagina: 'Relatórios', idiomas: ['PT', 'EN'], tags: [], publicadoPor: 'MA', ultimaEdicao: '15/04/2026', ultimoEditor: 'MA' },
  { id: 8, entityId: 'imc', nome: 'Release de Resultados 4T24', tipo: 'Relatórios', status: 'Publicado', dataPub: '12/03/2026', pagina: 'Relatórios', idiomas: ['PT', 'EN'], tags: [], publicadoPor: 'CT', ultimaEdicao: '14/03/2026', ultimoEditor: 'MA' },
  { id: 11, entityId: 'imc', nome: 'Formulário de Referência 2025', tipo: 'Documentos Societários', status: 'Publicado', dataPub: '20/04/2026', pagina: 'Documentos Societários', idiomas: ['PT'], tags: [], publicadoPor: 'MA', ultimaEdicao: '20/04/2026', ultimoEditor: 'MA', externalLink: 'https://www.rad.cvm.gov.br/ENET/frmExibirArquivoIPEExterno.aspx' },
  { id: 9, entityId: 'imc-fii', nome: 'Apresentação para Investidores 1T25', tipo: 'Apresentações', status: 'Rascunho', dataPub: '28/04/2026', pagina: '—', idiomas: ['PT', 'EN'], tags: [], publicadoPor: 'DS', ultimaEdicao: '28/04/2026', ultimoEditor: 'CT' },
  { id: 10, entityId: 'imc-fii', nome: 'ITR 1T25', tipo: 'Informações Periódicas', status: 'Publicado', dataPub: '14/05/2026', pagina: 'Informações Periódicas', idiomas: ['PT'], tags: ['CVM'], publicadoPor: 'CVM', ultimaEdicao: '14/05/2026', ultimoEditor: 'MA', fromCvm: true },
];

// Pages that accept document uploads (list / list-group types)
// subGroups: pages that have internal content divisions
const LIST_PAGES = [
  { id: 'composicao', label: 'Composição Acionária', group: 'Governança', subGroups: [] as string[] },
  { id: 'atas', label: 'Atas e Assembleias', group: 'Governança', subGroups: ['AGO', 'AGE', 'RCA', 'Assembleias Especiais'] },
  { id: 'docs-cvm', label: 'Documentos CVM', group: 'Governança', subGroups: ['Fatos Relevantes', 'Comunicados ao Mercado', 'Avisos aos Acionistas', 'Documentos Societários', 'Informações Periódicas'] },
  { id: 'resultados', label: 'Resultados', group: 'Investidores', subGroups: [] as string[] },
  { id: 'calendario', label: 'Calendário de Eventos', group: 'Investidores', subGroups: [] as string[] },
  { id: 'ratings', label: 'Ratings', group: 'Investidores', subGroups: [] as string[] },
];


interface DocForm {
  entityId: string;
  titulo: string;
  allPages: boolean;
  paginaIds: string[];
  subGroupIds: Record<string, string[]>; // pageId → selected subGroup ids
  idiomas: string[];
  scheduleEnabled: boolean;
  scheduleDate: string;
  scheduleTime: string;
  file: File | null;
  isExternalLink: boolean;
  externalUrl: string;
}

function emptyDocForm(entityId = ''): DocForm {
  return {
    entityId,
    titulo: '', allPages: false, paginaIds: [], subGroupIds: {},
    idiomas: ['PT'], scheduleEnabled: false, scheduleDate: '', scheduleTime: '',
    file: null, isExternalLink: false, externalUrl: '',
  };
}

export default function DocumentosPage() {
  const portalName = usePortalName();
  const [activeEntity, setActiveEntity] = useState(ENTITIES[0].id);
  const [search, setSearch] = useState('');
  const [docFilters, setDocFilters] = useState<Record<string, string>>({ tipo: '', ano: '', status: '' });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [docs, setDocs] = useState<DocRow[]>(MOCK_DOCS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<DocForm>(emptyDocForm());
  const [dragActive, setDragActive] = useState(false);
  const [docLocale, setDocLocale] = useState<LocaleCode>(PORTAL_CONFIG.languages[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [replaceDoc, setReplaceDoc] = useState<DocRow | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [ptOnly, setPtOnly] = useState(false);

  function patchForm<K extends keyof DocForm>(key: K, val: DocForm[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function handleFile(file: File) { patchForm('file', file); }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function openDrawer() { setForm(emptyDocForm(activeEntity)); setDocLocale(PORTAL_CONFIG.languages[0]); setPtOnly(false); setDrawerOpen(true); }
  function closeDrawer() { setDrawerOpen(false); }

  function handleSave(asDraft: boolean) {
    if (!form.titulo.trim()) return;
    const paginaLabel = form.paginaIds.length === 0
      ? '—'
      : form.paginaIds.map(id => LIST_PAGES.find(p => p.id === id)?.label ?? id).join(', ');
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const newDoc: DocRow = {
      id: Date.now(),
      entityId: form.entityId || activeEntity,
      nome: form.titulo,
      tipo: 'Documento',
      status: asDraft ? 'Rascunho' : 'Publicado',
      dataPub: asDraft ? '—' : dateStr,
      pagina: paginaLabel,
      idiomas: form.idiomas,
      tags: [],
      publicadoPor: 'MA',
      ultimaEdicao: dateStr,
      ultimoEditor: 'MA',
      externalLink: form.isExternalLink ? form.externalUrl : undefined,
    };
    setDocs(prev => [newDoc, ...prev]);
    closeDrawer();
  }

  const _filtered = docs.filter((d) => {
    if (d.entityId !== activeEntity) return false;
    if (search && !d.nome.toLowerCase().includes(search.toLowerCase())) return false;
    if (docFilters.tipo && d.tipo !== docFilters.tipo) return false;
    if (docFilters.ano && !d.dataPub.includes(docFilters.ano)) return false;
    if (docFilters.status && d.status !== docFilters.status) return false;
    return true;
  });
  const { sorted: filtered, col, dir, toggle } = useSort(_filtered);

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

  const DOC_FILTERS = [
    {
      key: 'tipo',
      label: 'Tipo',
      options: [
        { value: '', label: 'Todos os tipos', shortLabel: 'Todos' },
        ...tipoOptions.map(t => ({ value: t, label: t })),
      ],
    },
    {
      key: 'ano',
      label: 'Ano',
      options: [
        { value: '', label: 'Todos os anos', shortLabel: 'Todos' },
        { value: '2026', label: '2026' },
        { value: '2025', label: '2025' },
        { value: '2024', label: '2024' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: '', label: 'Todos os status', shortLabel: 'Todos' },
        { value: 'Publicado', label: 'Publicado' },
        { value: 'Rascunho', label: 'Rascunho' },
      ],
    },
  ];

  function handleDocFilter(key: string, value: string) {
    setDocFilters(f => ({ ...f, [key]: value }));
  }

  return (
    <div className="page docs-page">
      <StickyPageHeader
        title="Documentos"
        description={<>Documentos publicados no portal <strong>{portalName}</strong>.</>}
        action={
          <button type="button" className="btn-primary" onClick={openDrawer}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
            Novo documento
          </button>
        }
      />

      {/* Entity tabmenu */}
      {ENTITIES.length > 1 && (
        <>
          <div className="cdr-entities">
            {ENTITIES.map(e => (
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
          <div className="cdr-entity-mobile">
            <div className="filter-wrap">
              <select
                className="filter-select"
                value={activeEntity}
                onChange={ev => { setActiveEntity(ev.target.value); setSelected(new Set()); }}
              >
                {ENTITIES.map(e => (
                  <option key={e.id} value={e.id}>{e.name} — {e.tipo}</option>
                ))}
              </select>
              <svg className="filter-wrap__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
          </div>
        </>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar__filters">
          <SearchInput value={search} onChange={setSearch} placeholder="Pesquisar por título..." />
          <FilterBar groups={DOC_FILTERS} value={docFilters} onChange={handleDocFilter} />
        </div>
        <div className="toolbar__actions">
          <button type="button" className="btn-toolbar">Despublicar</button>
          <button type="button" className="btn-toolbar btn-toolbar--success">Publicar</button>
          <button
            type="button"
            className="btn-toolbar btn-toolbar--danger"
            disabled={selected.size === 0}
            onClick={() => setDeleteModalOpen(true)}
          >
            Excluir
          </button>
          <span className="toolbar__count">
            {selected.size > 0 ? `${selected.size} de ` : ''}{filtered.length} doc{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper table-wrapper--responsive">
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
              <th className={`th-sort${col === 'status' ? ' th-sort--active' : ''}`} onClick={() => toggle('status')}><span className="th-sort-inner">Status <SortIcon dir={col === 'status' ? dir : null} /></span></th>
              <th className={`th-sort${col === 'nome' ? ' th-sort--active' : ''}`} onClick={() => toggle('nome')}><span className="th-sort-inner">Nome <SortIcon dir={col === 'nome' ? dir : null} /></span></th>
              <th className={`th-sort docs-col-pub${col === 'dataPub' ? ' th-sort--active' : ''}`} onClick={() => toggle('dataPub')}><span className="th-sort-inner">Publicação <SortIcon dir={col === 'dataPub' ? dir : null} /></span></th>
              <th className={`th-sort${col === 'pagina' ? ' th-sort--active' : ''}`} onClick={() => toggle('pagina')}><span className="th-sort-inner">Página <SortIcon dir={col === 'pagina' ? dir : null} /></span></th>
              <th className={`th-sort docs-col-center${col === 'publicadoPor' ? ' th-sort--active' : ''}`} onClick={() => toggle('publicadoPor')}><span className="th-sort-inner">Publicado por <SortIcon dir={col === 'publicadoPor' ? dir : null} /></span></th>
              <th className={`th-sort${col === 'ultimaEdicao' ? ' th-sort--active' : ''}`} onClick={() => toggle('ultimaEdicao')}><span className="th-sort-inner">Última edição <SortIcon dir={col === 'ultimaEdicao' ? dir : null} /></span></th>
              <th className={`th-sort docs-col-center${col === 'ultimoEditor' ? ' th-sort--active' : ''}`} onClick={() => toggle('ultimoEditor')}><span className="th-sort-inner">Editado por <SortIcon dir={col === 'ultimoEditor' ? dir : null} /></span></th>
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
                    <div className="docs-nome-badges">
                      {doc.idiomas.map(lang => (
                        <span key={lang} className="docs-badge docs-badge--lang">{lang}</span>
                      ))}
                    </div>
                  </td>
                  <td className="table-cell--muted">{doc.dataPub}</td>
                  <td className="table-cell--muted">
                    <span className="docs-pagina-cell">
                      {doc.pagina}
                      {doc.externalLink && (
                        <span className="docs-ext-badge" title={doc.externalLink}>
                          <span className="material-symbols-outlined docs-ext-badge__icon">open_in_new</span>
                          Link externo
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="docs-col-center">
                    <div className={`docs-avatar${doc.fromCvm ? ' docs-avatar--cvm' : ''}`} title={doc.fromCvm ? 'Auto CVM' : doc.publicadoPor}>{doc.publicadoPor}</div>
                  </td>
                  <td className="table-cell--muted">{doc.ultimaEdicao}</td>
                  <td className="docs-col-center">
                    <div className="docs-avatar" title={doc.ultimoEditor}>{doc.ultimoEditor}</div>
                  </td>
                  <td>
                    <button type="button" className="btn-action btn-action--enter" onClick={() => { setReplaceDoc(doc); setReplaceFile(null); }}>Editar</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="rcard-list">
        {filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)', padding: 'var(--space-6) 0' }}>
            Nenhum documento encontrado.
          </p>
        ) : (
          filtered.map((doc) => (
            <div key={doc.id} className="rcard">
              <div className="rcard__stripe" style={{ background: doc.status === 'Publicado' ? 'var(--color-primary-400)' : 'var(--color-gray-300)' }} />
              <div className="rcard__inner">
                <div className="rcard__body">
                  <div className="docs-rcard__check">
                    <input type="checkbox" checked={selected.has(doc.id)} onChange={() => toggleSelect(doc.id)} />
                    <span className={`badge ${doc.status === 'Publicado' ? 'badge--success' : 'badge--warning'}`}>{doc.status}</span>
                  </div>
                  <span className="rcard__title" style={{ padding: '0 var(--space-4)' }}>{doc.nome}</span>
                  <div className="docs-nome-badges" style={{ padding: '0 var(--space-4)' }}>
                    {doc.idiomas.map(lang => (
                      <span key={lang} className="docs-badge docs-badge--lang">{lang}</span>
                    ))}
                  </div>
                </div>
                <div className="docs-rcard__rows">
                  <div className="docs-rcard__row">
                    <span className="docs-rcard__label">Publicação</span>
                    <span className="docs-rcard__value">{doc.dataPub}</span>
                  </div>
                  <div className="docs-rcard__row">
                    <span className="docs-rcard__label">Página</span>
                    <span className="docs-rcard__value docs-pagina-cell">
                      {doc.pagina}
                      {doc.externalLink && (
                        <span className="docs-ext-badge" title={doc.externalLink}>
                          <span className="material-symbols-outlined docs-ext-badge__icon">open_in_new</span>
                          Link externo
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="docs-rcard__row">
                    <span className="docs-rcard__label">Publicado por</span>
                    <span className="docs-rcard__value">
                      <div className={`docs-avatar${doc.fromCvm ? ' docs-avatar--cvm' : ''}`} title={doc.fromCvm ? 'Auto CVM' : doc.publicadoPor}>{doc.publicadoPor}</div>
                    </span>
                  </div>
                  <div className="docs-rcard__row">
                    <span className="docs-rcard__label">Última edição</span>
                    <span className="docs-rcard__value">{doc.ultimaEdicao}</span>
                  </div>
                  <div className="docs-rcard__row">
                    <span className="docs-rcard__label">Editado por</span>
                    <span className="docs-rcard__value">
                      <div className="docs-avatar" title={doc.ultimoEditor}>{doc.ultimoEditor}</div>
                    </span>
                  </div>
                </div>
                <div className="rcard__footer">
                  <button type="button" className="btn-action btn-action--enter" onClick={() => { setReplaceDoc(doc); setReplaceFile(null); }}>Editar</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Replace file modal ── */}
      <Modal
        open={!!replaceDoc}
        onClose={() => setReplaceDoc(null)}
        title="Substituir arquivo"
        size="sm"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={() => setReplaceDoc(null)}>Cancelar</button>
            <button
              type="button"
              className="btn-primary"
              disabled={!replaceFile}
              onClick={() => {
                setDocs(prev => prev.map(d => d.id === replaceDoc!.id ? { ...d, ultimaEdicao: new Date().toLocaleDateString('pt-BR'), ultimoEditor: 'MA' } : d));
                setReplaceDoc(null);
              }}
            >
              Salvar alterações
            </button>
          </div>
        }
      >
        <div className="doc-field" style={{ marginBottom: 'var(--space-4)' }}>
          <label className="doc-field__label">Alterar título</label>
          <input className="doc-field__input" type="text" defaultValue={replaceDoc?.nome ?? ''} />
        </div>
        <FileDropzone
          file={replaceFile}
          onChange={setReplaceFile}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          hint="PDF, Word, Excel, PowerPoint"
        />
      </Modal>

      {/* ── New document modal ── */}
      <Modal
        open={drawerOpen}
        onClose={closeDrawer}
        title="Novo documento"
        size="md"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={closeDrawer}>Cancelar</button>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button type="button" className="btn-outline" onClick={() => handleSave(true)}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>draft</span>
                Salvar rascunho
              </button>
              <button type="button" className="btn-primary" onClick={() => handleSave(false)}
                disabled={!form.titulo.trim() || (!form.allPages && form.paginaIds.length === 0)}>
                Publicar
              </button>
            </div>
          </div>
        }
      >
        <div className="doc-modal-body">
          {/* Active entity badge */}
          {(() => {
            const ent = ENTITIES.find(e => e.id === (form.entityId || activeEntity));
            return ent ? (
              <div className="doc-entity-badge">
                <span className="doc-entity-badge__tipo">{ent.tipo}</span>
                <span className="doc-entity-badge__name">{ent.name}</span>
              </div>
            ) : null;
          })()}

          {/* Language tabs */}
          {!ptOnly && PORTAL_CONFIG.languages.length > 1 && (
            <LangTabs active={docLocale} onChange={setDocLocale} />
          )}

          {/* Apenas Português switch */}
          {PORTAL_CONFIG.languages.length > 1 && (docLocale === PORTAL_CONFIG.languages[0] || ptOnly) && (
            <label className="doc-pt-only-row">
              <span className="doc-pt-only-label">
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>translate</span>
                Apenas Português
                <span className="doc-pt-only-hint">O mesmo arquivo será exibido em todos os idiomas</span>
              </span>
              <button
                type="button"
                className={`cdr2-toggle${ptOnly ? ' cdr2-toggle--on' : ''}`}
                onClick={() => { setPtOnly(v => !v); setDocLocale(PORTAL_CONFIG.languages[0]); }}
                aria-pressed={ptOnly}
              >
                <span className="cdr2-toggle__knob" />
              </button>
            </label>
          )}

          {/* Título */}
          <div className="doc-field">
            <label className="doc-field__label">Título *</label>
            <input className="doc-field__input" type="text" placeholder="Nome do documento"
              key={docLocale}
              value={form.titulo} onChange={e => patchForm('titulo', e.target.value)} autoFocus />
          </div>

          {/* File / External link toggle */}
          <div className="doc-source-toggle">
            <button
              type="button"
              className={`doc-source-toggle__btn${!form.isExternalLink ? ' doc-source-toggle__btn--active' : ''}`}
              onClick={() => patchForm('isExternalLink', false)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>upload_file</span>
              Arquivo
            </button>
            <button
              type="button"
              className={`doc-source-toggle__btn${form.isExternalLink ? ' doc-source-toggle__btn--active' : ''}`}
              onClick={() => patchForm('isExternalLink', true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>open_in_new</span>
              Link externo
            </button>
          </div>

          {form.isExternalLink ? (
            <div className="doc-field">
              <label className="doc-field__label">URL do documento *</label>
              <input
                className="doc-field__input"
                type="url"
                placeholder="https://..."
                value={form.externalUrl}
                onChange={e => patchForm('externalUrl', e.target.value)}
              />
              <span className="doc-field__hint">O documento abrirá em nova aba ao ser acessado no portal.</span>
            </div>
          ) : (
            <div
              className={`doc-upload${dragActive ? ' doc-upload--active' : ''}${form.file ? ' doc-upload--filled' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => !form.file && fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              {form.file ? (
                <div className="doc-upload__file">
                  <span className="material-symbols-outlined doc-upload__file-icon">picture_as_pdf</span>
                  <div className="doc-upload__file-info">
                    <span className="doc-upload__file-name">{form.file.name}</span>
                    <span className="doc-upload__file-size">{(form.file.size / 1024).toFixed(0)} KB</span>
                  </div>
                  <button type="button" className="doc-upload__file-remove"
                    onClick={e => { e.stopPropagation(); patchForm('file', null); }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                  </button>
                </div>
              ) : (
                <>
                  <span className="material-symbols-outlined doc-upload__icon">upload_file</span>
                  <span className="doc-upload__label">Arraste ou clique para enviar</span>
                  <span className="doc-upload__hint">PDF, DOC, XLS, PPT, ZIP</span>
                </>
              )}
            </div>
          )}

          {/* Página */}
          <div className="up-form__section">
            <span className="up-form__section-label">Página de destino</span>
            <label className="up-form__check">
              <input
                type="checkbox"
                checked={form.allPages}
                onChange={e => patchForm('allPages', e.target.checked)}
              />
              Todas as páginas do portal
            </label>
            {!form.allPages && (
              <div className="up-form__emp-list">
                {LIST_PAGES.map(p => {
                  const checked = form.paginaIds.includes(p.id);
                  const subs = form.subGroupIds[p.id] ?? [];
                  return (
                    <div key={p.id}>
                      <label className="up-form__check">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            const ids = e.target.checked
                              ? [...form.paginaIds, p.id]
                              : form.paginaIds.filter(id => id !== p.id);
                            patchForm('paginaIds', ids);
                            if (!e.target.checked) {
                              patchForm('subGroupIds', { ...form.subGroupIds, [p.id]: [] });
                            }
                          }}
                        />
                        {p.label}
                      </label>
                      {checked && p.subGroups.length > 0 && (
                        <div className="doc-subgroup">
                          <label className="doc-subgroup__check">
                            <input
                              type="checkbox"
                              checked={subs.length === 0}
                              onChange={() => patchForm('subGroupIds', { ...form.subGroupIds, [p.id]: [] })}
                            />
                            Todos os grupos
                          </label>
                          {p.subGroups.map(sg => (
                            <label key={sg} className="doc-subgroup__check">
                              <input
                                type="checkbox"
                                checked={subs.includes(sg)}
                                onChange={e => {
                                  const next = e.target.checked ? [...subs, sg] : subs.filter(s => s !== sg);
                                  patchForm('subGroupIds', { ...form.subGroupIds, [p.id]: next });
                                }}
                              />
                              {sg}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Agendamento */}
          <div className="doc-field">
            <label className="doc-field__label">Agendamento</label>
            <label className="doc-schedule-toggle">
              <input type="checkbox" checked={form.scheduleEnabled}
                onChange={e => patchForm('scheduleEnabled', e.target.checked)} />
              <span>Publicar em data e hora específica</span>
            </label>
            {form.scheduleEnabled && (
              <div className="doc-schedule-row">
                <input className="doc-field__input" type="date"
                  value={form.scheduleDate} onChange={e => patchForm('scheduleDate', e.target.value)} />
                <input className="doc-field__input" type="time"
                  value={form.scheduleTime} onChange={e => patchForm('scheduleTime', e.target.value)} />
              </div>
            )}
          </div>

        </div>
      </Modal>

      {/* Delete modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Excluir documentos"
        size="sm"
        footer={
          <div className="modal-footer">
            <button
              type="button"
              className="btn-outline"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-outline btn-outline--danger"
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
