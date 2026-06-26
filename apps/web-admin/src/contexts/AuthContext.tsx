import { createContext, useContext, useState, ReactNode } from 'react';

type Role = 'super_admin' | 'client_user';

interface User {
  email: string;
  name: string;
  role: Role;
  tenantId?: string;
}

interface AuthState {
  user: User | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const CREDENTIALS: Array<{ email: string; password: string; user: User }> = [
  {
    email: 'admin@astri.solutions',
    password: 'workr2025',
    user: { email: 'admin@astri.solutions', name: 'G. Santos', role: 'super_admin' },
  },
  {
    email: 'cliente@demo.com',
    password: 'demo2025',
    user: { email: 'cliente@demo.com', name: 'Cliente Demo', role: 'client_user', tenantId: 'demo' },
  },
];

const STORAGE_KEY = 'workr_auth';

function loadFromStorage(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadFromStorage);

  function login(email: string, password: string): boolean {
    const match = CREDENTIALS.find(
      (c) => c.email === email && c.password === password
    );
    if (!match) return false;
    setUser(match.user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(match.user));
    return true;
  }

  function logout() {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
