import { Canal, DEFAULT_CANAIS, CANAIS_KEY, PageType } from '../components/ChannelEditor';
import { pageHasPublishedMateria } from './useMateriasStore';
import { pKey } from '../utils/portalStorage';

export interface Destino {
  id: string;
  label: string;
  parentLabel: string | null;
  pageType: PageType | undefined;
  /** @deprecated use headerImageUrl !== null instead */
  canalHasHeaderImage: boolean;
  /** This page's own header image, or the parent canal's if this page has none of its own. Null means no image at any level. */
  headerImageUrl: string | null;
  /** True when headerImageUrl comes from the parent canal, not this page's own override. */
  headerImageInherited: boolean;
  hasPublishedMateria: boolean; // show pages already occupied
}

function buildDestinos(canais: Canal[], portalKey?: string): Destino[] {
  const result: Destino[] = [];
  for (const canal of canais) {
    if (!canal.enabled) continue;
    const canalHeaderImage = canal.headerImage ?? null;
    if (canal.children.length === 0) {
      result.push({
        id: canal.id, label: canal.label, parentLabel: null, pageType: canal.pageType,
        canalHasHeaderImage: !!canalHeaderImage, headerImageUrl: canalHeaderImage, headerImageInherited: false,
        hasPublishedMateria: false,
      });
    } else {
      for (const sub of canal.children) {
        if (!sub.enabled) continue;
        const ownImage = sub.headerImage ?? null;
        result.push({
          id: sub.id,
          label: sub.label,
          parentLabel: canal.label,
          pageType: sub.pageType,
          canalHasHeaderImage: !!canalHeaderImage,
          headerImageUrl: ownImage ?? canalHeaderImage,
          headerImageInherited: !ownImage && !!canalHeaderImage,
          hasPublishedMateria: sub.pageType === 'show' ? pageHasPublishedMateria(sub.id, portalKey) : false,
        });
        for (const ss of sub.children ?? []) {
          if (!ss.enabled) continue;
          const ssOwnImage = ss.headerImage ?? null;
          const ssFallback = ownImage ?? canalHeaderImage;
          result.push({
            id: ss.id,
            label: ss.label,
            parentLabel: `${canal.label} › ${sub.label}`,
            pageType: ss.pageType,
            canalHasHeaderImage: !!canalHeaderImage,
            headerImageUrl: ssOwnImage ?? ssFallback,
            headerImageInherited: !ssOwnImage && !!ssFallback,
            hasPublishedMateria: ss.pageType === 'show' ? pageHasPublishedMateria(ss.id, portalKey) : false,
          });
        }
      }
    }
  }
  return result;
}

export function useCanaisDestinos(portalKey?: string): Destino[] {
  const canaisKey = portalKey ? pKey(CANAIS_KEY, portalKey) : CANAIS_KEY;
  const stored = localStorage.getItem(canaisKey);
  const canais: Canal[] = stored ? (JSON.parse(stored) as Canal[]) : DEFAULT_CANAIS;
  return buildDestinos(canais, portalKey);
}
