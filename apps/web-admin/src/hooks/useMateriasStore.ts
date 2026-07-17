import { Canal, DEFAULT_CANAIS, CANAIS_KEY } from '../components/ChannelEditor';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { pKey } from '../utils/portalStorage';

export const MATERIAS_KEY = 'portal_materias';

export type MateriaStatus = 'publicado' | 'rascunho' | 'agendado';
export type MateriaPageType = 'show' | 'galeria' | 'formulario';

export interface StoredMateria {
  id: string;
  titulo: string;
  subtitulo: string;
  pageId: string;
  pageLabel: string;
  pageType: MateriaPageType;
  pageSlugType: string | undefined;
  status: MateriaStatus;
  data: string;
  autor: string;
  ultimaEdicao: string;
  ultimoEditor: string;
  // Rich content sections (persisted locally and synced to Supabase)
  content?: unknown;
}

function storageKey(portalKey?: string): string {
  return portalKey ? pKey(MATERIAS_KEY, portalKey) : MATERIAS_KEY;
}

function loadRaw(portalKey?: string): StoredMateria[] {
  try {
    const raw = localStorage.getItem(storageKey(portalKey));
    return raw ? (JSON.parse(raw) as StoredMateria[]) : [];
  } catch {
    return [];
  }
}

function saveRaw(materias: StoredMateria[], portalKey?: string) {
  localStorage.setItem(storageKey(portalKey), JSON.stringify(materias));
}

export function loadMaterias(portalKey?: string): StoredMateria[] {
  return loadRaw(portalKey);
}

/** Returns true if a 'show'-type page already has a published matéria */
export function pageHasPublishedMateria(pageId: string, portalKey?: string): boolean {
  return loadRaw(portalKey).some(m => m.pageId === pageId && m.status === 'publicado');
}

/** Save or update a matéria to localStorage, activating the page in canais if needed */
export function persistMateria(materia: StoredMateria, portalKey?: string) {
  const all = loadRaw(portalKey);
  const idx = all.findIndex(m => m.id === materia.id);
  if (idx >= 0) {
    all[idx] = materia;
  } else {
    all.push(materia);
  }
  saveRaw(all, portalKey);

  if (materia.status === 'publicado' && materia.pageSlugType === 'show') {
    activatePage(materia.pageId, portalKey);
  }
}

/** Sync a matéria to Supabase portal_materias table */
export async function syncMateriaToSupabase(materia: StoredMateria, portalDbId: string) {
  if (!isSupabaseConfigured || !supabase || !portalDbId) return;
  await supabase.from('portal_materias').upsert({
    id: materia.id,
    portal_id: portalDbId,
    titulo: materia.titulo,
    subtitulo: materia.subtitulo,
    page_id: materia.pageId,
    page_label: materia.pageLabel,
    page_type: materia.pageType,
    page_slug: materia.pageSlugType ?? null,
    status: materia.status,
    data: materia.data,
    autor: materia.autor,
    ultima_edicao: materia.ultimaEdicao,
    ultimo_editor: materia.ultimoEditor,
    content: materia.content ?? null,
  }, { onConflict: 'id' });
}

export function deleteMateria(id: string, portalKey?: string) {
  const all = loadRaw(portalKey).filter(m => m.id !== id);
  saveRaw(all, portalKey);
  if (isSupabaseConfigured && supabase) {
    supabase.from('portal_materias').delete().eq('id', id).then(() => {});
  }
}

function activatePage(pageId: string, portalKey?: string) {
  try {
    const canaisKey = portalKey ? pKey(CANAIS_KEY, portalKey) : CANAIS_KEY;
    const raw = localStorage.getItem(canaisKey);
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
    localStorage.setItem(canaisKey, JSON.stringify(updated));
  } catch {
    // silently ignore
  }
}
