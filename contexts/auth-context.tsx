"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import type { User, Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase/client"

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    setError(null)
    if (!supabase) {
      const err = new Error("Supabase가 설정되지 않았습니다. .env.local을 확인하세요.")
      setError(err.message)
      return { error: err }
    }
    const { error: err } = await supabase.auth.signUp({ email, password })
    if (err) {
      setError(err.message)
      return { error: err }
    }
    return { error: null }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null)
    if (!supabase) {
      const err = new Error("Supabase가 설정되지 않았습니다. .env.local을 확인하세요.")
      setError(err.message)
      return { error: err }
    }
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (err) {
      setError(err.message)
      return { error: err }
    }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    setError(null)
    if (supabase) await supabase.auth.signOut()
  }, [])

  const value: AuthContextValue = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    error,
    clearError,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return ctx
}
