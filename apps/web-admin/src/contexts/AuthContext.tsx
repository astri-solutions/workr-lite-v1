import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type Role = 'super_admin' | 'admin' | 'editor' | 'viewer' | 'client_user';

export interface Portal {
  id: string;
  nome: string;
  role?: 'admin' | 'editor' | 'viewer';
}

interface User {
  email: string;
  name: string;
  role: Role;
  tenantId?: string;
  portais?: Portal[];
  activePortalId?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** Role do usuário no portal ativo. null se super_admin ou sem portal ativo. */
  portalRole: 'admin' | 'editor' | 'viewer' | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  switchPortal: (portalId: string) => void;
  enterPortal: (id: string, nome: string) => void;
}

const STORAGE_KEY = 'workr_auth';
const SESSION_VERSION = 2; // bump to invalidate all existing sessions

function userFromStorage(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User & { _v?: number };
    if (parsed._v !== SESSION_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function persist(user: User | null) {
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...user, _v: SESSION_VERSION }));
  else localStorage.removeItem(STORAGE_KEY);
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Busca portais + roles do usuário na tabela portal_users (apenas client_user).
 *  Também popula workr_portais no localStorage para que "Ver portal" funcione. */
async function loadClientPortais(sbUserId: string): Promise<Portal[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('portal_users')
      .select('role, portals!inner(portal_key, cliente, vercel_url, subdomain, github_repo, vercel_created)')
      .eq('user_id', sbUserId);
    if (error || !data) return [];
    type PortalRow = {
      portal_key: string; cliente: string;
      vercel_url?: string; subdomain?: string;
      github_repo?: string; vercel_created?: boolean;
    };
    type Row = { role: string; portals: unknown };

    const portais: Portal[] = (data as Row[]).map(row => {
      const p = row.portals as PortalRow;
      return { id: p.portal_key, nome: p.cliente, role: row.role as 'admin' | 'editor' | 'viewer' };
    });

    // Populate workr_portais so "Ver portal" link resolves correctly
    try {
      const existing: unknown[] = JSON.parse(localStorage.getItem('workr_portais') ?? '[]');
      const existingIds = new Set((existing as Array<{ id: string }>).map(e => e.id));
      const toAdd = (data as Row[])
        .map(row => {
          const p = row.portals as PortalRow;
          return {
            id: p.portal_key,
            cliente: p.cliente,
            vercelUrl: p.vercel_url ?? null,
            subdomain: p.subdomain ?? null,
            githubRepo: p.github_repo ?? null,
            vercelCreated: p.vercel_created ?? false,
          };
        })
        .filter(entry => !existingIds.has(entry.id));
      if (toAdd.length > 0) {
        localStorage.setItem('workr_portais', JSON.stringify([...existing, ...toAdd]));
      }
    } catch { /* non-fatal */ }

    return portais;
  } catch {
    return [];
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(userFromStorage);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  async function buildClientUser(sbUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> }, stored: User | null): Promise<User> {
    const base = mergeWithStored(supabaseUserToUser(sbUser), stored);
    if (base.role !== 'client_user') return base;
    const portais = await loadClientPortais(sbUser.id);
    if (portais.length === 0) {
      // No portals means the user's access was revoked (portal deleted). Force sign-out.
      if (supabase) await supabase.auth.signOut();
      persist(null);
      return base; // onAuthStateChange will set user to null
    }
    const activePortalId = base.activePortalId ?? portais[0].id;
    return { ...base, portais, activePortalId };
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const u = await buildClientUser(session.user, userFromStorage());
        setUser(u);
        persist(u);
      } else {
        setUser(null);
        persist(null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const u = await buildClientUser(session.user, userFromStorage());
        setUser(u);
        persist(u);
      } else {
        setUser(null);
        persist(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function login(email: string, password: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return false;
    const u = await buildClientUser(data.user, userFromStorage());
    setUser(u);
    persist(u);
    return true;
  }

  async function logout() {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    // Clear all portal-scoped data to prevent bleed between users on shared devices
    try {
      const portalKeys = Object.keys(localStorage).filter(k =>
        k.startsWith('portal_') || k === 'workr_portais'
      );
      portalKeys.forEach(k => localStorage.removeItem(k));
      // Clear hydration flags
      Object.keys(sessionStorage)
        .filter(k => k.startsWith('portal_hydrated_'))
        .forEach(k => sessionStorage.removeItem(k));
    } catch { /* non-fatal */ }
    setUser(null);
    persist(null);
  }

  function enterPortal(id: string, nome: string) {
    setUser(prev => {
      if (!prev) return prev;
      const existing = prev.portais ?? [];
      const portais = existing.some(p => p.id === id) ? existing : [...existing, { id, nome }];
      const updated = { ...prev, portais, activePortalId: id };
      persist(updated);
      return updated;
    });
  }

  function switchPortal(portalId: string) {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, activePortalId: portalId };
      persist(updated);
      return updated;
    });
  }

  // Role do usuário no portal ativo (null para super_admin ou sem portal)
  const activePortal = user?.portais?.find(p => p.id === user.activePortalId);
  const portalRole: 'admin' | 'editor' | 'viewer' | null = activePortal?.role ?? null;

  return (
    <AuthContext.Provider value={{ user, loading, portalRole, login, logout, switchPortal, enterPortal }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Preserve portais/activePortalId from the stored session when re-authenticating
 * the same email. For client_user with no active portal, auto-detect from the
 * portals list stored in localStorage (matched by empresa.email).
 */
function mergeWithStored(u: User, stored: User | null = userFromStorage()): User {
  let merged: User = stored && stored.email === u.email
    ? { ...u, portais: stored.portais, activePortalId: stored.activePortalId }
    : u;

  // Auto-assign portal for client_user accounts that have none yet
  if (merged.role === 'client_user' && !merged.activePortalId) {
    try {
      const portais = JSON.parse(localStorage.getItem('workr_portais') ?? '[]') as Array<{
        id: string; cliente: string; empresa?: { email?: string };
      }>;
      const mine = portais.find(p => p.empresa?.email === merged.email);
      if (mine) {
        const entry = { id: mine.id, nome: mine.cliente };
        merged = {
          ...merged,
          portais: [entry],
          activePortalId: mine.id,
        };
      }
    } catch { /* non-fatal */ }
  }

  return merged;
}

function supabaseUserToUser(sbUser: { email?: string | null; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> }): User {
  const meta = sbUser.user_metadata ?? {};
  const appMeta = sbUser.app_metadata ?? {};
  const role = (appMeta['role'] as Role | undefined) ?? 'client_user';
  const name = (meta['name'] as string | undefined) ?? (meta['full_name'] as string | undefined) ?? sbUser.email ?? '';
  return { email: sbUser.email ?? '', name, role };
}
