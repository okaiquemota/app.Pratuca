import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Logo } from '@/components/brand/Logo'
import { Alert } from '@/components/ui/Feedback'
import { isSupabaseConfigured } from '@/lib/env'

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="hidden flex-col justify-between bg-ink p-10 text-brand-100 lg:flex">
        <Link to="/" aria-label="Pratuca — página inicial">
          <Logo tone="light" />
        </Link>
        <div>
          <p className="text-3xl leading-tight font-bold text-white">
            Organize seus pedidos e foque no que você faz de melhor: <span className="text-brand-400">cozinhar.</span>
          </p>
          <ul className="mt-8 space-y-3 text-brand-100/90">
            {['Cardápio digital com link próprio', 'Pedidos chegando organizados', 'Resumo do que produzir no dia', 'R$ 39,90/mês, sem comissão'].map(
              (item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-brand-500 text-ink">
                    <Check className="size-4" aria-hidden />
                  </span>
                  {item}
                </li>
              ),
            )}
          </ul>
        </div>
        <p className="text-sm text-brand-100/60">Uma solução MovCode</p>
      </aside>
      <main className="flex flex-col bg-brand-50 px-4 py-8 sm:px-8">
        <Link to="/" className="mb-8 self-start lg:hidden" aria-label="Pratuca — página inicial">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-sm text-muted">{subtitle}</p> : null}
          {!isSupabaseConfigured ? <ConfigNotice className="mt-6" /> : null}
          <div className="mt-6">{children}</div>
          {footer ? <div className="mt-6 text-center text-sm text-muted">{footer}</div> : null}
        </div>
      </main>
    </div>
  )
}

export function ConfigNotice({ className }: { className?: string }) {
  return (
    <Alert tone="warning" title="Configuração pendente" className={className}>
      Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> no arquivo <code>.env.local</code> para
      ativar login, cadastro e pedidos. Veja o README.
    </Alert>
  )
}
