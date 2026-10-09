import { Check } from 'lucide-react'
import { Link } from 'react-router'
import { Logo } from '@/components/brand/Logo'
import { ConfigNotice } from '@/components/layout/AuthLayout'
import { Alert, Spinner } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { signOut } from '@/features/auth/api'
import { useMyStore } from '@/features/stores/hooks'
import { cn } from '@/lib/cn'
import { isSupabaseConfigured } from '@/lib/env'
import { errorMessage } from '@/lib/errors'
import { StepBusiness } from './steps/StepBusiness'
import { StepOperation } from './steps/StepOperation'
import { StepProduct } from './steps/StepProduct'
import { StepPublish } from './steps/StepPublish'

const ONBOARDING_STEPS = ['Seu negócio', 'Atendimento', 'Primeiro produto', 'Publicar'] as const

/**
 * Etapa atual vem do banco (stores.onboarding_step), então o usuário
 * pode sair e continuar depois de onde parou:
 *   sem loja → 1 | 2 atendimento | 3 produto | 4 publicar | 5 concluído
 */
export default function OnboardingPage() {
  const { data: store, isPending, isError, error, refetch } = useMyStore()
  const step = store ? Math.min(store.onboarding_step, 5) : 1

  return (
    <div className="min-h-dvh bg-brand-50">
      <title>Configurar loja — Pratuca</title>
      <header className="border-b border-line/70 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Logo size="sm" />
          <div className="flex items-center gap-1">
            {store ? (
              <Link to="/app" className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-brand-50 hover:text-ink">
                Ir para o painel
              </Link>
            ) : null}
            <button type="button" onClick={() => void signOut()} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-brand-50">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {!isSupabaseConfigured ? <ConfigNotice className="mb-6" /> : null}
        {step <= 4 ? <Stepper current={step} /> : null}

        <div className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-8">
          {isPending ? (
            <Spinner />
          ) : isError ? (
            <Alert tone="danger" action={<Button size="sm" variant="outline" onClick={() => void refetch()}>Tentar novamente</Button>}>
              {errorMessage(error)}
            </Alert>
          ) : !store ? (
            <StepBusiness />
          ) : step === 2 ? (
            <StepOperation store={store} />
          ) : step === 3 ? (
            <StepProduct store={store} />
          ) : (
            <StepPublish store={store} />
          )}
        </div>
      </main>
    </div>
  )
}

function Stepper({ current }: { current: number }) {
  return (
    <nav aria-label="Etapas da configuração">
      <p className="mb-3 text-sm font-medium text-muted">
        Etapa {current} de {ONBOARDING_STEPS.length}
      </p>
      <ol className="grid grid-cols-4 gap-2">
        {ONBOARDING_STEPS.map((label, index) => {
          const number = index + 1
          const done = number < current
          const active = number === current
          return (
            <li key={label} aria-current={active ? 'step' : undefined} className="flex flex-col gap-2">
              <span className={cn('h-1.5 rounded-full', done || active ? 'bg-brand-500' : 'bg-line')} />
              <span className={cn('hidden items-center gap-1 text-xs font-medium sm:flex', active ? 'text-ink' : 'text-muted')}>
                {done ? <Check className="size-3.5 text-success-600" aria-hidden /> : null}
                {label}
                {done ? <span className="sr-only"> (concluída)</span> : null}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
