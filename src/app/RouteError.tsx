import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Logo } from '@/components/brand/Logo'
import { Button, ButtonLink } from '@/components/ui/Button'

/** Erros inesperados: mensagem amigável, sem detalhes técnicos sensíveis. */
export function RouteError() {
  const error = useRouteError()
  const isChunkError = error instanceof Error && /dynamically imported module|Loading chunk/i.test(error.message)
  const notFound = isRouteErrorResponse(error) && error.status === 404
  if (import.meta.env.DEV) console.error(error)
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-brand-50 px-4 text-center">
      <Logo />
      <div>
        <h1 className="text-xl font-bold">{notFound ? 'Página não encontrada' : 'Algo deu errado'}</h1>
        <p className="mt-2 max-w-md text-sm text-muted">
          {isChunkError
            ? 'Uma nova versão da Pratuca foi publicada. Recarregue a página para continuar.'
            : 'Tente recarregar a página. Se o problema continuar, fale com o suporte.'}
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => window.location.reload()}>Recarregar</Button>
        <ButtonLink to="/" variant="outline">
          Ir para o início
        </ButtonLink>
      </div>
    </div>
  )
}
