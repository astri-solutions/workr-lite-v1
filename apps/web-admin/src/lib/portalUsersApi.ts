import { supabase, isSupabaseConfigured } from './supabase';
import { resolvePortalUuid } from './portalConfigApi';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PortalUserRole = 'admin' | 'editor' | 'viewer';

export interface PortalUserRecord {
  id: string;          // portal_users.id (UUID)
  portalId: string;    // portals.id (UUID)
  userId: string;      // auth.users.id
  email: string;
  nome: string;
  role: PortalUserRole;
  empresas: string[] | null;  // null = access to all
  status: 'Ativo' | 'Suspenso';
  createdAt: string;
}

function rowToRecord(r: Record<string, unknown>): PortalUserRecord {
  return {
    id:        r['id'] as string,
    portalId:  r['portal_id'] as string,
    userId:    r['user_id'] as string,
    email:     r['email'] as string,
    nome:      (r['nome'] as string) ?? '',
    role:      (r['role'] as PortalUserRole) ?? 'editor',
    empresas:  (r['empresas'] as string[] | null) ?? null,
    status:    (r['status'] as 'Ativo' | 'Suspenso') ?? 'Ativo',
    createdAt: r['created_at'] as string,
  };
}

// ── API ───────────────────────────────────────────────────────────────────────

export async function fetchPortalUsers(portalKey: string): Promise<PortalUserRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const portalUuid = await resolvePortalUuid(portalKey);
  if (!portalUuid) return [];
  const { data } = await supabase
    .from('portal_users')
    .select('*')
    .eq('portal_id', portalUuid)
    .order('created_at', { ascending: true });
  return (data ?? []).map(r => rowToRecord(r as Record<string, unknown>));
}

export async function upsertPortalUser(
  portalKey: string,
  userId: string,
  fields: { email: string; nome: string; role: PortalUserRole; empresas?: string[] | null }
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const portalUuid = await resolvePortalUuid(portalKey);
  if (!portalUuid) return;
  await supabase.from('portal_users').upsert(
    { portal_id: portalUuid, user_id: userId, ...fields },
    { onConflict: 'portal_id,user_id' }
  );
}

export async function updatePortalUserStatus(
  recordId: string,
  status: 'Ativo' | 'Suspenso'
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from('portal_users').update({ status }).eq('id', recordId);
}

export async function updatePortalUserRole(
  recordId: string,
  role: PortalUserRole,
  empresas?: string[] | null
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const patch: Record<string, unknown> = { role };
  if (empresas !== undefined) patch['empresas'] = empresas;
  await supabase.from('portal_users').update(patch).eq('id', recordId);
}

const FN_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : '';

// Removes the user's access to this portal. If the account has no access to
// any other portal, the account itself is deleted from auth — otherwise only
// the portal_users row (this portal's access) is removed.
export async function deletePortalUser(recordId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Sessão não encontrada');
  const res = await fetch(`${FN_BASE}/remove-portal-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify({ recordId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? 'Erro ao remover usuário');
  }
}
