import { useState, useCallback, useRef, Fragment, useEffect, type DragEvent } from 'react';
import { processImageToDataUrl } from '../../utils/imageProcessor';
import StickyPageHeader from '../../components/StickyPageHeader';
import Modal from '../../components/Modal';
import UnsavedModal from '../../components/UnsavedModal';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import LangTabs from '../../components/LangTabs';
import { Canal, SubCanal, SubSubCanal, DEFAULT_CANAIS, DEFAULT_CANAIS_FLAT, PageType, ListaAgrupadaStyle, Marcador, normalizeMarcadores } from '../../components/ChannelEditor';
import MarcadorListEditor from '../../components/MarcadorListEditor';
import PORTAL_CONFIG, { LocaleCode } from '../../portalConfig';
import { usePortalName } from '../../hooks/usePortalName';
import { useAuth } from '../../contexts/AuthContext';
import { savePortalConfig, fetchPortalConfig } from '../../lib/portalConfigApi';
import { loadMaterias, persistMateria } from '../../hooks/useMateriasStore';
import { loadCvmRoutedPageIds } from '../../services/cvm.service';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { resolvePortalId } from '../../lib/portalDb';
import { usePublish } from '../../contexts/PublishContext';
import PublishButton from '../../components/PublishButton';
import { transferCategoria } from '../../lib/categoriaTransfer';
import { logActivity } from '../../lib/activityLog';
import '../admin/AdminPages.css';
import './CanaisPage.css';

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

// Flattens the wizard's group-name inputs (custom flat list, or one list per
// empresa) into the single de-duped list stored on the canal/sub-canal —
// documentos.js groups purely by the label found on each tagged document, so
// only the set of possible names needs to survive, not which mode built them.
function resolveGroupCategories(form: {
  laByEmpresa: boolean;
  laSelectedEmpresas: string[];
  laCategories: Marcador[];
  laEmpresaCategories: Record<string, Marcador[]>;
}): Marcador[] {
  const raw = form.laByEmpresa
    ? form.laSelectedEmpresas.flatMap(id => form.laEmpresaCategories[id] ?? [])
    : form.laCategories;
  const seen = new Set<string>();
  const result: Marcador[] = [];
  for (const m of raw) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    result.push(m);
  }
  return result;
}

// ── Portal empresas ──────────────────────────────────────────────────────────
type PortalEmpresa = { id: string; label: string };

function loadPortalEmpresas(portalId?: string): PortalEmpresa[] {
  try {
    const raw = localStorage.getItem(`portal_empresas_${portalId ?? 'default'}`);
    if (!raw) return [];
    const items: Array<{ id: string; nome?: string; label?: string }> = JSON.parse(raw);
    return items.map(e => ({ id: e.id, label: e.nome ?? e.label ?? e.id }));
  } catch { return []; }
}

// Sidebar/tabmenu portals are simple CVM-compliance sites: direct pages only,
// no rich content sections. list/formulário page types make sense there, and
// so does 'show' — but only in its simplified form (NovaMateriaPage
// restricts it to a single subtítulo+texto block for flat layouts, instead
// of the full block palette the Banner layout's Show allows).
const FLAT_PAGE_TYPES: PageType[] = ['lista', 'lista-agrupada', 'tabela', 'tabela-resultados', 'formulario', 'show'];

// ── Page type definitions ───────────────────────────────────────────────────
const PAGE_TYPES: Array<{
  id: PageType;
  label: string;
  icon: string;
  desc: string;
  flow: string;
  thumb: React.ReactNode;
}> = [
  {
    id: 'show', label: 'Show', icon: 'article',
    desc: 'Conteúdos variados: texto, imagem, tabelas e listas.',
    flow: 'Página livre para edição de conteúdo rico.',
    thumb: (
      <svg width="100%" height="48" viewBox="0 0 160 48" fill="none">
        <rect x="2" y="2" width="156" height="10" rx="2" fill="#c8d2db"/>
        <rect x="2" y="16" width="156" height="4" rx="1" fill="#e8edf2"/>
        <rect x="2" y="24" width="120" height="4" rx="1" fill="#e8edf2"/>
        <rect x="2" y="34" width="68" height="10" rx="2" fill="#eef1f5"/>
        <rect x="74" y="34" width="84" height="10" rx="2" fill="#eef1f5"/>
      </svg>
    ),
  },
  {
    id: 'lista', label: 'Lista', icon: 'list_alt',
    desc: 'Lista de documentos com filtro por ano.',
    flow: 'Exibe documentos vinculados com filtro de ano e categoria.',
    thumb: (
      <svg width="100%" height="48" viewBox="0 0 160 48" fill="none">
        <rect x="2" y="2" width="50" height="8" rx="2" fill="#e8edf2"/>
        <rect x="56" y="2" width="50" height="8" rx="2" fill="#e8edf2"/>
        <rect x="2" y="14" width="156" height="1" fill="#dde3ea"/>
        <rect x="2" y="19" width="130" height="6" rx="1" fill="#eef1f5"/>
        <rect x="2" y="29" width="130" height="6" rx="1" fill="#eef1f5"/>
        <rect x="2" y="39" width="100" height="6" rx="1" fill="#eef1f5"/>
      </svg>
    ),
  },
  {
    id: 'lista-agrupada', label: 'Lista Agrupada', icon: 'folder_open',
    desc: 'Documentos organizados por seção ou accordion.',
    flow: 'Documentos organizados em categorias ou agrupados por empresa.',
    thumb: (
      <svg width="100%" height="48" viewBox="0 0 160 48" fill="none">
        <rect x="2" y="2" width="156" height="12" rx="2" fill="#e8edf2" stroke="#c8d2db" strokeWidth="1"/>
        <rect x="6" y="6" width="60" height="4" rx="1" fill="#c8d2db"/>
        <rect x="2" y="18" width="156" height="12" rx="2" fill="#f5f7fa" stroke="#dde3ea" strokeWidth="1"/>
        <rect x="6" y="22" width="50" height="4" rx="1" fill="#dde3ea"/>
        <rect x="6" y="34" width="130" height="4" rx="1" fill="#e8edf2"/>
        <rect x="6" y="42" width="100" height="4" rx="1" fill="#e8edf2"/>
      </svg>
    ),
  },
  {
    id: 'tabela', label: 'Tabela', icon: 'table_chart',
    desc: 'Dados estruturados em linhas e colunas.',
    flow: 'Tabela de dados editável com colunas personalizáveis.',
    thumb: (
      <svg width="100%" height="48" viewBox="0 0 160 48" fill="none">
        <rect x="2" y="2" width="156" height="10" rx="2" fill="#c8d2db"/>
        <rect x="2" y="14" width="156" height="1" fill="#dde3ea"/>
        <rect x="2" y="18" width="52" height="7" rx="1" fill="#eef1f5"/>
        <rect x="56" y="18" width="50" height="7" rx="1" fill="#eef1f5"/>
        <rect x="108" y="18" width="50" height="7" rx="1" fill="#eef1f5"/>
        <rect x="2" y="27" width="52" height="7" rx="1" fill="#eef1f5"/>
        <rect x="56" y="27" width="50" height="7" rx="1" fill="#eef1f5"/>
        <rect x="108" y="27" width="50" height="7" rx="1" fill="#eef1f5"/>
        <rect x="2" y="36" width="52" height="7" rx="1" fill="#eef1f5"/>
        <rect x="56" y="36" width="50" height="7" rx="1" fill="#eef1f5"/>
        <rect x="108" y="36" width="50" height="7" rx="1" fill="#eef1f5"/>
      </svg>
    ),
  },
  {
    id: 'tabela-resultados', label: 'Tabela Resultados', icon: 'grid_view',
    desc: 'Matriz de categoria × trimestre, como uma central de resultados.',
    flow: 'Usa os mesmos trimestres/arquivos já cadastrados em Central de Resultados — só muda a apresentação para uma matriz.',
    thumb: (
      <svg width="100%" height="48" viewBox="0 0 160 48" fill="none">
        <rect x="2" y="2" width="156" height="10" rx="2" fill="#1f2937"/>
        <rect x="2" y="16" width="70" height="6" rx="1" fill="#dde3ea"/>
        <circle cx="90" cy="19" r="3" fill="#c8d2db"/>
        <circle cx="118" cy="19" r="3" fill="#c8d2db"/>
        <circle cx="146" cy="19" r="3" fill="#c8d2db"/>
        <rect x="2" y="27" width="70" height="6" rx="1" fill="#eef1f5"/>
        <circle cx="90" cy="30" r="3" fill="#c8d2db"/>
        <circle cx="118" cy="30" r="3" fill="#c8d2db"/>
        <rect x="2" y="38" width="70" height="6" rx="1" fill="#eef1f5"/>
        <circle cx="90" cy="41" r="3" fill="#c8d2db"/>
        <circle cx="118" cy="41" r="3" fill="#c8d2db"/>
        <circle cx="146" cy="41" r="3" fill="#c8d2db"/>
      </svg>
    ),
  },
  {
    id: 'blog', label: 'Blog', icon: 'newspaper',
    desc: 'Artigos e matérias com capa, título e resumo.',
    flow: 'Feed de artigos com capa, data e categorias.',
    thumb: (
      <svg width="100%" height="48" viewBox="0 0 160 48" fill="none">
        <rect x="2" y="2" width="74" height="30" rx="2" fill="#e8edf2"/>
        <rect x="2" y="36" width="50" height="5" rx="1" fill="#c8d2db"/>
        <rect x="84" y="2" width="74" height="30" rx="2" fill="#e8edf2"/>
        <rect x="84" y="36" width="50" height="5" rx="1" fill="#c8d2db"/>
      </svg>
    ),
  },
  {
    id: 'galeria', label: 'Galeria', icon: 'photo_library',
    desc: 'Imagens, vídeos e apresentações em cards.',
    flow: 'Grade de mídia com imagens, vídeos e PDFs.',
    thumb: (
      <svg width="100%" height="48" viewBox="0 0 160 48" fill="none">
        <rect x="2" y="2" width="48" height="36" rx="2" fill="#e8edf2"/>
        <circle cx="14" cy="14" r="4" fill="#c8d2db"/>
        <polyline points="2,38 18,22 30,32 38,26 50,38" stroke="#c8d2db" strokeWidth="1.5" fill="none"/>
        <rect x="56" y="2" width="48" height="36" rx="2" fill="#e8edf2"/>
        <circle cx="68" cy="14" r="4" fill="#c8d2db"/>
        <polyline points="56,38 72,22 84,32 92,26 104,38" stroke="#c8d2db" strokeWidth="1.5" fill="none"/>
        <rect x="110" y="2" width="48" height="36" rx="2" fill="#e8edf2"/>
        <circle cx="122" cy="14" r="4" fill="#c8d2db"/>
        <polyline points="110,38 126,22 138,32 146,26 158,38" stroke="#c8d2db" strokeWidth="1.5" fill="none"/>
      </svg>
    ),
  },
  {
    id: 'formulario', label: 'Formulário', icon: 'assignment',
    desc: 'Fale com RI, cadastro no mailing, trabalhe conosco.',
    flow: 'Formulário de contato configurável com campos e e-mail de recebimento.',
    thumb: (
      <svg width="100%" height="48" viewBox="0 0 160 48" fill="none">
        <rect x="2" y="2" width="156" height="8" rx="2" fill="#e8edf2"/>
        <rect x="2" y="14" width="156" height="8" rx="2" fill="#e8edf2"/>
        <rect x="2" y="26" width="100" height="8" rx="2" fill="#e8edf2"/>
        <rect x="2" y="38" width="44" height="8" rx="4" fill="#c8d2db"/>
      </svg>
    ),
  },
  {
    id: 'timeline', label: 'Linha do Tempo', icon: 'timeline',
    desc: 'Marcos por ano com título, descrição e imagem.',
    flow: 'Combine com uma matéria do tipo Linha do tempo em Matérias.',
    thumb: (
      <svg width="100%" height="48" viewBox="0 0 160 48" fill="none">
        <line x1="80" y1="4" x2="80" y2="44" stroke="#c8d2db" strokeWidth="2"/>
        {[10, 24, 38].map((y, i) => (
          <g key={i}>
            <circle cx="80" cy={y} r="3" fill="#8fa0b3"/>
            {i % 2 === 0
              ? <rect x="24" y={y - 4} width="40" height="8" rx="2" fill="#e8edf2"/>
              : <rect x="96" y={y - 4} width="40" height="8" rx="2" fill="#e8edf2"/>}
          </g>
        ))}
      </svg>
    ),
  },
];

// Page types that support a matérias linking step
const MATERIA_STEP_TYPES: PageType[] = ['show', 'galeria', 'tabela', 'blog'];

// ── State types ─────────────────────────────────────────────────────────────
interface NewSubForm {
  step: 1 | 2 | 3 | 4;
  canalId: string;
  parentSubId: string | null; // set when adding L3 (sub-sub-page)
  canalHasHeaderImage: boolean; // true when parent canal has a header image
  locale: LocaleCode;
  labels: Record<string, string>;
  href: string;
  headerImageUrl: string | null;
  hasChildren: boolean;
  // Undefined until the admin explicitly picks a format — never defaults to
  // 'show', so a page can't silently accept content of the wrong shape.
  pageType: PageType | undefined;
  isExternalLink: boolean;
  externalUrl: string;
  draft: boolean;
  // lista-agrupada
  laStyle: ListaAgrupadaStyle;
  laByEmpresa: boolean;
  laSelectedEmpresas: string[];
  laFiltroEmpresa: boolean;
  laCategories: Marcador[];
  laEmpresaCategories: Record<string, Marcador[]>;
  laActiveEmpresa: string;
  linkedMateriaIds: string[];
}

function emptyNewSubForm(canalId: string, parentSubId: string | null = null, canalHasHeaderImage = false, empresas: PortalEmpresa[] = []): NewSubForm {
  const hasMultiple = empresas.length > 1;
  return {
    step: 1,
    canalId,
    parentSubId,
    canalHasHeaderImage,
    locale: PORTAL_CONFIG.languages[0],
    labels: { [PORTAL_CONFIG.languages[0]]: '' },
    href: '',
    headerImageUrl: null,
    hasChildren: false,
    pageType: undefined, isExternalLink: false, externalUrl: '',
    draft: false, laStyle: 'accordion',
    laByEmpresa: hasMultiple,
    laSelectedEmpresas: empresas.map(e => e.id),
    laFiltroEmpresa: hasMultiple,
    laCategories: [],
    laEmpresaCategories: {},
    laActiveEmpresa: empresas[0]?.id ?? '',
    linkedMateriaIds: [],
  };
}

interface EditState {
  canalId: string;
  parentSubId?: string;
  subId: string;
  locale: LocaleCode;
  labels: Record<string, string>;
  label: string;
  href: string;
  targetCanalId: string;
  // Undefined until the admin explicitly picks a format — never defaults to
  // 'show', so a page can't silently accept content of the wrong shape.
  pageType: PageType | undefined;
  listaAgrupadaStyle: ListaAgrupadaStyle;
  isExternalLink: boolean;
  externalUrl: string;
  showInFooter: boolean;
  transferTo: string;
  headerImageUrl: string | null;
  canalHeaderImage: string | null; // parent canal's own image, for the inherit hint
  // lista-agrupada
  laByEmpresa: boolean;
  laSelectedEmpresas: string[];
  laFiltroEmpresa: boolean;
  laCategories: Marcador[];
  laEmpresaCategories: Record<string, Marcador[]>;
  laActiveEmpresa: string;
}

interface CanalEditState {
  canalId: string;
  locale: LocaleCode;
  labels: Record<string, string>;
  label: string;
  // Undefined until the admin explicitly picks a format — never defaults to
  // 'show', so a page can't silently accept content of the wrong shape.
  pageType: PageType | undefined;
  listaAgrupadaStyle: ListaAgrupadaStyle;
  headerImageUrl: string | null;
  applyHeaderToChildren: boolean;
  isLeaf: boolean;
  showInFooter: boolean;
  laCategories: Marcador[];
}

type CanalType = 'pagina' | 'pai';

interface NewCanalForm {
  step: 1 | 2 | 3;
  titles: Record<string, string>;
  subtitles: Record<string, string>;
  headerImageUrl: string | null;
  tipo: CanalType;
  // Undefined until the admin explicitly picks a format — never defaults to
  // 'show', so a page can't silently accept content of the wrong shape.
  pageType: PageType | undefined;
  draft: boolean;
  locale: LocaleCode;
  isExternalLink: boolean;
  externalUrl: string;
  restrito: boolean;
  // lista-agrupada config (same as NewSubForm)
  laStyle: ListaAgrupadaStyle;
  laByEmpresa: boolean;
  laSelectedEmpresas: string[];
  laFiltroEmpresa: boolean;
  laCategories: Marcador[];
  laEmpresaCategories: Record<string, Marcador[]>;
  linkedMateriaIds: string[];
}

function emptyNewCanalForm(empresas: PortalEmpresa[] = []): NewCanalForm {
  const hasMultiple = empresas.length > 1;
  return {
    step: 1,
    titles: { [PORTAL_CONFIG.languages[0]]: '' },
    subtitles: {},
    headerImageUrl: null,
    tipo: 'pai',
    pageType: undefined,
    draft: false,
    locale: PORTAL_CONFIG.languages[0],
    isExternalLink: false,
    externalUrl: '',
    restrito: false,
    laStyle: 'accordion',
    laByEmpresa: hasMultiple,
    laSelectedEmpresas: empresas.map(e => e.id),
    laFiltroEmpresa: hasMultiple,
    laCategories: [],
    laEmpresaCategories: {},
    linkedMateriaIds: [],
  };
}

interface ConfirmDeleteState {
  type: 'canal' | 'sub' | 'subsub';
  label: string;
  canalId: string;
  subId?: string;
  subSubId?: string;
  // Linked-content check (populated async after the modal opens)
  checking: boolean;
  affectedIds: string[]; // this node's id + every descendant's id
  hasTabelaResultados: boolean;
  cvmDocsCount: number;
  otherDocsCount: number;
  materiasCount: number;
  resultadosPublicadosCount: number;
  transferTo: string;
}

function orderKey(list: Canal[]): string {
  return list.map(c =>
    c.id + ':' + c.children.map(s => s.id + (s.children?.map(ss => ss.id).join(',') ?? '')).join(',')
  ).join('|');
}

// Row actions (Sub-página / Editar / Publicar-Despublicar / Excluir) collapse
// into a "⋮" dropdown on phones (see .ct-row-menu in CanaisPage.css) — on
// desktop the same buttons keep rendering inline, this wrapper is invisible
// there (`display: contents`). Avoids maintaining two separate action lists.
function RowActionsMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className={`ct-row-menu${open ? ' ct-row-menu--open' : ''}`} ref={ref}>
      <button type="button" className="ct-row-menu__trigger" aria-label="Mais ações" title="Mais ações"
        onClick={() => setOpen(o => !o)}>
        <span className="material-symbols-outlined">more_vert</span>
      </button>
      <div className="ct-row-menu__dropdown" onClick={() => setOpen(false)}>
        {children}
      </div>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────────────
export default function CanaisPage() {
  const portalName = usePortalName();
  const { publish, hasPendingDraft, notifyDraft } = usePublish();
  // Every tree edit (toggle/reorder/delete) already writes straight to
  // portal_config via mutate() — but the LIVE site only reflects it once
  // "Publicar" is clicked (that's what hasPendingDraft tracks). Someone who
  // deletes a canal and then navigates away without publishing sees the
  // deletion "stuck" in the CMS but not on the actual site, with no warning
  // that anything was still pending.
  const blocker = useUnsavedChanges(hasPendingDraft);
  const { user } = useAuth();
  const activePortalId = user?.activePortalId;
  const canaisKey = `portal_canais_${activePortalId ?? 'default'}`;
  const [cvmPageIds, setCvmPageIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!activePortalId) return;
    loadCvmRoutedPageIds(activePortalId).then(setCvmPageIds).catch(() => {});
  }, [activePortalId]);
  const [portalDbId, setPortalDbId] = useState<string | null>(null);
  useEffect(() => {
    if (!activePortalId) return;
    resolvePortalId(activePortalId).then(setPortalDbId).catch(() => setPortalDbId(null));
  }, [activePortalId]);
  const portalEmpresas = loadPortalEmpresas(activePortalId);
  const hasMultipleEmpresas = portalEmpresas.length > 1;
  // localStorage is only a cache (seeded at portal creation or whenever
  // someone opens Personalização → Layout in THIS browser) — a banner
  // portal opened fresh (new device, cleared storage) has no key here, and
  // the `?? 'sidebar'` fallback used to silently misclassify it as flat
  // layout, hiding "Sub-página"/"Tipo de canal" for a portal that actually
  // supports them. Hydrate from Supabase (authoritative) on mount, same
  // pattern as LayoutPage.tsx.
  const layoutKey = `portal_layout_${activePortalId ?? 'default'}`;
  const [portalLayout, setPortalLayout] = useState<'sidebar' | 'tabmenu' | 'banner'>(
    () => (localStorage.getItem(layoutKey) as 'sidebar' | 'tabmenu' | 'banner' | null) ?? 'sidebar',
  );
  const isFlatLayout = portalLayout === 'sidebar' || portalLayout === 'tabmenu';

  useEffect(() => {
    if (!activePortalId) return;
    fetchPortalConfig(activePortalId).then(data => {
      if (data?.layout && typeof data.layout === 'string') {
        localStorage.setItem(layoutKey, data.layout);
        setPortalLayout(data.layout as 'sidebar' | 'tabmenu' | 'banner');
      }
    }).catch(console.error);
  }, [activePortalId, layoutKey]);

  // Flat layouts (sidebar/tabmenu) default to direct pages; banner gets the full tree
  const defaultCanais = isFlatLayout ? DEFAULT_CANAIS_FLAT : DEFAULT_CANAIS;

  const [canais, setCanais] = useState<Canal[]>(() => {
    try {
      const raw = localStorage.getItem(canaisKey);
      return raw ? JSON.parse(raw) : defaultCanais;
    } catch {
      return defaultCanais;
    }
  });
  const [savedOrderKey, setSavedOrderKey] = useState(() => {
    try {
      const raw = localStorage.getItem(canaisKey);
      return orderKey(raw ? JSON.parse(raw) : defaultCanais);
    } catch {
      return orderKey(defaultCanais);
    }
  });

  // Hydrate from Supabase on mount so all users see the same channel tree
  useEffect(() => {
    if (!activePortalId) return;
    fetchPortalConfig(activePortalId).then(data => {
      if (Array.isArray(data?.canais) && (data.canais as Canal[]).length > 0) {
        const canaisList = data.canais as Canal[];
        localStorage.setItem(canaisKey, JSON.stringify(canaisList));
        setCanais(canaisList);
        setSavedOrderKey(orderKey(canaisList));
      } else {
        // No canais in Supabase — seed the layout-appropriate default so all users share the same initial state
        savePortalConfig(activePortalId, { canais: defaultCanais }).catch(console.error);
        localStorage.setItem(canaisKey, JSON.stringify(defaultCanais));
        setCanais(defaultCanais);
        setSavedOrderKey(orderKey(defaultCanais));
      }
    }).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePortalId, canaisKey]);

  // Arrastar uma categoria/marcador da árvore de Canais para outro canal:
  // reusa a mesma lógica de "Transferir categoria" de Documentos (mover
  // documentos + reescrever o marcador), estendida em transferCategoria()
  // para também atualizar as regras de roteamento do Auto CVM que apontavam
  // para o par (página, categoria) antigo. Matérias não têm campo de
  // categoria/marcador (só page_id), então não participam desta transferência.
  interface PendingCategoriaDrop {
    sourcePageId: string;
    sourceLabel: string;
    destPageId: string;
    destPageLabel: string;
    destIsGrouped: boolean;
  }
  const [pendingDrop, setPendingDrop] = useState<PendingCategoriaDrop | null>(null);
  const [dropTransferring, setDropTransferring] = useState(false);
  const [dropError, setDropError] = useState('');

  function handleMarkerDragStart(e: DragEvent, sourcePageId: string, sourceLabel: string) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ sourcePageId, sourceLabel }));
  }

  function handleCanalDragOver(e: DragEvent, destPageType?: PageType) {
    if (destPageType !== 'lista' && destPageType !== 'lista-agrupada') return;
    if (!e.dataTransfer.types.includes('application/json')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleCanalDrop(e: DragEvent, destPageId: string, destPageLabel: string, destPageType?: PageType) {
    if (destPageType !== 'lista' && destPageType !== 'lista-agrupada') return;
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    e.preventDefault();
    try {
      const { sourcePageId, sourceLabel } = JSON.parse(raw) as { sourcePageId: string; sourceLabel: string };
      if (!sourcePageId || !sourceLabel || sourcePageId === destPageId) return;
      setDropError('');
      setPendingDrop({ sourcePageId, sourceLabel, destPageId, destPageLabel, destIsGrouped: destPageType === 'lista-agrupada' });
    } catch { /* ignore malformed payload */ }
  }

  async function confirmCategoriaDrop() {
    if (!pendingDrop || !portalDbId) return;
    setDropTransferring(true);
    setDropError('');
    try {
      // The marker at the destination keeps the SOURCE category's own name
      // (e.g. "Documentos Societários") — the destination is just a page to
      // file it under, not a rename target. Passing the destination page's
      // own label here instead was the bug: every dragged category ended up
      // renamed to whatever page it landed on, so distinct categories
      // dropped on the same page all collapsed into one group.
      const result = await transferCategoria({
        portalDbId,
        sourcePageId: pendingDrop.sourcePageId,
        sourceLabel: pendingDrop.sourceLabel,
        destPageId: pendingDrop.destPageId,
        destLabel: pendingDrop.sourceLabel,
        destIsGrouped: pendingDrop.destIsGrouped,
        activePortalKey: activePortalId,
      });
      if (result.error) { setDropError(result.error); return; }
      if (activePortalId) {
        const data = await fetchPortalConfig(activePortalId);
        if (Array.isArray(data?.canais)) {
          setCanais(data.canais as Canal[]);
          setSavedOrderKey(orderKey(data.canais as Canal[]));
        }
      }
      logActivity({
        portalId: portalDbId,
        userName: user?.name ?? user?.email ?? '',
        userEmail: user?.email ?? '',
        action: 'alterou',
        category: 'documento',
        entity: `Categoria "${pendingDrop.sourceLabel}" → página "${pendingDrop.destPageLabel}" (${result.moved} documento(s), ${result.routingUpdated} regra(s) de Auto CVM)`,
      });
      setPendingDrop(null);
    } finally {
      setDropTransferring(false);
    }
  }

  // Modals
  const [editModal, setEditModal] = useState<EditState | null>(null);
  const [canalEditModal, setCanalEditModal] = useState<CanalEditState | null>(null);
  const [newCanalOpen, setNewCanalOpen] = useState(false);
  const [newCanalForm, setNewCanalForm] = useState<NewCanalForm>(emptyNewCanalForm(portalEmpresas));
  const [newSubOpen, setNewSubOpen] = useState(false);
  const [newSubForm, setNewSubForm] = useState<NewSubForm>(emptyNewSubForm('', null, false, portalEmpresas));
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState | null>(null);
  const [subConfirming, setSubConfirming] = useState(false);

  // Árvore de canais — canais colapsados (accordion por canal, todos abertos por padrão)
  const [collapsedCanals, setCollapsedCanals] = useState<Set<string>>(() => new Set());
  function toggleCanalCollapsed(id: string) {
    setCollapsedCanals(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Same collapse/expand as L1 canais, for an L2 sub-página that has its own
  // L3 sub-subpáginas — those used to always render inline with no way to
  // hide them.
  const [collapsedSubs, setCollapsedSubs] = useState<Set<string>>(() => new Set());
  function toggleSubCollapsed(id: string) {
    setCollapsedSubs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Animation
  const [movedCanals, setMovedCanals] = useState<{ id: string; dir: -1 | 1 }[]>([]);
  const movedCanalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function animateCanal(idA: string, idB: string, dir: -1 | 1) {
    if (movedCanalTimer.current) clearTimeout(movedCanalTimer.current);
    setMovedCanals([{ id: idA, dir }, { id: idB, dir: (dir * -1) as -1 | 1 }]);
    movedCanalTimer.current = setTimeout(() => setMovedCanals([]), 500);
  }

  const [saveError, setSaveError] = useState<string | null>(null);

  const orderChanged = orderKey(canais) !== savedOrderKey;
  const mutate = useCallback((fn: (prev: Canal[]) => Canal[]) => {
    setCanais(prev => {
      const next = fn(prev);
      localStorage.setItem(canaisKey, JSON.stringify(next));
      if (activePortalId) {
        savePortalConfig(activePortalId, { canais: next })
          .then(() => setSaveError(null))
          .catch(err => { console.error(err); setSaveError(String(err?.message ?? err)); });
      }
      notifyDraft();
      return next;
    });
  }, [canaisKey, activePortalId, notifyDraft]);

  function saveToStorage(updated: Canal[]) {
    localStorage.setItem(canaisKey, JSON.stringify(updated));
    if (activePortalId) {
      savePortalConfig(activePortalId, { canais: updated })
        .then(() => setSaveError(null))
        .catch(err => { console.error(err); setSaveError(String(err?.message ?? err)); });
    }
    notifyDraft();
  }
  function handleSaveOrder() {
    saveToStorage(canais);
    setSavedOrderKey(orderKey(canais));
  }

  // Publish must not race the async Supabase save: flush the CURRENT tree to
  // portal_config and await it before publish() reads the config back.
  async function handlePublish() {
    localStorage.setItem(canaisKey, JSON.stringify(canais));
    if (activePortalId) {
      try {
        await savePortalConfig(activePortalId, { canais });
        setSaveError(null);
      } catch (e) {
        console.error(e);
        setSaveError(String((e as Error)?.message ?? e));
        return; // don't publish a state the database rejected
      }
    }
    setSavedOrderKey(orderKey(canais));
    await publish();
  }

  // ── Canal actions ──────────────────────────────────────────────────────
  function toggleCanal(cid: string) {
    mutate(prev => prev.map(c => c.id === cid ? { ...c, enabled: !c.enabled } : c));
  }
  function removeCanal(cid: string) {
    mutate(prev => prev.filter(c => c.id !== cid));
  }
  function moveCanal(idx: number, dir: -1 | 1) {
    mutate(prev => {
      const next = [...prev];
      const t = idx + dir;
      if (t < 0 || t >= next.length) return prev;
      animateCanal(next[idx].id, next[t].id, dir);
      [next[idx], next[t]] = [next[t], next[idx]];
      return next;
    });
  }

  // ── SubCanal (L2) ──────────────────────────────────────────────────────
  function toggleSub(cid: string, sid: string) {
    mutate(prev => prev.map(c => c.id !== cid ? c : {
      ...c, children: c.children.map(s => s.id === sid ? { ...s, enabled: !s.enabled } : s),
    }));
  }
  function removeSub(cid: string, sid: string) {
    mutate(prev => prev.map(c => c.id !== cid ? c : {
      ...c, children: c.children.filter(s => s.id !== sid),
    }));
  }
  function moveSub(cid: string, idx: number, dir: -1 | 1) {
    mutate(prev => prev.map(c => {
      if (c.id !== cid) return c;
      const ch = [...c.children];
      const t = idx + dir;
      if (t < 0 || t >= ch.length) return c;
      [ch[idx], ch[t]] = [ch[t], ch[idx]];
      return { ...c, children: ch };
    }));
  }

  // ── SubSubCanal (L3) ───────────────────────────────────────────────────
  function toggleSubSub(cid: string, sid: string, ssid: string) {
    mutate(prev => prev.map(c => c.id !== cid ? c : {
      ...c, children: c.children.map(s => s.id !== sid ? s : {
        ...s, children: (s.children ?? []).map(ss => ss.id === ssid ? { ...ss, enabled: !ss.enabled } : ss),
      }),
    }));
  }
  function removeSubSub(cid: string, sid: string, ssid: string) {
    mutate(prev => prev.map(c => c.id !== cid ? c : {
      ...c, children: c.children.map(s => s.id !== sid ? s : {
        ...s, children: (s.children ?? []).filter(ss => ss.id !== ssid),
      }),
    }));
  }
  function moveSubSub(cid: string, sid: string, idx: number, dir: -1 | 1) {
    mutate(prev => prev.map(c => c.id !== cid ? c : {
      ...c, children: c.children.map(s => {
        if (s.id !== sid) return s;
        const ch = [...(s.children ?? [])];
        const t = idx + dir;
        if (t < 0 || t >= ch.length) return s;
        [ch[idx], ch[t]] = [ch[t], ch[idx]];
        return { ...s, children: ch };
      }),
    }));
  }
  function openNewSubSub(canalId: string, subId: string) {
    const canal = canais.find(c => c.id === canalId);
    const canalHasHeaderImage = !!(canal?.headerImage);
    setNewSubForm(emptyNewSubForm(canalId, subId, canalHasHeaderImage, portalEmpresas));
    setNewSubOpen(true);
  }

  // ── Delete with confirmation ───────────────────────────────────────────
  // Flat list of every leaf/parent node id + its own pageType, across all
  // three levels — this is the same id scheme portal_documents.pagina_ids
  // and portal_materias.page_id store, unlike the composite ids `allPages`
  // (above) uses for the edit-modal transfer picker.
  function flatNodeList(): Array<{ id: string; label: string; pageType?: PageType }> {
    const out: Array<{ id: string; label: string; pageType?: PageType }> = [];
    for (const c of canais) {
      out.push({ id: c.id, label: c.label, pageType: c.pageType });
      for (const s of c.children) {
        out.push({ id: s.id, label: `${c.label} → ${s.label}`, pageType: s.pageType });
        for (const ss of s.children ?? []) {
          out.push({ id: ss.id, label: `${c.label} → ${s.label} → ${ss.label}`, pageType: ss.pageType });
        }
      }
    }
    return out;
  }
  function collectAffectedIds(state: ConfirmDeleteState): string[] {
    if (state.type === 'canal') {
      const canal = canais.find(c => c.id === state.canalId);
      if (!canal) return [state.canalId];
      const ids = [canal.id];
      for (const s of canal.children) {
        ids.push(s.id);
        for (const ss of s.children ?? []) ids.push(ss.id);
      }
      return ids;
    }
    if (state.type === 'sub') {
      const canal = canais.find(c => c.id === state.canalId);
      const sub = canal?.children.find(s => s.id === state.subId);
      const ids = [state.subId!];
      for (const ss of sub?.children ?? []) ids.push(ss.id);
      return ids;
    }
    return [state.subSubId!];
  }

  async function openConfirmDelete(base: Pick<ConfirmDeleteState, 'type' | 'label' | 'canalId' | 'subId' | 'subSubId'>) {
    const initial: ConfirmDeleteState = {
      ...base,
      checking: true,
      affectedIds: [],
      hasTabelaResultados: false,
      cvmDocsCount: 0,
      otherDocsCount: 0,
      materiasCount: 0,
      resultadosPublicadosCount: 0,
      transferTo: '',
    };
    setConfirmDelete(initial);
    const affectedIds = collectAffectedIds(initial);
    const nodes = flatNodeList();
    const hasTabelaResultados = affectedIds.some(id => nodes.find(n => n.id === id)?.pageType === 'tabela-resultados');

    if (!portalDbId || !isSupabaseConfigured || !supabase) {
      setConfirmDelete(prev => prev && prev === initial ? { ...prev, checking: false, affectedIds, hasTabelaResultados } : prev);
      return;
    }
    try {
      const [{ data: docs }, { data: materias }, resultadosRes] = await Promise.all([
        supabase.from('portal_documents').select('id, from_cvm, pagina_ids').eq('portal_id', portalDbId).overlaps('pagina_ids', affectedIds),
        supabase.from('portal_materias').select('id', { count: 'exact', head: false }).eq('portal_id', portalDbId).in('page_id', affectedIds),
        hasTabelaResultados
          ? supabase.from('portal_resultado_periodos').select('id', { count: 'exact', head: true }).eq('portal_id', portalDbId).eq('status', 'Publicado')
          : Promise.resolve({ count: 0 }),
      ]);
      const cvmDocsCount = (docs ?? []).filter(d => d.from_cvm).length;
      const otherDocsCount = (docs ?? []).length - cvmDocsCount;
      setConfirmDelete(prev => prev && prev.canalId === initial.canalId && prev.subId === initial.subId && prev.subSubId === initial.subSubId ? {
        ...prev,
        checking: false,
        affectedIds,
        hasTabelaResultados,
        cvmDocsCount,
        otherDocsCount,
        materiasCount: materias?.length ?? 0,
        resultadosPublicadosCount: (resultadosRes as { count: number | null }).count ?? 0,
      } : prev);
    } catch (e) {
      console.error(e);
      setConfirmDelete(prev => prev ? { ...prev, checking: false, affectedIds, hasTabelaResultados } : prev);
    }
  }

  async function handleLinkedContent(state: ConfirmDeleteState) {
    if (!portalDbId || !isSupabaseConfigured || !supabase || state.affectedIds.length === 0) return;
    const { affectedIds, transferTo } = state;

    // Documents (CVM-imported and manual) whose pagina_ids reference a
    // deleted page.
    const { data: docs } = await supabase.from('portal_documents')
      .select('id, from_cvm, pagina_ids').eq('portal_id', portalDbId).overlaps('pagina_ids', affectedIds);
    if (docs && docs.length > 0) {
      const cvmDocs = docs.filter(d => d.from_cvm);
      const otherDocs = docs.filter(d => !d.from_cvm);

      if (transferTo) {
        // Transfer: swap the deleted ids for the target page id in pagina_ids.
        await Promise.all(docs.map(d => {
          const kept = ((d.pagina_ids as string[]) ?? []).filter(id => !affectedIds.includes(id));
          const nextIds = kept.includes(transferTo) ? kept : [...kept, transferTo];
          return supabase!.from('portal_documents').update({ pagina_ids: nextIds }).eq('id', d.id);
        }));
      } else {
        // No transfer: CVM-imported docs are deleted outright; manually
        // uploaded docs are unlinked (or drafted if that leaves them with
        // no specific page, so they don't silently start showing on every
        // page — an empty pagina_ids means "all pages" elsewhere in this app).
        if (cvmDocs.length > 0) {
          const paths = cvmDocs.flatMap((d: Record<string, unknown>) => {
            const arquivos = (d.arquivos as Record<string, { filePath?: string }> | null) ?? {};
            const fromArquivos = Object.values(arquivos).map(a => a.filePath).filter((p): p is string => !!p);
            return fromArquivos.length > 0 ? fromArquivos : ((d.file_path as string | null) ? [d.file_path as string] : []);
          });
          await supabase.from('portal_documents').delete().in('id', cvmDocs.map(d => d.id));
          if (paths.length > 0) await supabase.storage.from('portal-documents').remove(paths);
        }
        await Promise.all(otherDocs.map(d => {
          const kept = ((d.pagina_ids as string[]) ?? []).filter(id => !affectedIds.includes(id));
          return supabase!.from('portal_documents').update({
            pagina_ids: kept,
            ...(kept.length === 0 ? { status: 'Rascunho' } : {}),
          }).eq('id', d.id);
        }));
      }
    }

    // Matérias (incl. Formulários, which reuse the same store): always drop
    // to draft, unlinked, waiting to be reassigned to another page.
    if (state.materiasCount > 0) {
      await supabase.from('portal_materias')
        .update({ page_id: null, page_label: null, status: 'rascunho' })
        .eq('portal_id', portalDbId).in('page_id', affectedIds);

      // Mirror the same change into the localStorage cache — this Supabase
      // update bypasses persistMateria/deleteMateria entirely, so without
      // this the cache keeps the old pageId with status 'publicado' and
      // pageHasPublishedMateria() (localStorage-only) keeps reporting the
      // destination page as occupied forever, even though nothing is
      // actually linked to it anymore.
      loadMaterias(activePortalId)
        .filter(m => affectedIds.includes(m.pageId))
        .forEach(m => persistMateria({ ...m, pageId: '', pageLabel: '', status: 'rascunho' }, activePortalId));
    }

    // Resultados: this page (pageType 'tabela-resultados') is the only
    // place these render, so there's nowhere to "transfer" them to — drop
    // to draft and flag for auto-reactivation once a new Central de
    // Resultados page exists (handled in CentralDeResultadosPage2).
    if (state.hasTabelaResultados && state.resultadosPublicadosCount > 0) {
      await Promise.all([
        supabase.from('portal_resultado_periodos')
          .update({ status: 'Rascunho', pending_reactivation: true }).eq('portal_id', portalDbId).eq('status', 'Publicado'),
        supabase.from('portal_resultado_arquivos')
          .update({ status: 'Rascunho', pending_reactivation: true }).eq('portal_id', portalDbId).eq('status', 'Publicado'),
      ]);
    }
  }

  async function doDelete() {
    if (!confirmDelete) return;
    await handleLinkedContent(confirmDelete);
    if (confirmDelete.type === 'canal') {
      removeCanal(confirmDelete.canalId);
    } else if (confirmDelete.type === 'sub') {
      removeSub(confirmDelete.canalId, confirmDelete.subId!);
    } else {
      removeSubSub(confirmDelete.canalId, confirmDelete.subId!, confirmDelete.subSubId!);
    }
    setConfirmDelete(null);
  }

  // ── New sub-page (Add page) modal ──────────────────────────────────────
  function openNewSub(canalId: string) {
    const canal = canais.find(c => c.id === canalId);
    const canalHasHeaderImage = !!(canal?.headerImage);
    setNewSubForm(emptyNewSubForm(canalId, null, canalHasHeaderImage, portalEmpresas));
    setNewSubOpen(true);
  }

  function patchSub(patch: Partial<NewSubForm>) {
    setNewSubForm(f => ({ ...f, ...patch }));
  }

  function commitNewSub() {
    const primaryLang = PORTAL_CONFIG.languages[0];
    const label = newSubForm.labels[primaryLang]?.trim() || 'Nova página';
    const href = newSubForm.href.trim() || '/' + label.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-') + '.html';
    const newId = genId();

    if (newSubForm.parentSubId) {
      // L3: add as sub-sub-page
      const ss: SubSubCanal = {
        id: newId, label, labels: newSubForm.labels, href, enabled: !newSubForm.draft,
        ...(newSubForm.headerImageUrl ? { headerImage: newSubForm.headerImageUrl } : {}),
      };
      mutate(prev => prev.map(c => c.id !== newSubForm.canalId ? c : {
        ...c, children: c.children.map(s => s.id !== newSubForm.parentSubId ? s : {
          ...s, children: [...(s.children ?? []), ss],
        }),
      }));
    } else {
      const s: SubCanal = {
        id: newId, label, labels: newSubForm.labels, href,
        enabled: !newSubForm.draft,
        ...(newSubForm.hasChildren ? {} : { pageType: newSubForm.pageType }),
        ...(newSubForm.isExternalLink ? { isExternalLink: true, externalUrl: newSubForm.externalUrl } : {}),
        ...(newSubForm.pageType === 'lista-agrupada'
          ? { listaAgrupadaStyle: newSubForm.laStyle, listaAgrupadaCategories: resolveGroupCategories(newSubForm) }
          : {}),
        ...(newSubForm.headerImageUrl ? { headerImage: newSubForm.headerImageUrl } : {}),
      };
      mutate(prev => prev.map(c => c.id !== newSubForm.canalId ? c : { ...c, children: [...c.children, s] }));
    }

    if (newSubForm.linkedMateriaIds.length > 0) {
      const all = loadMaterias(activePortalId ?? undefined);
      for (const mid of newSubForm.linkedMateriaIds) {
        const m = all.find(x => x.id === mid);
        if (m) persistMateria({ ...m, pageId: newId, pageLabel: label }, activePortalId ?? undefined);
      }
    }

    setNewSubOpen(false);
    setSubConfirming(false);
  }

  function triggerSubConfirm() {
    setSubConfirming(true);
    setTimeout(commitNewSub, 900);
  }

  // can commit new sub?
  const canCommitSub = !!(
    newSubForm.labels[PORTAL_CONFIG.languages[0]]?.trim() &&
    (newSubForm.hasChildren ||
     (!!newSubForm.pageType && (
       newSubForm.pageType !== 'lista-agrupada' ||
       (hasMultipleEmpresas
         ? newSubForm.laSelectedEmpresas.some(id => (newSubForm.laEmpresaCategories[id]?.length ?? 0) > 0)
         : newSubForm.laCategories.length > 0)
     )))
  );

  const subHasMatStep = !newSubForm.hasChildren && !!newSubForm.pageType && MATERIA_STEP_TYPES.includes(newSubForm.pageType);
  const subTotalSteps = newSubForm.hasChildren ? 1 : newSubForm.pageType === 'lista-agrupada' ? 4 : subHasMatStep ? 3 : 2;
  const canalHasMatStep = newCanalForm.tipo !== 'pai' && !!newCanalForm.pageType && MATERIA_STEP_TYPES.includes(newCanalForm.pageType);

  // ── Canal edit ─────────────────────────────────────────────────────────
  function openCanalEdit(canal: Canal) {
    const primaryLang = PORTAL_CONFIG.languages[0];
    setCanalEditModal({
      canalId: canal.id,
      locale: primaryLang,
      labels: (canal.labels as Record<string, string> | undefined) ?? { [primaryLang]: canal.label },
      label: canal.label,
      pageType: canal.pageType,
      listaAgrupadaStyle: canal.listaAgrupadaStyle ?? 'accordion',
      headerImageUrl: canal.headerImage ?? null,
      applyHeaderToChildren: false,
      isLeaf: canal.children.length === 0,
      showInFooter: canal.showInFooter ?? false,
      laCategories: normalizeMarcadores(canal.listaAgrupadaCategories),
    });
  }
  function commitCanalEdit() {
    if (!canalEditModal) return;
    const primaryLang = PORTAL_CONFIG.languages[0];
    const { canalId, labels, label, pageType, listaAgrupadaStyle, headerImageUrl, applyHeaderToChildren, isLeaf, showInFooter, laCategories } = canalEditModal;
    const resolvedLabel = labels[primaryLang]?.trim() || label;
    setCanais(prev => {
      const next = prev.map(c => {
        if (c.id !== canalId) return c;
        const updated: Canal = {
          ...c, label: resolvedLabel.trim() || c.label, labels,
          pageType: isLeaf ? pageType : c.pageType,
          listaAgrupadaStyle: isLeaf && pageType === 'lista-agrupada' ? listaAgrupadaStyle : c.listaAgrupadaStyle,
          listaAgrupadaCategories: isLeaf && pageType === 'lista-agrupada'
            ? laCategories
            : c.listaAgrupadaCategories,
          headerImage: headerImageUrl ?? undefined, showInFooter,
        };
        if (applyHeaderToChildren && headerImageUrl) {
          updated.children = c.children.map(s => ({ ...s, headerImage: headerImageUrl }));
        }
        return updated;
      });
      saveToStorage(next);
      return next;
    });
    setCanalEditModal(null);
  }

  // ── New canal wizard ───────────────────────────────────────────────────
  function commitNewCanal() {
    const primaryLang = PORTAL_CONFIG.languages[0];
    const label = newCanalForm.titles[primaryLang]?.trim() || 'Novo canal';
    const isLeaf = newCanalForm.tipo === 'pagina';
    const newId = genId();
    const c: Canal = {
      id: newId, label, labels: newCanalForm.titles, enabled: !newCanalForm.draft, children: [],
      ...(isLeaf ? { pageType: newCanalForm.pageType, href: `/${newId}.html` } : {}),
      ...(isLeaf && newCanalForm.pageType === 'lista-agrupada'
        ? { listaAgrupadaStyle: newCanalForm.laStyle, listaAgrupadaCategories: resolveGroupCategories(newCanalForm) } : {}),
      ...(newCanalForm.headerImageUrl ? { headerImage: newCanalForm.headerImageUrl } : {}),
    };
    mutate(prev => [...prev, c]);

    if (newCanalForm.linkedMateriaIds.length > 0) {
      const all = loadMaterias(activePortalId ?? undefined);
      for (const mid of newCanalForm.linkedMateriaIds) {
        const m = all.find(x => x.id === mid);
        if (m) persistMateria({ ...m, pageId: newId, pageLabel: label }, activePortalId ?? undefined);
      }
    }

    setNewCanalOpen(false);
    setNewCanalForm(emptyNewCanalForm(portalEmpresas));
  }

  // ── Sub/SubSub edit ────────────────────────────────────────────────────
  const _laDefaults = {
    laByEmpresa: hasMultipleEmpresas,
    laSelectedEmpresas: portalEmpresas.map(e => e.id),
    laFiltroEmpresa: hasMultipleEmpresas,
    laCategories: [] as Marcador[],
    laEmpresaCategories: {} as Record<string, Marcador[]>,
    laActiveEmpresa: portalEmpresas[0]?.id ?? '',
  };

  function openEdit(cid: string, sub: SubCanal, parentSubId?: string) {
    const primaryLang = PORTAL_CONFIG.languages[0];
    const parentCanal = canais.find(c => c.id === cid);
    setEditModal({
      canalId: cid, parentSubId, subId: sub.id,
      locale: primaryLang,
      labels: (sub.labels as Record<string, string> | undefined) ?? { [primaryLang]: sub.label },
      label: sub.label, href: sub.href, targetCanalId: cid,
      pageType: sub.pageType, listaAgrupadaStyle: sub.listaAgrupadaStyle ?? 'accordion',
      isExternalLink: sub.isExternalLink ?? false, externalUrl: sub.externalUrl ?? '',
      showInFooter: sub.showInFooter ?? false, transferTo: '',
      headerImageUrl: sub.headerImage ?? null,
      canalHeaderImage: parentCanal?.headerImage ?? null,
      ..._laDefaults,
      laByEmpresa: false,
      laCategories: normalizeMarcadores(sub.listaAgrupadaCategories),
    });
  }
  function openEditSubSub(cid: string, sid: string, ss: SubSubCanal) {
    const primaryLang = PORTAL_CONFIG.languages[0];
    const parentCanal = canais.find(c => c.id === cid);
    const parentSub = parentCanal?.children.find(s => s.id === sid);
    setEditModal({
      canalId: cid, parentSubId: sid, subId: ss.id,
      locale: primaryLang,
      labels: (ss.labels as Record<string, string> | undefined) ?? { [primaryLang]: ss.label },
      label: ss.label, href: ss.href, targetCanalId: cid,
      pageType: ss.pageType, listaAgrupadaStyle: 'accordion',
      isExternalLink: ss.isExternalLink ?? false, externalUrl: ss.externalUrl ?? '',
      showInFooter: false, transferTo: '',
      headerImageUrl: ss.headerImage ?? null,
      canalHeaderImage: parentSub?.headerImage ?? parentCanal?.headerImage ?? null,
      ..._laDefaults,
    });
  }
  function commitEdit() {
    if (!editModal) return;
    const primaryLang = PORTAL_CONFIG.languages[0];
    const resolvedLabel = editModal.labels[primaryLang]?.trim() || editModal.label;
    const { canalId, parentSubId, subId, href, targetCanalId, pageType, listaAgrupadaStyle, isExternalLink, externalUrl, showInFooter, headerImageUrl } = editModal;
    const label = resolvedLabel;
    if (parentSubId) {
      setCanais(prev => {
        const next = prev.map(c => c.id !== canalId ? c : {
          ...c, children: c.children.map(s => s.id !== parentSubId ? s : {
            ...s, children: (s.children ?? []).map(ss => ss.id !== subId ? ss : {
              ...ss, label: label.trim() || ss.label, labels: editModal.labels, href: href.trim() || ss.href,
              pageType, isExternalLink, externalUrl: isExternalLink ? externalUrl : undefined,
              headerImage: headerImageUrl ?? undefined,
            }),
          }),
        });
        saveToStorage(next); return next;
      });
    } else {
      setCanais(prev => {
        let movingSub: SubCanal | null = null;
        const without = prev.map(c => {
          if (c.id !== canalId) return c;
          const sub = c.children.find(s => s.id === subId);
          if (sub) movingSub = {
            ...sub, label: label.trim() || sub.label, labels: editModal.labels, href: href.trim() || sub.href,
            pageType,
            listaAgrupadaStyle: pageType === 'lista-agrupada' ? listaAgrupadaStyle : undefined,
            listaAgrupadaCategories: pageType === 'lista-agrupada' ? resolveGroupCategories(editModal) : undefined,
            isExternalLink, externalUrl: isExternalLink ? externalUrl : undefined, showInFooter,
            headerImage: headerImageUrl ?? undefined,
          };
          return { ...c, children: c.children.filter(s => s.id !== subId) };
        });
        if (!movingSub) return prev;
        const ms = movingSub as SubCanal;
        const next = without.map(c => c.id !== targetCanalId ? c : { ...c, children: [...c.children, ms] });
        saveToStorage(next); return next;
      });
    }
    setEditModal(null);
  }

  // All pages for transfer picker
  const allPages = canais.flatMap(c => [
    ...c.children.map(s => ({ id: `${c.id}::${s.id}`, label: `${c.label} → ${s.label}` })),
    ...(c.children.flatMap(s => (s.children ?? []).map(ss => ({
      id: `${c.id}::${s.id}::${ss.id}`, label: `${c.label} → ${s.label} → ${ss.label}`,
    })))),
  ]);

  const canAdvanceNewCanal = !!newCanalForm.titles[PORTAL_CONFIG.languages[0]]?.trim();
  const canCommitNewCanal = newCanalForm.tipo === 'pai' || (
    !!newCanalForm.pageType && (
      newCanalForm.pageType !== 'lista-agrupada' || (
        hasMultipleEmpresas
          ? (!newCanalForm.laByEmpresa ||
             newCanalForm.laSelectedEmpresas.some(id => (newCanalForm.laEmpresaCategories[id]?.length ?? 0) > 0))
          : newCanalForm.laCategories.length > 0
      )
    )
  );

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <StickyPageHeader
        title="Árvore de canais"
        description={<>Árvore de navegação do portal <strong>{portalName}</strong>.</>}
        action={
          <div className="publish-actions">
            {orderChanged && (
              <button className="btn-outline" type="button" onClick={handleSaveOrder}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>save</span>
                Salvar ordem
              </button>
            )}
            <button className="btn-outline" type="button" onClick={() => { setNewCanalForm({ ...emptyNewCanalForm(portalEmpresas), tipo: isFlatLayout ? 'pagina' : 'pai' }); setNewCanalOpen(true); }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
              Novo canal
            </button>
            <PublishButton onClick={handlePublish} disabled={!hasPendingDraft} />
          </div>
        }
      />

      {saveError && (
        <div className="ct-save-error" role="alert">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
          <span>Alteração não foi salva no banco: {saveError}. Se você acabou de receber acesso a este portal, saia e entre novamente para renovar a sessão.</span>
        </div>
      )}

      {/* ── Árvore de canais (grid, um card por canal) ──────────────────── */}
      <div className="ct-tree">
        {canais.length === 0 && (
          <div className="ct-empty">Não há canais cadastrados</div>
        )}

        {canais.length > 0 && (
          <div className="ct-grid ct-grid--header">
            <span>Nome</span>
            <span>Status</span>
            <span>Tipo</span>
            <span>Nível</span>
            <span>Posição</span>
            <span></span>
          </div>
        )}

        {canais.map((canal, ci) => {
          const movedInfo = movedCanals.find(x => x.id === canal.id);
          const movedClass = movedInfo ? `ct-row--moved-${movedInfo.dir === -1 ? 'up' : 'down'}` : '';
          const collapsed = collapsedCanals.has(canal.id);
          return (
            <div key={canal.id} className={['ct-canal-group', movedClass].filter(Boolean).join(' ')}>
              {/* L1 — Canal */}
              <div className={['ct-grid', 'ct-tr', 'ct-tr--l1', !canal.enabled ? 'ct-tr--off' : ''].filter(Boolean).join(' ')}
                onDragOver={e => handleCanalDragOver(e, canal.pageType)}
                onDrop={e => handleCanalDrop(e, canal.id, canal.label, canal.pageType)}>
                <span className="table-cell--bold ct-tree-name" data-level={0}>
                  <button className="ct-collapse-btn" type="button" onClick={() => toggleCanalCollapsed(canal.id)}
                    aria-label={collapsed ? 'Expandir' : 'Recolher'}>
                    <span className={`material-symbols-outlined${collapsed ? ' ct-collapse-btn__icon--closed' : ''}`}>expand_more</span>
                  </button>
                  {canal.label}
                </span>
                <span>
                  <span className={`badge ${canal.enabled ? 'badge--success' : 'badge--gray'}`}>
                    {canal.enabled ? 'Publicado' : 'Rascunho'}
                  </span>
                </span>
                <span>
                  {canal.children.length === 0 ? (
                    canal.pageType
                      ? <span className="ct-type-badge">{canal.pageType}</span>
                      : <span className="ct-type-badge ct-type-badge--warn" title="Nenhum conteúdo pode ser publicado aqui até um formato ser escolhido em Editar">Sem formato</span>
                  ) : (
                    <span className="ct-type-badge">Canal</span>
                  )}
                </span>
                <span><span className="ct-type-badge ct-type-badge--nivel">Raiz</span></span>
                <span>
                  <div className="ct-row__reorder">
                    <button className="ct-icon-btn" type="button" title="Subir" onClick={() => moveCanal(ci, -1)} disabled={ci === 0}>
                      <span className="material-symbols-outlined">expand_less</span>
                    </button>
                    <button className="ct-icon-btn" type="button" title="Descer" onClick={() => moveCanal(ci, 1)} disabled={ci === canais.length - 1}>
                      <span className="material-symbols-outlined">expand_more</span>
                    </button>
                  </div>
                </span>
                <span className="table-actions">
                  <RowActionsMenu>
                    {!isFlatLayout && (
                      <button className="btn-action btn-action--enter" type="button" onClick={() => openNewSub(canal.id)}>
                        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>add</span>
                        Sub-página
                      </button>
                    )}
                    <button className="btn-action btn-action--enter btn-action--icon" type="button" title="Editar" onClick={() => openCanalEdit(canal)}>
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button className={`btn-action btn-action--icon ${canal.enabled ? 'btn-action--secondary' : 'btn-action--enter'}`} type="button"
                      title={canal.enabled ? 'Despublicar' : 'Publicar'} onClick={() => toggleCanal(canal.id)}>
                      <span className="material-symbols-outlined">{canal.enabled ? 'visibility_off' : 'visibility'}</span>
                    </button>
                    <button className="btn-action btn-action--danger" type="button"
                      onClick={() => openConfirmDelete({ type: 'canal', label: canal.label, canalId: canal.id })}>
                      Excluir
                    </button>
                  </RowActionsMenu>
                </span>
              </div>

              {!collapsed && canal.children.length === 0 && canal.pageType === 'lista-agrupada' && (
                <div className="ct-tr ct-tr--empty"
                  onDragOver={e => handleCanalDragOver(e, canal.pageType)}
                  onDrop={e => handleCanalDrop(e, canal.id, canal.label, canal.pageType)}>
                  {normalizeMarcadores(canal.listaAgrupadaCategories).length > 0 ? (
                    <div className="ct-la-cats">
                      {normalizeMarcadores(canal.listaAgrupadaCategories).map(cat => (
                        <span key={cat.id} className="ct-la-cat-chip ct-la-cat-chip--sm" draggable
                          onDragStart={e => handleMarkerDragStart(e, canal.id, cat.label)}
                          title="Arraste para outro canal para transferir esta categoria">{cat.label}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="ct-empty">Nenhum grupo cadastrado — abra "Editar" para adicionar.</span>
                  )}
                </div>
              )}
              {!collapsed && canal.children.length === 0 && canal.pageType !== 'lista-agrupada' && (
                <div className="ct-tr ct-tr--empty">
                  <span className="ct-empty">Nenhuma página neste canal.</span>
                </div>
              )}

              {/* L2 — Sub-página */}
              {!collapsed && canal.children.length > 0 && (
                <div className="ct-l2-group">
                  {canal.children.map((sub, si) => {
                    const subHasChildren = (sub.children ?? []).length > 0;
                    const subCollapsed = collapsedSubs.has(sub.id);
                    return (
                    <Fragment key={sub.id}>
                      <div className={['ct-grid', 'ct-tr', 'ct-tr--l2', !sub.enabled ? 'ct-tr--off' : ''].filter(Boolean).join(' ')}
                        onDragOver={e => handleCanalDragOver(e, sub.pageType)}
                        onDrop={e => handleCanalDrop(e, sub.id, sub.label, sub.pageType)}>
                        <span className="ct-tree-name" data-level={1}>
                          {subHasChildren && (
                            <button className="ct-collapse-btn" type="button" onClick={() => toggleSubCollapsed(sub.id)}
                              aria-label={subCollapsed ? 'Expandir' : 'Recolher'}>
                              <span className={`material-symbols-outlined${subCollapsed ? ' ct-collapse-btn__icon--closed' : ''}`}>expand_more</span>
                            </button>
                          )}
                          {sub.label}
                        </span>
                        <span>
                          <span className={`badge ${sub.enabled ? 'badge--success' : 'badge--gray'}`}>
                            {sub.enabled ? 'Publicado' : 'Rascunho'}
                          </span>
                        </span>
                        <span>
                          {sub.pageType
                            ? <span className="ct-type-badge">{sub.pageType}</span>
                            : <span className="ct-type-badge ct-type-badge--warn" title="Nenhum conteúdo pode ser publicado aqui até um formato ser escolhido em Editar">Sem formato</span>}
                          {cvmPageIds.has(sub.id) && <span className="ct-cvm-badge">⟳ Auto CVM</span>}
                        </span>
                        <span><span className="ct-type-badge ct-type-badge--nivel">Subpágina</span></span>
                        <span>
                          <div className="ct-row__reorder">
                            <button className="ct-icon-btn" type="button" onClick={() => moveSub(canal.id, si, -1)} disabled={si === 0}>
                              <span className="material-symbols-outlined">expand_less</span>
                            </button>
                            <button className="ct-icon-btn" type="button" onClick={() => moveSub(canal.id, si, 1)} disabled={si === canal.children.length - 1}>
                              <span className="material-symbols-outlined">expand_more</span>
                            </button>
                          </div>
                        </span>
                        <span className="table-actions">
                          <RowActionsMenu>
                            {!isFlatLayout && (
                              <button className="btn-action btn-action--enter" type="button" onClick={() => openNewSubSub(canal.id, sub.id)}>
                                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>add</span>
                                Sub-página
                              </button>
                            )}
                            <button className="btn-action btn-action--enter btn-action--icon" type="button" title="Editar" onClick={() => openEdit(canal.id, sub)}>
                              <span className="material-symbols-outlined">edit</span>
                            </button>
                            <button className={`btn-action btn-action--icon ${sub.enabled ? 'btn-action--secondary' : 'btn-action--enter'}`} type="button"
                              title={sub.enabled ? 'Despublicar' : 'Publicar'} onClick={() => toggleSub(canal.id, sub.id)}>
                              <span className="material-symbols-outlined">{sub.enabled ? 'visibility_off' : 'visibility'}</span>
                            </button>
                            <button className="btn-action btn-action--danger" type="button"
                              onClick={() => openConfirmDelete({ type: 'sub', label: sub.label, canalId: canal.id, subId: sub.id })}>
                              Excluir
                            </button>
                          </RowActionsMenu>
                        </span>
                      </div>

                      {/* L3 — Sub-subpágina */}
                      {!subCollapsed && subHasChildren && (
                        <div className="ct-l3-group">
                          {(sub.children ?? []).map((ss, ssi) => (
                            <div key={ss.id} className={['ct-grid', 'ct-tr', 'ct-tr--l3', !ss.enabled ? 'ct-tr--off' : ''].filter(Boolean).join(' ')}
                              onDragOver={e => handleCanalDragOver(e, ss.pageType)}
                              onDrop={e => handleCanalDrop(e, ss.id, ss.label, ss.pageType)}>
                              <span className="ct-tree-name" data-level={2}>{ss.label}</span>
                              <span>
                                <span className={`badge ${ss.enabled ? 'badge--success' : 'badge--gray'}`}>
                                  {ss.enabled ? 'Publicado' : 'Rascunho'}
                                </span>
                              </span>
                              <span>
                                {ss.pageType
                                  ? <span className="ct-type-badge">{ss.pageType}</span>
                                  : <span className="ct-type-badge ct-type-badge--warn" title="Nenhum conteúdo pode ser publicado aqui até um formato ser escolhido em Editar">Sem formato</span>}
                                {cvmPageIds.has(ss.id) && <span className="ct-cvm-badge">⟳ Auto CVM</span>}
                              </span>
                              <span><span className="ct-type-badge ct-type-badge--nivel">Sub-subpágina</span></span>
                              <span>
                                <div className="ct-row__reorder">
                                  <button className="ct-icon-btn" type="button" onClick={() => moveSubSub(canal.id, sub.id, ssi, -1)} disabled={ssi === 0}>
                                    <span className="material-symbols-outlined">expand_less</span>
                                  </button>
                                  <button className="ct-icon-btn" type="button" onClick={() => moveSubSub(canal.id, sub.id, ssi, 1)} disabled={ssi === (sub.children?.length ?? 0) - 1}>
                                    <span className="material-symbols-outlined">expand_more</span>
                                  </button>
                                </div>
                              </span>
                              <span className="table-actions">
                                <RowActionsMenu>
                                  <button className="btn-action btn-action--enter btn-action--icon" type="button" title="Editar" onClick={() => openEditSubSub(canal.id, sub.id, ss)}>
                                    <span className="material-symbols-outlined">edit</span>
                                  </button>
                                  <button className={`btn-action btn-action--icon ${ss.enabled ? 'btn-action--secondary' : 'btn-action--enter'}`} type="button"
                                    title={ss.enabled ? 'Despublicar' : 'Publicar'} onClick={() => toggleSubSub(canal.id, sub.id, ss.id)}>
                                    <span className="material-symbols-outlined">{ss.enabled ? 'visibility_off' : 'visibility'}</span>
                                  </button>
                                  <button className="btn-action btn-action--danger" type="button"
                                    onClick={() => openConfirmDelete({ type: 'subsub', label: ss.label, canalId: canal.id, subId: sub.id, subSubId: ss.id })}>
                                    Excluir
                                  </button>
                                </RowActionsMenu>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </Fragment>
                  );})}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Confirm delete modal ──────────────────────────────────────── */}
      {confirmDelete && (
        <Modal open onClose={() => setConfirmDelete(null)}
          title={
            confirmDelete.type === 'canal' ? 'Excluir canal'
            : confirmDelete.type === 'sub' ? 'Excluir página'
            : 'Excluir sub-página'
          }
          size="sm"
          footer={
            <div className="modal-footer">
              <button className="btn-outline" type="button" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn-danger" type="button" onClick={doDelete}>Excluir</button>
            </div>
          }
        >
          <div className="ct-confirm-delete">
            <span className="material-symbols-outlined ct-confirm-delete__icon">delete_forever</span>
            <p className="ct-confirm-delete__msg">
              Tem certeza que deseja excluir <strong>"{confirmDelete.label}"</strong>?
            </p>
            {confirmDelete.type === 'canal' && (
              <p className="ct-confirm-delete__warn">
                Todas as páginas e sub-páginas deste canal também serão removidas.
              </p>
            )}
            {confirmDelete.type === 'sub' && (
              <p className="ct-confirm-delete__warn">
                As sub-páginas desta página também serão removidas.
              </p>
            )}

            {confirmDelete.checking && (
              <p className="ct-confirm-delete__warn">Verificando conteúdo vinculado…</p>
            )}

            {!confirmDelete.checking && (confirmDelete.cvmDocsCount > 0 || confirmDelete.otherDocsCount > 0) && (
              <div className="ct-transfer">
                <div className="ct-transfer__warn">
                  <span className="material-symbols-outlined ct-transfer__warn-icon">warning</span>
                  <span>
                    {confirmDelete.cvmDocsCount > 0 && <>{confirmDelete.cvmDocsCount} documento{confirmDelete.cvmDocsCount !== 1 ? 's' : ''} do Auto CVM</>}
                    {confirmDelete.cvmDocsCount > 0 && confirmDelete.otherDocsCount > 0 && ' e '}
                    {confirmDelete.otherDocsCount > 0 && <>{confirmDelete.otherDocsCount} documento{confirmDelete.otherDocsCount !== 1 ? 's' : ''} manual{confirmDelete.otherDocsCount !== 1 ? 'is' : ''}</>}
                    {' '}{(confirmDelete.cvmDocsCount + confirmDelete.otherDocsCount) !== 1 ? 'estão' : 'está'} vinculado{(confirmDelete.cvmDocsCount + confirmDelete.otherDocsCount) !== 1 ? 's' : ''} a esta página.
                  </span>
                </div>
                <p className="canais-edit-section-title" style={{ marginTop: 8 }}>Transferir documentos para outra página</p>
                <select className="canais-edit-form__input filter-select" value={confirmDelete.transferTo}
                  onChange={e => setConfirmDelete(m => m ? { ...m, transferTo: e.target.value } : m)}>
                  <option value="">— Não transferir —</option>
                  {flatNodeList().filter(p => !confirmDelete.affectedIds.includes(p.id)).map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
                {!confirmDelete.transferTo && confirmDelete.cvmDocsCount > 0 && (
                  <p className="ct-transfer__hint">
                    Sem transferência, os {confirmDelete.cvmDocsCount} documento{confirmDelete.cvmDocsCount !== 1 ? 's' : ''} do Auto CVM {confirmDelete.cvmDocsCount !== 1 ? 'serão excluídos' : 'será excluído'} permanentemente.
                  </p>
                )}
                {!confirmDelete.transferTo && confirmDelete.otherDocsCount > 0 && (
                  <p className="ct-transfer__hint">
                    Documentos manuais não serão excluídos — ficarão como rascunho, sem página vinculada.
                  </p>
                )}
              </div>
            )}

            {!confirmDelete.checking && confirmDelete.materiasCount > 0 && (
              <p className="ct-confirm-delete__warn">
                {confirmDelete.materiasCount} matéria{confirmDelete.materiasCount !== 1 ? 's' : ''} (incluindo formulários) vinculada{confirmDelete.materiasCount !== 1 ? 's' : ''} a esta página {confirmDelete.materiasCount !== 1 ? 'ficarão' : 'ficará'} como rascunho, aguardando ser vinculada a outra página.
              </p>
            )}

            {!confirmDelete.checking && confirmDelete.hasTabelaResultados && confirmDelete.resultadosPublicadosCount > 0 && (
              <p className="ct-confirm-delete__warn">
                Esta é a página Central de Resultados. {confirmDelete.resultadosPublicadosCount} trimestre{confirmDelete.resultadosPublicadosCount !== 1 ? 's' : ''} publicado{confirmDelete.resultadosPublicadosCount !== 1 ? 's' : ''} {confirmDelete.resultadosPublicadosCount !== 1 ? 'ficarão' : 'ficará'} como rascunho e {confirmDelete.resultadosPublicadosCount !== 1 ? 'serão reativados' : 'será reativado'} automaticamente quando uma nova página Central de Resultados for criada.
              </p>
            )}
          </div>
        </Modal>
      )}

      {pendingDrop && (
        <Modal open onClose={() => !dropTransferring && setPendingDrop(null)} title="Transferir categoria" size="sm"
          footer={
            <div className="modal-footer">
              <button className="btn-outline" type="button" disabled={dropTransferring} onClick={() => setPendingDrop(null)}>Cancelar</button>
              <button className="btn-primary" type="button" disabled={dropTransferring} onClick={confirmCategoriaDrop}>
                {dropTransferring ? 'Transferindo...' : 'Transferir'}
              </button>
            </div>
          }
        >
          <div className="ct-confirm-delete">
            <span className="material-symbols-outlined ct-confirm-delete__icon">drive_file_move</span>
            <p className="ct-confirm-delete__msg">
              Mover a categoria <strong>"{pendingDrop.sourceLabel}"</strong> para a página <strong>"{pendingDrop.destPageLabel}"</strong>?
            </p>
            <p className="ct-confirm-delete__warn">
              Todos os documentos já publicados nesta categoria serão movidos junto, e as regras de Auto CVM que apontavam para ela serão atualizadas automaticamente.
            </p>
            {dropError && <p className="ct-confirm-delete__warn" style={{ color: 'var(--color-error-600)' }}>{dropError}</p>}
          </div>
        </Modal>
      )}

      {/* ── Add page wizard modal ────────────────────────────────────── */}
      <Modal
        open={newSubOpen}
        onClose={() => { setNewSubOpen(false); setSubConfirming(false); }}
        title={
          newSubForm.step === 1 ? (newSubForm.parentSubId ? 'Adicionar sub-página' : 'Adicionar página') :
          newSubForm.step === 2 ? 'Tipo de página' :
          newSubForm.step === 3 ? (newSubForm.pageType === 'lista-agrupada' ? 'Estilo de agrupamento' : 'Vincular matéria') :
          'Categorias'
        }
        size={newSubForm.step === 2 ? 'lg' : 'md'}
        footer={
          <div className="modal-footer">
            {newSubForm.step === 1 && (
              <>
                <button className="btn-outline" type="button" onClick={() => setNewSubOpen(false)}>Cancelar</button>
                {newSubForm.hasChildren ? (
                  <button className="btn-primary" type="button" onClick={commitNewSub}
                    disabled={!newSubForm.labels[PORTAL_CONFIG.languages[0]]?.trim()}>
                    Criar canal
                  </button>
                ) : (
                  <button className="btn-primary" type="button"
                    onClick={() => patchSub({ step: 2 })}
                    disabled={!newSubForm.labels[PORTAL_CONFIG.languages[0]]?.trim()}>
                    Próximo
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
                  </button>
                )}
              </>
            )}
            {newSubForm.step === 2 && !subConfirming && (
              <>
                <button className="btn-outline" type="button" onClick={() => patchSub({ step: 1 })}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_back</span>
                  Voltar
                </button>
                {newSubForm.pageType === 'lista-agrupada' || subHasMatStep ? (
                  <button className="btn-primary" type="button" onClick={() => patchSub({ step: 3 })} disabled={!newSubForm.pageType}>
                    Próximo
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
                  </button>
                ) : (
                  <button className="btn-primary" type="button" onClick={triggerSubConfirm} disabled={!newSubForm.pageType}>
                    Criar página
                  </button>
                )}
              </>
            )}
            {newSubForm.step === 3 && (
              <>
                <button className="btn-outline" type="button" onClick={() => patchSub({ step: 2 })}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_back</span>
                  Voltar
                </button>
                {newSubForm.pageType === 'lista-agrupada' ? (
                  <button className="btn-primary" type="button" onClick={() => patchSub({ step: 4 })}>
                    Próximo
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
                  </button>
                ) : (
                  <button className="btn-primary" type="button" onClick={triggerSubConfirm}>
                    Criar página
                  </button>
                )}
              </>
            )}
            {newSubForm.step === 4 && !subConfirming && (
              <>
                <button className="btn-outline" type="button" onClick={() => patchSub({ step: 3 })}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_back</span>
                  Voltar
                </button>
                <button className="btn-primary" type="button" onClick={triggerSubConfirm} disabled={!canCommitSub}>
                  Adicionar página
                </button>
              </>
            )}
          </div>
        }
      >
        {/* Step indicator */}
        {!subConfirming && subTotalSteps > 1 && (
          <div className="ct-wizard-steps">
            {Array.from({ length: subTotalSteps }, (_, i) => (
              <Fragment key={i}>
                <div className={`ct-wizard-step${newSubForm.step > i + 1 ? ' ct-wizard-step--done' : newSubForm.step === i + 1 ? ' ct-wizard-step--active' : ''}`}>
                  <div className="ct-wizard-step__dot">
                    {newSubForm.step > i + 1
                      ? <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>check</span>
                      : <span>{i + 1}</span>}
                  </div>
                </div>
                {i < subTotalSteps - 1 && <div className="ct-wizard-step__line" />}
              </Fragment>
            ))}
          </div>
        )}

        {/* ── Step 1: Basic info ──────────────────────────────────── */}
        {newSubForm.step === 1 && (
          <div className="canais-edit-form">
            <label className="canais-new-draft-check">
              <input type="checkbox" checked={newSubForm.isExternalLink}
                onChange={e => patchSub({ isExternalLink: e.target.checked, externalUrl: '' })} />
              <span>Link externo</span>
            </label>

            {PORTAL_CONFIG.languages.length > 1 && (
              <LangTabs active={newSubForm.locale} onChange={l => patchSub({ locale: l })} />
            )}

            {!newSubForm.isExternalLink ? (
              <div key={newSubForm.locale} className="canais-edit-row">
                <label className="canais-edit-form__label lang-fade">
                  <span>Nome da página <span className="ct-required">*</span></span>
                  <input className="canais-edit-form__input" type="text" placeholder="Ex: Atas e Assembleias" autoFocus
                    value={newSubForm.labels[newSubForm.locale] ?? ''}
                    onChange={e => {
                      const val = e.target.value;
                      const newLabels = { ...newSubForm.labels, [newSubForm.locale]: val };
                      const primaryLabel = newLabels[PORTAL_CONFIG.languages[0]] ?? '';
                      const href = '/' + primaryLabel.toLowerCase()
                        .normalize('NFD').replace(/[̀-ͯ]/g, '')
                        .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-') + '.html';
                      patchSub({ labels: newLabels, href });
                    }} />
                </label>
                <label className="canais-edit-form__label">
                  URL (slug)
                  <input className="canais-edit-form__input" type="text" placeholder="/exemplo.html"
                    value={newSubForm.href}
                    onChange={e => patchSub({ href: e.target.value })} />
                </label>
              </div>
            ) : (
              <div key={newSubForm.locale} className="canais-edit-row">
                <label className="canais-edit-form__label lang-fade">
                  <span>Nome da página <span className="ct-required">*</span></span>
                  <input className="canais-edit-form__input" type="text" placeholder="Ex: Site da empresa" autoFocus
                    value={newSubForm.labels[newSubForm.locale] ?? ''}
                    onChange={e => patchSub({ labels: { ...newSubForm.labels, [newSubForm.locale]: e.target.value } })} />
                </label>
                <label className="canais-edit-form__label">
                  URL externa
                  <input className="canais-edit-form__input" type="url" placeholder="https://..."
                    value={newSubForm.externalUrl}
                    onChange={e => patchSub({ externalUrl: e.target.value })} />
                </label>
              </div>
            )}

            {!newSubForm.isExternalLink && (
              <>
                <div className="canais-edit-divider" />
                <p className="canais-edit-section-title">
                  Imagem do header
                  <span style={{ fontWeight: 400, color: 'var(--color-gray-400)', fontSize: 'var(--text-xs)', marginLeft: 6 }}>(opcional)</span>
                </p>
                {newSubForm.canalHasHeaderImage ? (
                  <p className="ct-wizard-hint">
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>photo_library</span>
                    Esta página herda a imagem do canal pai.
                  </p>
                ) : (
                  <HeaderImageEditor
                    value={newSubForm.headerImageUrl}
                    onChange={v => patchSub({ headerImageUrl: v })}
                    portalDbId={portalDbId}
                  />
                )}
              </>
            )}

            {!newSubForm.parentSubId && !isFlatLayout && (
              <>
                <div className="canais-edit-divider" />
                <p className="canais-edit-section-title">Estrutura</p>
                <div className="canais-new-type-row">
                  {([
                    { key: false as boolean, icon: 'article', label: 'Página simples', desc: 'Link direto, sem sub-páginas' },
                    { key: true as boolean, icon: 'account_tree', label: 'Terceiro nível', desc: 'Agrupa sub-páginas na navegação' },
                  ]).map(opt => (
                    <button key={String(opt.key)} type="button"
                      className={`canais-new-type-btn${newSubForm.hasChildren === opt.key ? ' canais-new-type-btn--active' : ''}`}
                      onClick={() => patchSub({ hasChildren: opt.key })}
                    >
                      <span className="material-symbols-outlined canais-new-type-btn__icon">{opt.icon}</span>
                      <span className="canais-new-type-btn__label">{opt.label}</span>
                      <span className="canais-new-type-btn__desc">{opt.desc}</span>
                      {newSubForm.hasChildren === opt.key && (
                        <span className="canais-new-type-btn__check">
                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>check</span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="ct-wizard-hint">
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>info</span>
                  {newSubForm.hasChildren
                    ? 'Sub-páginas podem ser adicionadas após a criação na árvore de canais.'
                    : 'Você escolherá o tipo de conteúdo no próximo passo.'}
                </p>
              </>
            )}

            <div className="canais-edit-divider" />
            <label className="canais-new-draft-check">
              <input type="checkbox" checked={newSubForm.draft}
                onChange={e => patchSub({ draft: e.target.checked })} />
              <span>Salvar como rascunho (não publicar ainda)</span>
            </label>
          </div>
        )}

        {/* ── Step 2: Page type ───────────────────────────────────── */}
        {newSubForm.step === 2 && (
          <div className="canais-edit-form">
            {subConfirming ? (
              <div className="ct-confirm-anim">
                <div className="ct-confirm-anim__circle">
                  <span className="material-symbols-outlined">check</span>
                </div>
                <p className="ct-confirm-anim__label">Criando página...</p>
              </div>
            ) : (
              <>
                <p className="ct-step2-label">Selecione como o conteúdo será exibido nesta página.</p>
                <div className="ct-pt-grid">
                  {PAGE_TYPES.map(pt => (
                    <button key={pt.id} type="button"
                      className={`ct-pt-card${newSubForm.pageType === pt.id ? ' ct-pt-card--active' : ''}`}
                      onClick={() => patchSub({ pageType: pt.id })}
                    >
                      <div className="ct-pt-card__thumb">{pt.thumb}</div>
                      <div className="ct-pt-card__body">
                        <span className="material-symbols-outlined ct-pt-card__icon">{pt.icon}</span>
                        <span className="ct-pt-card__label">{pt.label}</span>
                      </div>
                      {newSubForm.pageType === pt.id && (
                        <span className="ct-pt-card__check">
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>check</span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {newSubForm.pageType && newSubForm.pageType !== 'lista-agrupada' && (
                  <div className="ct-flow-box">
                    <p className="ct-flow-box__desc">
                      <span className="material-symbols-outlined ct-flow-box__icon">
                        {PAGE_TYPES.find(p => p.id === newSubForm.pageType)?.icon}
                      </span>
                      {PAGE_TYPES.find(p => p.id === newSubForm.pageType)?.flow}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Step 3: Matérias link (non-LA) OR Grouping style (LA) ─ */}
        {newSubForm.step === 3 && (
          <div className="canais-edit-form">
            {newSubForm.pageType !== 'lista-agrupada' ? (
              <MateriasLinkPicker
                selected={newSubForm.linkedMateriaIds}
                onChange={ids => patchSub({ linkedMateriaIds: ids })}
                portalKey={activePortalId ?? undefined}
              />
            ) : (
            <>
            <p className="ct-step2-label">Escolha como os grupos serão exibidos visualmente na página.</p>
            <div className="ct-style-cards">
              {([
                {
                  id: 'accordion' as ListaAgrupadaStyle,
                  label: 'Accordion',
                  desc: 'Grupos colapsáveis — o usuário clica para expandir cada categoria.',
                  icon: 'unfold_more',
                  thumb: (
                    <svg width="100%" height="52" viewBox="0 0 200 52" fill="none">
                      <rect x="2" y="2" width="196" height="13" rx="3" fill="#e8edf2" stroke="#c8d2db" strokeWidth="1"/>
                      <rect x="8" y="6" width="70" height="4" rx="1" fill="#b0bec5"/>
                      <rect x="180" y="6" width="14" height="4" rx="1" fill="#c8d2db"/>
                      <rect x="2" y="19" width="196" height="13" rx="3" fill="#f5f7fa" stroke="#e0e5ea" strokeWidth="1"/>
                      <rect x="8" y="23" width="55" height="4" rx="1" fill="#cfd8dc"/>
                      <rect x="180" y="23" width="14" height="4" rx="1" fill="#dde3ea"/>
                      <rect x="2" y="36" width="196" height="13" rx="3" fill="#f5f7fa" stroke="#e0e5ea" strokeWidth="1"/>
                      <rect x="8" y="40" width="65" height="4" rx="1" fill="#cfd8dc"/>
                      <rect x="180" y="40" width="14" height="4" rx="1" fill="#dde3ea"/>
                    </svg>
                  ),
                },
                {
                  id: 'secao' as ListaAgrupadaStyle,
                  label: 'Seção',
                  desc: 'Grupos sempre visíveis, separados por título de seção.',
                  icon: 'view_agenda',
                  thumb: (
                    <svg width="100%" height="52" viewBox="0 0 200 52" fill="none">
                      <rect x="2" y="2" width="80" height="6" rx="2" fill="#c8d2db"/>
                      <rect x="2" y="12" width="196" height="1" fill="#e0e5ea"/>
                      <rect x="2" y="17" width="160" height="5" rx="1" fill="#eef1f5"/>
                      <rect x="2" y="26" width="130" height="5" rx="1" fill="#eef1f5"/>
                      <rect x="2" y="36" width="80" height="6" rx="2" fill="#c8d2db"/>
                      <rect x="2" y="46" width="196" height="1" fill="#e0e5ea"/>
                    </svg>
                  ),
                },
              ]).map(s => (
                <button key={s.id} type="button"
                  className={`ct-style-card${newSubForm.laStyle === s.id ? ' ct-style-card--active' : ''}`}
                  onClick={() => patchSub({ laStyle: s.id })}
                >
                  <div className="ct-style-card__thumb">{s.thumb}</div>
                  <div className="ct-style-card__body">
                    <div className="ct-style-card__head">
                      <span className="material-symbols-outlined ct-style-card__icon">{s.icon}</span>
                      <span className="ct-style-card__label">{s.label}</span>
                      {newSubForm.laStyle === s.id && (
                        <span className="ct-pt-card__check">
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>check</span>
                        </span>
                      )}
                    </div>
                    <span className="ct-style-card__desc">{s.desc}</span>
                  </div>
                </button>
              ))}
            </div>
            </>
            )}
          </div>
        )}

        {/* ── Step 4: Categories (LA only) ────────────────────────── */}
        {newSubForm.step === 4 && (
          <div className="canais-edit-form">
            {subConfirming && (
              <div className="ct-confirm-anim">
                <div className="ct-confirm-anim__circle">
                  <span className="material-symbols-outlined">check</span>
                </div>
                <p className="ct-confirm-anim__label">Criando página...</p>
              </div>
            )}
            {!subConfirming && PORTAL_CONFIG.languages.length > 1 && (
              <LangTabs active={newSubForm.locale} onChange={l => patchSub({ locale: l })} />
            )}

            {!subConfirming && hasMultipleEmpresas ? (
              <>
                <p className="ct-la-sub-title">Selecione a empresa e defina as categorias</p>
                <div className="ct-la-emp-boxes">
                  {portalEmpresas.filter(e => newSubForm.laSelectedEmpresas.includes(e.id)).map(emp => {
                    const cats = newSubForm.laEmpresaCategories[emp.id] ?? [];
                    const isActive = newSubForm.laActiveEmpresa === emp.id;
                    return (
                      <button key={emp.id} type="button"
                        className={`ct-la-emp-box${isActive ? ' ct-la-emp-box--active' : ''}`}
                        onClick={() => patchSub({ laActiveEmpresa: emp.id })}
                      >
                        <div className="ct-la-emp-box__head">
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: isActive ? 'var(--color-primary-500)' : 'var(--color-gray-400)' }}>domain</span>
                          <span className="ct-la-emp-box__name">{emp.label}</span>
                          {cats.length > 0
                            ? <span className="ct-la-emp-box__count">{cats.length} cat.</span>
                            : <span className="ct-la-emp-box__empty">Sem categorias</span>}
                        </div>
                        {cats.length > 0 && (
                          <div className="ct-la-emp-box__chips">
                            {cats.slice(0, 4).map(cat => (
                              <span key={cat.id} className="ct-la-cat-chip ct-la-cat-chip--sm">{cat.label}</span>
                            ))}
                            {cats.length > 4 && <span className="ct-la-emp-box__more">+{cats.length - 4}</span>}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Active empresa marker editor */}
                {(() => {
                  const empId = newSubForm.laActiveEmpresa;
                  const emp = portalEmpresas.find(e => e.id === empId);
                  if (!emp || !newSubForm.laSelectedEmpresas.includes(empId)) return null;
                  const cats = newSubForm.laEmpresaCategories[empId] ?? [];
                  return (
                    <div className="ct-la-active-emp">
                      <p className="ct-la-sub-title">{emp.label}</p>
                      <MarcadorListEditor
                        key={empId}
                        groups={cats}
                        onChange={next => patchSub({ laEmpresaCategories: { ...newSubForm.laEmpresaCategories, [empId]: next } })}
                        locale={newSubForm.locale}
                        fallbackLocale={PORTAL_CONFIG.languages[0]}
                        placeholder="Ex: ITR, DFP, Fatos Relevantes"
                      />
                    </div>
                  );
                })()}
              </>
            ) : (
              /* Single empresa */
              <>
                <p className="ct-la-sub-title">
                  <span>Categorias <span className="ct-required">*</span></span>
                  <span style={{ fontWeight: 400, color: 'var(--color-gray-400)' }}> — mínimo 1</span>
                </p>
                <MarcadorListEditor
                  groups={newSubForm.laCategories}
                  onChange={next => patchSub({ laCategories: next })}
                  locale={newSubForm.locale}
                  fallbackLocale={PORTAL_CONFIG.languages[0]}
                />
              </>
            )}
          </div>
        )}
      </Modal>

      {/* ── Canal edit modal ──────────────────────────────────────────── */}
      {canalEditModal && (
        <Modal open onClose={() => setCanalEditModal(null)} title="Editar canal" size="lg"
          footer={
            <div className="modal-footer">
              <button className="btn-outline" type="button" onClick={() => setCanalEditModal(null)}>Cancelar</button>
              <button className="btn-primary" type="button" onClick={commitCanalEdit}
                disabled={canalEditModal.isLeaf && !canalEditModal.pageType}>Salvar</button>
            </div>
          }
        >
          <div className="canais-edit-form">
            {PORTAL_CONFIG.languages.length > 1 && (
              <LangTabs active={canalEditModal.locale} onChange={l => setCanalEditModal(m => m ? { ...m, locale: l } : m)} />
            )}
            <label className="canais-edit-form__label lang-fade" key={canalEditModal.locale}>
              Nome do canal
              <input className="canais-edit-form__input" type="text"
                value={canalEditModal.labels[canalEditModal.locale] ?? ''} autoFocus
                onChange={e => setCanalEditModal(m => m ? { ...m, labels: { ...m.labels, [m.locale]: e.target.value } } : m)} />
            </label>
            {canalEditModal.locale !== PORTAL_CONFIG.languages[0] && (
              <p className="canais-locked-note">
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>lock</span>
                Formato definido no idioma principal ({PORTAL_CONFIG.languages[0]}) — aqui só o nome do canal muda.
              </p>
            )}
            {!isFlatLayout && (
              <>
                <div className="canais-edit-divider" />
                <p className="canais-edit-section-title">Imagem do header</p>
                <HeaderImageEditor
                  value={canalEditModal.headerImageUrl}
                  onChange={v => setCanalEditModal(m => m ? { ...m, headerImageUrl: v } : m)}
                  portalDbId={portalDbId}
                  disabled={canalEditModal.locale !== PORTAL_CONFIG.languages[0]}
                />
                <label className={`canal-apply-default${canalEditModal.locale !== PORTAL_CONFIG.languages[0] ? ' canal-apply-default--disabled' : ''}`}>
                  <input type="checkbox" checked={canalEditModal.applyHeaderToChildren}
                    disabled={canalEditModal.locale !== PORTAL_CONFIG.languages[0]}
                    onChange={e => setCanalEditModal(m => m ? { ...m, applyHeaderToChildren: e.target.checked } : m)} />
                  Aplicar como padrão para todas as páginas filhas
                </label>
              </>
            )}
            <div className="canais-edit-divider" />
            <label className={`canal-apply-default${canalEditModal.locale !== PORTAL_CONFIG.languages[0] ? ' canal-apply-default--disabled' : ''}`}>
              <input type="checkbox" checked={canalEditModal.showInFooter}
                disabled={canalEditModal.locale !== PORTAL_CONFIG.languages[0]}
                onChange={e => setCanalEditModal(m => m ? { ...m, showInFooter: e.target.checked } : m)} />
              <span>Exibir no footer <span style={{ fontWeight: 400, color: 'var(--color-gray-400)', fontSize: 'var(--text-xs)' }}>(Footer completo com mapa do site)</span></span>
            </label>
            {canalEditModal.isLeaf && (
              <>
                <div className="canais-edit-divider" />
                <p className="canais-edit-section-title">
                  Tipo de página
                  {!canalEditModal.pageType && <span className="ct-required"> * — obrigatório antes de publicar conteúdo</span>}
                </p>
                <PageTypePicker
                  value={canalEditModal.pageType}
                  onChange={v => setCanalEditModal(m => m ? { ...m, pageType: v } : m)}
                  allowed={isFlatLayout ? FLAT_PAGE_TYPES : undefined}
                  disabled={canalEditModal.locale !== PORTAL_CONFIG.languages[0]}
                />
                {canalEditModal.pageType === 'lista-agrupada' && (
                  <>
                    <div className="canais-edit-divider" />
                    <p className="ct-la-sub-title">Estilo de agrupamento</p>
                    <div className={`canais-agrupada-grid${canalEditModal.locale !== PORTAL_CONFIG.languages[0] ? ' canais-agrupada-grid--disabled' : ''}`}>
                      {(['accordion', 'secao'] as const).map(s => (
                        <button key={s} type="button" disabled={canalEditModal.locale !== PORTAL_CONFIG.languages[0]}
                          className={`canais-agrupada-opt${canalEditModal.listaAgrupadaStyle === s ? ' canais-agrupada-opt--active' : ''}`}
                          onClick={() => setCanalEditModal(m => m ? { ...m, listaAgrupadaStyle: s } : m)}
                        >
                          <span>{s === 'accordion' ? 'Accordion' : 'Seção'}</span>
                        </button>
                      ))}
                    </div>
                    <div className="canais-edit-divider" />
                    <p className="ct-la-sub-title">
                      <span>Grupos <span className="ct-required">*</span></span>
                      <span style={{ fontWeight: 400, color: 'var(--color-gray-400)' }}> — mínimo 1</span>
                    </p>
                    <MarcadorListEditor
                      groups={canalEditModal.laCategories}
                      onChange={next => setCanalEditModal(m => m ? { ...m, laCategories: next } : m)}
                      locale={canalEditModal.locale}
                      fallbackLocale={PORTAL_CONFIG.languages[0]}
                      placeholder="Ex: Fatos Relevantes"
                      emptyHint='Pressione Enter ou clique em "Adicionar" para incluir um grupo.'
                    />
                  </>
                )}
              </>
            )}
          </div>
        </Modal>
      )}

      {/* ── Sub/SubSub edit modal ─────────────────────────────────────── */}
      {editModal && (
        <Modal open onClose={() => setEditModal(null)}
          title={editModal.parentSubId ? 'Editar sub-página' : 'Editar página'}
          size="lg"
          footer={
            <div className="modal-footer">
              <button className="btn-outline" type="button" onClick={() => setEditModal(null)}>Cancelar</button>
              <button className="btn-primary" type="button" onClick={commitEdit} disabled={!editModal.pageType}>Salvar</button>
            </div>
          }
        >
          <div className="canais-edit-form">
            {(() => {
              const isPrimary = editModal.locale === PORTAL_CONFIG.languages[0];
              return (<>
            <label className={`canais-new-draft-check${!isPrimary ? ' canal-apply-default--disabled' : ''}`}>
              <input type="checkbox" checked={editModal.isExternalLink} disabled={!isPrimary}
                onChange={e => setEditModal(m => m ? { ...m, isExternalLink: e.target.checked, externalUrl: '' } : m)} />
              <span>Link externo</span>
            </label>

            {PORTAL_CONFIG.languages.length > 1 && (
              <LangTabs active={editModal.locale} onChange={l => setEditModal(m => m ? { ...m, locale: l } : m)} />
            )}

            {!isPrimary && (
              <p className="canais-locked-note">
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>lock</span>
                Formato definido no idioma principal ({PORTAL_CONFIG.languages[0]}) — aqui só o nome da página muda.
              </p>
            )}

            {editModal.isExternalLink ? (
              <div key={editModal.locale} className="canais-edit-row">
                <label className="canais-edit-form__label lang-fade">
                  Nome da página
                  <input className="canais-edit-form__input" type="text" autoFocus
                    value={editModal.labels[editModal.locale] ?? ''}
                    onChange={e => setEditModal(m => m ? { ...m, labels: { ...m.labels, [m.locale]: e.target.value } } : m)} />
                </label>
                <label className="canais-edit-form__label">
                  URL externa
                  <input className="canais-edit-form__input" type="url" placeholder="https://..." disabled={!isPrimary}
                    value={editModal.externalUrl}
                    onChange={e => setEditModal(m => m ? { ...m, externalUrl: e.target.value } : m)} />
                </label>
              </div>
            ) : (
              <div key={editModal.locale} className="canais-edit-row">
                <label className="canais-edit-form__label lang-fade">
                  Nome da página
                  <input className="canais-edit-form__input" type="text" autoFocus
                    value={editModal.labels[editModal.locale] ?? ''}
                    onChange={e => {
                      const val = e.target.value;
                      const newLabels = { ...editModal.labels, [editModal.locale]: val };
                      const primaryLabel = newLabels[PORTAL_CONFIG.languages[0]] ?? '';
                      const slug = '/' + primaryLabel.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
                      setEditModal(m => m ? { ...m, labels: newLabels, label: primaryLabel, href: slug } : m);
                    }} />
                </label>
                <label className="canais-edit-form__label">
                  URL (slug)
                  <input className="canais-edit-form__input" type="text" value={editModal.href} disabled={!isPrimary}
                    onChange={e => setEditModal(m => m ? { ...m, href: e.target.value } : m)} />
                </label>
              </div>
            )}

            <div className="canais-edit-divider" />
            <p className="canais-edit-section-title">
              Tipo de página
              {!editModal.pageType && <span className="ct-required"> * — obrigatório antes de publicar conteúdo</span>}
            </p>
            <PageTypePicker value={editModal.pageType} onChange={v => setEditModal(m => m ? { ...m, pageType: v, ..._laDefaults } : m)} disabled={!isPrimary} />

            {!editModal.isExternalLink && (
              <>
                <div className="canais-edit-divider" />
                <p className="canais-edit-section-title">
                  Imagem do header
                  <span style={{ fontWeight: 400, color: 'var(--color-gray-400)', fontSize: 'var(--text-xs)', marginLeft: 6 }}>(opcional)</span>
                </p>
                {editModal.headerImageUrl == null && editModal.canalHeaderImage ? (
                  <>
                    <p className="ct-wizard-hint">
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>photo_library</span>
                      Esta página herda a imagem do canal pai.
                    </p>
                    <HeaderImageEditor
                      value={null}
                      onChange={v => setEditModal(m => m ? { ...m, headerImageUrl: v } : m)}
                      portalDbId={portalDbId}
                      placeholderLabel="Clique para usar uma imagem própria nesta página"
                      disabled={!isPrimary}
                    />
                  </>
                ) : (
                  <HeaderImageEditor
                    value={editModal.headerImageUrl}
                    onChange={v => setEditModal(m => m ? { ...m, headerImageUrl: v } : m)}
                    portalDbId={portalDbId}
                    disabled={!isPrimary}
                  />
                )}
              </>
            )}

            {/* Lista Agrupada flow */}
            {editModal.pageType === 'lista-agrupada' && (
              <div className="ct-la-flow">
                {/* Style picker */}
                <p className="ct-la-sub-title">Estilo de agrupamento</p>
                <div className={`canais-agrupada-grid${!isPrimary ? ' canais-agrupada-grid--disabled' : ''}`}>
                  {(['accordion', 'secao'] as const).map(s => (
                    <button key={s} type="button" disabled={!isPrimary}
                      className={`canais-agrupada-opt${editModal.listaAgrupadaStyle === s ? ' canais-agrupada-opt--active' : ''}`}
                      onClick={() => setEditModal(m => m ? { ...m, listaAgrupadaStyle: s } : m)}
                    >
                      <span>{s === 'accordion' ? 'Accordion' : 'Seção'}</span>
                    </button>
                  ))}
                </div>

                <div className="canais-edit-divider" style={{ margin: 'var(--space-2) 0' }} />

                {/* Categories */}
                {hasMultipleEmpresas ? (
                  <>
                    <p className="ct-la-sub-title">Categorias por empresa</p>
                    <div className="ct-la-emp-boxes">
                      {portalEmpresas.filter(e => editModal.laSelectedEmpresas.includes(e.id)).map(emp => {
                        const cats = editModal.laEmpresaCategories[emp.id] ?? [];
                        const isActive = editModal.laActiveEmpresa === emp.id;
                        return (
                          <button key={emp.id} type="button"
                            className={`ct-la-emp-box${isActive ? ' ct-la-emp-box--active' : ''}`}
                            onClick={() => setEditModal(m => m ? { ...m, laActiveEmpresa: emp.id } : m)}
                          >
                            <div className="ct-la-emp-box__head">
                              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: isActive ? 'var(--color-primary-500)' : 'var(--color-gray-400)' }}>domain</span>
                              <span className="ct-la-emp-box__name">{emp.label}</span>
                              {cats.length > 0
                                ? <span className="ct-la-emp-box__count">{cats.length} cat.</span>
                                : <span className="ct-la-emp-box__empty">Sem categorias</span>}
                            </div>
                            {cats.length > 0 && (
                              <div className="ct-la-emp-box__chips">
                                {cats.slice(0, 4).map(cat => (
                                  <span key={cat.id} className="ct-la-cat-chip ct-la-cat-chip--sm">{cat.label}</span>
                                ))}
                                {cats.length > 4 && <span className="ct-la-emp-box__more">+{cats.length - 4}</span>}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {(() => {
                      const empId = editModal.laActiveEmpresa;
                      const emp = portalEmpresas.find(e => e.id === empId);
                      if (!emp || !editModal.laSelectedEmpresas.includes(empId)) return null;
                      const cats = editModal.laEmpresaCategories[empId] ?? [];
                      return (
                        <div className="ct-la-active-emp">
                          <p className="ct-la-sub-title">{emp.label}</p>
                          <MarcadorListEditor
                            key={empId}
                            groups={cats}
                            onChange={next => setEditModal(m => m ? { ...m, laEmpresaCategories: { ...m.laEmpresaCategories, [empId]: next } } : m)}
                            locale={editModal.locale}
                            fallbackLocale={PORTAL_CONFIG.languages[0]}
                            placeholder="Ex: ITR, DFP, Fatos Relevantes"
                          />
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  /* Single empresa */
                  <>
                    <p className="ct-la-sub-title">
                      <span>Categorias <span className="ct-required">*</span></span>
                      <span style={{ fontWeight: 400, color: 'var(--color-gray-400)' }}> — mínimo 1</span>
                    </p>
                    <MarcadorListEditor
                      groups={editModal.laCategories}
                      onChange={next => setEditModal(m => m ? { ...m, laCategories: next } : m)}
                      locale={editModal.locale}
                      fallbackLocale={PORTAL_CONFIG.languages[0]}
                    />
                  </>
                )}
              </div>
            )}

            {!editModal.parentSubId && (
              <>
                <div className="canais-edit-divider" />
                <label className="canais-edit-form__label">
                  Mudar canal
                  <select className="canais-edit-form__input filter-select" value={editModal.targetCanalId}
                    onChange={e => setEditModal(m => m ? { ...m, targetCanalId: e.target.value } : m)}>
                    {canais.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </label>
                <label className="canal-apply-default">
                  <input type="checkbox" checked={editModal.showInFooter}
                    onChange={e => setEditModal(m => m ? { ...m, showInFooter: e.target.checked } : m)} />
                  <span>Exibir no footer <span style={{ fontWeight: 400, color: 'var(--color-gray-400)', fontSize: 'var(--text-xs)' }}>(Footer completo com mapa do site)</span></span>
                </label>

                {/* Transfer content */}
                <div className="canais-edit-divider" />
                <div className="ct-transfer">
                  <p className="canais-edit-section-title">Transferir conteúdo</p>
                  <p className="ct-transfer__hint">Move todo o conteúdo desta página (documentos, artigos, mídia) para outra página. A origem será esvaziada.</p>
                  <select className="canais-edit-form__input filter-select" value={editModal.transferTo}
                    onChange={e => setEditModal(m => m ? { ...m, transferTo: e.target.value } : m)}>
                    <option value="">— Não transferir —</option>
                    {allPages.filter(p => !p.id.includes(editModal.subId)).map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                  {editModal.transferTo && (
                    <div className="ct-transfer__warn">
                      <span className="material-symbols-outlined ct-transfer__warn-icon">warning</span>
                      <span>O conteúdo será transferido ao salvar. Esta ação não pode ser desfeita.</span>
                    </div>
                  )}
                </div>
              </>
            )}
              </>);
            })()}
          </div>
        </Modal>
      )}

      {/* ── New canal wizard modal ────────────────────────────────────── */}
      <Modal open={newCanalOpen} onClose={() => setNewCanalOpen(false)}
        title={newCanalForm.step === 1 ? 'Novo canal' : newCanalForm.step === 2 ? 'Tipo de página' : 'Vincular matéria'}
        size={newCanalForm.step === 2 ? 'lg' : 'md'}
        footer={
          <div className="modal-footer">
            {newCanalForm.step === 1 && (
              <>
                <button className="btn-outline" type="button" onClick={() => setNewCanalOpen(false)}>Cancelar</button>
                {newCanalForm.tipo === 'pai' ? (
                  <button className="btn-primary" type="button" onClick={commitNewCanal} disabled={!canAdvanceNewCanal}>Criar canal</button>
                ) : (
                  <button className="btn-primary" type="button" onClick={() => setNewCanalForm(f => ({ ...f, step: 2 }))} disabled={!canAdvanceNewCanal}>
                    Próximo
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
                  </button>
                )}
              </>
            )}
            {newCanalForm.step === 2 && (
              <>
                <button className="btn-outline" type="button" onClick={() => setNewCanalForm(f => ({ ...f, step: 1 }))}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_back</span>
                  Voltar
                </button>
                {canalHasMatStep ? (
                  <button className="btn-primary" type="button" onClick={() => setNewCanalForm(f => ({ ...f, step: 3 }))} disabled={!canCommitNewCanal}>
                    Próximo
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
                  </button>
                ) : (
                  <button className="btn-primary" type="button" onClick={commitNewCanal} disabled={!canCommitNewCanal}>Criar página</button>
                )}
              </>
            )}
            {newCanalForm.step === 3 && (
              <>
                <button className="btn-outline" type="button" onClick={() => setNewCanalForm(f => ({ ...f, step: 2 }))}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_back</span>
                  Voltar
                </button>
                <button className="btn-primary" type="button" onClick={commitNewCanal}>Criar página</button>
              </>
            )}
          </div>
        }
      >
        {newCanalForm.step === 3 ? (
          <div className="canais-edit-form">
            <MateriasLinkPicker
              selected={newCanalForm.linkedMateriaIds}
              onChange={ids => setNewCanalForm(f => ({ ...f, linkedMateriaIds: ids }))}
              portalKey={activePortalId ?? undefined}
            />
          </div>
        ) : newCanalForm.step === 1 ? (
          <div className="canais-edit-form">
            <label className="canais-new-draft-check">
              <input type="checkbox" checked={newCanalForm.isExternalLink}
                onChange={e => setNewCanalForm(f => ({ ...f, isExternalLink: e.target.checked, externalUrl: '' }))} />
              <span>Link externo</span>
            </label>
            {newCanalForm.isExternalLink && (
              <label className="canais-edit-form__label">
                URL externa
                <input className="canais-edit-form__input" type="url" placeholder="https://..."
                  value={newCanalForm.externalUrl}
                  onChange={e => setNewCanalForm(f => ({ ...f, externalUrl: e.target.value }))} />
              </label>
            )}
            <LangTabs active={newCanalForm.locale} onChange={l => setNewCanalForm(f => ({ ...f, locale: l }))} />
            {!isFlatLayout && (
              <div className="canal-header-img-wrap">
                <p className="canais-edit-section-title">Imagem do header</p>
                <HeaderImageEditor value={newCanalForm.headerImageUrl}
                  onChange={v => setNewCanalForm(f => ({ ...f, headerImageUrl: v }))} portalDbId={portalDbId} />
              </div>
            )}
            <div key={newCanalForm.locale} className="canais-edit-form__label-group">
              <label className="canais-edit-form__label lang-fade">
                Título
                <input className="canais-edit-form__input" type="text" placeholder="Ex: Governança" autoFocus
                  value={newCanalForm.titles[newCanalForm.locale] ?? ''}
                  onChange={e => setNewCanalForm(f => ({ ...f, titles: { ...f.titles, [f.locale]: e.target.value } }))} />
              </label>
              {!isFlatLayout && (
                <label className="canais-edit-form__label lang-fade" style={{ marginTop: '12px' }}>
                  Subtítulo <span style={{ fontWeight: 400, color: 'var(--color-gray-400)', fontSize: 'var(--text-xs)' }}>(opcional)</span>
                  <input className="canais-edit-form__input" type="text" placeholder="Breve descrição do canal"
                    value={newCanalForm.subtitles[newCanalForm.locale] ?? ''}
                    onChange={e => setNewCanalForm(f => ({ ...f, subtitles: { ...f.subtitles, [f.locale]: e.target.value } }))} />
                </label>
              )}
            </div>
            {isFlatLayout && (
              <p className="ct-wizard-hint">
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>info</span>
                No layout {portalLayout === 'sidebar' ? 'Sidebar' : 'Tabmenu'}, cada canal é uma página direta. Você escolherá o tipo de conteúdo no próximo passo.
              </p>
            )}
            {!isFlatLayout && (
              <div>
                <p className="canais-edit-section-title" style={{ marginBottom: '8px' }}>Tipo de canal</p>
                <div className="canais-new-type-row">
                  {(['pai', 'pagina'] as const).map(t => (
                    <button key={t} type="button"
                      className={`canais-new-type-btn${newCanalForm.tipo === t ? ' canais-new-type-btn--active' : ''}`}
                      onClick={() => setNewCanalForm(f => ({ ...f, tipo: t }))}
                    >
                      <span className="material-symbols-outlined canais-new-type-btn__icon">
                        {t === 'pai' ? 'account_tree' : 'article'}
                      </span>
                      <span className="canais-new-type-btn__label">{t === 'pai' ? 'Canal pai' : 'Página direta'}</span>
                      <span className="canais-new-type-btn__desc">
                        {t === 'pai' ? 'Agrupa páginas filhas na navegação' : 'Link direto sem filhos na navegação'}
                      </span>
                      {newCanalForm.tipo === t && (
                        <span className="canais-new-type-btn__check">
                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>check</span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {newCanalForm.tipo === 'pagina' && (
                  <p className="ct-wizard-hint">
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>info</span>
                    Você escolherá o tipo de conteúdo no próximo passo.
                  </p>
                )}
              </div>
            )}
            <label className="canais-new-draft-check">
              <input type="checkbox" checked={newCanalForm.draft}
                onChange={e => setNewCanalForm(f => ({ ...f, draft: e.target.checked }))} />
              <span>Salvar como rascunho (não exibir no portal ainda)</span>
            </label>
            <label className="canais-new-draft-check">
              <input type="checkbox" checked={newCanalForm.restrito}
                onChange={e => setNewCanalForm(f => ({ ...f, restrito: e.target.checked }))} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-primary-400)' }}>lock</span>
                Acesso restrito — exige login para visualizar
              </span>
            </label>
          </div>
        ) : (
          <div className="canais-edit-form">
            <p className="ct-step2-label">Selecione como o conteúdo será exibido nesta página.</p>
            <div className="ct-pt-grid">
              {(isFlatLayout ? PAGE_TYPES.filter(pt => FLAT_PAGE_TYPES.includes(pt.id)) : PAGE_TYPES).map(pt => (
                <button key={pt.id} type="button"
                  className={`ct-pt-card${newCanalForm.pageType === pt.id ? ' ct-pt-card--active' : ''}`}
                  onClick={() => setNewCanalForm(f => ({ ...f, pageType: pt.id }))}
                >
                  <div className="ct-pt-card__thumb">{pt.thumb}</div>
                  <div className="ct-pt-card__body">
                    <span className="material-symbols-outlined ct-pt-card__icon">{pt.icon}</span>
                    <span className="ct-pt-card__label">{pt.label}</span>
                  </div>
                  {newCanalForm.pageType === pt.id && (
                    <span className="ct-pt-card__check">
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>check</span>
                    </span>
                  )}
                </button>
              ))}
            </div>
            {newCanalForm.pageType && newCanalForm.pageType !== 'lista-agrupada' && (
              <div className="ct-flow-box">
                <p className="ct-flow-box__desc">
                  <span className="material-symbols-outlined ct-flow-box__icon">
                    {PAGE_TYPES.find(p => p.id === newCanalForm.pageType)?.icon}
                  </span>
                  {PAGE_TYPES.find(p => p.id === newCanalForm.pageType)?.flow}
                </p>
              </div>
            )}

            {/* Lista Agrupada: configuração de empresas/categorias */}
            {newCanalForm.pageType === 'lista-agrupada' && (
              <div className="ct-la-flow">
                {hasMultipleEmpresas ? (
                  <>
                    <div className="ct-la-flow__header">
                      <span className="material-symbols-outlined ct-la-flow__header-icon">domain</span>
                      <span>Este portal tem <strong>{portalEmpresas.length} empresas</strong>. A lista pode ser dividida automaticamente por empresa.</span>
                    </div>

                    <label className="ct-la-check ct-la-check--featured">
                      <input type="checkbox" checked={newCanalForm.laByEmpresa}
                        onChange={e => setNewCanalForm(f => ({ ...f, laByEmpresa: e.target.checked }))} />
                      <div>
                        <span className="ct-la-check__label">Dividir por empresa</span>
                        <span className="ct-la-check__desc">Cada empresa exibe sua própria lista de documentos nesta página</span>
                      </div>
                    </label>

                    {newCanalForm.laByEmpresa && (
                      <>
                        <p className="ct-la-sub-title">Empresas incluídas</p>
                        <div className="ct-la-empresas">
                          {portalEmpresas.map(e => (
                            <label key={e.id} className="ct-la-check">
                              <input type="checkbox"
                                checked={newCanalForm.laSelectedEmpresas.includes(e.id)}
                                onChange={ev => setNewCanalForm(f => ({
                                  ...f,
                                  laSelectedEmpresas: ev.target.checked
                                    ? [...f.laSelectedEmpresas, e.id]
                                    : f.laSelectedEmpresas.filter(id => id !== e.id),
                                }))}
                              />
                              <span className="ct-la-check__label">{e.label}</span>
                            </label>
                          ))}
                        </div>
                        <label className="ct-la-check">
                          <input type="checkbox" checked={newCanalForm.laFiltroEmpresa}
                            onChange={e => setNewCanalForm(f => ({ ...f, laFiltroEmpresa: e.target.checked }))} />
                          <div>
                            <span className="ct-la-check__label">Exibir filtro por empresa</span>
                            <span className="ct-la-check__desc">Usuário pode filtrar documentos por empresa no site</span>
                          </div>
                        </label>

                        {/* Per-empresa categories */}
                        {newCanalForm.laSelectedEmpresas.length > 0 && (
                          <>
                            <div className="canais-edit-divider" style={{ margin: 'var(--space-1) 0' }} />
                            <p className="ct-la-sub-title">
                              Categorias por empresa
                              <span style={{ fontWeight: 400, color: 'var(--color-gray-400)', marginLeft: 4 }}>— ao menos 1</span>
                            </p>
                            {portalEmpresas.filter(e => newCanalForm.laSelectedEmpresas.includes(e.id)).map(emp => {
                              const cats = newCanalForm.laEmpresaCategories[emp.id] ?? [];
                              return (
                                <div key={emp.id} className="ct-la-emp-cats">
                                  <p className="ct-la-emp-cats__name">{emp.label}</p>
                                  <MarcadorListEditor
                                    groups={cats}
                                    onChange={next => setNewCanalForm(f => ({ ...f, laEmpresaCategories: { ...f.laEmpresaCategories, [emp.id]: next } }))}
                                    locale={newCanalForm.locale}
                                    fallbackLocale={PORTAL_CONFIG.languages[0]}
                                    placeholder="Ex: ITR, DFP, Fatos Relevantes"
                                  />
                                </div>
                              );
                            })}
                          </>
                        )}

                        {/* Style picker */}
                        <p className="ct-la-sub-title" style={{ marginTop: 'var(--space-2)' }}>Estilo de agrupamento</p>
                        <div className="canais-agrupada-grid">
                          {(['accordion', 'secao'] as const).map(s => (
                            <button key={s} type="button"
                              className={`canais-agrupada-opt${newCanalForm.laStyle === s ? ' canais-agrupada-opt--active' : ''}`}
                              onClick={() => setNewCanalForm(f => ({ ...f, laStyle: s }))}
                            >
                              <span>{s === 'accordion' ? 'Accordion' : 'Seção'}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {!newCanalForm.laByEmpresa && (
                      <div className="ct-la-style-row">
                        <p className="ct-la-sub-title">Estilo de agrupamento</p>
                        <div className="canais-agrupada-grid">
                          {(['accordion', 'secao'] as const).map(s => (
                            <button key={s} type="button"
                              className={`canais-agrupada-opt${newCanalForm.laStyle === s ? ' canais-agrupada-opt--active' : ''}`}
                              onClick={() => setNewCanalForm(f => ({ ...f, laStyle: s }))}
                            >
                              <span>{s === 'accordion' ? 'Accordion' : 'Seção'}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="ct-la-flow__header">
                      <span className="material-symbols-outlined ct-la-flow__header-icon">category</span>
                      <span>Defina as categorias que organizarão os documentos desta página.</span>
                    </div>
                    <p className="ct-la-sub-title">
                      <span>Categorias <span className="ct-required">*</span></span>
                      <span style={{ fontWeight: 400, color: 'var(--color-gray-400)' }}> — mínimo 1</span>
                    </p>
                    <MarcadorListEditor
                      groups={newCanalForm.laCategories}
                      onChange={next => setNewCanalForm(f => ({ ...f, laCategories: next }))}
                      locale={newCanalForm.locale}
                      fallbackLocale={PORTAL_CONFIG.languages[0]}
                    />
                    <p className="ct-la-sub-title" style={{ marginTop: 'var(--space-2)' }}>Estilo de agrupamento</p>
                    <div className="canais-agrupada-grid">
                      {(['accordion', 'secao'] as const).map(s => (
                        <button key={s} type="button"
                          className={`canais-agrupada-opt${newCanalForm.laStyle === s ? ' canais-agrupada-opt--active' : ''}`}
                          onClick={() => setNewCanalForm(f => ({ ...f, laStyle: s }))}
                        >
                          <span>{s === 'accordion' ? 'Accordion' : 'Seção'}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      <UnsavedModal
        open={blocker.state === 'blocked'}
        onStay={() => blocker.reset?.()}
        onLeave={() => blocker.proceed?.()}
      />
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────
function PageTypePicker({ value, onChange, allowed, disabled }: { value: PageType | undefined; onChange: (v: PageType) => void; allowed?: PageType[]; disabled?: boolean }) {
  const options = allowed ? PAGE_TYPES.filter(pt => allowed.includes(pt.id)) : PAGE_TYPES;
  return (
    <div className={`canais-page-types${disabled ? ' canais-page-types--disabled' : ''}`}>
      {options.map(pt => (
        <button key={pt.id} type="button" disabled={disabled}
          className={`canais-page-type${value === pt.id ? ' canais-page-type--active' : ''}`}
          onClick={() => onChange(pt.id)}
        >
          <div className="canais-page-type__thumb">{pt.thumb}</div>
          <span className="canais-page-type__label">{pt.label}</span>
          <span className="canais-page-type__desc">{pt.desc}</span>
          {value === pt.id && (
            <span className="canais-page-type__check">
              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>check</span>
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function MateriasLinkPicker({ selected, onChange, portalKey }: { selected: string[]; onChange: (ids: string[]) => void; portalKey?: string }) {
  const materias = loadMaterias(portalKey);
  return (
    <>
      <p className="ct-step2-label">
        Selecione matérias existentes para vincular automaticamente a esta página. É opcional — você pode vincular mais matérias a qualquer momento pelo menu Matérias.
      </p>
      {materias.length === 0 ? (
        <p className="ct-mat-empty">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>article</span>
          Nenhuma matéria cadastrada ainda. Você pode vincular matérias pelo menu Matérias após criar a página.
        </p>
      ) : (
        <div className="ct-mat-list">
          {materias.map(m => {
            const isSel = selected.includes(m.id);
            return (
              <label key={m.id} className={`ct-mat-item${isSel ? ' ct-mat-item--selected' : ''}`}>
                <input type="checkbox" checked={isSel}
                  onChange={e => onChange(e.target.checked ? [...selected, m.id] : selected.filter(id => id !== m.id))} />
                <div className="ct-mat-item__info">
                  <span className="ct-mat-item__title">{m.titulo}</span>
                  {m.pageLabel && (
                    <span className="ct-mat-item__page">
                      <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>link</span>
                      Vinculada a: {m.pageLabel}
                    </span>
                  )}
                  <span className={`badge ${m.status === 'publicado' ? 'badge--success' : m.status === 'agendado' ? 'badge--warning' : 'badge--gray'}`}>
                    {m.status === 'publicado' ? 'Publicado' : m.status === 'agendado' ? 'Agendado' : 'Rascunho'}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      )}
      <p className="ct-wizard-hint">
        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>info</span>
        Matérias já vinculadas a outras páginas serão movidas para esta nova página.
      </p>
    </>
  );
}

// Uploads straight to Storage and returns a real public URL — a data: URL
// embedded in portal_config.canais would bloat that JSON blob with a full
// base64 image and never actually resolve as a stable, cacheable asset
// (same anti-pattern already fixed for matéria section images).
async function uploadCanalHeaderImage(file: File, objectUrl: string, portalDbId: string | null): Promise<string> {
  if (!portalDbId || !isSupabaseConfigured || !supabase) return objectUrl;
  try {
    const path = `${portalDbId}/header/canal-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
    const { error } = await supabase.storage.from('portal-media').upload(path, file, { upsert: true, contentType: file.type || 'image/webp' });
    if (error) return objectUrl;
    // Same gap as matéria images: uploaded straight to the bucket with no
    // portal_media row, so it never showed up in Biblioteca de Mídia.
    supabase.from('portal_media').insert({
      id: crypto.randomUUID(),
      portal_id: portalDbId,
      name: file.name || 'header.webp',
      type: 'image',
      size_bytes: file.size,
      file_path: path,
    }).then(({ error: insertError }) => {
      if (insertError) console.error('portal_media insert failed for header image', insertError);
    });
    return supabase.storage.from('portal-media').getPublicUrl(path).data.publicUrl;
  } catch {
    return objectUrl;
  }
}

function HeaderImageEditor({ value, onChange, portalDbId, placeholderLabel, disabled }: {
  value: string | null; onChange: (v: string | null) => void; portalDbId: string | null; placeholderLabel?: string; disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const result = await processImageToDataUrl(f, 'channel-header');
      const url = await uploadCanalHeaderImage(result.file, result.dataUrl, portalDbId);
      onChange(url);
    } finally { setUploading(false); }
  }
  if (value) return (
    <div className={`canal-header-img-preview${disabled ? ' canal-header-img-preview--disabled' : ''}`}>
      <img src={value} alt="Header" className="canal-header-img-preview__img" />
      <div className="canal-header-img-preview__actions">
        <label className="btn-action btn-action--enter canais-img-file-label">
          {uploading ? 'Enviando…' : 'Substituir'}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} disabled={uploading || disabled} />
        </label>
        <button className="btn-action btn-action--danger" type="button" disabled={disabled} onClick={() => onChange(null)}>Remover</button>
      </div>
    </div>
  );
  return (
    <label className={`canal-header-img-empty canais-img-file-label${disabled ? ' canal-header-img-empty--disabled' : ''}`}>
      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} disabled={uploading || disabled} />
      <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>image</span>
      <span>{uploading ? 'Enviando…' : (placeholderLabel ?? 'Clique para adicionar imagem de header')}</span>
    </label>
  );
}
