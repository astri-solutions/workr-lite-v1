import { Canal, DEFAULT_CANAIS, CANAIS_KEY, PageType } from '../components/ChannelEditor';
import { pageHasPublishedMateria } from './useMateriasStore';
import { pKey } from '../utils/portalStorage';

export interface Destino {
  id: string;
  label: string;
  parentLabel: string | null;
  pageType: PageType | undefined;
  canalHasHeaderImage: boolean;
  hasPublishedMateria: boolean; // show pages already occupied
}

function buildDestinos(canais: Canal[], portalKey?: string): Destino[] {
  const result: Destino[] = [];
  for (const canal of canais) {
    if (!canal.enabled) continue;
    const canalHasHeaderImage = !!(canal.headerImage);
    if (canal.children.length === 0) {
      result.push({ id: canal.id, label: canal.label, parentLabel: null, pageType: canal.pageType, canalHasHeaderImage, hasPublishedMateria: false });
    } else {
      for (const sub of canal.children) {
        result.push({
          id: sub.id,
          label: sub.label,
          parentLabel: canal.label,
          pageType: sub.pageType,
          canalHasHeaderImage,
          hasPublishedMateria: sub.pageType === 'show' ? pageHasPublishedMateria(sub.id, portalKey) : false,
        });
        for (const ss of sub.children ?? []) {
          result.push({
            id: ss.id,
            label: ss.label,
            parentLabel: `${canal.label} › ${sub.label}`,
            pageType: ss.pageType,
            canalHasHeaderImage,
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
