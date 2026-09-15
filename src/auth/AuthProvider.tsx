import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'

type User = {
  id: string
  name: string
  email: string
}

type AuthContextType = {
  user: User | null
  token: string
  loading: boolean
  signIn: (email: string, password: string) => Promise<User>
  signUp: (name: string, email: string, password: string) => Promise<User>
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const tokenKey = 'health-link-token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState(localStorage.getItem(tokenKey) || '')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem(tokenKey)
    if (!storedToken) {
      setLoading(false)
      return
    }

    fetch('/api/user', {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user)
          setToken(storedToken)
        } else {
          localStorage.removeItem(tokenKey)
        }
      })
      .catch(() => {
        localStorage.removeItem(tokenKey)
      })
      .finally(() => setLoading(false))
  }, [])

  const signIn = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message || 'Login failed')

    localStorage.setItem(tokenKey, result.token)
    setToken(result.token)
    setUser(result.user)
    return result.user
  }

  const signUp = async (name: string, email: string, password: string) => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message || 'Sign up failed')

    localStorage.setItem(tokenKey, result.token)
    setToken(result.token)
    setUser(result.user)
    return result.user
  }

  const signOut = () => {
    localStorage.removeItem(tokenKey)
    setUser(null)
    setToken('')
  }

  const value = useMemo(
    () => ({ user, token, loading, signIn, signUp, signOut }),
    [user, token, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used within AuthProvider')
  return auth
}
