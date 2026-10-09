import { formatCents, formatOrderNumber } from '@/lib/format'
import { formatPhone } from '@/lib/phone'
import { FULFILLMENT_LABEL, PAYMENT_LABEL } from '@/lib/labels'
import type { PlacedOrder } from '@/features/public-menu/types'

/**
 * Mensagem organizada do pedido para o WhatsApp do empreendedor.
 * Usa *negrito* do WhatsApp e evita emojis para manter a leitura limpa
 * em qualquer aparelho.
 */
export function buildOrderMessage(order: PlacedOrder, customerPhone?: string): string {
  const lines: string[] = []
  lines.push(`*Novo pedido ${formatOrderNumber(order.number)}* — ${order.store.name}`)
  lines.push('')
  for (const item of order.items) {
    lines.push(`${item.quantity}x ${item.product_name} — ${formatCents(item.line_total_cents)}`)
    for (const option of item.options) {
      lines.push(`   • ${option.group_name}: ${option.name}`)
    }
    if (item.notes) lines.push(`   Obs.: ${item.notes}`)
  }
  lines.push('')
  lines.push(`Subtotal: ${formatCents(order.subtotal_cents)}`)
  if (order.fulfillment === 'delivery') lines.push(`Entrega: ${formatCents(order.delivery_fee_cents)}`)
  lines.push(`*Total: ${formatCents(order.total_cents)}*`)
  lines.push('')
  lines.push(`*${FULFILLMENT_LABEL[order.fulfillment]}*`)
  if (order.fulfillment === 'delivery' && order.delivery_address) {
    const a = order.delivery_address
    const street = [a.street, a.number].filter(Boolean).join(', ')
    lines.push([street, a.complement].filter(Boolean).join(' — '))
    if (a.neighborhood) lines.push(`Bairro: ${a.neighborhood}`)
    if (a.reference) lines.push(`Referência: ${a.reference}`)
  }
  let payment = `Pagamento: ${PAYMENT_LABEL[order.payment_method]}`
  if (order.payment_method === 'cash' && order.change_for_cents) {
    payment += ` (troco para ${formatCents(order.change_for_cents)})`
  }
  lines.push(payment)
  if (order.notes) lines.push(`Observações: ${order.notes}`)
  lines.push('')
  lines.push(`Cliente: ${order.customer_name}${customerPhone ? ` — ${formatPhone(customerPhone)}` : ''}`)
  lines.push('Pedido registrado pela Pratuca.')
  return lines.join('\n')
}
