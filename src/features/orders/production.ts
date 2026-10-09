import type { OrderItemOptionSnapshot, OrderStatus } from '@/types/database'

/**
 * Resumo de produção
 * ------------------
 * Soma as quantidades dos itens dos pedidos do período, agrupadas por
 * produto e, dentro de cada produto, pela combinação de opções escolhidas
 * (ex.: "Marmita — Frango", "Marmita — Carne").
 *
 * Regras de inclusão:
 *   * cancelado → NÃO entra no resumo;
 *   * novo, confirmado, em preparo → entram como "a produzir";
 *   * pronto, saiu para entrega, concluído → entram como "já produzido".
 * O total do produto soma as duas parcelas, para que o empreendedor veja
 * quanto precisa preparar no dia inteiro e quanto ainda falta.
 */
export const PENDING_PRODUCTION: OrderStatus[] = ['new', 'confirmed', 'preparing']
export const DONE_PRODUCTION: OrderStatus[] = ['ready', 'out_for_delivery', 'completed']

export interface ProductionInputItem {
  product_id: string | null
  product_name: string
  quantity: number
  options: OrderItemOptionSnapshot[]
}

export interface ProductionInputOrder {
  status: OrderStatus
  items: ProductionInputItem[]
}

export interface ProductionVariant {
  label: string
  total: number
  pending: number
}

export interface ProductionLine {
  key: string
  name: string
  total: number
  pending: number
  done: number
  variants: ProductionVariant[]
}

export function variantLabel(options: OrderItemOptionSnapshot[]): string {
  return options
    .map((o) => o.name.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .join(' + ')
}

export function buildProductionSummary(orders: ProductionInputOrder[]): ProductionLine[] {
  const lines = new Map<string, ProductionLine & { variantMap: Map<string, ProductionVariant> }>()

  for (const order of orders) {
    const pending = PENDING_PRODUCTION.includes(order.status)
    const done = DONE_PRODUCTION.includes(order.status)
    if (!pending && !done) continue

    for (const item of order.items) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) continue
      const key = item.product_id ?? `nome:${item.product_name.trim().toLowerCase()}`
      let line = lines.get(key)
      if (!line) {
        line = { key, name: item.product_name, total: 0, pending: 0, done: 0, variants: [], variantMap: new Map() }
        lines.set(key, line)
      }
      line.total += item.quantity
      if (pending) line.pending += item.quantity
      else line.done += item.quantity

      const label = variantLabel(item.options)
      if (label) {
        let variant = line.variantMap.get(label)
        if (!variant) {
          variant = { label, total: 0, pending: 0 }
          line.variantMap.set(label, variant)
        }
        variant.total += item.quantity
        if (pending) variant.pending += item.quantity
      }
    }
  }

  return [...lines.values()]
    .map(({ variantMap, ...line }) => ({
      ...line,
      variants: [...variantMap.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, 'pt-BR')),
    }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'pt-BR'))
}

export function productionTotals(lines: ProductionLine[]): { total: number; pending: number } {
  return lines.reduce((acc, l) => ({ total: acc.total + l.total, pending: acc.pending + l.pending }), { total: 0, pending: 0 })
}
