import { supabase, isSupabaseConfigured } from './supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SiteTipo = 'RI' | 'Institucional' | 'Fundo' | 'Landing Page';

export interface Site {
  id: string;
  link: string;
  status: 'Ativo' | 'Suspenso';
  ip: string;
  tipo: SiteTipo;
}

export interface Empresa {
  cnpj: string;
  responsavel: string;
  email: string;
  status: 'Ativa' | 'Suspensa';
}

export interface Portal {
  id: string;       // portal_key (timestamp slug)
  dbId?: string;    // portals.id (UUID) — set when loaded from Supabase
  cliente: string;
  criadoEm: string;
  empresa: Empresa;
  sites: Site[];
  githubRepo?: string;
  vercelUrl?: string;
  vercelCreated?: boolean;
  subdomain?: string;
}

// ── localStorage keys ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'workr_portais';

function readLocalStorage(): Portal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalStorage(portals: Portal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(portals));
}

// ── Supabase ↔ UI type conversion ─────────────────────────────────────────────

function dbToPortal(row: Record<string, unknown>, sites: Record<string, unknown>[]): Portal {
  const d = new Date(row['criado_em'] as string);
  const criadoEm = isNaN(d.getTime())
    ? (row['criado_em'] as string)
    : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

  return {
    id: (row['portal_key'] as string) ?? (row['id'] as string),
    dbId: (row['id'] as string) ?? undefined,
    cliente: row['cliente'] as string,
    criadoEm,
    empresa: {
      cnpj: (row['cnpj'] as string) ?? '',
      responsavel: (row['responsavel'] as string) ?? '',
      email: (row['email'] as string) ?? '',
      status: (row['empresa_status'] as 'Ativa' | 'Suspensa') ?? 'Ativa',
    },
    sites: sites.map(s => ({
      id: s['id'] as string,
      link: s['link'] as string,
      status: (s['status'] as 'Ativo' | 'Suspenso') ?? 'Ativo',
      ip: (s['ip'] as string) ?? '—',
      tipo: (s['tipo'] as SiteTipo) ?? 'RI',
    })),
    githubRepo: (row['github_repo'] as string) ?? undefined,
    vercelUrl: (row['vercel_url'] as string) ?? undefined,
    vercelCreated: (row['vercel_created'] as boolean) ?? false,
    subdomain: (row['subdomain'] as string) ?? undefined,
  };
}

// ── API ───────────────────────────────────────────────────────────────────────

export async function fetchPortais(): Promise<Portal[]> {
  if (!isSupabaseConfigured || !supabase) {
    return readLocalStorage();
  }

  const { data, error } = await supabase
    .from('portals')
    .select('*, portal_sites(*)')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
  }
  if (!data) {
    return readLocalStorage();
  }

  if (data.length === 0) {
    // Supabase is empty — only migrate from localStorage if the local portals
    // have never been provisioned (no githubRepo). If they have a repo they
    // were already synced to Supabase and the empty result means they were deleted.
    const local = readLocalStorage();
    const unsynced = local.filter(p => !p.githubRepo);
    if (unsynced.length > 0) {
      await Promise.all(unsynced.map(p => savePortal(p)));
      return unsynced;
    }
    return [];
  }

  const portals = data.map(row => {
    // portal_sites returns as object (not array) when portal_id has a UNIQUE constraint
    const rawSites = row['portal_sites'];
    const sites: Record<string, unknown>[] = Array.isArray(rawSites)
      ? rawSites
      : rawSites && typeof rawSites === 'object' ? [rawSites as Record<string, unknown>] : [];
    return dbToPortal(row as Record<string, unknown>, sites);
  });

  // Cache to localStorage so sync consumers (BancoDeDadosPage, etc.) can find portal data
  writeLocalStorage(portals);

  return portals;
}

export async function savePortal(portal: Portal): Promise<void> {
  // Always write to localStorage as cache/fallback
  const locals = readLocalStorage();
  const idx = locals.findIndex(p => p.id === portal.id);
  if (idx >= 0) locals[idx] = portal; else locals.push(portal);
  writeLocalStorage(locals);

  if (!isSupabaseConfigured || !supabase) return;

  // Parse date from "DD/MM/YYYY" format
  const parts = portal.criadoEm.split('/');
  const isoDate = parts.length === 3
    ? `${parts[2]}-${parts[1]}-${parts[0]}`
    : new Date().toISOString().slice(0, 10);

  const { data: upserted, error: portalError } = await supabase
    .from('portals')
    .upsert({
      portal_key: portal.id,
      cliente: portal.cliente,
      criado_em: isoDate,
      cnpj: portal.empresa.cnpj || null,
      responsavel: portal.empresa.responsavel || null,
      email: portal.empresa.email || null,
      empresa_status: portal.empresa.status,
      github_repo: portal.githubRepo ?? null,
      vercel_url: portal.vercelUrl ?? null,
      vercel_created: portal.vercelCreated ?? false,
      subdomain: portal.subdomain ?? null,
    }, { onConflict: 'portal_key' })
    .select('id')
    .single();

  if (portalError || !upserted) return;

  const dbPortalId = upserted.id as string;

  // Replace all sites: delete then insert
  await supabase.from('portal_sites').delete().eq('portal_id', dbPortalId);
  if (portal.sites.length > 0) {
    await supabase
      .from('portal_sites')
      .insert(
        portal.sites.map(s => ({
          portal_id: dbPortalId,
          link: s.link,
          status: s.status,
          ip: s.ip !== '—' ? s.ip : null,
          tipo: s.tipo,
        }))
      );
  }
}

export async function deletePortal(portalId: string): Promise<void> {
  // Remove from localStorage — database cleanup is handled by the delete-portal edge function
  const locals = readLocalStorage().filter(p => p.id !== portalId);
  writeLocalStorage(locals);

  // Clean up all portal-scoped keys (portal_canais_<id>, portal_cores_<id>, etc.)
  const prefix = `_${portalId}`;
  Object.keys(localStorage)
    .filter(k => k.endsWith(prefix))
    .forEach(k => localStorage.removeItem(k));
  // Also clean up the empresa-scoped key
  localStorage.removeItem(`portal_empresas_${portalId}`);
}

export async function updateEmpresaData(
  portalId: string,
  data: { cnpj?: string; responsavel?: string; email?: string }
): Promise<void> {
  const locals = readLocalStorage();
  const portal = locals.find(p => p.id === portalId);
  if (portal) {
    portal.empresa = { ...portal.empresa, ...data };
    writeLocalStorage(locals);
  }

  if (!isSupabaseConfigured || !supabase) return;

  const update: Record<string, string | null> = {};
  if ('cnpj'        in data) update['cnpj']        = data.cnpj        || null;
  if ('responsavel' in data) update['responsavel']  = data.responsavel || null;
  if ('email'       in data) update['email']        = data.email       || null;

  await supabase
    .from('portals')
    .update(update)
    .eq('portal_key', portalId);
}

export async function updateEmpresaStatus(
  portalId: string,
  status: 'Ativa' | 'Suspensa'
): Promise<void> {
  // Update localStorage
  const locals = readLocalStorage();
  const portal = locals.find(p => p.id === portalId);
  if (portal) {
    portal.empresa.status = status;
    writeLocalStorage(locals);
  }

  if (!isSupabaseConfigured || !supabase) return;

  await supabase
    .from('portals')
    .update({ empresa_status: status })
    .eq('portal_key', portalId);
}

export async function updateSiteStatus(
  siteId: string,
  status: 'Ativo' | 'Suspenso'
): Promise<void> {
  // Update localStorage
  const locals = readLocalStorage();
  for (const portal of locals) {
    const site = portal.sites.find(s => s.id === siteId);
    if (site) { site.status = status; break; }
  }
  writeLocalStorage(locals);

  if (!isSupabaseConfigured || !supabase) return;

  await supabase
    .from('portal_sites')
    .update({ status })
    .eq('id', siteId);
}

export async function fetchPortalSite(siteId: string): Promise<{
  siteId: string; portalId: string; portalKey: string; cliente: string; link: string;
  ip: string; status: 'Ativo' | 'Suspenso'; criadoEm: string;
  githubRepo?: string; vercelUrl?: string; vercelCreated?: boolean; subdomain?: string;
  suporteNome?: string; suporteEmail?: string; suporteUserId?: string;
} | undefined> {
  if (!isSupabaseConfigured || !supabase) {
    return fromLocalStorage(siteId);
  }

  const { data, error } = await supabase
    .from('portal_sites')
    .select('*, portals(*)')
    .eq('id', siteId)
    .single();

  if (error || !data) {
    return fromLocalStorage(siteId);
  }

  const portal = data['portals'] as Record<string, unknown>;
  const d = new Date(portal['criado_em'] as string);
  const criadoEm = isNaN(d.getTime())
    ? (portal['criado_em'] as string)
    : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

  return {
    siteId: data['id'] as string,
    portalId: portal['id'] as string,
    portalKey: (portal['portal_key'] as string) ?? (portal['id'] as string),
    cliente: portal['cliente'] as string,
    link: data['link'] as string,
    ip: (data['ip'] as string) ?? '—',
    status: (data['status'] as 'Ativo' | 'Suspenso') ?? 'Ativo',
    criadoEm,
    githubRepo: (portal['github_repo'] as string) ?? undefined,
    vercelUrl: (portal['vercel_url'] as string) ?? undefined,
    vercelCreated: (portal['vercel_created'] as boolean) ?? false,
    subdomain: (portal['subdomain'] as string) ?? undefined,
    suporteNome: (portal['suporte_nome'] as string) ?? undefined,
    suporteEmail: (portal['suporte_email'] as string) ?? undefined,
    suporteUserId: (portal['suporte_user_id'] as string) ?? undefined,
  };
}

function fromLocalStorage(siteId: string) {
  try {
    const portals: Portal[] = readLocalStorage();
    for (const portal of portals) {
      const s = portal.sites?.find(s => s.id === siteId);
      if (s) {
        return {
          siteId: s.id,
          portalId: portal.id,
          portalKey: portal.id,
          cliente: portal.cliente,
          link: s.link,
          ip: s.ip || '—',
          status: s.status,
          criadoEm: portal.criadoEm,
          githubRepo: portal.githubRepo,
          vercelUrl: portal.vercelUrl,
          vercelCreated: portal.vercelCreated,
          subdomain: portal.subdomain,
        };
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}
