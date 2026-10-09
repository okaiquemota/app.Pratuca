import { describe, expect, it } from 'vitest'
import type { PlacedOrder } from '@/features/public-menu/types'
import { buildWaMeLink } from './link'
import { buildOrderMessage } from './message'
import { waMeLinkNotifier } from './notifier'

const order: PlacedOrder = {
  order_id: 'id',
  number: 42,
  status: 'new',
  created_at: '2026-10-09T15:00:00Z',
  customer_name: 'Maria Silva',
  fulfillment: 'delivery',
  delivery_address: { street: 'Rua das Flores', number: '10', complement: 'Apto 2', neighborhood: 'Centro', reference: null },
  payment_method: 'cash',
  change_for_cents: 5000,
  notes: 'Tocar a campainha',
  subtotal_cents: 3780,
  delivery_fee_cents: 400,
  total_cents: 4180,
  duplicate: false,
  store: { name: 'Sabor da Nona', slug: 'sabor-da-nona', whatsapp: '5511987654321' },
  items: [
    {
      product_name: 'Marmita Tradicional',
      quantity: 2,
      unit_price_cents: 1890,
      options_unit_cents: 0,
      options: [{ group_name: 'Carne', name: 'Frango', price_cents: 0 }],
      line_total_cents: 3780,
      notes: 'sem cebola',
    },
  ],
}

describe('WhatsApp', () => {
  it('gera link oficial wa.me com mensagem codificada', () => {
    const link = buildWaMeLink('+55 (11) 98765-4321', 'Olá & até já? #1')
    expect(link).toBe('https://wa.me/5511987654321?text=Ol%C3%A1%20%26%20at%C3%A9%20j%C3%A1%3F%20%231')
  })

  it('rejeita números inválidos', () => {
    expect(buildWaMeLink('123')).toBeNull()
  })

  it('monta a mensagem do pedido com itens, totais, entrega e pagamento', () => {
    const message = buildOrderMessage(order, '11912345678')
    expect(message).toContain('*Novo pedido #0042* — Sabor da Nona')
    expect(message).toContain('2x Marmita Tradicional — R$ 37,80')
    expect(message).toContain('• Carne: Frango')
    expect(message).toContain('Obs.: sem cebola')
    expect(message).toContain('Entrega: R$ 4,00')
    expect(message).toContain('*Total: R$ 41,80*')
    expect(message).toContain('Rua das Flores, 10 — Apto 2')
    expect(message).toContain('Pagamento: Dinheiro (troco para R$ 50,00)')
    expect(message).toContain('Cliente: Maria Silva — (11) 91234-5678')
  })

  it('o notificador retorna link quando a loja tem WhatsApp', () => {
    const result = waMeLinkNotifier.prepare(order)
    expect(result.kind).toBe('link')
    expect(waMeLinkNotifier.prepare({ ...order, store: { ...order.store, whatsapp: null } }).kind).toBe('unavailable')
  })
})
