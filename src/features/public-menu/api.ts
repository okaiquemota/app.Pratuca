import { getSupabase } from '@/lib/supabase'
import type { Json } from '@/types/database'
import type { PlacedOrder, PublicMenu } from './types'

export async function fetchPublicMenu(slug: string): Promise<PublicMenu | null> {
  const { data, error } = await getSupabase().rpc('get_public_menu', { p_slug: slug })
  if (error) throw error
  return (data as unknown as PublicMenu | null) ?? null
}

export interface OrderRequest {
  customer: { name: string; phone: string }
  fulfillment: 'delivery' | 'pickup'
  address: { street: string; number: string; complement: string; neighborhood: string; reference: string } | null
  payment_method: string
  change_for_cents: number | null
  notes: string | null
  expected_total_cents: number
  items: Array<{ product_id: string; quantity: number; notes?: string; option_ids: string[] }>
}

/**
 * Cria o pedido pela função confiável do banco. A chave de idempotência
 * garante que cliques repetidos ou reenvios não dupliquem o pedido.
 */
export async function createPublicOrder(slug: string, idempotencyKey: string, order: OrderRequest): Promise<PlacedOrder> {
  const { data, error } = await getSupabase().rpc('create_public_order', {
    p_slug: slug,
    p_idempotency_key: idempotencyKey,
    p_order: order as unknown as Json,
  })
  if (error) throw error
  return data as unknown as PlacedOrder
}
