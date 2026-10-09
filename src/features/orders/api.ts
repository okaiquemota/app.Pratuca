import { getSupabase } from '@/lib/supabase'
import type { OrderItemOptionSnapshot, OrderItemRow, OrderRow, OrderStatus, OrderStatusHistoryRow } from '@/types/database'

export interface OrderWithItems extends OrderRow {
  order_items: Array<OrderItemRow & { options: OrderItemOptionSnapshot[] }>
}

export interface OrderFilters {
  from: string
  to: string
  status: OrderStatus | 'all' | 'open'
}

const OPEN: OrderStatus[] = ['new', 'confirmed', 'preparing', 'ready', 'out_for_delivery']

export async function fetchOrders(storeId: string, filters: OrderFilters): Promise<OrderWithItems[]> {
  let query = getSupabase()
    .from('orders')
    .select('*, order_items(*)')
    .eq('store_id', storeId)
    .gte('created_at', filters.from)
    .lt('created_at', filters.to)
    .order('created_at', { ascending: false })
    .limit(500)
  if (filters.status === 'open') query = query.in('status', OPEN)
  else if (filters.status !== 'all') query = query.eq('status', filters.status)
  const { data, error } = await query
  if (error) throw error
  const orders = data as unknown as OrderWithItems[]
  return orders.map((o) => ({ ...o, order_items: [...o.order_items].sort((a, b) => a.position - b.position) }))
}

export async function fetchOrderHistory(orderId: string): Promise<OrderStatusHistoryRow[]> {
  const { data, error } = await getSupabase()
    .from('order_status_history')
    .select('*')
    .eq('order_id', orderId)
    .order('id')
  if (error) throw error
  return data
}

export async function fetchRecentOrders(storeId: string, limit = 5): Promise<OrderRow[]> {
  const { data, error } = await getSupabase()
    .from('orders')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

/** A transição é validada pelo banco (update_order_status). */
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<OrderRow> {
  const { data, error } = await getSupabase().rpc('update_order_status', { p_order_id: orderId, p_status: status })
  if (error) throw error
  return data
}

/** Total vendido: soma dos pedidos não cancelados. */
export function salesTotalCents(orders: Pick<OrderRow, 'status' | 'total_cents'>[]): number {
  return orders.filter((o) => o.status !== 'canceled').reduce((sum, o) => sum + o.total_cents, 0)
}
