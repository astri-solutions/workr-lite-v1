import { Canal, DEFAULT_CANAIS, DEFAULT_CANAIS_FLAT } from '../components/ChannelEditor';

export interface DestPage {
  id: string;
  label: string;
  group: string;
}

/**
 * Loads the portal's real canal tree — never a hardcoded page list.
 * Flat layouts (sidebar/tabmenu) have direct L1 pages with no children;
 * banner layouts nest destination pages under L2 (and sometimes L3).
 */
export function loadPortalCanais(portalKey?: string): Canal[] {
  try {
    const raw = localStorage.getItem(`portal_canais_${portalKey ?? 'default'}`);
    if (raw) return JSON.parse(raw) as Canal[];
  } catch { /* fall through to default */ }
  const layout = localStorage.getItem(`portal_layout_${portalKey ?? 'default'}`) ?? 'sidebar';
  return (layout === 'sidebar' || layout === 'tabmenu') ? DEFAULT_CANAIS_FLAT : DEFAULT_CANAIS;
}

/** Flattens the canal tree into a pickable list of destination pages. */
export function buildDestPages(canais: Canal[]): DestPage[] {
  const result: DestPage[] = [];
  for (const c of canais) {
    if (c.children.length === 0) {
      // Direct page — the whole canal IS the destination (flat layouts, or
      // a childless canal in a banner layout).
      result.push({ id: c.id, label: c.label, group: 'Canal raiz' });
      continue;
    }
    for (const s of c.children) {
      result.push({ id: s.id, label: s.label, group: c.label });
      for (const ss of s.children ?? []) {
        result.push({ id: ss.id, label: ss.label, group: `${c.label} → ${s.label}` });
      }
    }
  }
  return result;
}
