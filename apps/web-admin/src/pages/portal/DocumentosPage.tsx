import { useState, useRef } from 'react';
import Modal from '../../components/Modal';
import LangTabs from '../../components/LangTabs';
import StickyPageHeader from '../../components/StickyPageHeader';
import FileDropzone from '../../components/FileDropzone';
import FilterBar from '../../components/FilterBar';
import PORTAL_CONFIG, { LocaleCode } from '../../portalConfig';
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

// Pages that accept document uploads (list / list-group types)
const LIST_PAGES = [
  { id: 'composicao', label: 'Composição Acionária', group: 'Governança' },
  { id: 'atas', label: 'Atas e Assembleias', group: 'Governança' },
  { id: 'docs-cvm', label: 'Documentos CVM', group: 'Governança' },
  { id: 'resultados', label: 'Central de Resultados', group: 'Investidores' },
  { id: 'calendario', label: 'Calendário de Eventos', group: 'Investidores' },
  { id: 'ratings', label: 'Ratings', group: 'Investidores' },
];

const DOC_TIPOS = [
  'Fatos Relevantes',
  'Comunicados ao Mercado',
  'Avisos aos Acionistas',
  'Documentos Societários',
  'Relatórios',
  'Apresentações',
  'Informações Periódicas',
];


interface DocForm {
  titulo: string;
  data: string;
  tipo: string;
  paginaId: string;
  idiomas: string[];
  scheduleEnabled: boolean;
  scheduleDate: string;
  scheduleTime: string;
  file: File | null;
  rascunho: boolean;
}

function emptyDocForm(): DocForm {
  return {
    titulo: '', data: '', tipo: '', paginaId: '',
    idiomas: ['PT'], scheduleEnabled: false, scheduleDate: '', scheduleTime: '',
    file: null, rascunho: false,
  };
}

export default function DocumentosPage() {
  const [search, setSearch] = useState('');
  const [docFilters, setDocFilters] = useState<Record<string, string>>({ empresa: '', tipo: '', ano: '', status: '' });
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

  function openDrawer() { setForm(emptyDocForm()); setDocLocale(PORTAL_CONFIG.languages[0]); setDrawerOpen(true); }
  function closeDrawer() { setDrawerOpen(false); }

  function handleSave(asDraft: boolean) {
    if (!form.titulo.trim()) return;
    const paginaLabel = LIST_PAGES.find(p => p.id === form.paginaId)?.label ?? '—';
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const newDoc: DocRow = {
      id: Date.now(),
      nome: form.titulo,
      tipo: form.tipo || 'Sem tipo',
      status: asDraft ? 'Rascunho' : 'Publicado',
      dataPub: form.data || dateStr,
      pagina: paginaLabel,
      idiomas: form.idiomas,
      tags: [],
      publicadoPor: 'MA',
      ultimaEdicao: dateStr,
    };
    setDocs(prev => [newDoc, ...prev]);
    closeDrawer();
  }

  const filtered = docs.filter((d) => {
    if (search && !d.nome.toLowerCase().includes(search.toLowerCase())) return false;
    if (docFilters.tipo && d.tipo !== docFilters.tipo) return false;
    if (docFilters.ano && !d.dataPub.includes(docFilters.ano)) return false;
    if (docFilters.status && d.status !== docFilters.status) return false;
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

  const DOC_FILTERS = [
    {
      key: 'empresa',
      label: 'Empresa',
      options: [
        { value: '', label: 'Todas as empresas', shortLabel: 'Todas' },
        ...ENTITIES.map(e => ({ value: e.id, label: e.name })),
      ],
    },
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
    if (key === 'empresa') setSelected(new Set());
  }

  return (
    <div className="page docs-page">
      <StickyPageHeader
        title="Documentos"
        description={<>Documentos publicados no portal <strong>{PORTAL_CONFIG.name}</strong>.</>}
        action={
          <button type="button" className="btn-primary" onClick={openDrawer}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
            Novo documento
          </button>
        }
      />

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar__filters">
          <div className="docs-search">
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>search</span>
            <input
              type="text"
              placeholder="Pesquisar por título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
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
                    <button type="button" className="btn-action btn-action--enter" onClick={() => { setReplaceDoc(doc); setReplaceFile(null); }}>Editar</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
                setDocs(prev => prev.map(d => d.id === replaceDoc!.id ? { ...d, ultimaEdicao: new Date().toLocaleDateString('pt-BR') } : d));
                setReplaceDoc(null);
              }}
            >
              Salvar alterações
            </button>
          </div>
        }
      >
        <p className="docs-replace-name">{replaceDoc?.nome}</p>
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
                disabled={!form.titulo.trim()}>
                Publicar
              </button>
            </div>
          </div>
        }
      >
        <LangTabs active={docLocale} onChange={setDocLocale} />

        {(() => {
          const locked = docLocale !== PORTAL_CONFIG.languages[0];
          return (
            <>
              {/* Título — per language */}
              <div className="doc-field">
                <label className="doc-field__label">Título *</label>
                <input className="doc-field__input lang-fade" type="text" placeholder="Nome do documento"
                  key={docLocale}
                  value={form.titulo} onChange={e => patchForm('titulo', e.target.value)} autoFocus />
              </div>

              {/* Locked notice */}
              {locked && (
                <div className="modal-locked-notice">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Campos comuns já definidos no idioma principal
                </div>
              )}

              <div className={locked ? 'modal-locked-group' : ''}>
                {/* Upload zone — always enabled; each language can have its own file */}
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

                {/* Data */}
                <div className="doc-field">
                  <label className="doc-field__label">Data de publicação</label>
                  <input className="doc-field__input" type="date" disabled={locked}
                    value={form.data} onChange={e => patchForm('data', e.target.value)} />
                </div>

                {/* Tipo */}
                <div className="doc-field">
                  <label className="doc-field__label">Tipo</label>
                  <div className="doc-select-wrap">
                    <select className="doc-field__select" disabled={locked}
                      value={form.tipo} onChange={e => patchForm('tipo', e.target.value)}>
                      <option value="">Selecionar tipo...</option>
                      {DOC_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span className="material-symbols-outlined doc-select-wrap__icon">expand_more</span>
                  </div>
                </div>

                {/* Página */}
                <div className="doc-field">
                  <label className="doc-field__label">Página de destino</label>
                  <p className="doc-field__hint">Apenas páginas do tipo lista e lista agrupada</p>
                  <div className="doc-select-wrap">
                    <select className="doc-field__select" disabled={locked}
                      value={form.paginaId} onChange={e => patchForm('paginaId', e.target.value)}>
                      <option value="">Selecionar página...</option>
                      {(() => {
                        const groups: Record<string, typeof LIST_PAGES> = {};
                        for (const p of LIST_PAGES) {
                          (groups[p.group] ??= []).push(p);
                        }
                        return Object.entries(groups).map(([group, pages]) => (
                          <optgroup key={group} label={group}>
                            {pages.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                          </optgroup>
                        ));
                      })()}
                    </select>
                    <span className="material-symbols-outlined doc-select-wrap__icon">expand_more</span>
                  </div>
                </div>

                {/* Agendamento */}
                <div className="doc-field">
                  <label className="doc-field__label">Agendamento</label>
                  <label className="doc-schedule-toggle">
                    <input type="checkbox" disabled={locked} checked={form.scheduleEnabled}
                      onChange={e => patchForm('scheduleEnabled', e.target.checked)} />
                    <span>Publicar em data e hora específica</span>
                  </label>
                  {form.scheduleEnabled && (
                    <div className="doc-schedule-row">
                      <input className="doc-field__input" type="date" disabled={locked}
                        value={form.scheduleDate} onChange={e => patchForm('scheduleDate', e.target.value)} />
                      <input className="doc-field__input" type="time" disabled={locked}
                        value={form.scheduleTime} onChange={e => patchForm('scheduleTime', e.target.value)} />
                    </div>
                  )}
                </div>
              </div>
            </>
          );
        })()}
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
