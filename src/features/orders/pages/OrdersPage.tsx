import { ChevronLeft, ChevronRight, ClipboardList, RefreshCw } from 'lucide-react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Alert, Card, EmptyState, PageHeader, Skeleton } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Field'
import { useStore } from '@/features/stores/hooks'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/errors'
import { formatCents, formatNumber, formatOrderNumber, formatTime, pluralize } from '@/lib/format'
import { FULFILLMENT_LABEL } from '@/lib/labels'
import { addDays, localDateString, zonedDayRange } from '@/lib/timezone'
import type { OrderStatus } from '@/types/database'
import { salesTotalCents, type OrderFilters } from '../api'
import { OrderDetailsDialog } from '../components/OrderDetailsDialog'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { ProductionSummary } from '../components/ProductionSummary'
import { useOrders } from '../hooks'
import { STATUS_LABEL } from '../status'

type StatusFilter = OrderFilters['status']
const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'open', label: 'Em aberto' },
  ...(['new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'canceled'] as OrderStatus[]).map((s) => ({
    value: s,
    label: STATUS_LABEL[s],
  })),
]

export default function OrdersPage() {
  const store = useStore()
  const [params, setParams] = useSearchParams()
  const today = localDateString(new Date(), store.timezone)
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get('data') ?? '') ? params.get('data')! : today
  const status = (FILTERS.find((f) => f.value === params.get('status'))?.value ?? 'all') as StatusFilter
  const view = params.get('ver') === 'producao' ? 'production' : 'list'
  const selectedId = params.get('pedido')

  const range = useMemo(() => zonedDayRange(date, store.timezone), [date, store.timezone])
  // Produção sempre considera o dia todo (todos os status); a lista aplica o filtro.
  const allOrders = useOrders(store.id, { ...range, status: 'all' })
  const all = useMemo(() => allOrders.data ?? [], [allOrders.data])
  const filtered = useMemo(
    () =>
      status === 'all'
        ? all
        : status === 'open'
          ? all.filter((o) => !['completed', 'canceled'].includes(o.status))
          : all.filter((o) => o.status === status),
    [all, status],
  )
  const selected = all.find((o) => o.id === selectedId) ?? null

  const set = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k)
      else next.set(k, v)
    }
    setParams(next, { replace: true })
  }

  const countFor = (value: StatusFilter) =>
    value === 'all' ? all.length : value === 'open' ? all.filter((o) => !['completed', 'canceled'].includes(o.status)).length : all.filter((o) => o.status === value).length

  return (
    <>
      <title>Pedidos — Pratuca</title>
      <PageHeader
        title="Pedidos"
        description={`${formatNumber(all.length)} ${all.length === 1 ? 'pedido' : 'pedidos'} · ${formatCents(salesTotalCents(all))} vendidos`}
        actions={
          <Button variant="outline" onClick={() => void allOrders.refetch()} loading={allOrders.isFetching && !allOrders.isPending} icon={<RefreshCw className="size-4" aria-hidden />}>
            Atualizar
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="Dia anterior" onClick={() => set({ data: addDays(date, -1) })}>
            <ChevronLeft className="size-5" aria-hidden />
          </Button>
          <label className="sr-only" htmlFor="data-pedidos">Data</label>
          <Input id="data-pedidos" type="date" value={date} max={today} onChange={(e) => e.target.value && set({ data: e.target.value })} className="w-auto" />
          <Button variant="outline" size="icon" aria-label="Próximo dia" disabled={date >= today} onClick={() => set({ data: addDays(date, 1) })}>
            <ChevronRight className="size-5" aria-hidden />
          </Button>
          {date !== today ? (
            <Button variant="ghost" size="sm" onClick={() => set({ data: null })}>Hoje</Button>
          ) : null}
        </div>
        <div role="tablist" aria-label="Visualização" className="inline-flex rounded-xl bg-white p-1 ring-1 ring-line">
          {[
            { value: 'list', label: 'Lista de pedidos' },
            { value: 'production', label: 'Produção' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={view === tab.value}
              onClick={() => set({ ver: tab.value === 'production' ? 'producao' : null })}
              className={cn('min-h-9 rounded-lg px-3 text-sm font-semibold', view === tab.value ? 'bg-ink text-white' : 'text-muted hover:text-ink')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {allOrders.isError ? <Alert tone="danger" className="mb-4">{errorMessage(allOrders.error)}</Alert> : null}

      {view === 'production' ? (
        allOrders.isPending ? <Skeleton className="h-72" /> : <ProductionSummary orders={all} />
      ) : (
        <>
          <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-2" role="group" aria-label="Filtrar por status">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={status === f.value}
                  onClick={() => set({ status: f.value === 'all' ? null : f.value })}
                  className={cn(
                    'min-h-9 shrink-0 rounded-full border px-3 text-sm font-medium whitespace-nowrap',
                    status === f.value ? 'border-brand-500 bg-brand-500 text-ink' : 'border-line bg-white text-muted hover:text-ink',
                  )}
                >
                  {f.label} <span className="tabular-nums opacity-75">({countFor(f.value)})</span>
                </button>
              ))}
            </div>
          </div>

          {allOrders.isPending ? (
            <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="size-6" aria-hidden />}
              title={all.length ? 'Nenhum pedido com este status' : date === today ? 'Nenhum pedido hoje ainda' : 'Nenhum pedido neste dia'}
              description={all.length ? 'Escolha outro filtro para ver os demais pedidos.' : 'Os pedidos feitos pelo seu cardápio aparecem aqui automaticamente.'}
            />
          ) : (
            <>
              {/* Celular: cards */}
              <ul className="flex flex-col gap-2 md:hidden">
                {filtered.map((o) => (
                  <li key={o.id}>
                    <button type="button" onClick={() => set({ pedido: o.id })} className="w-full rounded-2xl border border-line bg-white p-4 text-left hover:border-brand-400">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold">{formatOrderNumber(o.number)}</span>
                        <OrderStatusBadge status={o.status} />
                      </div>
                      <p className="mt-1 font-medium">{o.customer_name}</p>
                      <p className="mt-0.5 text-sm text-muted">
                        {formatTime(o.created_at, store.timezone)} · {FULFILLMENT_LABEL[o.fulfillment]} · {pluralize(o.order_items.reduce((s, i) => s + i.quantity, 0), 'item', 'itens')}
                      </p>
                      <p className="mt-2 font-semibold">{formatCents(o.total_cents)}</p>
                    </button>
                  </li>
                ))}
              </ul>
              {/* Desktop: tabela */}
              <Card className="hidden overflow-hidden md:block">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Pedidos do dia</caption>
                  <thead className="bg-canvas text-xs text-muted uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Pedido</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Horário</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Cliente</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Itens</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Modalidade</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Total</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((o) => (
                      <tr key={o.id} className="cursor-pointer hover:bg-brand-50" onClick={() => set({ pedido: o.id })}>
                        <td className="px-4 py-3">
                          <button type="button" className="font-bold hover:underline" onClick={(e) => { e.stopPropagation(); set({ pedido: o.id }) }}>
                            {formatOrderNumber(o.number)}
                          </button>
                        </td>
                        <td className="px-4 py-3 tabular-nums">{formatTime(o.created_at, store.timezone)}</td>
                        <td className="px-4 py-3">{o.customer_name}</td>
                        <td className="px-4 py-3">{o.order_items.reduce((s, i) => s + i.quantity, 0)}</td>
                        <td className="px-4 py-3">{FULFILLMENT_LABEL[o.fulfillment]}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatCents(o.total_cents)}</td>
                        <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </>
      )}

      {selected ? <OrderDetailsDialog order={selected} timeZone={store.timezone} onClose={() => set({ pedido: null })} /> : null}
    </>
  )
}
