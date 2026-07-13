import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type Role = 'super_admin' | 'admin' | 'editor' | 'viewer' | 'client_user';

export interface Portal {
  id: string;
  nome: string;
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
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  switchPortal: (portalId: string) => void;
  enterPortal: (id: string, nome: string) => void;
}

// ── Fallback para desenvolvimento sem Supabase ────────────────────────────────
const DEMO_CREDENTIALS: Array<{ email: string; password: string; user: User }> = [
  {
    email: 'projetos@astri.solutions',
    password: 'workr2025',
    user: { email: 'projetos@astri.solutions', name: 'Astri Projetos', role: 'super_admin' },
  },
];

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(userFromStorage);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = supabaseUserToUser(session.user);
        setUser(u);
        persist(u);
      } else {
        setUser(null);
        persist(null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = supabaseUserToUser(session.user);
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
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) return false;
      const u = supabaseUserToUser(data.user);
      setUser(u);
      persist(u);
      return true;
    }

    // Fallback demo
    const match = DEMO_CREDENTIALS.find(c => c.email === email && c.password === password);
    if (!match) return false;
    setUser(match.user);
    persist(match.user);
    return true;
  }

  async function logout() {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, switchPortal, enterPortal }}>
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

function supabaseUserToUser(sbUser: { email?: string | null; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> }): User {
  const meta = sbUser.user_metadata ?? {};
  const appMeta = sbUser.app_metadata ?? {};
  const role = (appMeta['role'] as Role | undefined) ?? 'client_user';
  const name = (meta['name'] as string | undefined) ?? (meta['full_name'] as string | undefined) ?? sbUser.email ?? '';
  return { email: sbUser.email ?? '', name, role };
}
