import {
  CreditCard,
  ExternalLink,
  FolderTree,
  Home,
  LogOut,
  Menu as MenuIcon,
  ReceiptText,
  Settings,
  UtensilsCrossed,
  Users,
  X,
} from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { Logo } from '@/components/brand/Logo'
import { signOut } from '@/features/auth/api'
import { SubscriptionBanner } from '@/features/billing/SubscriptionBanner'
import { useStore } from '@/features/stores/hooks'
import { cn } from '@/lib/cn'

interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  end?: boolean
}

const items: NavItem[] = [
  { to: '/app', label: 'Início', icon: Home, end: true },
  { to: '/app/pedidos', label: 'Pedidos', icon: ReceiptText },
  { to: '/app/cardapio', label: 'Cardápio', icon: UtensilsCrossed },
  { to: '/app/categorias', label: 'Categorias', icon: FolderTree },
  { to: '/app/clientes', label: 'Clientes', icon: Users },
  { to: '/app/configuracoes', label: 'Configurações', icon: Settings },
  { to: '/app/assinatura', label: 'Assinatura', icon: CreditCard },
]

const bottomItems = items.slice(0, 3)

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                isActive ? 'bg-brand-500 text-ink' : 'text-brand-100/85 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

export function AppLayout() {
  const store = useStore()
  const [drawer, setDrawer] = useState(false)

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col gap-6 bg-ink px-3 py-5">
      <Link to="/app" className="px-2" onClick={onNavigate} aria-label="Pratuca — início do painel">
        <Logo tone="light" size="sm" />
      </Link>
      <div className="rounded-xl bg-white/5 px-3 py-2.5">
        <p className="truncate text-sm font-semibold text-white">{store.name}</p>
        <p className="text-xs text-brand-100/70">{store.is_published ? (store.is_open ? 'Aberta para pedidos' : 'Fechada agora') : 'Cardápio não publicado'}</p>
      </div>
      <nav aria-label="Painel" className="flex-1 overflow-y-auto">
        <NavList onNavigate={onNavigate} />
      </nav>
      <div className="flex flex-col gap-1 border-t border-white/10 pt-4">
        <a
          href={`/loja/${store.slug}`}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-brand-100/85 hover:bg-white/10 hover:text-white"
        >
          <ExternalLink className="size-5" aria-hidden />
          Ver minha loja
        </a>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm text-brand-100/85 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-5" aria-hidden />
          Sair
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[16rem_1fr]">
      <a href="#painel" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        Pular para o conteúdo
      </a>
      <aside className="sticky top-0 hidden h-dvh lg:block">{sidebar()}</aside>

      {/* Barra superior (celular/tablet) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white px-2 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawer(true)}
          className="inline-flex size-11 items-center justify-center rounded-xl hover:bg-brand-50"
          aria-label="Abrir menu"
          aria-expanded={drawer}
          aria-controls="menu-painel"
        >
          <MenuIcon className="size-6" aria-hidden />
        </button>
        <Link to="/app" aria-label="Início do painel">
          <Logo size="sm" />
        </Link>
        <span className="size-11" aria-hidden />
      </header>

      {drawer ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu do painel" id="menu-painel">
          <button type="button" className="absolute inset-0 bg-ink/50" aria-label="Fechar menu" onClick={() => setDrawer(false)} />
          <div className="animate-enter absolute inset-y-0 left-0 w-72 max-w-[85vw]">
            {sidebar(() => setDrawer(false))}
            <button
              type="button"
              onClick={() => setDrawer(false)}
              className="absolute top-4 right-3 inline-flex size-10 items-center justify-center rounded-xl text-brand-100 hover:bg-white/10"
              aria-label="Fechar menu"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col pb-20 lg:pb-0">
        <SubscriptionBanner storeId={store.id} />
        <main id="painel" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>

      {/* Navegação inferior (celular) */}
      <nav aria-label="Atalhos" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="grid grid-cols-4">
          {bottomItems.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn('flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium', isActive ? 'text-brand-700' : 'text-muted')
                }
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-xs font-medium text-muted"
            >
              <MenuIcon className="size-5" aria-hidden />
              Mais
            </button>
          </li>
        </ul>
      </nav>
    </div>
  )
}
