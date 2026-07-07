import { useState, useCallback, useRef } from 'react';
import StickyPageHeader from '../../components/StickyPageHeader';
import Modal from '../../components/Modal';
import LangTabs from '../../components/LangTabs';
import { Canal, SubCanal, SubSubCanal, DEFAULT_CANAIS, CANAIS_KEY, PageType, ListaAgrupadaStyle } from '../../components/ChannelEditor';
import PORTAL_CONFIG, { LocaleCode } from '../../portalConfig';
import { usePortalName } from '../../hooks/usePortalName';
import '../admin/AdminPages.css';
import './CanaisPage.css';

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

const PAGE_TYPES = [
  {
    id: 'show',
    label: 'Show',
    desc: 'Conteúdos variados: texto, imagem, tabelas e listas.',
    thumb: (
      <svg width="100%" height="56" viewBox="0 0 160 56" fill="none">
        <rect x="2" y="2" width="156" height="12" rx="2" fill="#c8d2db"/>
        <rect x="2" y="18" width="156" height="4" rx="1" fill="#e8edf2"/>
        <rect x="2" y="26" width="120" height="4" rx="1" fill="#e8edf2"/>
        <rect x="2" y="34" width="68" height="14" rx="2" fill="#eef1f5"/>
        <rect x="74" y="34" width="84" height="14" rx="2" fill="#eef1f5"/>
      </svg>
    ),
  },
  {
    id: 'lista',
    label: 'Lista',
    desc: 'Lista de documentos com filtro por ano.',
    thumb: (
      <svg width="100%" height="56" viewBox="0 0 160 56" fill="none">
        <rect x="2" y="2" width="50" height="8" rx="2" fill="#e8edf2"/>
        <rect x="56" y="2" width="50" height="8" rx="2" fill="#e8edf2"/>
        <rect x="2" y="14" width="156" height="1" fill="#dde3ea"/>
        <rect x="2" y="19" width="130" height="6" rx="1" fill="#eef1f5"/>
        <rect x="2" y="29" width="130" height="6" rx="1" fill="#eef1f5"/>
        <rect x="2" y="39" width="130" height="6" rx="1" fill="#eef1f5"/>
        <rect x="2" y="49" width="100" height="6" rx="1" fill="#eef1f5"/>
      </svg>
    ),
  },
  {
    id: 'lista-agrupada',
    label: 'Lista Agrupada',
    desc: 'Documentos organizados por seção ou accordion.',
    thumb: (
      <svg width="100%" height="56" viewBox="0 0 160 56" fill="none">
        <rect x="2" y="2" width="156" height="12" rx="2" fill="#e8edf2" stroke="#c8d2db" strokeWidth="1"/>
        <rect x="6" y="6" width="60" height="4" rx="1" fill="#c8d2db"/>
        <rect x="2" y="18" width="156" height="12" rx="2" fill="#f5f7fa" stroke="#dde3ea" strokeWidth="1"/>
        <rect x="6" y="22" width="50" height="4" rx="1" fill="#dde3ea"/>
        <rect x="6" y="34" width="130" height="4" rx="1" fill="#e8edf2"/>
        <rect x="6" y="42" width="100" height="4" rx="1" fill="#e8edf2"/>
        <rect x="6" y="50" width="120" height="4" rx="1" fill="#e8edf2"/>
      </svg>
    ),
  },
  {
    id: 'tabela',
    label: 'Tabela',
    desc: 'Dados estruturados em linhas e colunas.',
    thumb: (
      <svg width="100%" height="56" viewBox="0 0 160 56" fill="none">
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
        <rect x="2" y="45" width="52" height="7" rx="1" fill="#eef1f5"/>
        <rect x="56" y="45" width="50" height="7" rx="1" fill="#eef1f5"/>
        <rect x="108" y="45" width="50" height="7" rx="1" fill="#eef1f5"/>
      </svg>
    ),
  },
  {
    id: 'blog',
    label: 'Blog',
    desc: 'Artigos e matérias com capa, título e resumo.',
    thumb: (
      <svg width="100%" height="56" viewBox="0 0 160 56" fill="none">
        <rect x="2" y="2" width="74" height="36" rx="2" fill="#e8edf2"/>
        <rect x="2" y="42" width="50" height="5" rx="1" fill="#c8d2db"/>
        <rect x="2" y="50" width="74" height="4" rx="1" fill="#eef1f5"/>
        <rect x="84" y="2" width="74" height="36" rx="2" fill="#e8edf2"/>
        <rect x="84" y="42" width="50" height="5" rx="1" fill="#c8d2db"/>
        <rect x="84" y="50" width="74" height="4" rx="1" fill="#eef1f5"/>
      </svg>
    ),
  },
  {
    id: 'galeria',
    label: 'Galeria',
    desc: 'Imagens, vídeos e apresentações em cards.',
    thumb: (
      <svg width="100%" height="56" viewBox="0 0 160 56" fill="none">
        <rect x="2" y="2" width="48" height="36" rx="2" fill="#e8edf2"/>
        <circle cx="14" cy="14" r="4" fill="#c8d2db"/>
        <polyline points="2,38 18,22 30,32 38,26 50,38" stroke="#c8d2db" strokeWidth="1.5" fill="none"/>
        <rect x="56" y="2" width="48" height="36" rx="2" fill="#e8edf2"/>
        <circle cx="68" cy="14" r="4" fill="#c8d2db"/>
        <polyline points="56,38 72,22 84,32 92,26 104,38" stroke="#c8d2db" strokeWidth="1.5" fill="none"/>
        <rect x="110" y="2" width="48" height="36" rx="2" fill="#e8edf2"/>
        <circle cx="122" cy="14" r="4" fill="#c8d2db"/>
        <polyline points="110,38 126,22 138,32 146,26 158,38" stroke="#c8d2db" strokeWidth="1.5" fill="none"/>
        <rect x="2" y="42" width="48" height="5" rx="1" fill="#dde3ea"/>
        <rect x="56" y="42" width="48" height="5" rx="1" fill="#dde3ea"/>
        <rect x="110" y="42" width="48" height="5" rx="1" fill="#dde3ea"/>
      </svg>
    ),
  },
];

// Edit modal covers both level-2 (SubCanal) and level-3 (SubSubCanal).
// When parentSubId is set → level-3 item.
interface EditState {
  canalId: string;
  parentSubId?: string; // set for level-3 items
  subId: string;
  label: string;
  href: string;
  targetCanalId: string;
  pageType: PageType;
  listaAgrupadaStyle: ListaAgrupadaStyle;
  isExternalLink: boolean;
  externalUrl: string;
  showInFooter: boolean;
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
  titles: Record<string, string>;
  subtitles: Record<string, string>;
  headerImageUrl: string | null;
  tipo: CanalType;
  draft: boolean;
  locale: LocaleCode;
  isExternalLink: boolean;
  externalUrl: string;
  restrito: boolean;
}

function emptyNewCanalForm(): NewCanalForm {
  return {
    titles: { [PORTAL_CONFIG.languages[0]]: '' },
    subtitles: {},
    headerImageUrl: null,
    tipo: 'pai',
    draft: false,
    locale: PORTAL_CONFIG.languages[0],
    isExternalLink: false,
    externalUrl: '',
    restrito: false,
  };
}

function orderKey(list: Canal[]): string {
  return list.map(c =>
    c.id + ':' + c.children.map(s => s.id + (s.children?.map(ss => ss.id).join(',') ?? '')).join(',')
  ).join('|');
}

export default function CanaisPage() {
  const portalName = usePortalName();
  const [canais, setCanais] = useState<Canal[]>(DEFAULT_CANAIS);
  const [savedOrderKey, setSavedOrderKey] = useState(() => orderKey(DEFAULT_CANAIS));
  const [editModal, setEditModal] = useState<EditState | null>(null);
  const [canalEditModal, setCanalEditModal] = useState<CanalEditState | null>(null);
  const [newCanalOpen, setNewCanalOpen] = useState(false);
  const [newCanalForm, setNewCanalForm] = useState<NewCanalForm>(emptyNewCanalForm());
  const [movedCanals, setMovedCanals] = useState<{ id: string; dir: -1 | 1 }[]>([]);
  const movedCanalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function animateCanal(idA: string, idB: string, dir: -1 | 1) {
    if (movedCanalTimer.current) clearTimeout(movedCanalTimer.current);
    setMovedCanals([{ id: idA, dir }, { id: idB, dir: (dir * -1) as -1 | 1 }]);
    movedCanalTimer.current = setTimeout(() => setMovedCanals([]), 500);
  }

  const orderChanged = orderKey(canais) !== savedOrderKey;

  const mutate = useCallback((fn: (prev: Canal[]) => Canal[]) => {
    setCanais(fn);
  }, []);

  function saveToStorage(updated: Canal[]) {
    localStorage.setItem(CANAIS_KEY, JSON.stringify(updated));
  }

  function handleSaveOrder() {
    saveToStorage(canais);
    setSavedOrderKey(orderKey(canais));
  }

  // ── Canal-level actions ──────────────────────────────
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

  function commitNewCanal() {
    const primaryLang = PORTAL_CONFIG.languages[0];
    const label = newCanalForm.titles[primaryLang]?.trim() || 'Novo canal';
    const c: Canal = {
      id: genId(),
      label,
      enabled: !newCanalForm.draft,
      children: [],
      ...(newCanalForm.headerImageUrl ? { headerImage: newCanalForm.headerImageUrl } : {}),
    };
    mutate(prev => [...prev, c]);
    setNewCanalOpen(false);
    setNewCanalForm(emptyNewCanalForm());
  }

  // ── SubCanal (level-2) actions ───────────────────────
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

  function addSub(cid: string) {
    const s: SubCanal = { id: genId(), label: 'Nova página', href: `/${genId()}.html`, enabled: false };
    mutate(prev => prev.map(c => c.id !== cid ? c : { ...c, children: [...c.children, s] }));
  }

  // ── SubSubCanal (level-3) actions ────────────────────
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

  function addSubSub(cid: string, sid: string) {
    const ss: SubSubCanal = { id: genId(), label: 'Nova sub-página', href: `/${genId()}.html`, enabled: false };
    mutate(prev => prev.map(c => c.id !== cid ? c : {
      ...c, children: c.children.map(s => s.id !== sid ? s : {
        ...s, children: [...(s.children ?? []), ss],
      }),
    }));
  }

  // ── Canal edit ───────────────────────────────────────
  function openCanalEdit(canal: Canal) {
    setCanalEditModal({
      canalId: canal.id,
      label: canal.label,
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
          ...c,
          label: label.trim() || c.label,
          pageType: isLeaf ? pageType : c.pageType,
          headerImage: headerImageUrl ?? undefined,
          showInFooter,
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

  // ── Sub / SubSub edit ────────────────────────────────
  function openEdit(cid: string, sub: SubCanal, parentSubId?: string) {
    setEditModal({
      canalId: cid,
      parentSubId,
      subId: sub.id,
      label: sub.label,
      href: sub.href,
      targetCanalId: cid,
      pageType: sub.pageType ?? 'show',
      listaAgrupadaStyle: sub.listaAgrupadaStyle ?? 'accordion',
      isExternalLink: sub.isExternalLink ?? false,
      externalUrl: sub.externalUrl ?? '',
      showInFooter: sub.showInFooter ?? false,
    });
  }

  function openEditSubSub(cid: string, sid: string, ss: SubSubCanal) {
    setEditModal({
      canalId: cid,
      parentSubId: sid,
      subId: ss.id,
      label: ss.label,
      href: ss.href,
      targetCanalId: cid,
      pageType: ss.pageType ?? 'show',
      listaAgrupadaStyle: 'accordion',
      isExternalLink: ss.isExternalLink ?? false,
      externalUrl: ss.externalUrl ?? '',
      showInFooter: false,
    });
  }

  function commitEdit() {
    if (!editModal) return;
    const { canalId, parentSubId, subId, label, href, targetCanalId, pageType, listaAgrupadaStyle, isExternalLink, externalUrl, showInFooter } = editModal;

    if (parentSubId) {
      // Level-3: edit SubSubCanal in place (no moving to other sections)
      setCanais(prev => {
        const next = prev.map(c => c.id !== canalId ? c : {
          ...c, children: c.children.map(s => s.id !== parentSubId ? s : {
            ...s, children: (s.children ?? []).map(ss => ss.id !== subId ? ss : {
              ...ss,
              label: label.trim() || ss.label,
              href: href.trim() || ss.href,
              pageType,
              isExternalLink,
              externalUrl: isExternalLink ? externalUrl : undefined,
            }),
          }),
        });
        saveToStorage(next);
        return next;
      });
    } else {
      // Level-2: edit SubCanal with optional move-to-section
      setCanais(prev => {
        let movingSub: SubCanal | null = null;
        const without = prev.map(c => {
          if (c.id !== canalId) return c;
          const sub = c.children.find(s => s.id === subId);
          if (sub) movingSub = {
            ...sub,
            label: label.trim() || sub.label,
            href: href.trim() || sub.href,
            pageType,
            listaAgrupadaStyle: pageType === 'lista-agrupada' ? listaAgrupadaStyle : undefined,
            isExternalLink,
            externalUrl: isExternalLink ? externalUrl : undefined,
            showInFooter,
          };
          return { ...c, children: c.children.filter(s => s.id !== subId) };
        });
        if (!movingSub) return prev;
        const ms = movingSub as SubCanal;
        const next = without.map(c => c.id !== targetCanalId ? c : { ...c, children: [...c.children, ms] });
        saveToStorage(next);
        return next;
      });
    }
    setEditModal(null);
  }

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
            <button className="btn-primary" type="button" onClick={() => { setNewCanalForm(emptyNewCanalForm()); setNewCanalOpen(true); }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
              Novo canal
            </button>
          </div>
        }
      />

      <div className="ct-tree">
        {canais.map((canal, ci) => (
          <div
            key={canal.id}
            className={[
              'ct-section',
              movedCanals.find(x => x.id === canal.id)
                ? `ct-section--moved-${movedCanals.find(x => x.id === canal.id)!.dir === -1 ? 'up' : 'down'}`
                : '',
            ].filter(Boolean).join(' ')}
          >
            {/* Section header */}
            <div className="ct-section__head">
              <div className="ct-section__reorder">
                <button className="ct-icon-btn" type="button" title="Subir" onClick={() => moveCanal(ci, -1)} disabled={ci === 0}>
                  <span className="material-symbols-outlined">expand_less</span>
                </button>
                <button className="ct-icon-btn" type="button" title="Descer" onClick={() => moveCanal(ci, 1)} disabled={ci === canais.length - 1}>
                  <span className="material-symbols-outlined">expand_more</span>
                </button>
              </div>
              <div className="ct-section__info">
                <span className={`ct-status-dot${canal.enabled ? ' ct-status-dot--on' : ''}`} />
                <span className="ct-section__name">{canal.label}</span>
                <span className="ct-section__count">{canal.children.length}</span>
              </div>
              <div className="ct-section__acts">
                <button className="btn-toolbar" type="button" onClick={() => openCanalEdit(canal)}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>edit</span>
                  Editar
                </button>
                <button
                  className={`btn-toolbar${canal.enabled ? '' : ' btn-toolbar--success'}`}
                  type="button"
                  onClick={() => toggleCanal(canal.id)}
                >
                  {canal.enabled ? 'Despublicar' : 'Publicar'}
                </button>
                <button className="btn-toolbar btn-toolbar--danger" type="button" onClick={() => removeCanal(canal.id)}>
                  Excluir
                </button>
              </div>
            </div>

            {/* Page rows */}
            <div className="ct-body">
              {canal.children.length === 0 && (
                <p className="ct-empty">Nenhuma página nesta seção.</p>
              )}
              {canal.children.map((sub, si) => (
                <div key={sub.id} className={`ct-item${!sub.enabled ? ' ct-item--off' : ''}`}>
                  {/* Level-2 row */}
                  <div className="ct-row">
                    <div className="ct-row__reorder">
                      <button className="ct-icon-btn ct-icon-btn--sm" type="button" title="Subir" onClick={() => moveSub(canal.id, si, -1)} disabled={si === 0}>
                        <span className="material-symbols-outlined">expand_less</span>
                      </button>
                      <button className="ct-icon-btn ct-icon-btn--sm" type="button" title="Descer" onClick={() => moveSub(canal.id, si, 1)} disabled={si === canal.children.length - 1}>
                        <span className="material-symbols-outlined">expand_more</span>
                      </button>
                    </div>
                    <span className={`ct-status-dot${sub.enabled ? ' ct-status-dot--on' : ''}`} />
                    <div className="ct-row__info">
                      <span className="ct-row__label">{sub.label}</span>
                      {sub.isExternalLink ? (
                        <span className="ct-row__ext">
                          <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>open_in_new</span>
                          {sub.externalUrl || 'link externo'}
                        </span>
                      ) : (
                        <span className="ct-row__href">{sub.href}</span>
                      )}
                    </div>
                    {sub.pageType && (
                      <span className="ct-row__type">{sub.pageType}</span>
                    )}
                    <div className="ct-row__acts">
                      <button className="btn-action btn-action--enter" type="button" onClick={() => openEdit(canal.id, sub)}>Editar</button>
                      <button
                        className={`btn-action ${sub.enabled ? 'btn-action--secondary' : 'btn-action--enter'}`}
                        type="button"
                        onClick={() => toggleSub(canal.id, sub.id)}
                      >
                        {sub.enabled ? 'Despublicar' : 'Publicar'}
                      </button>
                      <button className="btn-action btn-action--danger" type="button" onClick={() => removeSub(canal.id, sub.id)}>Excluir</button>
                    </div>
                  </div>

                  {/* Level-3 children */}
                  {(sub.children ?? []).length > 0 && (
                    <div className="ct-l3">
                      {(sub.children ?? []).map((ss, ssi) => (
                        <div key={ss.id} className={`ct-row ct-row--l3${!ss.enabled ? ' ct-item--off' : ''}`}>
                          <div className="ct-row__reorder">
                            <button className="ct-icon-btn ct-icon-btn--sm" type="button" title="Subir" onClick={() => moveSubSub(canal.id, sub.id, ssi, -1)} disabled={ssi === 0}>
                              <span className="material-symbols-outlined">expand_less</span>
                            </button>
                            <button className="ct-icon-btn ct-icon-btn--sm" type="button" title="Descer" onClick={() => moveSubSub(canal.id, sub.id, ssi, 1)} disabled={ssi === (sub.children?.length ?? 0) - 1}>
                              <span className="material-symbols-outlined">expand_more</span>
                            </button>
                          </div>
                          <span className="ct-l3-indent" aria-hidden="true" />
                          <span className={`ct-status-dot${ss.enabled ? ' ct-status-dot--on' : ''}`} />
                          <div className="ct-row__info">
                            <span className="ct-row__label">{ss.label}</span>
                            {ss.isExternalLink ? (
                              <span className="ct-row__ext">
                                <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>open_in_new</span>
                                {ss.externalUrl || 'link externo'}
                              </span>
                            ) : (
                              <span className="ct-row__href">{ss.href}</span>
                            )}
                          </div>
                          <div className="ct-row__acts">
                            <button className="btn-action btn-action--enter" type="button" onClick={() => openEditSubSub(canal.id, sub.id, ss)}>Editar</button>
                            <button
                              className={`btn-action ${ss.enabled ? 'btn-action--secondary' : 'btn-action--enter'}`}
                              type="button"
                              onClick={() => toggleSubSub(canal.id, sub.id, ss.id)}
                            >
                              {ss.enabled ? 'Despublicar' : 'Publicar'}
                            </button>
                            <button className="btn-action btn-action--danger" type="button" onClick={() => removeSubSub(canal.id, sub.id, ss.id)}>Excluir</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add sub-sub-page */}
                  <div className="ct-add-child">
                    <button className="ct-add-child__btn" type="button" onClick={() => addSubSub(canal.id, sub.id)}>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>subdirectory_arrow_right</span>
                      Adicionar sub-página em <em>{sub.label}</em>
                    </button>
                  </div>
                </div>
              ))}

              {/* Add page to section */}
              <div className="ct-add-row">
                <button className="ct-add-row__btn" type="button" onClick={() => addSub(canal.id)}>
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add_circle</span>
                  Adicionar página
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Canal edit modal */}
      {canalEditModal && (
        <Modal
          open
          onClose={() => setCanalEditModal(null)}
          title="Editar canal"
          size="lg"
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
              <input
                className="canais-edit-form__input"
                type="text"
                value={canalEditModal.label}
                onChange={e => setCanalEditModal(m => m ? { ...m, label: e.target.value } : m)}
                autoFocus
              />
            </label>

            <div className="canais-edit-divider" />

            <p className="canais-edit-section-title">Imagem do header</p>
            <div className="canal-header-img-wrap">
              {canalEditModal.headerImageUrl ? (
                <div className="canal-header-img-preview">
                  <img src={canalEditModal.headerImageUrl} alt="Header" className="canal-header-img-preview__img" />
                  <div className="canal-header-img-preview__actions">
                    <label className="btn-action btn-action--enter canais-img-file-label">
                      Substituir
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) setCanalEditModal(m => m ? { ...m, headerImageUrl: URL.createObjectURL(f) } : m);
                        }} />
                    </label>
                    <button className="btn-action btn-action--danger" type="button" onClick={() => setCanalEditModal(m => m ? { ...m, headerImageUrl: null } : m)}>
                      Remover
                    </button>
                  </div>
                </div>
              ) : (
                <label className="canal-header-img-empty canais-img-file-label">
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) setCanalEditModal(m => m ? { ...m, headerImageUrl: URL.createObjectURL(f) } : m);
                    }} />
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>image</span>
                  <span>Clique para escolher uma imagem de header</span>
                </label>
              )}
              <label className="canal-apply-default">
                <input
                  type="checkbox"
                  checked={canalEditModal.applyHeaderToChildren}
                  onChange={e => setCanalEditModal(m => m ? { ...m, applyHeaderToChildren: e.target.checked } : m)}
                />
                Aplicar como padrão para todas as páginas filhas
              </label>
            </div>

            <div className="canais-edit-divider" />

            <label className="canal-apply-default">
              <input
                type="checkbox"
                checked={canalEditModal.showInFooter}
                onChange={e => setCanalEditModal(m => m ? { ...m, showInFooter: e.target.checked } : m)}
              />
              <span>
                Exibir no footer <span style={{ fontWeight: 400, color: 'var(--color-gray-400)', fontSize: 'var(--text-xs)' }}>(Footer completo com mapa do site)</span>
              </span>
            </label>

            {canalEditModal.isLeaf && (
              <>
                <div className="canais-edit-divider" />
                <p className="canais-edit-section-title">Tipo de página</p>
                <div className="canais-page-types">
                  {PAGE_TYPES.map(pt => (
                    <button
                      key={pt.id} type="button"
                      className={`canais-page-type${canalEditModal.pageType === pt.id ? ' canais-page-type--active' : ''}`}
                      onClick={() => setCanalEditModal(m => m ? { ...m, pageType: pt.id as PageType } : m)}
                    >
                      <div className="canais-page-type__thumb">{pt.thumb}</div>
                      <span className="canais-page-type__label">{pt.label}</span>
                      <span className="canais-page-type__desc">{pt.desc}</span>
                      {canalEditModal.pageType === pt.id && (
                        <span className="canais-page-type__check">
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>check</span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Sub / SubSub edit modal */}
      {editModal && (
        <Modal
          open
          onClose={() => setEditModal(null)}
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
            <label className="canais-new-draft-check" style={{ marginBottom: 'var(--space-3)' }}>
              <input
                type="checkbox"
                checked={editModal.isExternalLink}
                onChange={e => setEditModal(m => m ? { ...m, isExternalLink: e.target.checked, externalUrl: '' } : m)}
              />
              <span>Link externo</span>
            </label>
            {editModal.isExternalLink && (
              <label className="canais-edit-form__label" style={{ marginBottom: 'var(--space-4)' }}>
                URL externa
                <input
                  className="canais-edit-form__input"
                  type="url"
                  placeholder="https://..."
                  value={editModal.externalUrl}
                  onChange={e => setEditModal(m => m ? { ...m, externalUrl: e.target.value } : m)}
                />
              </label>
            )}

            <div className="canais-edit-row">
              <label className="canais-edit-form__label">
                Nome da página
                <input
                  className="canais-edit-form__input"
                  type="text"
                  value={editModal.label}
                  onChange={e => {
                    const label = e.target.value;
                    const slug = '/' + label.toLowerCase()
                      .normalize('NFD').replace(/[̀-ͯ]/g, '')
                      .replace(/[^a-z0-9\s-]/g, '')
                      .trim().replace(/\s+/g, '-');
                    setEditModal(m => m ? { ...m, label, href: slug } : m);
                  }}
                  autoFocus
                />
              </label>
              <label className="canais-edit-form__label">
                URL (slug)
                <input
                  className="canais-edit-form__input"
                  type="text"
                  value={editModal.href}
                  onChange={e => setEditModal(m => m ? { ...m, href: e.target.value } : m)}
                />
              </label>
            </div>

            <div className="canais-edit-divider" />

            <p className="canais-edit-section-title">Tipo de página</p>
            <div className="canais-page-types">
              {PAGE_TYPES.map(pt => (
                <button
                  key={pt.id} type="button"
                  className={`canais-page-type${editModal.pageType === pt.id ? ' canais-page-type--active' : ''}`}
                  onClick={() => setEditModal(m => m ? { ...m, pageType: pt.id as PageType } : m)}
                >
                  <div className="canais-page-type__thumb">{pt.thumb}</div>
                  <span className="canais-page-type__label">{pt.label}</span>
                  <span className="canais-page-type__desc">{pt.desc}</span>
                  {editModal.pageType === pt.id && (
                    <span className="canais-page-type__check">
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>check</span>
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Only for level-2: move to section + footer */}
            {!editModal.parentSubId && (
              <>
                <label className="canais-edit-form__label" style={{ marginTop: 'var(--space-4)' }}>
                  Mover para seção
                  <select
                    className="canais-edit-form__input filter-select"
                    value={editModal.targetCanalId}
                    onChange={e => setEditModal(m => m ? { ...m, targetCanalId: e.target.value } : m)}
                  >
                    {canais.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </label>
                <label className="canal-apply-default" style={{ marginTop: 'var(--space-4)' }}>
                  <input
                    type="checkbox"
                    checked={editModal.showInFooter}
                    onChange={e => setEditModal(m => m ? { ...m, showInFooter: e.target.checked } : m)}
                  />
                  <span>
                    Exibir no footer <span style={{ fontWeight: 400, color: 'var(--color-gray-400)', fontSize: 'var(--text-xs)' }}>(Footer completo com mapa do site)</span>
                  </span>
                </label>
              </>
            )}

            {editModal.pageType === 'lista-agrupada' && (
              <div className="canais-agrupada-opts">
                <p className="canais-edit-section-title" style={{ marginBottom: 'var(--space-3)' }}>Estilo de agrupamento</p>
                <div className="canais-agrupada-grid">
                  <button
                    type="button"
                    className={`canais-agrupada-opt${editModal.listaAgrupadaStyle === 'accordion' ? ' canais-agrupada-opt--active' : ''}`}
                    onClick={() => setEditModal(m => m ? { ...m, listaAgrupadaStyle: 'accordion' } : m)}
                  >
                    <svg width="100%" height="72" viewBox="0 0 200 72" fill="none">
                      <rect x="1" y="1" width="198" height="20" rx="3" fill="#e8edf2" stroke="#c8d2db" strokeWidth="1"/>
                      <path d="M186 10l-4 5-4-5" stroke="#6F6F6F" strokeWidth="1.5" fill="none"/>
                      <rect x="6" y="6" width="60" height="8" rx="2" fill="#c8d2db"/>
                      <rect x="1" y="25" width="198" height="20" rx="3" fill="#f5f7fa" stroke="#dde3ea" strokeWidth="1"/>
                      <path d="M186 35l4-5 4 5" stroke="#6F6F6F" strokeWidth="1.5" fill="none"/>
                      <rect x="6" y="30" width="50" height="8" rx="2" fill="#dde3ea"/>
                      <rect x="8" y="49" width="140" height="5" rx="1" fill="#e8edf2"/>
                      <rect x="8" y="58" width="100" height="5" rx="1" fill="#e8edf2"/>
                    </svg>
                    <span>Accordion</span>
                  </button>
                  <button
                    type="button"
                    className={`canais-agrupada-opt${editModal.listaAgrupadaStyle === 'secao' ? ' canais-agrupada-opt--active' : ''}`}
                    onClick={() => setEditModal(m => m ? { ...m, listaAgrupadaStyle: 'secao' } : m)}
                  >
                    <svg width="100%" height="72" viewBox="0 0 200 72" fill="none">
                      <rect x="6" y="2" width="80" height="10" rx="2" fill="#c8d2db"/>
                      <rect x="1" y="16" width="198" height="1" fill="#dde3ea"/>
                      <rect x="6" y="22" width="140" height="5" rx="1" fill="#e8edf2"/>
                      <rect x="6" y="31" width="100" height="5" rx="1" fill="#e8edf2"/>
                      <rect x="6" y="42" width="70" height="10" rx="2" fill="#c8d2db"/>
                      <rect x="1" y="56" width="198" height="1" fill="#dde3ea"/>
                      <rect x="6" y="62" width="140" height="5" rx="1" fill="#e8edf2"/>
                    </svg>
                    <span>Seção com subtítulo</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* New canal modal */}
      <Modal
        open={newCanalOpen}
        onClose={() => setNewCanalOpen(false)}
        title="Novo canal"
        size="md"
        footer={
          <div className="modal-footer">
            <button className="btn-outline" type="button" onClick={() => setNewCanalOpen(false)}>Cancelar</button>
            <button
              className="btn-primary"
              type="button"
              onClick={commitNewCanal}
              disabled={!newCanalForm.titles[PORTAL_CONFIG.languages[0]]?.trim()}
            >
              Criar canal
            </button>
          </div>
        }
      >
        <label className="canais-new-draft-check" style={{ marginBottom: 'var(--space-4)' }}>
          <input
            type="checkbox"
            checked={newCanalForm.isExternalLink}
            onChange={e => setNewCanalForm(p => ({ ...p, isExternalLink: e.target.checked, externalUrl: '' }))}
          />
          <span>Link externo</span>
        </label>
        {newCanalForm.isExternalLink && (
          <label className="canais-edit-form__label" style={{ marginTop: 'var(--space-3)' }}>
            URL externa
            <input
              className="canais-edit-form__input"
              type="url"
              placeholder="https://..."
              value={newCanalForm.externalUrl}
              onChange={e => setNewCanalForm(p => ({ ...p, externalUrl: e.target.value }))}
            />
          </label>
        )}

        <LangTabs active={newCanalForm.locale} onChange={l => setNewCanalForm(f => ({ ...f, locale: l }))} />

        <div>
          <p className="canais-edit-section-title" style={{ marginBottom: '8px' }}>Imagem do header</p>
          {newCanalForm.headerImageUrl ? (
            <div className="canal-header-img-preview">
              <img src={newCanalForm.headerImageUrl} alt="Header" className="canal-header-img-preview__img" />
              <div className="canal-header-img-preview__actions">
                <label className="btn-toolbar canais-img-file-label">
                  Substituir
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) setNewCanalForm(p => ({ ...p, headerImageUrl: URL.createObjectURL(f) }));
                    }} />
                </label>
                <button className="btn-toolbar btn-toolbar--danger" type="button" onClick={() => setNewCanalForm(p => ({ ...p, headerImageUrl: null }))}>
                  Remover
                </button>
              </div>
            </div>
          ) : (
            <label className="canal-header-img-empty canais-img-file-label">
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) setNewCanalForm(p => ({ ...p, headerImageUrl: URL.createObjectURL(f) }));
                }} />
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>image</span>
              <span>Clique para adicionar imagem de header</span>
            </label>
          )}
        </div>

        <div key={newCanalForm.locale} className="canais-edit-form__label-group">
          <label className="canais-edit-form__label lang-fade">
            Título
            <input
              className="canais-edit-form__input"
              type="text"
              placeholder="Ex: Governança"
              value={newCanalForm.titles[newCanalForm.locale] ?? ''}
              onChange={e => setNewCanalForm(p => ({ ...p, titles: { ...p.titles, [p.locale]: e.target.value } }))}
              autoFocus
            />
          </label>
          <label className="canais-edit-form__label lang-fade" style={{ marginTop: '12px' }}>
            Subtítulo <span style={{ fontWeight: 400, color: 'var(--color-gray-400)', fontSize: 'var(--text-xs)' }}>(opcional)</span>
            <input
              className="canais-edit-form__input"
              type="text"
              placeholder="Breve descrição do canal"
              value={newCanalForm.subtitles[newCanalForm.locale] ?? ''}
              onChange={e => setNewCanalForm(p => ({ ...p, subtitles: { ...p.subtitles, [p.locale]: e.target.value } }))}
            />
          </label>
        </div>

        <div>
          <p className="canais-edit-section-title" style={{ marginBottom: '8px' }}>Tipo de canal</p>
          <div className="canais-new-type-row">
            <button
              type="button"
              className={`canais-new-type-btn${newCanalForm.tipo === 'pai' ? ' canais-new-type-btn--active' : ''}`}
              onClick={() => setNewCanalForm(p => ({ ...p, tipo: 'pai' }))}
            >
              <span className="material-symbols-outlined canais-new-type-btn__icon">account_tree</span>
              <span className="canais-new-type-btn__label">Canal pai</span>
              <span className="canais-new-type-btn__desc">Agrupa páginas filhas na navegação</span>
              {newCanalForm.tipo === 'pai' && <span className="canais-new-type-btn__check"><span className="material-symbols-outlined" style={{ fontSize: '13px' }}>check</span></span>}
            </button>
            <button
              type="button"
              className={`canais-new-type-btn${newCanalForm.tipo === 'pagina' ? ' canais-new-type-btn--active' : ''}`}
              onClick={() => setNewCanalForm(p => ({ ...p, tipo: 'pagina' }))}
            >
              <span className="material-symbols-outlined canais-new-type-btn__icon">article</span>
              <span className="canais-new-type-btn__label">Página direta</span>
              <span className="canais-new-type-btn__desc">Link direto sem filhos na navegação</span>
              {newCanalForm.tipo === 'pagina' && <span className="canais-new-type-btn__check"><span className="material-symbols-outlined" style={{ fontSize: '13px' }}>check</span></span>}
            </button>
          </div>
        </div>

        <label className="canais-new-draft-check">
          <input
            type="checkbox"
            checked={newCanalForm.draft}
            onChange={e => setNewCanalForm(p => ({ ...p, draft: e.target.checked }))}
          />
          <span>Salvar como rascunho (não exibir no portal ainda)</span>
        </label>
        <label className="canais-check-label">
          <input
            type="checkbox"
            checked={newCanalForm.restrito}
            onChange={e => setNewCanalForm(f => ({ ...f, restrito: e.target.checked }))}
          />
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-primary-400)' }}>lock</span>
          Acesso restrito — exige login para visualizar
        </label>
      </Modal>
    </div>
  );
}
