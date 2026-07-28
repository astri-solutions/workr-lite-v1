import { useState } from 'react';
import './ChannelEditor.css';

export const CANAIS_KEY = 'portal_canais';

export type PageType = 'show' | 'lista' | 'lista-agrupada' | 'tabela' | 'tabela-resultados' | 'blog' | 'galeria' | 'formulario' | 'timeline';
export type ListaAgrupadaStyle = 'accordion' | 'secao';

// A "lista-agrupada" grouping marker — NOT a nav entry (never appears in the
// site menu, publish-config only reads Canal.children for the live nav), but
// otherwise editable like a real tree node: stable id, per-locale name,
// reorderable. The id is what Auto CVM routing and document tagging
// (`portal_documents.sub_group_ids`) reference, so renaming a marker's label
// never breaks anything pointing at it.
export interface Marcador {
  id: string;
  label: string;
  labels?: Partial<Record<string, string>>;
}

export function genMarcadorId(): string {
  return `mk-${Math.random().toString(36).slice(2, 9)}`;
}

// Tolerates the pre-existing plain-string arrays already stored in portals
// created before markers became id-based objects — no migration script
// needed, every reader just normalizes on the way in. A legacy string's own
// text becomes its id, so anything already referencing that label (document
// tagging, Auto CVM routing) keeps resolving correctly.
export function normalizeMarcadores(raw: unknown): Marcador[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(item => (typeof item === 'string' ? { id: item, label: item } : item as Marcador));
}

export function marcadorLabel(m: Marcador, locale: string, fallbackLocale: string): string {
  return m.labels?.[locale] || m.labels?.[fallbackLocale] || m.label;
}

export interface SubSubCanal {
  id: string;
  label: string;
  // Per-locale nav label — `label` above stays the primary locale's value
  // for every place that still expects a plain string (breadcrumbs, delete
  // confirmations, etc.); `labels` is the source of truth the site's nav
  // reads to actually translate the menu.
  labels?: Partial<Record<string, string>>;
  href: string;
  enabled: boolean;
  pageType?: PageType;
  isExternalLink?: boolean;
  externalUrl?: string;
  // Own header image for this specific page — overrides the parent canal's
  // `headerImage`. Unset means "inherit from the parent canal".
  headerImage?: string;
}

export interface SubCanal {
  id: string;
  label: string;
  labels?: Partial<Record<string, string>>;
  href: string;
  enabled: boolean;
  pageType?: PageType;
  listaAgrupadaStyle?: ListaAgrupadaStyle;
  // Group markers offered when tagging a document to this page, used only
  // when pageType === 'lista-agrupada' — editable like sub-pages (id, name,
  // position) but never rendered as a nav entry.
  listaAgrupadaCategories?: Marcador[];
  isExternalLink?: boolean;
  externalUrl?: string;
  showInFooter?: boolean;
  children?: SubSubCanal[];
  // Own header image for this specific page — overrides the parent canal's
  // `headerImage`. Unset means "inherit from the parent canal".
  headerImage?: string;
}

export interface Canal {
  id: string;
  label: string;
  labels?: Partial<Record<string, string>>;
  href?: string;
  enabled: boolean;
  children: SubCanal[];
  headerImage?: string;
  pageType?: PageType;
  listaAgrupadaStyle?: ListaAgrupadaStyle;
  listaAgrupadaCategories?: Marcador[];
  showInFooter?: boolean;
  isExternalLink?: boolean;
  externalUrl?: string;
}

export const DEFAULT_CANAIS: Canal[] = [
  { id: 'a-companhia', label: 'A Companhia', href: '/a-companhia.html', enabled: true, children: [] },
  {
    id: 'governanca', label: 'Governança', enabled: true, children: [
      { id: 'composicao', label: 'Composição Acionária', href: '/composicao-acionaria.html', enabled: true },
      { id: 'atas', label: 'Atas e Assembleias', href: '/atas-assembleias.html', enabled: true },
      { id: 'docs-cvm', label: 'Documentos CVM', href: '/documentos-cvm.html', enabled: true },
    ],
  },
  {
    id: 'investidores', label: 'Investidores', enabled: true, children: [
      { id: 'resultados', label: 'Resultados', href: '/central-resultados.html', enabled: true },
      { id: 'calendario', label: 'Calendário de Eventos', href: '/calendario-eventos.html', enabled: true },
      { id: 'ratings', label: 'Ratings', href: '/ratings.html', enabled: true },
    ],
  },
  {
    id: 'contato', label: 'Contato', enabled: true, children: [
      { id: 'fale-ri', label: 'Fale com RI', href: '/fale-com-ri.html', enabled: true },
      { id: 'mailing', label: 'Mailing', href: '/mailing.html', enabled: true },
    ],
  },
];

/** Default tree for flat layouts (sidebar/tabmenu): every canal is a direct page, no children. */
export const DEFAULT_CANAIS_FLAT: Canal[] = [
  { id: 'central-resultados', label: 'Resultados', href: '/central-resultados.html', enabled: true, children: [] },
  { id: 'docs-cvm', label: 'Documentos CVM', href: '/documentos-cvm.html', enabled: true, children: [] },
  { id: 'atas-assembleias', label: 'Atas e Assembleias', href: '/atas-assembleias.html', enabled: true, children: [] },
  { id: 'fale-ri', label: 'Fale com RI', href: '/fale-com-ri.html', enabled: true, children: [] },
  { id: 'mailing', label: 'Mailing', href: '/mailing.html', enabled: true, children: [] },
];

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

interface Props {
  value: Canal[];
  onChange: (canais: Canal[]) => void;
  /** Flat mode (sidebar/tabmenu layouts): each canal is a direct page — sub-pages are not allowed. */
  flat?: boolean;
}

const PAGE_TYPE_OPTIONS: { value: PageType; label: string }[] = [
  { value: 'show', label: 'Show (conteúdo livre)' },
  { value: 'lista', label: 'Lista' },
  { value: 'lista-agrupada', label: 'Lista agrupada' },
  { value: 'tabela', label: 'Tabela' },
  { value: 'tabela-resultados', label: 'Tabela de resultados' },
  { value: 'blog', label: 'Blog' },
  { value: 'galeria', label: 'Galeria' },
  { value: 'formulario', label: 'Formulário' },
  { value: 'timeline', label: 'Timeline' },
];

export default function ChannelEditor({ value, onChange, flat = false }: Props) {
  const [editing, setEditing] = useState<{ cid: string; sid?: string } | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [optionsOpen, setOptionsOpen] = useState<{ cid: string; sid?: string } | null>(null);

  function toggleOptions(cid: string, sid?: string) {
    setOptionsOpen(prev => (prev?.cid === cid && prev?.sid === sid) ? null : { cid, sid });
  }

  function patchCanal(cid: string, patch: Partial<Canal>) {
    onChange(value.map(c => c.id === cid ? { ...c, ...patch } : c));
  }

  function patchSub(cid: string, sid: string, patch: Partial<SubCanal>) {
    onChange(value.map(c => c.id !== cid ? c : {
      ...c, children: c.children.map(s => s.id === sid ? { ...s, ...patch } : s),
    }));
  }

  function renderOptionsPanel(item: Canal | SubCanal, onPatch: (patch: Partial<Canal & SubCanal>) => void) {
    return (
      <div className="ce-options">
        <label className="ce-options__check">
          <input
            type="checkbox"
            checked={!!item.isExternalLink}
            onChange={e => onPatch({ isExternalLink: e.target.checked })}
          />
          Link direto (externo)
        </label>
        {item.isExternalLink ? (
          <input
            className="ce-options__input"
            type="text"
            placeholder="https://exemplo.com"
            value={item.externalUrl ?? ''}
            onChange={e => onPatch({ externalUrl: e.target.value })}
          />
        ) : (
          <>
            <label className="ce-options__label">
              Formato
              <select
                className="ce-options__select"
                value={item.pageType ?? 'show'}
                onChange={e => onPatch({ pageType: e.target.value as PageType })}
              >
                {PAGE_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            {item.pageType === 'lista-agrupada' && (
              <label className="ce-options__label">
                Estilo da lista agrupada
                <select
                  className="ce-options__select"
                  value={item.listaAgrupadaStyle ?? 'accordion'}
                  onChange={e => onPatch({ listaAgrupadaStyle: e.target.value as ListaAgrupadaStyle })}
                >
                  <option value="accordion">Acordeão</option>
                  <option value="secao">Divisão por seção</option>
                </select>
              </label>
            )}
          </>
        )}
      </div>
    );
  }

  function startEdit(cid: string, label: string, sid?: string) {
    setEditing({ cid, sid });
    setEditLabel(label);
  }

  function commitEdit() {
    if (!editing) return;
    const label = editLabel.trim();
    if (!label) { setEditing(null); return; }
    onChange(value.map(c => {
      if (c.id !== editing.cid) return c;
      if (!editing.sid) return { ...c, label };
      return { ...c, children: c.children.map(s => s.id === editing.sid ? { ...s, label } : s) };
    }));
    setEditing(null);
  }

  function toggleCanal(cid: string) {
    onChange(value.map(c => c.id === cid ? { ...c, enabled: !c.enabled } : c));
  }

  function toggleSub(cid: string, sid: string) {
    onChange(value.map(c => c.id !== cid ? c : {
      ...c, children: c.children.map(s => s.id === sid ? { ...s, enabled: !s.enabled } : s),
    }));
  }

  function moveCanal(idx: number, dir: -1 | 1) {
    const next = [...value];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  function moveSub(cid: string, idx: number, dir: -1 | 1) {
    onChange(value.map(c => {
      if (c.id !== cid) return c;
      const ch = [...c.children];
      const target = idx + dir;
      if (target < 0 || target >= ch.length) return c;
      [ch[idx], ch[target]] = [ch[target], ch[idx]];
      return { ...c, children: ch };
    }));
  }

  function addCanal() {
    const c: Canal = flat
      ? { id: genId(), label: 'Nova página', href: `/${genId()}.html`, enabled: true, children: [] }
      : { id: genId(), label: 'Nova seção', enabled: true, children: [] };
    onChange([...value, c]);
    startEdit(c.id, c.label);
  }

  function removeCanal(cid: string) {
    onChange(value.filter(c => c.id !== cid));
  }

  function addSub(cid: string) {
    const s: SubCanal = { id: genId(), label: 'Nova página', href: `/${genId()}.html`, enabled: true };
    onChange(value.map(c => c.id !== cid ? c : { ...c, children: [...c.children, s] }));
    startEdit(cid, s.label, s.id);
  }

  function removeSub(cid: string, sid: string) {
    onChange(value.map(c => c.id !== cid ? c : { ...c, children: c.children.filter(s => s.id !== sid) }));
  }

  return (
    <div className="ce-root">
      <div className="ce-list">
        {value.map((canal, ci) => (
          <div key={canal.id} className={`ce-canal${canal.enabled ? '' : ' ce-canal--disabled'}`}>
            <div className="ce-canal__header">
              <button className="ce-toggle" type="button" onClick={() => toggleCanal(canal.id)} title={canal.enabled ? 'Desativar' : 'Ativar'}>
                <div className={`ce-toggle__track${canal.enabled ? ' ce-toggle__track--on' : ''}`}>
                  <div className="ce-toggle__thumb" />
                </div>
              </button>

              {editing?.cid === canal.id && !editing.sid ? (
                <input
                  className="ce-inline-input"
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
                  autoFocus
                />
              ) : (
                <span className="ce-canal__label" onDoubleClick={() => startEdit(canal.id, canal.label)}>
                  {canal.label}
                </span>
              )}

              <div className="ce-canal__actions">
                {!flat && canal.children.length === 0 && (
                  <button className="ce-action" type="button" title="Link direto e formato" onClick={() => toggleOptions(canal.id)}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>tune</span>
                  </button>
                )}
                <button className="ce-action" type="button" title="Renomear" onClick={() => startEdit(canal.id, canal.label)}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                </button>
                <button className="ce-action" type="button" title="Mover para cima" onClick={() => moveCanal(ci, -1)} disabled={ci === 0}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>expand_less</span>
                </button>
                <button className="ce-action" type="button" title="Mover para baixo" onClick={() => moveCanal(ci, 1)} disabled={ci === value.length - 1}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>expand_more</span>
                </button>
                <button className="ce-action ce-action--danger" type="button" title="Remover" onClick={() => removeCanal(canal.id)}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                </button>
              </div>
            </div>

            {!flat && canal.children.length === 0 && optionsOpen?.cid === canal.id && !optionsOpen.sid &&
              renderOptionsPanel(canal, patch => patchCanal(canal.id, patch))}

            {!flat && canal.children.length > 0 && (
              <div className="ce-subs">
                {canal.children.map((sub, si) => (
                  <div key={sub.id} className={`ce-sub${sub.enabled ? '' : ' ce-sub--disabled'}`}>
                    <button className="ce-toggle ce-toggle--sm" type="button" onClick={() => toggleSub(canal.id, sub.id)}>
                      <div className={`ce-toggle__track${sub.enabled ? ' ce-toggle__track--on' : ''}`}>
                        <div className="ce-toggle__thumb" />
                      </div>
                    </button>

                    {editing?.cid === canal.id && editing.sid === sub.id ? (
                      <input
                        className="ce-inline-input"
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
                        autoFocus
                      />
                    ) : (
                      <span className="ce-sub__label" onDoubleClick={() => startEdit(canal.id, sub.label, sub.id)}>
                        {sub.label}
                      </span>
                    )}

                    <div className="ce-sub__actions">
                      <button className="ce-action" type="button" title="Link direto e formato" onClick={() => toggleOptions(canal.id, sub.id)}>
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>tune</span>
                      </button>
                      <button className="ce-action" type="button" title="Renomear" onClick={() => startEdit(canal.id, sub.label, sub.id)}>
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>edit</span>
                      </button>
                      <button className="ce-action" type="button" title="Mover para cima" onClick={() => moveSub(canal.id, si, -1)} disabled={si === 0}>
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>expand_less</span>
                      </button>
                      <button className="ce-action" type="button" title="Mover para baixo" onClick={() => moveSub(canal.id, si, 1)} disabled={si === canal.children.length - 1}>
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>expand_more</span>
                      </button>
                      <button className="ce-action ce-action--danger" type="button" title="Remover" onClick={() => removeSub(canal.id, sub.id)}>
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
                      </button>
                    </div>

                    {optionsOpen?.cid === canal.id && optionsOpen.sid === sub.id &&
                      renderOptionsPanel(sub, patch => patchSub(canal.id, sub.id, patch))}
                  </div>
                ))}
              </div>
            )}

            {!flat && (
              <button className="ce-add-sub" type="button" onClick={() => addSub(canal.id)}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                Adicionar página
              </button>
            )}
          </div>
        ))}
      </div>

      <button className="ce-add-canal" type="button" onClick={addCanal}>
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
        {flat ? 'Adicionar página' : 'Adicionar seção'}
      </button>
    </div>
  );
}
