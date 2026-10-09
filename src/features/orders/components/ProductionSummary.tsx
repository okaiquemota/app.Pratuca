import { ChefHat } from 'lucide-react'
import { useMemo } from 'react'
import { Card, EmptyState } from '@/components/ui/Feedback'
import { formatNumber } from '@/lib/format'
import type { OrderWithItems } from '../api'
import { buildProductionSummary, productionTotals } from '../production'

/**
 * Quanto produzir no período. Cancelados não contam; "faltam" = pedidos
 * novos, confirmados e em preparo. Regras em ../production.ts.
 */
export function ProductionSummary({ orders, title = 'Resumo de produção', compact = false }: { orders: OrderWithItems[]; title?: string; compact?: boolean }) {
  const lines = useMemo(
    () =>
      buildProductionSummary(
        orders.map((o) => ({
          status: o.status,
          items: o.order_items.map((i) => ({
            product_id: i.product_id,
            product_name: i.product_name,
            quantity: i.quantity,
            options: Array.isArray(i.options) ? i.options : [],
          })),
        })),
      ),
    [orders],
  )
  const totals = productionTotals(lines)

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-xs text-muted">Sem pedidos cancelados.</p>
        </div>
        {lines.length ? (
          <div className="text-right">
            <p className="text-2xl font-bold">{formatNumber(totals.total)}</p>
            <p className="text-xs text-muted">{formatNumber(totals.pending)} a produzir</p>
          </div>
        ) : null}
      </div>
      {lines.length === 0 ? (
        <EmptyState icon={<ChefHat className="size-6" aria-hidden />} title="Nada para produzir ainda" description="Assim que os pedidos chegarem, as quantidades por produto aparecem aqui." className="py-6" />
      ) : (
        <ul className="divide-y divide-line">
          {(compact ? lines.slice(0, 6) : lines).map((line) => (
            <li key={line.key} className="py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{line.name}</span>
                <span className="shrink-0 text-lg font-bold tabular-nums">{formatNumber(line.total)}</span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                <span>
                  <strong className="font-semibold text-warning-700">{formatNumber(line.pending)}</strong> a produzir
                </span>
                <span>{formatNumber(line.done)} prontos/entregues</span>
              </div>
              {line.variants.length ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {line.variants.map((v) => (
                    <li key={v.label} className="rounded-lg bg-canvas px-2 py-1 text-xs">
                      {v.label}: <strong>{formatNumber(v.total)}</strong>
                    </li>
                  ))}
                </ul>
              ) : null}
              {/* barra visual da proporção já produzida */}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-100" aria-hidden>
                <div className="h-full rounded-full bg-success-600" style={{ width: `${(line.done / line.total) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
