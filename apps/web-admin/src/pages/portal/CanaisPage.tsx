import { useState, useCallback, useRef, Fragment } from 'react';
import { processImage } from '../../utils/imageProcessor';
import StickyPageHeader from '../../components/StickyPageHeader';
import Modal from '../../components/Modal';
import LangTabs from '../../components/LangTabs';
import { Canal, SubCanal, SubSubCanal, DEFAULT_CANAIS, PageType, ListaAgrupadaStyle } from '../../components/ChannelEditor';
import PORTAL_CONFIG, { LocaleCode } from '../../portalConfig';
import { usePortalName } from '../../hooks/usePortalName';
import { useAuth } from '../../contexts/AuthContext';
import { savePortalConfig } from '../../lib/portalConfigApi';
import { loadMaterias, persistMateria } from '../../hooks/useMateriasStore';
import { loadCvmRoutedPageIds } from '../../services/cvm.service';
import { usePublish } from '../../contexts/PublishContext';
import '../admin/AdminPages.css';
import './CanaisPage.css';

function genId() {
  return Math.random().toString(36).slice(2, 9);
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
  pageType: PageType;
  isExternalLink: boolean;
  externalUrl: string;
  draft: boolean;
  // lista-agrupada
  laStyle: ListaAgrupadaStyle;
  laByEmpresa: boolean;
  laSelectedEmpresas: string[];
  laFiltroEmpresa: boolean;
  laCategories: string[];
  laCatInput: string;
  laEmpresaCategories: Record<string, string[]>;
  laEmpresaCatInputs: Record<string, string>;
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
    pageType: 'show', isExternalLink: false, externalUrl: '',
    draft: false, laStyle: 'accordion',
    laByEmpresa: hasMultiple,
    laSelectedEmpresas: empresas.map(e => e.id),
    laFiltroEmpresa: hasMultiple,
    laCategories: [], laCatInput: '',
    laEmpresaCategories: {}, laEmpresaCatInputs: {},
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
  pageType: PageType;
  listaAgrupadaStyle: ListaAgrupadaStyle;
  isExternalLink: boolean;
  externalUrl: string;
  showInFooter: boolean;
  transferTo: string;
  // lista-agrupada
  laByEmpresa: boolean;
  laSelectedEmpresas: string[];
  laFiltroEmpresa: boolean;
  laCategories: string[];
  laCatInput: string;
  laEmpresaCategories: Record<string, string[]>;
  laEmpresaCatInputs: Record<string, string>;
  laActiveEmpresa: string;
}

interface CanalEditState {
  canalId: string;
  label: string;
  pageType: PageType;
  headerImageUrl: string | null;
  applyHeaderToChildren: boolean;
  isLeaf: boolean;
  showInFooter: boolean;
}

type CanalType = 'pagina' | 'pai';

interface NewCanalForm {
  step: 1 | 2 | 3;
  titles: Record<string, string>;
  subtitles: Record<string, string>;
  headerImageUrl: string | null;
  tipo: CanalType;
  pageType: PageType;
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
  laCategories: string[];
  laCatInput: string;
  laEmpresaCategories: Record<string, string[]>;
  laEmpresaCatInputs: Record<string, string>;
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
    pageType: 'show',
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
    laCatInput: '',
    laEmpresaCategories: {},
    laEmpresaCatInputs: {},
    linkedMateriaIds: [],
  };
}

interface ConfirmDeleteState {
  type: 'canal' | 'sub' | 'subsub';
  label: string;
  canalId: string;
  subId?: string;
  subSubId?: string;
}

function orderKey(list: Canal[]): string {
  return list.map(c =>
    c.id + ':' + c.children.map(s => s.id + (s.children?.map(ss => ss.id).join(',') ?? '')).join(',')
  ).join('|');
}

// ── Component ───────────────────────────────────────────────────────────────
export default function CanaisPage() {
  const portalName = usePortalName();
  const { publish, publishing } = usePublish();
  const { user } = useAuth();
  const activePortalId = user?.activePortalId;
  const canaisKey = `portal_canais_${activePortalId ?? 'default'}`;
  const cvmPageIds = loadCvmRoutedPageIds();
  const portalEmpresas = loadPortalEmpresas(activePortalId);
  const hasMultipleEmpresas = portalEmpresas.length > 1;
  const [canais, setCanais] = useState<Canal[]>(() => {
    try {
      const raw = localStorage.getItem(canaisKey);
      return raw ? JSON.parse(raw) : DEFAULT_CANAIS;
    } catch {
      return DEFAULT_CANAIS;
    }
  });
  const [savedOrderKey, setSavedOrderKey] = useState(() => {
    try {
      const raw = localStorage.getItem(canaisKey);
      return orderKey(raw ? JSON.parse(raw) : DEFAULT_CANAIS);
    } catch {
      return orderKey(DEFAULT_CANAIS);
    }
  });

  // Modals
  const [editModal, setEditModal] = useState<EditState | null>(null);
  const [canalEditModal, setCanalEditModal] = useState<CanalEditState | null>(null);
  const [newCanalOpen, setNewCanalOpen] = useState(false);
  const [newCanalForm, setNewCanalForm] = useState<NewCanalForm>(emptyNewCanalForm(portalEmpresas));
  const [newSubOpen, setNewSubOpen] = useState(false);
  const [newSubForm, setNewSubForm] = useState<NewSubForm>(emptyNewSubForm('', null, false, portalEmpresas));
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState | null>(null);
  const [subConfirming, setSubConfirming] = useState(false);

  // Accordion expand state — L1 canals and L2 subs with children
  const [expandedCanals, setExpandedCanals] = useState<Set<string>>(
    () => new Set(DEFAULT_CANAIS.map(c => c.id))
  );
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(
    () => new Set(
      DEFAULT_CANAIS.flatMap(c => c.children.filter(s => (s.children?.length ?? 0) > 0).map(s => s.id))
    )
  );

  function toggleExpandCanal(id: string) {
    setExpandedCanals(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleExpandSub(id: string) {
    setExpandedSubs(prev => {
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

  const orderChanged = orderKey(canais) !== savedOrderKey;
  const mutate = useCallback((fn: (prev: Canal[]) => Canal[]) => {
    setCanais(prev => {
      const next = fn(prev);
      localStorage.setItem(canaisKey, JSON.stringify(next));
      if (activePortalId) savePortalConfig(activePortalId, { canais: next }).catch(console.error);
      return next;
    });
  }, [canaisKey, activePortalId]);

  function saveToStorage(updated: Canal[]) {
    localStorage.setItem(canaisKey, JSON.stringify(updated));
    if (activePortalId) savePortalConfig(activePortalId, { canais: updated }).catch(console.error);
  }
  function handleSaveOrder() {
    saveToStorage(canais);
    setSavedOrderKey(orderKey(canais));
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
  function openConfirmDelete(state: ConfirmDeleteState) {
    setConfirmDelete(state);
  }
  function doDelete() {
    if (!confirmDelete) return;
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
      const ss: SubSubCanal = { id: newId, label, href, enabled: !newSubForm.draft };
      mutate(prev => prev.map(c => c.id !== newSubForm.canalId ? c : {
        ...c, children: c.children.map(s => s.id !== newSubForm.parentSubId ? s : {
          ...s, children: [...(s.children ?? []), ss],
        }),
      }));
    } else {
      const s: SubCanal = {
        id: newId, label, href,
        enabled: !newSubForm.draft,
        ...(newSubForm.hasChildren ? {} : { pageType: newSubForm.pageType }),
        ...(newSubForm.isExternalLink ? { isExternalLink: true, externalUrl: newSubForm.externalUrl } : {}),
        ...(newSubForm.pageType === 'lista-agrupada' ? { listaAgrupadaStyle: newSubForm.laStyle } : {}),
      };
      mutate(prev => prev.map(c => c.id !== newSubForm.canalId ? c : { ...c, children: [...c.children, s] }));
    }

    if (newSubForm.linkedMateriaIds.length > 0) {
      const all = loadMaterias();
      for (const mid of newSubForm.linkedMateriaIds) {
        const m = all.find(x => x.id === mid);
        if (m) persistMateria({ ...m, pageId: newId, pageLabel: label });
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
     newSubForm.pageType !== 'lista-agrupada' ||
     (hasMultipleEmpresas
       ? newSubForm.laSelectedEmpresas.some(id => (newSubForm.laEmpresaCategories[id]?.length ?? 0) > 0)
       : newSubForm.laCategories.length > 0))
  );

  const subHasMatStep = !newSubForm.hasChildren && MATERIA_STEP_TYPES.includes(newSubForm.pageType);
  const subTotalSteps = newSubForm.hasChildren ? 1 : newSubForm.pageType === 'lista-agrupada' ? 4 : subHasMatStep ? 3 : 2;
  const canalHasMatStep = newCanalForm.tipo === 'pagina' && MATERIA_STEP_TYPES.includes(newCanalForm.pageType);

  // ── Canal edit ─────────────────────────────────────────────────────────
  function openCanalEdit(canal: Canal) {
    setCanalEditModal({
      canalId: canal.id, label: canal.label,
      pageType: canal.pageType ?? 'show',
      headerImageUrl: canal.headerImage ?? null,
      applyHeaderToChildren: false,
      isLeaf: canal.children.length === 0,
      showInFooter: canal.showInFooter ?? false,
    });
  }
  function commitCanalEdit() {
    if (!canalEditModal) return;
    const { canalId, label, pageType, headerImageUrl, applyHeaderToChildren, isLeaf, showInFooter } = canalEditModal;
    setCanais(prev => {
      const next = prev.map(c => {
        if (c.id !== canalId) return c;
        const updated: Canal = {
          ...c, label: label.trim() || c.label,
          pageType: isLeaf ? pageType : c.pageType,
          headerImage: headerImageUrl ?? undefined, showInFooter,
        };
        if (applyHeaderToChildren && headerImageUrl) {
          updated.children = c.children.map(s => ({ ...s, headerImage: headerImageUrl } as SubCanal & { headerImage?: string }));
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
      id: newId, label, enabled: !newCanalForm.draft, children: [],
      ...(isLeaf ? { pageType: newCanalForm.pageType } : {}),
      ...(newCanalForm.headerImageUrl ? { headerImage: newCanalForm.headerImageUrl } : {}),
    };
    mutate(prev => [...prev, c]);

    if (newCanalForm.linkedMateriaIds.length > 0) {
      const all = loadMaterias();
      for (const mid of newCanalForm.linkedMateriaIds) {
        const m = all.find(x => x.id === mid);
        if (m) persistMateria({ ...m, pageId: newId, pageLabel: label });
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
    laCategories: [] as string[],
    laCatInput: '',
    laEmpresaCategories: {} as Record<string, string[]>,
    laEmpresaCatInputs: {} as Record<string, string>,
    laActiveEmpresa: portalEmpresas[0]?.id ?? '',
  };

  function openEdit(cid: string, sub: SubCanal, parentSubId?: string) {
    const primaryLang = PORTAL_CONFIG.languages[0];
    setEditModal({
      canalId: cid, parentSubId, subId: sub.id,
      locale: primaryLang,
      labels: { [primaryLang]: sub.label },
      label: sub.label, href: sub.href, targetCanalId: cid,
      pageType: sub.pageType ?? 'show', listaAgrupadaStyle: sub.listaAgrupadaStyle ?? 'accordion',
      isExternalLink: sub.isExternalLink ?? false, externalUrl: sub.externalUrl ?? '',
      showInFooter: sub.showInFooter ?? false, transferTo: '',
      ..._laDefaults,
    });
  }
  function openEditSubSub(cid: string, sid: string, ss: SubSubCanal) {
    const primaryLang = PORTAL_CONFIG.languages[0];
    setEditModal({
      canalId: cid, parentSubId: sid, subId: ss.id,
      locale: primaryLang,
      labels: { [primaryLang]: ss.label },
      label: ss.label, href: ss.href, targetCanalId: cid,
      pageType: ss.pageType ?? 'show', listaAgrupadaStyle: 'accordion',
      isExternalLink: ss.isExternalLink ?? false, externalUrl: ss.externalUrl ?? '',
      showInFooter: false, transferTo: '',
      ..._laDefaults,
    });
  }
  function commitEdit() {
    if (!editModal) return;
    const primaryLang = PORTAL_CONFIG.languages[0];
    const resolvedLabel = editModal.labels[primaryLang]?.trim() || editModal.label;
    const { canalId, parentSubId, subId, href, targetCanalId, pageType, listaAgrupadaStyle, isExternalLink, externalUrl, showInFooter } = editModal;
    const label = resolvedLabel;
    if (parentSubId) {
      setCanais(prev => {
        const next = prev.map(c => c.id !== canalId ? c : {
          ...c, children: c.children.map(s => s.id !== parentSubId ? s : {
            ...s, children: (s.children ?? []).map(ss => ss.id !== subId ? ss : {
              ...ss, label: label.trim() || ss.label, href: href.trim() || ss.href,
              pageType, isExternalLink, externalUrl: isExternalLink ? externalUrl : undefined,
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
            ...sub, label: label.trim() || sub.label, href: href.trim() || sub.href,
            pageType, listaAgrupadaStyle: pageType === 'lista-agrupada' ? listaAgrupadaStyle : undefined,
            isExternalLink, externalUrl: isExternalLink ? externalUrl : undefined, showInFooter,
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
  const canCommitNewCanal = newCanalForm.tipo !== 'pagina' || newCanalForm.pageType !== 'lista-agrupada' || (
    hasMultipleEmpresas
      ? (!newCanalForm.laByEmpresa ||
         newCanalForm.laSelectedEmpresas.some(id => (newCanalForm.laEmpresaCategories[id]?.length ?? 0) > 0))
      : newCanalForm.laCategories.length > 0
  );

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <StickyPageHeader
        title="Árvore de canais"
        description={<>Árvore de navegação do portal <strong>{portalName}</strong>.</>}
        action={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {orderChanged && (
              <button className="btn-outline" type="button" onClick={handleSaveOrder}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>save</span>
                Salvar ordem
              </button>
            )}
            <button className="btn-outline" type="button" onClick={() => { setNewCanalForm(emptyNewCanalForm(portalEmpresas)); setNewCanalOpen(true); }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
              Novo canal
            </button>
            <button className="btn-primary" type="button" onClick={publish} disabled={publishing} style={{ minWidth: 100 }}>
              {publishing ? 'Publicando…' : 'Publicar'}
            </button>
          </div>
        }
      />

      {/* ── Accordion tree ────────────────────────────────────────────── */}
      <div className="ct-tree">
        {canais.map((canal, ci) => {
          const canalExpanded = expandedCanals.has(canal.id);
          const movedInfo = movedCanals.find(x => x.id === canal.id);
          return (
            <div
              key={canal.id}
              className={['ct-canal-card', movedInfo ? `ct-row--moved-${movedInfo.dir === -1 ? 'up' : 'down'}` : ''].filter(Boolean).join(' ')}
            >
              {/* L1 — Canal row */}
              <div
                className={[
                  'ct-row ct-row--l1',
                  !canal.enabled ? 'ct-row--off' : '',
                ].filter(Boolean).join(' ')}
              >
                <div className="ct-row__title">
                  <span className="ct-row__name">{canal.label}</span>
                  <span className="ct-row__path">Canal raiz</span>
                </div>
                <span className="ct-row__type-col">—</span>
                <span className="ct-row__status-col">
                  <span className={`ct-status-dot${canal.enabled ? ' ct-status-dot--on' : ''}`} />
                </span>
                <div className="ct-row__acts">
                  <div className="ct-row__reorder">
                    <button className="ct-icon-btn ct-icon-btn--sm" type="button" title="Subir" onClick={() => moveCanal(ci, -1)} disabled={ci === 0}>
                      <span className="material-symbols-outlined">expand_less</span>
                    </button>
                    <button className="ct-icon-btn ct-icon-btn--sm" type="button" title="Descer" onClick={() => moveCanal(ci, 1)} disabled={ci === canais.length - 1}>
                      <span className="material-symbols-outlined">expand_more</span>
                    </button>
                  </div>
                  <button className="btn-action btn-action--enter" type="button" onClick={() => openCanalEdit(canal)}>Editar</button>
                  <button className={`btn-action ${canal.enabled ? 'btn-action--secondary' : 'btn-action--enter'}`} type="button" onClick={() => toggleCanal(canal.id)}>
                    {canal.enabled ? 'Despublicar' : 'Publicar'}
                  </button>
                  <button className="btn-action btn-action--danger" type="button"
                    onClick={() => openConfirmDelete({ type: 'canal', label: canal.label, canalId: canal.id })}>
                    Excluir
                  </button>
                  <button className="btn-action btn-action--enter" type="button" onClick={() => openNewSub(canal.id)}>
                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>add</span>
                    Página
                  </button>
                </div>
                <button
                  className={`ct-expand ct-expand--l1${canalExpanded ? ' ct-expand--open' : ''}`}
                  type="button"
                  aria-label={canalExpanded ? 'Recolher' : 'Expandir'}
                  onClick={() => toggleExpandCanal(canal.id)}
                >
                  <span className="material-symbols-outlined">expand_more</span>
                </button>
              </div>

              {/* Animated canal body — always rendered, height animated */}
              <div className={`ct-canal-body${canalExpanded ? ' ct-canal-body--open' : ''}`}>
                <div className="ct-canal-body__inner">
                  {canal.children.length === 0 && (
                    <div className="ct-row ct-row--empty">
                      <span className="ct-empty">Nenhuma página neste canal.</span>
                    </div>
                  )}

                  {canal.children.map((sub, si) => {
                    const hasL3 = (sub.children?.length ?? 0) > 0;
                    const subExpanded = expandedSubs.has(sub.id);
                    return (
                      <Fragment key={sub.id}>
                        {/* L2 row */}
                        <div className={`ct-row ct-row--l2${!sub.enabled ? ' ct-row--off' : ''}`}>
                          {hasL3 ? (
                            <button
                              className={`ct-expand ct-expand--sub${subExpanded ? ' ct-expand--open' : ''}`}
                              type="button"
                              aria-label={subExpanded ? 'Recolher' : 'Expandir'}
                              onClick={() => toggleExpandSub(sub.id)}
                            >
                              <span className="material-symbols-outlined">add</span>
                            </button>
                          ) : (
                            <span className="ct-expand ct-expand--leaf" aria-hidden="true" />
                          )}
                          <div className="ct-row__title">
                            <span className="ct-row__name">{sub.label}</span>
                            <span className="ct-row__path">{canal.label} › {sub.label}</span>
                          </div>
                          <span className="ct-row__type-col">
                            {sub.pageType ? <span className="ct-type-badge">{sub.pageType}</span> : '—'}
                            {cvmPageIds.has(sub.id) && <span className="ct-cvm-badge">⟳ Auto CVM</span>}
                          </span>
                          <span className="ct-row__status-col">
                            <span className={`ct-status-dot${sub.enabled ? ' ct-status-dot--on' : ''}`} />
                          </span>
                          <div className="ct-row__acts">
                            <div className="ct-row__reorder">
                              <button className="ct-icon-btn ct-icon-btn--sm" type="button" onClick={() => moveSub(canal.id, si, -1)} disabled={si === 0}>
                                <span className="material-symbols-outlined">expand_less</span>
                              </button>
                              <button className="ct-icon-btn ct-icon-btn--sm" type="button" onClick={() => moveSub(canal.id, si, 1)} disabled={si === canal.children.length - 1}>
                                <span className="material-symbols-outlined">expand_more</span>
                              </button>
                            </div>
                            <button className="btn-action btn-action--enter" type="button" onClick={() => openEdit(canal.id, sub)}>Editar</button>
                            <button className={`btn-action ${sub.enabled ? 'btn-action--secondary' : 'btn-action--enter'}`} type="button" onClick={() => toggleSub(canal.id, sub.id)}>
                              {sub.enabled ? 'Despublicar' : 'Publicar'}
                            </button>
                            <button className="btn-action btn-action--danger" type="button"
                              onClick={() => openConfirmDelete({ type: 'sub', label: sub.label, canalId: canal.id, subId: sub.id })}>
                              Excluir
                            </button>
                            <button className="btn-action btn-action--enter" type="button" onClick={() => openNewSubSub(canal.id, sub.id)}>
                              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>add</span>
                              Sub-página
                            </button>
                          </div>
                        </div>

                        {/* Animated L3 body */}
                        {hasL3 && (
                          <div className={`ct-sub-body${subExpanded ? ' ct-sub-body--open' : ''}`}>
                            <div className="ct-sub-body__inner">
                              {(sub.children ?? []).map((ss, ssi) => (
                                <div key={ss.id} className={`ct-row ct-row--l3${!ss.enabled ? ' ct-row--off' : ''}`}>
                                  <span className="ct-expand ct-expand--leaf" aria-hidden="true" />
                                  <div className="ct-row__title">
                                    <span className="ct-row__name">{ss.label}</span>
                                    <span className="ct-row__path">{canal.label} › {sub.label} › {ss.label}</span>
                                  </div>
                                  <span className="ct-row__type-col">
                                    {ss.pageType ? <span className="ct-type-badge">{ss.pageType}</span> : '—'}
                                    {cvmPageIds.has(ss.id) && <span className="ct-cvm-badge">⟳ Auto CVM</span>}
                                  </span>
                                  <span className="ct-row__status-col">
                                    <span className={`ct-status-dot${ss.enabled ? ' ct-status-dot--on' : ''}`} />
                                  </span>
                                  <div className="ct-row__acts">
                                    <div className="ct-row__reorder">
                                      <button className="ct-icon-btn ct-icon-btn--sm" type="button" onClick={() => moveSubSub(canal.id, sub.id, ssi, -1)} disabled={ssi === 0}>
                                        <span className="material-symbols-outlined">expand_less</span>
                                      </button>
                                      <button className="ct-icon-btn ct-icon-btn--sm" type="button" onClick={() => moveSubSub(canal.id, sub.id, ssi, 1)} disabled={ssi === (sub.children?.length ?? 0) - 1}>
                                        <span className="material-symbols-outlined">expand_more</span>
                                      </button>
                                    </div>
                                    <button className="btn-action btn-action--enter" type="button" onClick={() => openEditSubSub(canal.id, sub.id, ss)}>Editar</button>
                                    <button className={`btn-action ${ss.enabled ? 'btn-action--secondary' : 'btn-action--enter'}`} type="button" onClick={() => toggleSubSub(canal.id, sub.id, ss.id)}>
                                      {ss.enabled ? 'Despublicar' : 'Publicar'}
                                    </button>
                                    <button className="btn-action btn-action--danger" type="button"
                                      onClick={() => openConfirmDelete({ type: 'subsub', label: ss.label, canalId: canal.id, subId: sub.id, subSubId: ss.id })}>
                                      Excluir
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Fragment>
                    );
                  })}
                </div>
              </div>
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
              <button className="btn-primary" style={{ background: '#dc2626', borderColor: '#dc2626' }} type="button" onClick={doDelete}>Excluir</button>
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
                  <button className="btn-primary" type="button" onClick={() => patchSub({ step: 3 })}>
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
                  />
                )}
              </>
            )}

            {!newSubForm.parentSubId && (
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
                {newSubForm.pageType !== 'lista-agrupada' && (
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
                            {cats.slice(0, 4).map((cat, i) => (
                              <span key={i} className="ct-la-cat-chip ct-la-cat-chip--sm">{cat}</span>
                            ))}
                            {cats.length > 4 && <span className="ct-la-emp-box__more">+{cats.length - 4}</span>}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Active empresa category input */}
                {(() => {
                  const empId = newSubForm.laActiveEmpresa;
                  const emp = portalEmpresas.find(e => e.id === empId);
                  if (!emp || !newSubForm.laSelectedEmpresas.includes(empId)) return null;
                  const cats = newSubForm.laEmpresaCategories[empId] ?? [];
                  const catInput = newSubForm.laEmpresaCatInputs[empId] ?? '';
                  return (
                    <div className="ct-la-active-emp">
                      <p className="ct-la-sub-title">{emp.label}</p>
                      <div className="ct-la-cat-input">
                        <input className="canais-edit-form__input" type="text"
                          placeholder="Ex: ITR, DFP, Fatos Relevantes"
                          value={catInput}
                          onChange={e => patchSub({ laEmpresaCatInputs: { ...newSubForm.laEmpresaCatInputs, [empId]: e.target.value } })}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && catInput.trim()) {
                              e.preventDefault();
                              patchSub({
                                laEmpresaCategories: { ...newSubForm.laEmpresaCategories, [empId]: [...cats, catInput.trim()] },
                                laEmpresaCatInputs: { ...newSubForm.laEmpresaCatInputs, [empId]: '' },
                              });
                            }
                          }}
                        />
                        <button className="btn-outline" type="button"
                          disabled={!catInput.trim()}
                          onClick={() => patchSub({
                            laEmpresaCategories: { ...newSubForm.laEmpresaCategories, [empId]: [...cats, catInput.trim()] },
                            laEmpresaCatInputs: { ...newSubForm.laEmpresaCatInputs, [empId]: '' },
                          })}>
                          Adicionar
                        </button>
                      </div>
                      {cats.length > 0 ? (
                        <div className="ct-la-cats">
                          {cats.map((cat, i) => (
                            <span key={i} className="ct-la-cat-chip">
                              {cat}
                              <button type="button" onClick={() => patchSub({
                                laEmpresaCategories: { ...newSubForm.laEmpresaCategories, [empId]: cats.filter((_, j) => j !== i) },
                              })}>
                                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="ct-la-cat-hint">Pressione Enter ou clique em "Adicionar" para incluir uma categoria.</p>
                      )}
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
                <div className="ct-la-cat-input">
                  <input className="canais-edit-form__input" type="text"
                    placeholder="Ex: Demonstrações Financeiras"
                    value={newSubForm.laCatInput}
                    onChange={e => patchSub({ laCatInput: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newSubForm.laCatInput.trim()) {
                        e.preventDefault();
                        patchSub({ laCategories: [...newSubForm.laCategories, newSubForm.laCatInput.trim()], laCatInput: '' });
                      }
                    }}
                  />
                  <button className="btn-outline" type="button"
                    disabled={!newSubForm.laCatInput.trim()}
                    onClick={() => patchSub({ laCategories: [...newSubForm.laCategories, newSubForm.laCatInput.trim()], laCatInput: '' })}>
                    Adicionar
                  </button>
                </div>
                {newSubForm.laCategories.length > 0 ? (
                  <div className="ct-la-cats">
                    {newSubForm.laCategories.map((cat, i) => (
                      <span key={i} className="ct-la-cat-chip">
                        {cat}
                        <button type="button" onClick={() => patchSub({ laCategories: newSubForm.laCategories.filter((_, j) => j !== i) })}>
                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="ct-la-cat-hint">Pressione Enter ou clique em "Adicionar" para incluir uma categoria.</p>
                )}
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
              <button className="btn-primary" type="button" onClick={commitCanalEdit}>Salvar</button>
            </div>
          }
        >
          <div className="canais-edit-form">
            <label className="canais-edit-form__label">
              Nome do canal
              <input className="canais-edit-form__input" type="text" value={canalEditModal.label} autoFocus
                onChange={e => setCanalEditModal(m => m ? { ...m, label: e.target.value } : m)} />
            </label>
            <div className="canais-edit-divider" />
            <p className="canais-edit-section-title">Imagem do header</p>
            <HeaderImageEditor
              value={canalEditModal.headerImageUrl}
              onChange={v => setCanalEditModal(m => m ? { ...m, headerImageUrl: v } : m)}
            />
            <label className="canal-apply-default">
              <input type="checkbox" checked={canalEditModal.applyHeaderToChildren}
                onChange={e => setCanalEditModal(m => m ? { ...m, applyHeaderToChildren: e.target.checked } : m)} />
              Aplicar como padrão para todas as páginas filhas
            </label>
            <div className="canais-edit-divider" />
            <label className="canal-apply-default">
              <input type="checkbox" checked={canalEditModal.showInFooter}
                onChange={e => setCanalEditModal(m => m ? { ...m, showInFooter: e.target.checked } : m)} />
              <span>Exibir no footer <span style={{ fontWeight: 400, color: 'var(--color-gray-400)', fontSize: 'var(--text-xs)' }}>(Footer completo com mapa do site)</span></span>
            </label>
            {canalEditModal.isLeaf && (
              <>
                <div className="canais-edit-divider" />
                <p className="canais-edit-section-title">Tipo de página</p>
                <PageTypePicker
                  value={canalEditModal.pageType}
                  onChange={v => setCanalEditModal(m => m ? { ...m, pageType: v } : m)}
                />
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
              <button className="btn-primary" type="button" onClick={commitEdit}>Salvar</button>
            </div>
          }
        >
          <div className="canais-edit-form">
            <label className="canais-new-draft-check">
              <input type="checkbox" checked={editModal.isExternalLink}
                onChange={e => setEditModal(m => m ? { ...m, isExternalLink: e.target.checked, externalUrl: '' } : m)} />
              <span>Link externo</span>
            </label>

            {PORTAL_CONFIG.languages.length > 1 && (
              <LangTabs active={editModal.locale} onChange={l => setEditModal(m => m ? { ...m, locale: l } : m)} />
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
                  <input className="canais-edit-form__input" type="url" placeholder="https://..."
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
                  <input className="canais-edit-form__input" type="text" value={editModal.href}
                    onChange={e => setEditModal(m => m ? { ...m, href: e.target.value } : m)} />
                </label>
              </div>
            )}

            <div className="canais-edit-divider" />
            <p className="canais-edit-section-title">Tipo de página</p>
            <PageTypePicker value={editModal.pageType} onChange={v => setEditModal(m => m ? { ...m, pageType: v, ..._laDefaults } : m)} />

            {/* Lista Agrupada flow */}
            {editModal.pageType === 'lista-agrupada' && (
              <div className="ct-la-flow">
                {/* Style picker */}
                <p className="ct-la-sub-title">Estilo de agrupamento</p>
                <div className="canais-agrupada-grid">
                  {(['accordion', 'secao'] as const).map(s => (
                    <button key={s} type="button"
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
                                {cats.slice(0, 4).map((cat, i) => (
                                  <span key={i} className="ct-la-cat-chip ct-la-cat-chip--sm">{cat}</span>
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
                      const catInput = editModal.laEmpresaCatInputs[empId] ?? '';
                      return (
                        <div className="ct-la-active-emp">
                          <p className="ct-la-sub-title">{emp.label}</p>
                          <div className="ct-la-cat-input">
                            <input className="canais-edit-form__input" type="text"
                              placeholder="Ex: ITR, DFP, Fatos Relevantes"
                              value={catInput}
                              onChange={e => setEditModal(m => m ? { ...m, laEmpresaCatInputs: { ...m.laEmpresaCatInputs, [empId]: e.target.value } } : m)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && catInput.trim()) {
                                  e.preventDefault();
                                  setEditModal(m => m ? {
                                    ...m,
                                    laEmpresaCategories: { ...m.laEmpresaCategories, [empId]: [...cats, catInput.trim()] },
                                    laEmpresaCatInputs: { ...m.laEmpresaCatInputs, [empId]: '' },
                                  } : m);
                                }
                              }}
                            />
                            <button className="btn-outline" type="button"
                              disabled={!catInput.trim()}
                              onClick={() => setEditModal(m => m ? {
                                ...m,
                                laEmpresaCategories: { ...m.laEmpresaCategories, [empId]: [...cats, catInput.trim()] },
                                laEmpresaCatInputs: { ...m.laEmpresaCatInputs, [empId]: '' },
                              } : m)}>
                              Adicionar
                            </button>
                          </div>
                          {cats.length > 0 ? (
                            <div className="ct-la-cats">
                              {cats.map((cat, i) => (
                                <span key={i} className="ct-la-cat-chip">
                                  {cat}
                                  <button type="button" onClick={() => setEditModal(m => m ? {
                                    ...m,
                                    laEmpresaCategories: { ...m.laEmpresaCategories, [empId]: cats.filter((_, j) => j !== i) },
                                  } : m)}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
                                  </button>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="ct-la-cat-hint">Pressione Enter ou clique em "Adicionar" para incluir uma categoria.</p>
                          )}
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
                    <div className="ct-la-cat-input">
                      <input className="canais-edit-form__input" type="text"
                        placeholder="Ex: Demonstrações Financeiras"
                        value={editModal.laCatInput}
                        onChange={e => setEditModal(m => m ? { ...m, laCatInput: e.target.value } : m)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && editModal.laCatInput.trim()) {
                            e.preventDefault();
                            setEditModal(m => m ? { ...m, laCategories: [...m.laCategories, m.laCatInput.trim()], laCatInput: '' } : m);
                          }
                        }}
                      />
                      <button className="btn-outline" type="button"
                        disabled={!editModal.laCatInput.trim()}
                        onClick={() => setEditModal(m => m ? { ...m, laCategories: [...m.laCategories, m.laCatInput.trim()], laCatInput: '' } : m)}>
                        Adicionar
                      </button>
                    </div>
                    {editModal.laCategories.length > 0 ? (
                      <div className="ct-la-cats">
                        {editModal.laCategories.map((cat, i) => (
                          <span key={i} className="ct-la-cat-chip">
                            {cat}
                            <button type="button" onClick={() => setEditModal(m => m ? { ...m, laCategories: m.laCategories.filter((_, j) => j !== i) } : m)}>
                              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="ct-la-cat-hint">Pressione Enter ou clique em "Adicionar" para incluir uma categoria.</p>
                    )}
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
            <div className="canal-header-img-wrap">
              <p className="canais-edit-section-title">Imagem do header</p>
              <HeaderImageEditor value={newCanalForm.headerImageUrl}
                onChange={v => setNewCanalForm(f => ({ ...f, headerImageUrl: v }))} />
            </div>
            <div key={newCanalForm.locale} className="canais-edit-form__label-group">
              <label className="canais-edit-form__label lang-fade">
                Título
                <input className="canais-edit-form__input" type="text" placeholder="Ex: Governança" autoFocus
                  value={newCanalForm.titles[newCanalForm.locale] ?? ''}
                  onChange={e => setNewCanalForm(f => ({ ...f, titles: { ...f.titles, [f.locale]: e.target.value } }))} />
              </label>
              <label className="canais-edit-form__label lang-fade" style={{ marginTop: '12px' }}>
                Subtítulo <span style={{ fontWeight: 400, color: 'var(--color-gray-400)', fontSize: 'var(--text-xs)' }}>(opcional)</span>
                <input className="canais-edit-form__input" type="text" placeholder="Breve descrição do canal"
                  value={newCanalForm.subtitles[newCanalForm.locale] ?? ''}
                  onChange={e => setNewCanalForm(f => ({ ...f, subtitles: { ...f.subtitles, [f.locale]: e.target.value } }))} />
              </label>
            </div>
            <div>
              <p className="canais-edit-section-title" style={{ marginBottom: '8px' }}>Tipo de canal</p>
              <div className="canais-new-type-row">
                {(['pai', 'pagina'] as const).map(t => (
                  <button key={t} type="button"
                    className={`canais-new-type-btn${newCanalForm.tipo === t ? ' canais-new-type-btn--active' : ''}`}
                    onClick={() => setNewCanalForm(f => ({ ...f, tipo: t }))}
                  >
                    <span className="material-symbols-outlined canais-new-type-btn__icon">{t === 'pai' ? 'account_tree' : 'article'}</span>
                    <span className="canais-new-type-btn__label">{t === 'pai' ? 'Canal pai' : 'Página direta'}</span>
                    <span className="canais-new-type-btn__desc">{t === 'pai' ? 'Agrupa páginas filhas na navegação' : 'Link direto sem filhos na navegação'}</span>
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
              {PAGE_TYPES.map(pt => (
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
                              const catInput = newCanalForm.laEmpresaCatInputs[emp.id] ?? '';
                              return (
                                <div key={emp.id} className="ct-la-emp-cats">
                                  <p className="ct-la-emp-cats__name">{emp.label}</p>
                                  <div className="ct-la-cat-input">
                                    <input className="canais-edit-form__input" type="text"
                                      placeholder="Ex: ITR, DFP, Fatos Relevantes"
                                      value={catInput}
                                      onChange={e => setNewCanalForm(f => ({ ...f, laEmpresaCatInputs: { ...f.laEmpresaCatInputs, [emp.id]: e.target.value } }))}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' && catInput.trim()) {
                                          e.preventDefault();
                                          setNewCanalForm(f => ({
                                            ...f,
                                            laEmpresaCategories: { ...f.laEmpresaCategories, [emp.id]: [...cats, catInput.trim()] },
                                            laEmpresaCatInputs: { ...f.laEmpresaCatInputs, [emp.id]: '' },
                                          }));
                                        }
                                      }}
                                    />
                                    <button className="btn-outline" type="button"
                                      disabled={!catInput.trim()}
                                      onClick={() => setNewCanalForm(f => ({
                                        ...f,
                                        laEmpresaCategories: { ...f.laEmpresaCategories, [emp.id]: [...cats, catInput.trim()] },
                                        laEmpresaCatInputs: { ...f.laEmpresaCatInputs, [emp.id]: '' },
                                      }))}>
                                      Adicionar
                                    </button>
                                  </div>
                                  {cats.length > 0 && (
                                    <div className="ct-la-cats">
                                      {cats.map((cat, i) => (
                                        <span key={i} className="ct-la-cat-chip">
                                          {cat}
                                          <button type="button" onClick={() => setNewCanalForm(f => ({
                                            ...f,
                                            laEmpresaCategories: { ...f.laEmpresaCategories, [emp.id]: cats.filter((_, j) => j !== i) },
                                          }))}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  )}
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
                    <div className="ct-la-cat-input">
                      <input className="canais-edit-form__input" type="text"
                        placeholder="Ex: Demonstrações Financeiras"
                        value={newCanalForm.laCatInput}
                        onChange={e => setNewCanalForm(f => ({ ...f, laCatInput: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newCanalForm.laCatInput.trim()) {
                            e.preventDefault();
                            setNewCanalForm(f => ({ ...f, laCategories: [...f.laCategories, f.laCatInput.trim()], laCatInput: '' }));
                          }
                        }}
                      />
                      <button className="btn-outline" type="button"
                        disabled={!newCanalForm.laCatInput.trim()}
                        onClick={() => setNewCanalForm(f => ({ ...f, laCategories: [...f.laCategories, f.laCatInput.trim()], laCatInput: '' }))}>
                        Adicionar
                      </button>
                    </div>
                    {newCanalForm.laCategories.length > 0 && (
                      <div className="ct-la-cats">
                        {newCanalForm.laCategories.map((cat, i) => (
                          <span key={i} className="ct-la-cat-chip">
                            {cat}
                            <button type="button" onClick={() => setNewCanalForm(f => ({ ...f, laCategories: f.laCategories.filter((_, j) => j !== i) }))}>
                              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {newCanalForm.laCategories.length === 0 && (
                      <p className="ct-la-cat-hint">Pressione Enter ou clique em "Adicionar" para incluir uma categoria.</p>
                    )}
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
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────
function PageTypePicker({ value, onChange }: { value: PageType; onChange: (v: PageType) => void }) {
  return (
    <div className="canais-page-types">
      {PAGE_TYPES.map(pt => (
        <button key={pt.id} type="button"
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

function MateriasLinkPicker({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const materias = loadMaterias();
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

function HeaderImageEditor({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const result = await processImage(f, 'channel-header');
    onChange(result.objectUrl);
  }
  if (value) return (
    <div className="canal-header-img-preview">
      <img src={value} alt="Header" className="canal-header-img-preview__img" />
      <div className="canal-header-img-preview__actions">
        <label className="btn-action btn-action--enter canais-img-file-label">
          Substituir
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        </label>
        <button className="btn-action btn-action--danger" type="button" onClick={() => onChange(null)}>Remover</button>
      </div>
    </div>
  );
  return (
    <label className="canal-header-img-empty canais-img-file-label">
      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>image</span>
      <span>Clique para adicionar imagem de header</span>
    </label>
  );
}
