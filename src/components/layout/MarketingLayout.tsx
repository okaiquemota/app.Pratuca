import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Logo } from '@/components/brand/Logo'
import { ButtonLink } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/AuthProvider'
import { cn } from '@/lib/cn'

const nav = [
  { to: '/#como-funciona', label: 'Como funciona' },
  { to: '/precos', label: 'Preços' },
  { to: '/ajuda', label: 'Ajuda' },
]

export function MarketingLayout() {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const location = useLocation()
  const routeKey = `${location.pathname}${location.hash}`
  const [lastRoute, setLastRoute] = useState(routeKey)
  if (lastRoute !== routeKey) {
    setLastRoute(routeKey)
    setOpen(false)
  }

  useEffect(() => {
    if (!location.hash) return
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
  }, [location.hash])

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-white/90 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link to="/" aria-label="Pratuca — página inicial">
            <Logo />
          </Link>
          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink/80 hover:bg-brand-50 hover:text-ink"
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <ButtonLink to="/app" size="sm">
                Ir para o painel
              </ButtonLink>
            ) : (
              <>
                <ButtonLink to="/entrar" variant="ghost" size="sm">
                  Entrar
                </ButtonLink>
                <ButtonLink to="/criar-conta" size="sm">
                  Começar teste grátis
                </ButtonLink>
              </>
            )}
          </div>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-xl hover:bg-brand-50 md:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
          </button>
        </div>
        <div id="menu-mobile" className={cn('border-t border-line bg-white md:hidden', open ? 'block' : 'hidden')}>
          <nav aria-label="Principal (celular)" className="container-page flex flex-col gap-1 py-3">
            {nav.map((item) => (
              <Link key={item.to} to={item.to} className="rounded-lg px-3 py-3 font-medium hover:bg-brand-50">
                {item.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              {user ? (
                <ButtonLink to="/app" className="col-span-2">
                  Ir para o painel
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink to="/entrar" variant="outline">
                    Entrar
                  </ButtonLink>
                  <ButtonLink to="/criar-conta">Criar conta</ButtonLink>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>
      <main id="conteudo" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

function Footer() {
  return (
    <footer className="bg-ink text-brand-100">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo tone="light" />
          <p className="mt-3 max-w-xs text-sm text-brand-100/75">
            Seu delivery, sem bagunça. Cardápio digital e pedidos organizados para pequenos negócios de alimentação.
          </p>
        </div>
        <nav aria-label="Produto" className="flex flex-col gap-2 text-sm">
          <p className="font-semibold text-white">Produto</p>
          <Link to="/#como-funciona" className="text-brand-100/80 hover:text-white">Como funciona</Link>
          <Link to="/precos" className="text-brand-100/80 hover:text-white">Preços</Link>
          <Link to="/criar-conta" className="text-brand-100/80 hover:text-white">Criar conta</Link>
          <Link to="/entrar" className="text-brand-100/80 hover:text-white">Entrar</Link>
        </nav>
        <nav aria-label="Institucional" className="flex flex-col gap-2 text-sm">
          <p className="font-semibold text-white">Suporte</p>
          <Link to="/ajuda" className="text-brand-100/80 hover:text-white">Central de ajuda</Link>
          <Link to="/termos" className="text-brand-100/80 hover:text-white">Termos de uso</Link>
          <Link to="/privacidade" className="text-brand-100/80 hover:text-white">Privacidade</Link>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-brand-100/60 sm:flex-row">
          <p className="tracking-[0.2em] uppercase">Pratuca • Uma solução MovCode</p>
          <p className="italic text-brand-400">Mais pedidos. Menos confusão.</p>
        </div>
      </div>
    </footer>
  )
}
