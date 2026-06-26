import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  email: string
  name: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const HARDCODED_USER: User = { email: 'admin@astri.solutions', name: 'Administrador' }
const HARDCODED_PASSWORD = 'workr2025'
const STORAGE_KEY = 'workr_auth'

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const user = JSON.parse(stored) as User
        return { user, isAuthenticated: true }
      }
    } catch {
      // ignore
    }
    return { user: null, isAuthenticated: false }
  })

  const login = async (email: string, password: string): Promise<boolean> => {
    if (email === HARDCODED_USER.email && password === HARDCODED_PASSWORD) {
      const user = HARDCODED_USER
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      setState({ user, isAuthenticated: true })
      return true
    }
    return false
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setState({ user: null, isAuthenticated: false })
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
