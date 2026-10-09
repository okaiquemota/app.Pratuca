import type { PlacedOrder } from '@/features/public-menu/types'
import { buildWaMeLink } from './link'
import { buildOrderMessage } from './message'

/**
 * Abstração de envio de pedidos para o WhatsApp.
 *
 * v1 (implementada): "link de clique" — o cliente abre o WhatsApp com a
 * mensagem preenchida e decide enviá-la. Nada garante que a mensagem foi
 * enviada, entregue ou lida; por isso o pedido é registrado ANTES no banco.
 *
 * Futuro: uma implementação via API oficial do WhatsApp Business deverá
 * rodar no servidor (Edge Function), com credenciais próprias da loja.
 * Não há implementação nem endpoints definidos nesta versão.
 */
export type NotifyResult =
  | { kind: 'link'; url: string }
  | { kind: 'unavailable'; reason: 'store_without_whatsapp' }

export interface OrderNotifier {
  prepare(order: PlacedOrder, customerPhone?: string): NotifyResult
}

export const waMeLinkNotifier: OrderNotifier = {
  prepare(order, customerPhone) {
    const url = order.store.whatsapp ? buildWaMeLink(order.store.whatsapp, buildOrderMessage(order, customerPhone)) : null
    return url ? { kind: 'link', url } : { kind: 'unavailable', reason: 'store_without_whatsapp' }
  },
}
