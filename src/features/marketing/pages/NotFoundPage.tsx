import { LogoMark } from '@/components/brand/Logo'
import { ButtonLink } from '@/components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-brand-50 px-4 text-center">
      <title>Página não encontrada — Pratuca</title>
      <LogoMark className="h-14 w-auto" />
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="max-w-sm text-sm text-muted">O endereço pode estar errado ou a página foi removida.</p>
      <ButtonLink to="/">Voltar para o início</ButtonLink>
    </div>
  )
}
