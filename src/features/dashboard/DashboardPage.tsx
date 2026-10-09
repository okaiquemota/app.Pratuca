import { Check, ClipboardList, Copy, ExternalLink, Plus, Share2, Store as StoreIcon, Wallet } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ButtonLink, Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Choice'
import { Alert, Card, EmptyState, PageHeader, Skeleton } from '@/components/ui/Feedback'
import { useToast } from '@/components/ui/toast'
import { useProducts } from '@/features/catalog/hooks'
import { salesTotalCents } from '@/features/orders/api'
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge'
import { ProductionSummary } from '@/features/orders/components/ProductionSummary'
import { useOrders } from '@/features/orders/hooks'
import { useStore, useUpdateStore } from '@/features/stores/hooks'
import { storePublicUrl } from '@/features/stores/storeUrl'
import { useCopy } from '@/hooks/useCopy'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/errors'
import { formatCents, formatNumber, formatOrderNumber, formatTime } from '@/lib/format'
import { localDateString, zonedDayRange } from '@/lib/timezone'

export default function DashboardPage() {
  const store = useStore()
  const today = localDateString(new Date(), store.timezone)
  const range = useMemo(() => zonedDayRange(today, store.timezone), [today, store.timezone])
  const orders = useOrders(store.id, { ...range, status: 'all' })
  const products = useProducts(store.id)
  const update = useUpdateStore()
  const toast = useToast()
  const { copied, copy } = useCopy()

  const list = orders.data ?? []
  const waiting = list.filter((o) => o.status === 'new' || o.status === 'confirmed' || o.status === 'preparing').length
  const sold = salesTotalCents(list)
  const url = storePublicUrl(store.slug)

  const checklist = [
    { done: Boolean(store.whatsapp), label: 'Informar o WhatsApp da loja', to: '/app/configuracoes' },
    { done: (products.data?.length ?? 0) > 0, label: 'Cadastrar produtos', to: '/app/cardapio' },
    { done: store.is_published, label: 'Publicar o cardápio', to: '/app/comecar' },
  ]
  const setupDone = checklist.every((c) => c.done)

  const toggleOpen = async (open: boolean) => {
    try {
      await update.mutateAsync({ storeId: store.id, values: { is_open: open } })
      toast.success(open ? 'Loja aberta para pedidos.' : 'Loja fechada. Novos pedidos estão pausados.')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <>
      <title>Início — Pratuca</title>
      <PageHeader
        title={`Olá, ${store.name}`}
        description={new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: store.timezone }).format(new Date())}
        actions={
          <>
            <ButtonLink to="/app/cardapio?novo=1" variant="outline" icon={<Plus className="size-4" aria-hidden />}>
              Novo produto
            </ButtonLink>
            <ButtonLink to="/app/pedidos" icon={<ClipboardList className="size-4" aria-hidden />}>
              Ver pedidos
            </ButtonLink>
          </>
        }
      />

      {!setupDone ? (
        <Card className="mb-6 p-5">
          <h2 className="font-semibold">Complete a configuração da sua loja</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {checklist.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.to}
                  className={cn(
                    'flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm',
                    item.done ? 'border-success-600/20 bg-success-50 text-success-700' : 'border-line hover:bg-brand-50',
                  )}
                >
                  <span className={cn('flex size-5 items-center justify-center rounded-full', item.done ? 'bg-success-600 text-white' : 'border border-line')}>
                    {item.done ? <Check className="size-3.5" aria-hidden /> : null}
                  </span>
                  {item.label}
                  <span className="sr-only">{item.done ? '(concluído)' : '(pendente)'}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted">Link do seu cardápio</p>
            <p className="truncate font-semibold">{url}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={() => void copy(url)} icon={copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}>
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold hover:bg-brand-50">
              <ExternalLink className="size-4" aria-hidden /> Abrir
            </a>
            {typeof navigator !== 'undefined' && 'share' in navigator ? (
              <Button variant="outline" size="sm" aria-label="Compartilhar link" onClick={() => void navigator.share({ title: store.name, url }).catch(() => {})}>
                <Share2 className="size-4" aria-hidden />
              </Button>
            ) : null}
          </div>
        </Card>
        <Card className="p-5">
          <Switch
            checked={store.is_open}
            onChange={(v) => void toggleOpen(v)}
            disabled={update.isPending || !store.is_published}
            label={store.is_open ? 'Loja aberta' : 'Loja fechada'}
            description={store.is_published ? 'Liga ou pausa novos pedidos.' : 'Publique o cardápio para abrir.'}
          />
        </Card>
      </div>

      {orders.isError ? (
        <Alert tone="danger" className="mb-6">{errorMessage(orders.error)}</Alert>
      ) : null}

      <section aria-label="Números de hoje" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Pedidos hoje" icon={<ClipboardList className="size-5" aria-hidden />} loading={orders.isPending} value={formatNumber(list.length)} />
        <Stat label="Aguardando confirmação ou preparo" icon={<StoreIcon className="size-5" aria-hidden />} loading={orders.isPending} value={formatNumber(waiting)} highlight={waiting > 0} />
        <Stat label="Vendido hoje" hint="Pedidos não cancelados" icon={<Wallet className="size-5" aria-hidden />} loading={orders.isPending} value={formatCents(sold)} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {orders.isPending ? <Skeleton className="h-64" /> : <ProductionSummary orders={list} title="Produção de hoje" compact />}

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Últimos pedidos</h2>
            <Link to="/app/pedidos" className="text-sm font-semibold text-brand-700 hover:underline">
              Ver todos
            </Link>
          </div>
          {orders.isPending ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : list.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="size-6" aria-hidden />}
              title="Nenhum pedido hoje"
              description="Compartilhe o link do cardápio com seus clientes para começar a receber pedidos."
              action={<Button variant="outline" size="sm" onClick={() => void copy(url)}>{copied ? 'Link copiado' : 'Copiar link do cardápio'}</Button>}
              className="py-6"
            />
          ) : (
            <ul className="divide-y divide-line">
              {list.slice(0, 6).map((o) => (
                <li key={o.id}>
                  <Link to={`/app/pedidos?pedido=${o.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 hover:bg-brand-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {formatOrderNumber(o.number)} · {o.customer_name}
                      </p>
                      <p className="text-xs text-muted">
                        {formatTime(o.created_at, store.timezone)} · {formatCents(o.total_cents)}
                      </p>
                    </div>
                    <OrderStatusBadge status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}

function Stat({ label, value, icon, loading, hint, highlight }: { label: string; value: string; icon: ReactNode; loading: boolean; hint?: string; highlight?: boolean }) {
  return (
    <Card className={cn('flex items-center gap-4 p-5', highlight && 'border-brand-400 bg-brand-50')}>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        {loading ? <Skeleton className="mt-1 h-7 w-20" /> : <p className="text-2xl font-bold tabular-nums">{value}</p>}
        {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      </div>
    </Card>
  )
}
