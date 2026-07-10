import { Canal, DEFAULT_CANAIS, CANAIS_KEY } from '../components/ChannelEditor';

export interface Destino {
  id: string;
  label: string;
  parentLabel: string | null;
  canalHasHeaderImage: boolean;
}

function buildDestinos(canais: Canal[]): Destino[] {
  const result: Destino[] = [];
  for (const canal of canais) {
    if (!canal.enabled) continue;
    const canalHasHeaderImage = !!(canal.headerImage);
    if (canal.children.length === 0) {
      result.push({ id: canal.id, label: canal.label, parentLabel: null, canalHasHeaderImage });
    } else {
      for (const sub of canal.children) {
        if (!sub.enabled) continue;
        result.push({ id: sub.id, label: sub.label, parentLabel: canal.label, canalHasHeaderImage });
      }
    }
  }
  return result;
}

export function useCanaisDestinos(): Destino[] {
  const stored = localStorage.getItem(CANAIS_KEY);
  const canais: Canal[] = stored ? (JSON.parse(stored) as Canal[]) : DEFAULT_CANAIS;
  return buildDestinos(canais);
}
