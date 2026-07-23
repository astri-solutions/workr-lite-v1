import { supabase, isSupabaseConfigured } from './supabase';

export type LogCategory =
  | 'documento'
  | 'materia'
  | 'usuario'
  | 'configuracao'
  | 'midia'
  | 'layout'
  | 'cvm'
  | 'backup';

export type LogAction =
  | 'publicou'
  | 'agendou'
  | 'editou'
  | 'removeu'
  | 'adicionou'
  | 'pausou'
  | 'ativou'
  | 'sincronizou'
  | 'importou'
  | 'enviou'
  | 'convidou'
  | 'alterou'
  | 'gerou'
  | 'fez_upload';

interface LogActivityOpts {
  portalId: string;
  userName: string;
  userEmail: string;
  action: LogAction;
  category: LogCategory;
  entity: string;
  detail?: string;
}

// Best-effort: a failed log write should never block the user's actual
// action (publish, upload, etc.), so errors are swallowed after a console log.
export async function logActivity(opts: LogActivityOpts): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !opts.portalId) return;
  try {
    await supabase.from('portal_activity_log').insert({
      portal_id: opts.portalId,
      user_name: opts.userName || 'Sistema',
      user_email: opts.userEmail,
      action: opts.action,
      category: opts.category,
      entity: opts.entity,
      detail: opts.detail ?? '',
    });
  } catch (e) {
    console.error('logActivity failed', e);
  }
}
