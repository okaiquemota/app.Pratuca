import type { Session, User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isSupabaseConfigured } from '@/lib/env'
import { getSupabase } from '@/lib/supabase'

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  /** true quando o usuário chegou pelo link de recuperação de senha */
  recovering: boolean
}

const AuthContext = createContext<AuthState>({ session: null, user: null, loading: true, recovering: false })

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: isSupabaseConfigured,
    recovering: false,
  })

  useEffect(() => {
    if (!isSupabaseConfigured) return
    const supabase = getSupabase()
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setState((s) => ({ ...s, session: data.session, user: data.session?.user ?? null, loading: false }))
    })

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setState((s) => ({
        session,
        user: session?.user ?? null,
        loading: false,
        recovering: event === 'PASSWORD_RECOVERY' ? true : event === 'SIGNED_OUT' ? false : s.recovering,
      }))
      if (event === 'SIGNED_OUT') queryClient.clear()
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [queryClient])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  return useContext(AuthContext)
}

/** Estado para testes de componentes. */
export function AuthTestProvider({ value, children }: { value: Partial<AuthState>; children: ReactNode }) {
  const merged = useMemo(() => ({ session: null, user: null, loading: false, recovering: false, ...value }), [value])
  return <AuthContext.Provider value={merged}>{children}</AuthContext.Provider>
}
