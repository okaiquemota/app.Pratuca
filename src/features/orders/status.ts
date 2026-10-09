import type { FulfillmentType, OrderStatus } from '@/types/database'

/**
 * Espelho (somente para a interface) das regras de transição definidas
 * em private.can_transition no banco. O banco é a fonte da verdade.
 */
export const ORDER_FLOW: OrderStatus[] = ['new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed']

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: 'Novo',
  confirmed: 'Confirmado',
  preparing: 'Em preparo',
  ready: 'Pronto',
  out_for_delivery: 'Saiu para entrega',
  completed: 'Concluído',
  canceled: 'Cancelado',
}

/** Rótulo do botão que leva o pedido ao próximo status. */
export const STATUS_ACTION: Record<OrderStatus, string> = {
  new: 'Marcar como novo',
  confirmed: 'Confirmar pedido',
  preparing: 'Iniciar preparo',
  ready: 'Marcar como pronto',
  out_for_delivery: 'Saiu para entrega',
  completed: 'Concluir pedido',
  canceled: 'Cancelar pedido',
}

export type StatusTone = 'brand' | 'info' | 'warning' | 'success' | 'neutral' | 'danger'

export const STATUS_TONE: Record<OrderStatus, StatusTone> = {
  new: 'brand',
  confirmed: 'info',
  preparing: 'warning',
  ready: 'success',
  out_for_delivery: 'info',
  completed: 'neutral',
  canceled: 'danger',
}

export const FINAL_STATUSES: OrderStatus[] = ['completed', 'canceled']
/** Pedidos que ainda exigem ação da cozinha/entrega. */
export const OPEN_STATUSES: OrderStatus[] = ['new', 'confirmed', 'preparing', 'ready', 'out_for_delivery']

export function canTransition(from: OrderStatus, to: OrderStatus, fulfillment: FulfillmentType): boolean {
  if (FINAL_STATUSES.includes(from)) return false
  if (from === to) return false
  if (to === 'canceled') return true
  if (to === 'out_for_delivery' && fulfillment !== 'delivery') return false
  return ORDER_FLOW.indexOf(to) > ORDER_FLOW.indexOf(from)
}

/** Próximo passo natural do fluxo (botão principal). */
export function nextStatus(from: OrderStatus, fulfillment: FulfillmentType): OrderStatus | null {
  if (FINAL_STATUSES.includes(from)) return null
  const flow = ORDER_FLOW.filter((s) => fulfillment === 'delivery' || s !== 'out_for_delivery')
  const index = flow.indexOf(from)
  return flow[index + 1] ?? null
}

export function availableTransitions(from: OrderStatus, fulfillment: FulfillmentType): OrderStatus[] {
  return [...ORDER_FLOW, 'canceled' as const].filter((to) => canTransition(from, to, fulfillment))
}
