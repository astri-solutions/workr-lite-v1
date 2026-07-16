import { Canal, DEFAULT_CANAIS, CANAIS_KEY } from '../components/ChannelEditor';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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

/** Save or update a matéria to localStorage, activating the page in canais if needed */
export function persistMateria(materia: StoredMateria) {
  const all = loadRaw();
  const idx = all.findIndex(m => m.id === materia.id);
  if (idx >= 0) {
    all[idx] = materia;
  } else {
    all.push(materia);
  }
  saveRaw(all);

  if (materia.status === 'publicado' && materia.pageSlugType === 'show') {
    activatePage(materia.pageId);
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

export function deleteMateria(id: string) {
  const all = loadRaw().filter(m => m.id !== id);
  saveRaw(all);
  if (isSupabaseConfigured && supabase) {
    supabase.from('portal_materias').delete().eq('id', id).then(() => {});
  }
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
