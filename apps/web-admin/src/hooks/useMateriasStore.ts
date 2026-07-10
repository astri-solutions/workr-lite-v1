import { Canal, DEFAULT_CANAIS, CANAIS_KEY } from '../components/ChannelEditor';

export const MATERIAS_KEY = 'portal_materias';

export type MateriaStatus = 'publicado' | 'rascunho' | 'agendado';
export type MateriaPageType = 'show' | 'galeria' | 'formulario';

export interface StoredMateria {
  id: string;
  titulo: string;
  subtitulo: string;
  // pageId: SubCanal.id
  pageId: string;
  pageLabel: string;
  pageType: MateriaPageType;
  // pageSlugType: the SubCanal.pageType at time of publish (used for conflict checks)
  pageSlugType: string | undefined;
  status: MateriaStatus;
  data: string;
  autor: string;
  ultimaEdicao: string;
  ultimoEditor: string;
}

function loadRaw(): StoredMateria[] {
  try {
    const raw = localStorage.getItem(MATERIAS_KEY);
    return raw ? (JSON.parse(raw) as StoredMateria[]) : [];
  } catch {
    return [];
  }
}

function saveRaw(materias: StoredMateria[]) {
  localStorage.setItem(MATERIAS_KEY, JSON.stringify(materias));
}

export function loadMaterias(): StoredMateria[] {
  return loadRaw();
}

/** Returns true if a 'show'-type page already has a published matéria */
export function pageHasPublishedMateria(pageId: string): boolean {
  return loadRaw().some(m => m.pageId === pageId && m.status === 'publicado');
}

/** Save or update a matéria, activating the page in canais if it's a fresh publish */
export function persistMateria(materia: StoredMateria) {
  const all = loadRaw();
  const idx = all.findIndex(m => m.id === materia.id);
  if (idx >= 0) {
    all[idx] = materia;
  } else {
    all.push(materia);
  }
  saveRaw(all);

  // Activate the page in canais when publishing to a 'show' page for the first time
  if (materia.status === 'publicado' && materia.pageSlugType === 'show') {
    activatePage(materia.pageId);
  }
}

export function deleteMateria(id: string) {
  const all = loadRaw().filter(m => m.id !== id);
  saveRaw(all);
}

function activatePage(pageId: string) {
  try {
    const raw = localStorage.getItem(CANAIS_KEY);
    const canais: Canal[] = raw ? JSON.parse(raw) : DEFAULT_CANAIS;
    const updated = canais.map(c => ({
      ...c,
      children: c.children.map(s => {
        if (s.id === pageId) return { ...s, enabled: true };
        return {
          ...s,
          children: (s.children ?? []).map(ss =>
            ss.id === pageId ? { ...ss, enabled: true } : ss
          ),
        };
      }),
    }));
    localStorage.setItem(CANAIS_KEY, JSON.stringify(updated));
  } catch {
    // silently ignore
  }
}
