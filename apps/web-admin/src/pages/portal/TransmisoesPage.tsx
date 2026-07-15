import { useState, useRef } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import Modal from '../../components/Modal';
import SearchInput from '../../components/SearchInput';
import { useSort } from '../../hooks/useSort';
import SortIcon from '../../components/SortIcon';
import PORTAL_CONFIG from '../../portalConfig';
import { usePortalName } from '../../hooks/usePortalName';
import '../admin/AdminPages.css';
import './TransmisoesPage.css';

/* ─── Types ───────────────────────────────────────────── */
interface Spectator {
  id: string;
  name: string;
  email: string;
  watching: boolean;
}

interface CastItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  language: string;
  allowSlideNav: boolean;
  showInHistory: boolean;
  template: string;
  diagrams: string;
  startDate: string;
  spectators: number;
  markers: number;
  featured: boolean;
  spectatorList: Spectator[];
}

type View = 'list' | 'detail' | 'new';
type DetailTab = 'config' | 'spectators';

/* ─── Seed data ────────────────────────────────────────── */
const SEED_SPECTATORS: Spectator[] = [
  { id: 's1', name: 'Luis Otero', email: 'restalilla@viqconsultant.com', watching: false },
  { id: 's2', name: 'RJ Manzo', email: 'rmanzo@viqconsultant.com', watching: false },
  { id: 's3', name: 'sgdas', email: 'asdg@wer.com', watching: false },
  { id: 's4', name: 'Pablo crot', email: 'pablocrot1@gmail.com', watching: false },
  { id: 's5', name: 'Ricardo Lira', email: 'lira.rcd@gmail.com', watching: true },
  { id: 's6', name: 'Anand Reddy Nadapi', email: 'anadapi@factset.com', watching: true },
  { id: 's7', name: 'diego medeiros de oliveira', email: 'diegomedeiroscaj@yahoo.com.br', watching: true },
  { id: 's8', name: 'erika', email: 'erika.barbosa@eternit.com.br', watching: true },
  { id: 's9', name: 'Bernardo', email: 'bernardobrasil.grsantos@gmail.com', watching: true },
  { id: 's10', name: 'SERGIO LUIZ HART', email: 'sergiohart1964@hotmail.com', watching: true },
  { id: 's11', name: 'Rennan Zanini', email: 'rennanvz@hotmail.com', watching: true },
  { id: 's12', name: 'Frederico Xavier', email: 'vendas2@usimontec.com.br', watching: false },
];

const CAST_KEY = 'portal_transmissoes';

const INITIAL_CASTS: CastItem[] = [
  { id: 'c1',  name: '3T24',          slug: '3T24',          description: 'Videoconferência de Resultados', language: 'pt', allowSlideNav: false, showInHistory: true,  template: 'Eternit RI', diagrams: 'Video, Chat',          startDate: '2024-11-06T15:00', spectators: 96,  markers: 0, featured: false, spectatorList: SEED_SPECTATORS },
  { id: 'c2',  name: 'Teste 3T24',    slug: 'Teste_3T24',    description: '',                              language: 'pt', allowSlideNav: true,  showInHistory: false, template: 'Eternit RI', diagrams: 'Video, Chat',          startDate: '2024-11-04T12:30', spectators: 4,   markers: 0, featured: false, spectatorList: [] },
  { id: 'c3',  name: '2T24',          slug: '2T24',          description: 'Videoconferência de Resultados', language: 'pt', allowSlideNav: false, showInHistory: true,  template: 'Eternit RI', diagrams: 'Video, Chat, Perguntas', startDate: '2024-08-07T15:00', spectators: 148, markers: 0, featured: false, spectatorList: [] },
  { id: 'c4',  name: 'Teste 2T24 Parte II', slug: 'Teste_2T24_Parte_II', description: '', language: 'pt', allowSlideNav: true, showInHistory: false, template: 'Eternit RI', diagrams: 'Video, Chat', startDate: '2024-08-06T17:40', spectators: 5, markers: 0, featured: false, spectatorList: [] },
  { id: 'c5',  name: 'Teste 2T24',    slug: 'Teste_2T24',    description: '',                              language: 'pt', allowSlideNav: true,  showInHistory: false, template: 'Eternit RI', diagrams: 'Video, Chat',          startDate: '2024-08-06T14:00', spectators: 1,   markers: 0, featured: false, spectatorList: [] },
  { id: 'c6',  name: '1T24',          slug: '1T24',          description: 'Videoconferência de Resultados', language: 'pt', allowSlideNav: false, showInHistory: true,  template: 'Eternit RI', diagrams: 'Video, Chat, Perguntas', startDate: '2024-05-08T15:00', spectators: 106, markers: 0, featured: false, spectatorList: [] },
  { id: 'c7',  name: '4T23',          slug: '4T23',          description: 'Videoconferência de Resultados', language: 'pt', allowSlideNav: false, showInHistory: true,  template: 'Eternit RI', diagrams: 'Video, Chat, Perguntas', startDate: '2024-02-28T15:00', spectators: 163, markers: 0, featured: true,  spectatorList: [] },
  { id: 'c8',  name: '3T23',          slug: '3T23',          description: 'Videoconferência de Resultados', language: 'pt', allowSlideNav: false, showInHistory: true,  template: 'Eternit RI', diagrams: 'Video, Chat, Perguntas', startDate: '2023-11-08T15:00', spectators: 94,  markers: 0, featured: false, spectatorList: [] },
  { id: 'c9',  name: '2T23',          slug: '2T23',          description: 'Videoconferência de Resultados', language: 'pt', allowSlideNav: false, showInHistory: true,  template: 'Eternit RI', diagrams: 'Video, Chat, Perguntas', startDate: '2023-08-09T15:00', spectators: 144, markers: 0, featured: false, spectatorList: [] },
  { id: 'c10', name: '2T23_Teste',    slug: '2T23_Teste',    description: '',                              language: 'pt', allowSlideNav: true,  showInHistory: false, template: 'Eternit RI', diagrams: 'Video, Chat',          startDate: '2023-08-07T13:00', spectators: 2,   markers: 0, featured: false, spectatorList: [] },
  { id: 'c11', name: '1T23',          slug: '1T23',          description: 'Videoconferência de Resultados', language: 'pt', allowSlideNav: false, showInHistory: true,  template: 'Eternit RI', diagrams: 'Video, Chat, Perguntas', startDate: '2023-05-10T15:00', spectators: 96,  markers: 0, featured: false, spectatorList: [] },
  { id: 'c12', name: '1T23_Teste',    slug: '1T23_Teste',    description: '',                              language: 'pt', allowSlideNav: true,  showInHistory: false, template: 'Eternit RI', diagrams: 'Video, Chat',          startDate: '2023-04-26T15:00', spectators: 1,   markers: 0, featured: false, spectatorList: [] },
  { id: 'c13', name: 'Teste',         slug: 'Teste',         description: '',                              language: 'pt', allowSlideNav: true,  showInHistory: false, template: 'Eternit RI', diagrams: 'Video, Chat',          startDate: '2023-04-21T14:00', spectators: 0,   markers: 0, featured: false, spectatorList: [] },
];

const TEMPLATES = ['Eternit RI', 'Workr Padrão', 'Customizado'];
const DIAGRAMS_OPTIONS = ['Video, Chat', 'Video, Chat, Perguntas', 'Video, Slides, Chat', 'Video, Slides, Chat, Perguntas'];
const LANGUAGES = [{ value: 'pt', label: 'Português' }, { value: 'en', label: 'English' }, { value: 'es', label: 'Español' }];

const PAGE_SIZE = 13;
const SPEC_PAGE_SIZE = 12;

function fmtDateTime(iso: string) {
  if (!iso) return '';
  const [date, time] = iso.split('T');
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y} ${time ?? ''}`;
}

function castLink(slug: string) {
  return `https://cast.workr.com.br/${PORTAL_CONFIG.name}/${slug}`;
}
function castLinkEspecial(slug: string) {
  return `https://cast.workr.com.br/${PORTAL_CONFIG.name}/${slug}/B4-51-C6-0E-3D-91-BF-CD-6E-8E-56-5C-05-56-15-E5`;
}
function historyCastsLink() {
  return `https://cast.workr.com.br/${PORTAL_CONFIG.name}`;
}

/* ─── Empty form ───────────────────────────────────────── */
const EMPTY_FORM = (): Omit<CastItem, 'id' | 'spectators' | 'markers' | 'spectatorList'> => ({
  name: '',
  slug: '',
  description: '',
  language: 'pt',
  allowSlideNav: true,
  showInHistory: false,
  template: '',
  diagrams: '',
  startDate: '',
  featured: false,
});

/* ─── Component ────────────────────────────────────────── */
export default function TransmisoesPage() {
  const portalName = usePortalName();
  const [casts, setCasts] = useState<CastItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(CAST_KEY) ?? 'null') ?? INITIAL_CASTS; } catch { return INITIAL_CASTS; }
  });
  const [view, setView] = useState<View>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('config');
  const [form, setForm] = useState(EMPTY_FORM());
  const [listPage, setListPage] = useState(1);
  const [specPage, setSpecPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const slidesRef = useRef<HTMLInputElement>(null);

  const selectedCast = casts.find(c => c.id === selectedId) ?? null;

  /* filtered + paginated list */
  const _filtered = casts.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );
  const { sorted: filtered, col: trnCol, dir: trnDir, toggle: trnToggle } = useSort(_filtered);
  const listPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((listPage - 1) * PAGE_SIZE, listPage * PAGE_SIZE);

  /* spectators pagination */
  const spectators = selectedCast?.spectatorList ?? [];
  const specPages = Math.max(1, Math.ceil(spectators.length / SPEC_PAGE_SIZE));
  const paginatedSpec = spectators.slice((specPage - 1) * SPEC_PAGE_SIZE, specPage * SPEC_PAGE_SIZE);

  function openDetail(cast: CastItem) {
    setSelectedId(cast.id);
    setForm({
      name: cast.name, slug: cast.slug, description: cast.description,
      language: cast.language, allowSlideNav: cast.allowSlideNav,
      showInHistory: cast.showInHistory, template: cast.template,
      diagrams: cast.diagrams, startDate: cast.startDate, featured: cast.featured,
    });
    setDetailTab('config');
    setSpecPage(1);
    setSaved(false);
    setView('detail');
  }

  function openNew() {
    setForm(EMPTY_FORM());
    setSelectedId(null);
    setView('new');
  }

  function backToList() {
    setView('list');
    setSelectedId(null);
  }

  function setField<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
    setSaved(false);
  }

  function persistCasts(next: CastItem[]) {
    setCasts(next);
    localStorage.setItem(CAST_KEY, JSON.stringify(next));
  }

  function handleSaveDetail() {
    if (!selectedId) return;
    persistCasts(casts.map(c => c.id === selectedId ? { ...c, ...form } : c));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleCreate() {
    if (!form.name.trim() || !form.template || !form.diagrams) return;
    const id = 'c-' + Date.now();
    const newCast: CastItem = {
      id, ...form,
      slug: form.slug || form.name.replace(/\s+/g, '_'),
      spectators: 0, markers: 0, spectatorList: [],
    };
    persistCasts([newCast, ...casts]);
    openDetail(newCast);
  }

  function handleDelete() {
    if (!selectedId) return;
    persistCasts(casts.filter(c => c.id !== selectedId));
    setDeleteConfirm(false);
    backToList();
  }


  const isNewValid = form.name.trim() && form.template && form.diagrams;

  /* ─── List view ─────────────────────────────────────── */
  if (view === 'list') {
    return (
      <div className="page">
        <StickyPageHeader
          title="Transmissões"
          description={<>Webcasts e transmissões ao vivo do portal <strong>{portalName}</strong>.</>}
          action={
            <button className="btn-primary" type="button" onClick={openNew}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
              Nova transmissão
            </button>
          }
        />

        <div className="toolbar">
          <div className="toolbar__filters">
            <SearchInput value={search} onChange={v => { setSearch(v); setListPage(1); }} placeholder="Pesquisar por nome..." />
          </div>
          <span className="toolbar__count">{filtered.length} transmiss{filtered.length !== 1 ? 'ões' : 'ão'}</span>
        </div>

        <div className="table-wrapper">
          <table className="data-table trn-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th className={`th-sort${trnCol === 'name' ? ' th-sort--active' : ''}`} onClick={() => trnToggle('name')}><span className="th-sort-inner">Cast <SortIcon dir={trnCol === 'name' ? trnDir : null} /></span></th>
                <th className={`th-sort${trnCol === 'startDate' ? ' th-sort--active' : ''}`} onClick={() => trnToggle('startDate')}><span className="th-sort-inner">Data de início <SortIcon dir={trnCol === 'startDate' ? trnDir : null} /></span></th>
                <th style={{ width: 120 }}></th>
                <th className={`th-sort${trnCol === 'spectators' ? ' th-sort--active' : ''}`} onClick={() => trnToggle('spectators')}><span className="th-sort-inner">Espectadores <SortIcon dir={trnCol === 'spectators' ? trnDir : null} /></span></th>
                <th className={`th-sort${trnCol === 'markers' ? ' th-sort--active' : ''}`} onClick={() => trnToggle('markers')}><span className="th-sort-inner">Marcadores <SortIcon dir={trnCol === 'markers' ? trnDir : null} /></span></th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={7} className="table-empty">Nenhuma transmissão encontrada.</td></tr>
              ) : paginated.map(cast => (
                <tr key={cast.id} className="trn-row">
                  <td className="trn-cell--check">
                    <input type="checkbox" className="cdr-checkbox" />
                  </td>
                  <td>
                    <button type="button" className="trn-name-link" onClick={() => openDetail(cast)}>
                      {cast.name}
                    </button>
                  </td>
                  <td className="trn-cell--meta">{fmtDateTime(cast.startDate)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-action btn-action--enter trn-manage-btn"
                      onClick={() => openDetail(cast)}
                    >
                      Gerenciar
                    </button>
                  </td>
                  <td className="trn-cell--meta">{cast.spectators}</td>
                  <td className="trn-cell--meta">{cast.markers || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {listPages > 1 && (
          <div className="trn-pagination">
            <button className="btn-outline trn-pg-btn" disabled={listPage === 1} onClick={() => setListPage(p => p - 1)}>Anterior</button>
            {Array.from({ length: listPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                type="button"
                className={`trn-pg-num${listPage === p ? ' trn-pg-num--active' : ''}`}
                onClick={() => setListPage(p)}
              >{p}</button>
            ))}
            <button className="btn-outline trn-pg-btn" disabled={listPage === listPages} onClick={() => setListPage(p => p + 1)}>Próximo</button>
            <span className="trn-pg-count">Exibindo {paginated.length} de {filtered.length}</span>
          </div>
        )}
      </div>
    );
  }

  /* ─── Detail / New view ─────────────────────────────── */
  const isDetail = view === 'detail';

  return (
    <div className="page">
      <StickyPageHeader
        title={isDetail ? selectedCast?.name ?? '' : 'Nova transmissão'}
        description={isDetail
          ? <>Configurações e espectadores da transmissão.</>
          : <>Preencha os dados para criar uma nova transmissão em <strong>{portalName}</strong>.</>
        }
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-outline" type="button" onClick={backToList}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_back</span>
              Voltar
            </button>
            {isDetail ? (
              <>
                <button className="btn-outline btn-outline--danger" type="button" onClick={() => setDeleteConfirm(true)}>
                  Excluir
                </button>
                <button className="btn-primary" type="button" onClick={handleSaveDetail}>
                  {saved ? 'Salvo!' : 'Salvar alterações'}
                </button>
              </>
            ) : (
              <button className="btn-primary" type="button" onClick={handleCreate} disabled={!isNewValid}>
                Criar transmissão
              </button>
            )}
          </div>
        }
      />

      {/* Tab bar — detail only */}
      {isDetail && (
        <div className="trn-tabs">
          <button
            type="button"
            className={`trn-tab${detailTab === 'config' ? ' trn-tab--active' : ''}`}
            onClick={() => setDetailTab('config')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>settings</span>
            Configurações
          </button>
          <button
            type="button"
            className={`trn-tab${detailTab === 'spectators' ? ' trn-tab--active' : ''}`}
            onClick={() => setDetailTab('spectators')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>group</span>
            Espectadores
            {spectators.length > 0 && (
              <span className="trn-tab__badge">{spectators.length}</span>
            )}
          </button>
        </div>
      )}

      {/* Config form */}
      {(!isDetail || detailTab === 'config') && (
        <div className="trn-form-card">
          {isDetail && (
            <div className="trn-link-cards">
              <div className="trn-link-card">
                <span className="trn-link-card__label">Link</span>
                <a href="#" className="trn-link">{castLink(form.slug)}</a>
              </div>
              <div className="trn-link-card">
                <span className="trn-link-card__label">Link Especial</span>
                <a href="#" className="trn-link trn-link--sm">{castLinkEspecial(form.slug)}</a>
              </div>
              <div className="trn-link-card">
                <span className="trn-link-card__label">History casts link</span>
                <a href="#" className="trn-link">{historyCastsLink()}</a>
              </div>
            </div>
          )}

          <div className="trn-form">
            <label className="trn-field">
              <span className="trn-field__label"><span className="trn-required">*</span> Nome</span>
              <input
                className="trn-field__input"
                type="text"
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                placeholder="Ex: 3T25"
              />
            </label>

            <label className="trn-field">
              <span className="trn-field__label"><span className="trn-required">*</span> Nome por URL</span>
              <input
                className="trn-field__input"
                type="text"
                value={form.slug}
                onChange={e => setField('slug', e.target.value)}
                placeholder="Ex: 3T25 (sem espaços)"
              />
            </label>

            <label className="trn-field">
              <span className="trn-field__label">Descrição</span>
              <textarea
                className="trn-field__input trn-field__textarea"
                rows={4}
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                placeholder="Descrição da transmissão"
              />
            </label>

            <label className="trn-field">
              <span className="trn-field__label">Data de início</span>
              <input
                className="trn-field__input trn-field__input--half"
                type="datetime-local"
                value={form.startDate}
                onChange={e => setField('startDate', e.target.value)}
              />
            </label>

            <label className="trn-field">
              <span className="trn-field__label">Linguagem</span>
              <div className="filter-wrap trn-select-wrap">
                <select
                  className="filter-select trn-field__select"
                  value={form.language}
                  onChange={e => setField('language', e.target.value)}
                >
                  {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
                <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
              </div>
            </label>

            <div className="trn-checkboxes">
              <label className="trn-checkbox-row">
                <input
                  type="checkbox"
                  checked={form.allowSlideNav}
                  onChange={e => setField('allowSlideNav', e.target.checked)}
                />
                <span>Permitir que o espectador navegue entre slides.</span>
              </label>
              <label className="trn-checkbox-row">
                <input
                  type="checkbox"
                  checked={form.showInHistory}
                  onChange={e => setField('showInHistory', e.target.checked)}
                />
                <span>Permitir que o Cast seja mostrado no histórico.</span>
              </label>
            </div>

            <div className="trn-two-col">
              <label className="trn-field">
                <span className="trn-field__label"><span className="trn-required">*</span> Template</span>
                <div className="filter-wrap trn-select-wrap">
                  <select
                    className="filter-select trn-field__select"
                    value={form.template}
                    onChange={e => setField('template', e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
                </div>
              </label>

              <label className="trn-field">
                <span className="trn-field__label"><span className="trn-required">*</span> Diagramas</span>
                <div className="filter-wrap trn-select-wrap">
                  <select
                    className="filter-select trn-field__select"
                    value={form.diagrams}
                    onChange={e => setField('diagrams', e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {DIAGRAMS_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <span className="material-symbols-outlined filter-wrap__icon">expand_more</span>
                </div>
              </label>
            </div>

            {/* File uploads — only on new */}
            {!isDetail && (
              <div className="trn-two-col">
                <div className="trn-field">
                  <span className="trn-field__label">Arquivo</span>
                  <div className="trn-upload">
                    <button type="button" className="trn-upload__btn" onClick={() => fileRef.current?.click()}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>upload</span>
                      Upload
                    </button>
                    <input ref={fileRef} type="file" style={{ display: 'none' }} />
                    <div className="trn-upload__hints">
                      <span>* Tamanho máximo 200 MB</span>
                      <span>* Extensões NÃO permitidas: exe, bat</span>
                    </div>
                  </div>
                </div>

                <div className="trn-field">
                  <span className="trn-field__label">Slides</span>
                  <div className="trn-upload">
                    <button type="button" className="trn-upload__btn" onClick={() => slidesRef.current?.click()}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>upload</span>
                      Upload
                    </button>
                    <input ref={slidesRef} type="file" accept=".pdf" style={{ display: 'none' }} />
                    <div className="trn-upload__hints">
                      <span>* Tamanho máximo 200 MB</span>
                      <span>* Extensões permitidas: pdf</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Export buttons — detail only */}
            {isDetail && (
              <div className="trn-exports">
                <button type="button" className="btn-outline">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span>
                  Exportar perguntas
                </button>
                <button type="button" className="btn-outline">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span>
                  Exportar espectadores
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spectators tab — detail only */}
      {isDetail && detailTab === 'spectators' && (
        <div className="trn-spec-section">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button type="button" className="btn-outline">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span>
              Exportar espectadores
            </button>
          </div>

          {specPages > 1 && (
            <div className="trn-pagination trn-pagination--top">
              <button className="btn-outline trn-pg-btn" disabled={specPage === 1} onClick={() => setSpecPage(p => p - 1)}>Anterior</button>
              {Array.from({ length: specPages }, (_, i) => i + 1).map(p => (
                <button key={p} type="button" className={`trn-pg-num${specPage === p ? ' trn-pg-num--active' : ''}`} onClick={() => setSpecPage(p)}>{p}</button>
              ))}
              <button className="btn-outline trn-pg-btn" disabled={specPage === specPages} onClick={() => setSpecPage(p => p + 1)}>Próximo</button>
              <span className="trn-pg-count">Exibindo {paginatedSpec.length} de {spectators.length}</span>
            </div>
          )}

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Espectador</th>
                  <th>Email</th>
                  <th style={{ width: 110 }}>Assistindo</th>
                </tr>
              </thead>
              <tbody>
                {spectators.length === 0 ? (
                  <tr><td colSpan={3} className="table-empty">Nenhum espectador registrado.</td></tr>
                ) : paginatedSpec.map(s => (
                  <tr key={s.id}>
                    <td className="table-cell--bold">{s.name}</td>
                    <td className="table-cell--muted">{s.email}</td>
                    <td className={s.watching ? 'table-cell--bold' : 'table-cell--muted'}>
                      {s.watching ? 'Sim' : 'Não'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Excluir transmissão"
        size="sm"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={() => setDeleteConfirm(false)}>Cancelar</button>
            <button type="button" className="btn-outline btn-outline--danger" onClick={handleDelete}>Excluir</button>
          </div>
        }
      >
        <p style={{ margin: 0, color: 'var(--color-gray-600)', fontSize: 'var(--text-sm)' }}>
          Deseja excluir a transmissão <strong>{selectedCast?.name}</strong>? Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
}
