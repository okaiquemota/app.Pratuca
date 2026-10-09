import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bike, Clock, ImageOff, MapPin, ShoppingBag, Store as StoreIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { LogoMark } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { Alert, Badge, EmptyState, Skeleton } from '@/components/ui/Feedback'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'
import { isSupabaseConfigured } from '@/lib/env'
import { errorMessage } from '@/lib/errors'
import { formatCents, formatDate, formatNumber } from '@/lib/format'
import { queryKeys } from '@/lib/queryClient'
import { publicImageUrl } from '@/lib/supabase'
import { fetchPublicMenu } from '../api'
import { calculateTotals, cartItemCount, reconcileCart } from '../cart'
import { CartDialog } from '../components/CartDialog'
import { OrderConfirmation } from '../components/OrderConfirmation'
import { ProductDialog } from '../components/ProductDialog'
import { todayHoursLabel, weeklyHours } from '../hours'
import type { PlacedOrder, PublicMenu, PublicProduct } from '../types'
import { useCart } from '../useCart'

export default function PublicStorePage() {
  const { slug = '' } = useParams()
  const normalized = slug.toLowerCase()
  const menu = useQuery({
    queryKey: queryKeys.publicMenu(normalized),
    queryFn: () => fetchPublicMenu(normalized),
    enabled: isSupabaseConfigured,
    staleTime: 60_000,
  })

  if (!isSupabaseConfigured) {
    return <Shell><Alert tone="warning" title="Configuração pendente">O sistema ainda não foi conectado ao banco de dados.</Alert></Shell>
  }
  if (menu.isPending) return <MenuSkeleton />
  if (menu.isError) {
    return (
      <Shell>
        <Alert tone="danger" title="Não foi possível carregar o cardápio" action={<Button size="sm" variant="outline" onClick={() => void menu.refetch()}>Tentar novamente</Button>}>
          {errorMessage(menu.error, 'Verifique sua conexão e tente novamente.')}
        </Alert>
      </Shell>
    )
  }
  if (!menu.data) {
    return (
      <Shell>
        <title>Loja não encontrada — Pratuca</title>
        <EmptyState icon={<StoreIcon className="size-6" aria-hidden />} title="Loja não encontrada" description="Confira se o link está correto. A loja pode ter mudado de endereço ou não estar publicada." />
      </Shell>
    )
  }
  return <Storefront menu={menu.data} slug={normalized} />
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-brand-50 px-4 py-10">
      <div className="mx-auto max-w-md">{children}</div>
      <PoweredBy />
    </div>
  )
}

function PoweredBy() {
  return (
    <p className="mt-10 pb-24 text-center text-xs text-muted">
      <Link to="/" className="inline-flex items-center gap-1 hover:text-ink">
        <LogoMark className="h-4 w-auto" /> Cardápio digital feito com Pratuca
      </Link>
    </p>
  )
}

function Storefront({ menu, slug }: { menu: PublicMenu; slug: string }) {
  const { store } = menu
  const queryClient = useQueryClient()
  const toast = useToast()
  const [cart, dispatch] = useCart(slug)
  const [openProduct, setOpenProduct] = useState<PublicProduct | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [placed, setPlaced] = useState<{ order: PlacedOrder; phone: string } | null>(null)
  const [cartNotice, setCartNotice] = useState<string | null>(null)

  // Mantém o carrinho salvo coerente com o cardápio atual (preços/disponibilidade).
  // Executa durante o render sempre que chega uma nova versão do cardápio.
  const [reconciledMenu, setReconciledMenu] = useState<PublicMenu | null>(null)
  if (reconciledMenu !== menu) {
    setReconciledMenu(menu)
    const { state, changed } = reconcileCart(cart, menu)
    if (changed) {
      dispatch({ type: 'replace', lines: state.lines })
      setCartNotice('Alguns itens do seu carrinho foram atualizados conforme o cardápio atual.')
    }
  }

  const sections = useMemo(() => {
    const byCategory = menu.categories
      .map((c) => ({ id: c.id, name: c.name, products: menu.products.filter((p) => p.category_id === c.id) }))
      .filter((s) => s.products.length)
    const others = menu.products.filter((p) => !p.category_id || !menu.categories.some((c) => c.id === p.category_id))
    if (others.length) byCategory.push({ id: 'outros', name: byCategory.length ? 'Outros' : 'Cardápio', products: others })
    return byCategory
  }, [menu])

  const count = cartItemCount(cart)
  const totals = calculateTotals(cart, { fulfillment: null, deliveryFeeCents: store.delivery_fee_cents, minOrderCents: store.min_order_cents })
  const logo = publicImageUrl(store.logo_path)
  const hoursToday = todayHoursLabel(store.opening_hours, store.timezone)

  if (placed) {
    return (
      <div className="min-h-dvh bg-brand-50 px-4">
        <OrderConfirmation order={placed.order} customerPhone={placed.phone} onNewOrder={() => setPlaced(null)} />
        <PoweredBy />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-brand-50">
      <title>{`${store.name} — Cardápio`}</title>
      <meta name="description" content={store.description ?? `Faça seu pedido em ${store.name}.`} />
      <meta property="og:title" content={`${store.name} — Cardápio`} />

      {menu.preview ? (
        <div role="status" className="bg-ink px-4 py-2 text-center text-sm text-brand-100">
          Prévia do seu cardápio — ainda não publicado. Só você está vendo esta página.
        </div>
      ) : null}

      <header className="bg-white">
        <div className="mx-auto max-w-3xl px-4 pt-6 pb-5">
          <div className="flex items-start gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-brand-100 sm:size-20">
              {logo ? <img src={logo} alt={`Logo de ${store.name}`} className="size-full object-cover" /> : <LogoMark className="h-9 w-auto" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold sm:text-2xl">{store.name}</h1>
                <Badge tone={store.accepting_orders ? 'success' : 'neutral'}>{store.accepting_orders ? 'Aberto' : 'Fechado'}</Badge>
              </div>
              {store.description ? <p className="mt-1 text-sm text-muted">{store.description}</p> : null}
            </div>
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-soft">
            {hoursToday ? (
              <li className="flex items-center gap-1.5">
                <Clock className="size-4" aria-hidden />
                <details className="group">
                  <summary className="cursor-pointer list-none underline-offset-2 group-open:underline hover:underline">{hoursToday}</summary>
                  <ul className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 rounded-xl bg-canvas p-3 text-xs">
                    {weeklyHours(store.opening_hours).map((h) => (
                      <li key={h.day} className="contents"><span>{h.day}</span><span>{h.text}</span></li>
                    ))}
                  </ul>
                </details>
              </li>
            ) : null}
            {store.accepts_delivery ? (
              <li className="flex items-center gap-1.5"><Bike className="size-4" aria-hidden /> Entrega {store.delivery_fee_cents ? formatCents(store.delivery_fee_cents) : 'grátis'}</li>
            ) : null}
            {store.accepts_pickup ? (
              <li className="flex items-center gap-1.5"><MapPin className="size-4" aria-hidden /> Retirada{store.address ? `: ${store.address}` : ''}</li>
            ) : null}
            {store.min_order_cents ? <li>Pedido mínimo {formatCents(store.min_order_cents)}</li> : null}
          </ul>
          {store.welcome_message ? <p className="mt-4 rounded-xl bg-brand-100 px-4 py-3 text-sm">{store.welcome_message}</p> : null}
        </div>
      </header>

      {sections.length > 1 ? (
        <nav aria-label="Categorias" className="sticky top-0 z-20 border-y border-line bg-white/95 backdrop-blur">
          <ul className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 py-2">
            {sections.map((s) => (
              <li key={s.id} className="shrink-0">
                <a href={`#cat-${s.id}`} className="inline-flex min-h-9 items-center rounded-full border border-line px-3 text-sm font-medium hover:bg-brand-50">
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <main className="mx-auto max-w-3xl px-4 py-6">
        {!store.accepting_orders ? (
          <Alert tone="warning" className="mb-5" title="A loja não está recebendo pedidos agora">
            Você pode ver o cardápio, mas os pedidos estão pausados no momento.
          </Alert>
        ) : null}
        {cartNotice ? <Alert tone="info" className="mb-5">{cartNotice}</Alert> : null}
        {menu.daily_menu ? (
          <div className="mb-5 rounded-2xl border border-brand-300 bg-white p-4">
            <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Cardápio de {formatDate(menu.daily_menu.date)}</p>
            {menu.daily_menu.title ? <p className="text-lg font-bold">{menu.daily_menu.title}</p> : null}
            {menu.daily_menu.note ? <p className="text-sm text-muted">{menu.daily_menu.note}</p> : null}
          </div>
        ) : null}

        {sections.length === 0 ? (
          <EmptyState icon={<ShoppingBag className="size-6" aria-hidden />} title="Cardápio em preparação" description="Esta loja ainda não tem produtos disponíveis. Volte mais tarde." />
        ) : (
          <div className="flex flex-col gap-8">
            {sections.map((section) => (
              <section key={section.id} id={`cat-${section.id}`} aria-labelledby={`titulo-${section.id}`} className="scroll-mt-16">
                <h2 id={`titulo-${section.id}`} className="mb-3 text-lg font-bold">{section.name}</h2>
                <ul className="flex flex-col gap-3">
                  {section.products.map((p) => (
                    <li key={p.id}>
                      <ProductCard product={p} onOpen={() => setOpenProduct(p)} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        <PoweredBy />
      </main>

      {count > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="mx-auto flex min-h-14 w-full max-w-3xl items-center justify-between gap-3 rounded-2xl bg-brand-500 px-5 font-semibold text-ink shadow-soft hover:bg-brand-400"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="size-5" aria-hidden />
              {formatNumber(count)} {count === 1 ? 'item' : 'itens'}
            </span>
            <span>Ver carrinho · {formatCents(totals.subtotalCents)}</span>
          </button>
        </div>
      ) : null}

      {openProduct ? (
        <ProductDialog
          product={openProduct}
          canOrder={store.accepting_orders}
          onClose={() => setOpenProduct(null)}
          onAdd={(line) => {
            dispatch({ type: 'add', line })
            setCartNotice(null)
            toast.success(`${line.quantity}x ${line.name} no carrinho.`)
          }}
        />
      ) : null}

      {cartOpen ? (
        <CartDialog
          store={store}
          cart={cart}
          dispatch={dispatch}
          onClose={() => setCartOpen(false)}
          onMenuOutdated={async () => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.publicMenu(slug) })
          }}
          onPlaced={(order, phone) => {
            dispatch({ type: 'clear' })
            setCartOpen(false)
            setPlaced({ order, phone })
            window.scrollTo({ top: 0 })
          }}
        />
      ) : null}
    </div>
  )
}

function ProductCard({ product, onOpen }: { product: PublicProduct; onOpen: () => void }) {
  const image = publicImageUrl(product.image_path)
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn('flex w-full gap-4 rounded-2xl border border-line bg-white p-3 text-left transition-colors hover:border-brand-400', !product.is_available && 'opacity-60')}
    >
      <div className="min-w-0 flex-1 py-1">
        <p className="font-semibold">{product.name}</p>
        {product.description ? <p className="mt-0.5 line-clamp-2 text-sm text-muted">{product.description}</p> : null}
        <p className="mt-2 flex items-center gap-2 font-semibold">
          {formatCents(product.price_cents)}
          {!product.is_available ? <Badge tone="warning">Esgotado</Badge> : null}
        </p>
      </div>
      <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-100">
        {image ? <img src={image} alt="" loading="lazy" className="size-full object-cover" /> : <ImageOff className="size-6 text-brand-700/50" aria-hidden />}
      </div>
    </button>
  )
}

function MenuSkeleton() {
  return (
    <div className="min-h-dvh bg-brand-50" aria-busy="true" aria-label="Carregando cardápio">
      <div className="bg-white">
        <div className="mx-auto flex max-w-3xl gap-4 px-4 py-6">
          <Skeleton className="size-20 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-6">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    </div>
  )
}
