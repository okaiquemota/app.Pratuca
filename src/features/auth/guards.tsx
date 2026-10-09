import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Spinner } from '@/components/ui/Feedback'
import { useAuth } from './AuthProvider'
import { safeNext } from './redirect'

/** Exige sessão; caso contrário redireciona para /entrar mantendo o destino. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner label="Verificando sua sessão…" className="min-h-[60vh]" />
  if (!user) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/entrar?next=${encodeURIComponent(next)}`} replace />
  }
  return <>{children}</>
}

/** Páginas de login/cadastro: quem já está logado vai para o painel. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner className="min-h-[40vh]" />
  if (user) {
    const next = new URLSearchParams(location.search).get('next')
    return <Navigate to={safeNext(next)} replace />
  }
  return <>{children}</>
}
