import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Alert, Spinner } from '@/components/ui/Feedback'
import { errorMessage } from '@/lib/errors'
import { useMyStore } from './hooks'

/** Sem loja → onboarding. Com loja → libera o painel. */
export function RequireStore({ children }: { children: ReactNode }) {
  const { data: store, isPending, isError, error, refetch } = useMyStore()
  if (isPending) return <Spinner label="Carregando sua loja…" className="min-h-[60vh]" />
  if (isError) {
    return (
      <div className="mx-auto max-w-md p-6">
        <Alert tone="danger" title="Não foi possível carregar sua loja" action={<Button size="sm" variant="outline" onClick={() => void refetch()}>Tentar novamente</Button>}>
          {errorMessage(error)}
        </Alert>
      </div>
    )
  }
  if (!store) return <Navigate to="/app/comecar" replace />
  return <>{children}</>
}
