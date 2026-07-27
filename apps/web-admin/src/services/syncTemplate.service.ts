// ─── Sync Template Service ───────────────────────────────────────────────────
// Pushes the current cliente-workr-lite scripts/styles/vite.config.js into
// every already-provisioned portal — the "regra de ouro": a correction or
// improvement to the shared system must reach every portal, without
// depending on that portal's own admin clicking Publicar, and without ever
// touching that portal's site.config.js or content. See sync-template-all
// edge function and the golden-rule note in CLAUDE.md.

import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface SyncTemplatePortalResult {
  repoName: string;
  status: 'updated' | 'already-current' | 'error';
  filesChanged?: number;
  error?: string;
}

export interface SyncTemplateResponse {
  templateFilesChecked: number;
  portalsChecked: number;
  portalsUpdated: number;
  portalsAlreadyCurrent: number;
  portalsFailed: number;
  results: SyncTemplatePortalResult[];
}

export const syncTemplateService = {
  /** Runs sync-template-all — super_admin only. */
  async syncAllPortals(): Promise<SyncTemplateResponse> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado.');
    const { data, error } = await supabase.functions.invoke('sync-template-all', { body: {} });
    if (error) throw new Error(`Falha ao sincronizar sistema: ${error.message}`);
    return data as SyncTemplateResponse;
  },
};
