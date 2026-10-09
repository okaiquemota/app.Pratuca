import { describe, expect, it } from 'vitest'
import {
  calculateTotals,
  cartItemCount,
  cartReducer,
  emptyCart,
  reconcileCart,
  toOrderItems,
  validateSelection,
  type CartLine,
  type CartState,
} from './cart'
import type { PublicMenu, PublicProduct } from './types'

const frango: Omit<CartLine, 'lineId'> = { productId: 'p1', name: 'Marmita de Frango', unitPriceCents: 1890, options: [], quantity: 1, notes: '' }

function withLines(...lines: Array<Partial<typeof frango> & { quantity: number }>): CartState {
  return lines.reduce<CartState>((state, line, i) => cartReducer(state, { type: 'add', line: { ...frango, ...line }, lineId: `l${i}` }), emptyCart)
}

describe('carrinho', () => {
  it('adiciona itens e agrupa itens idênticos', () => {
    let state = cartReducer(emptyCart, { type: 'add', line: frango })
    state = cartReducer(state, { type: 'add', line: { ...frango, quantity: 2 } })
    expect(state.lines).toHaveLength(1)
    expect(state.lines[0]?.quantity).toBe(3)
  })

  it('mantém linhas separadas para observações ou opções diferentes', () => {
    let state = cartReducer(emptyCart, { type: 'add', line: frango })
    state = cartReducer(state, { type: 'add', line: { ...frango, notes: 'sem cebola' } })
    state = cartReducer(state, {
      type: 'add',
      line: { ...frango, options: [{ id: 'o1', name: 'Ovo', groupName: 'Adicionais', priceCents: 200 }] },
    })
    expect(state.lines).toHaveLength(3)
    expect(cartItemCount(state)).toBe(3)
  })

  it('limita quantidade entre 1 e 99 e remove ao zerar', () => {
    const state = withLines({ quantity: 1 })
    const id = state.lines[0]!.lineId
    expect(cartReducer(state, { type: 'setQuantity', lineId: id, quantity: 500 }).lines[0]?.quantity).toBe(99)
    expect(cartReducer(state, { type: 'setQuantity', lineId: id, quantity: 0 }).lines).toHaveLength(0)
    expect(cartReducer(state, { type: 'add', line: { ...frango, quantity: -3 } })).toBe(state)
  })

  it('calcula subtotal com adicionais, taxa de entrega e total', () => {
    const state = withLines(
      { quantity: 2 },
      {
        productId: 'p2',
        unitPriceCents: 2190,
        quantity: 1,
        options: [{ id: 'o1', name: 'Ovo', groupName: 'Adicionais', priceCents: 200 }],
      },
    )
    const delivery = calculateTotals(state, { fulfillment: 'delivery', deliveryFeeCents: 500, minOrderCents: null })
    expect(delivery).toMatchObject({ subtotalCents: 1890 * 2 + 2390, deliveryFeeCents: 500, totalCents: 1890 * 2 + 2390 + 500 })
    const pickup = calculateTotals(state, { fulfillment: 'pickup', deliveryFeeCents: 500, minOrderCents: null })
    expect(pickup.deliveryFeeCents).toBe(0)
    expect(pickup.totalCents).toBe(1890 * 2 + 2390)
  })

  it('informa quanto falta para o pedido mínimo (sobre o subtotal)', () => {
    const totals = calculateTotals(withLines({ quantity: 1 }), { fulfillment: 'delivery', deliveryFeeCents: 500, minOrderCents: 3000 })
    expect(totals.belowMinimum).toBe(true)
    expect(totals.missingForMinimumCents).toBe(3000 - 1890)
  })

  it('não envia preços ao servidor', () => {
    const items = toOrderItems(withLines({ quantity: 2, notes: ' bem passado ' }))
    expect(items).toEqual([{ product_id: 'p1', quantity: 2, option_ids: [], notes: 'bem passado' }])
    expect(JSON.stringify(items)).not.toMatch(/price|cents/)
  })
})

describe('seleção de opções', () => {
  const groups = [
    { id: 'g1', name: 'Carne', min_select: 1, max_select: 1, options: [
      { id: 'a', name: 'Frango', price_cents: 0, is_available: true },
      { id: 'b', name: 'Carne', price_cents: 300, is_available: true },
    ] },
    { id: 'g2', name: 'Adicionais', min_select: 0, max_select: 2, options: [
      { id: 'c', name: 'Ovo', price_cents: 200, is_available: true },
      { id: 'd', name: 'Farofa', price_cents: 100, is_available: true },
      { id: 'e', name: 'Bacon', price_cents: 400, is_available: true },
    ] },
  ]

  it('exige o mínimo e respeita o máximo', () => {
    expect(validateSelection(groups, []).errors).toEqual({ g1: 'Escolha uma opção.' })
    expect(validateSelection(groups, ['a', 'b']).errors.g1).toBe('Escolha no máximo 1.')
    expect(validateSelection(groups, ['a', 'c', 'd', 'e']).errors.g2).toBe('Escolha no máximo 2.')
    expect(validateSelection(groups, ['b', 'c']).valid).toBe(true)
  })
})

describe('reconciliação com o cardápio atual', () => {
  const product = (overrides: Partial<PublicProduct> = {}): PublicProduct => ({
    id: 'p1', category_id: null, name: 'Marmita de Frango', description: null, price_cents: 1890,
    image_path: null, is_available: true, option_groups: [], ...overrides,
  })
  const menu = (products: PublicProduct[]): PublicMenu => ({
    store: {} as PublicMenu['store'], preview: false, daily_menu: null, categories: [], products,
  })

  it('atualiza preços alterados e sinaliza a mudança', () => {
    const { state, changed } = reconcileCart(withLines({ quantity: 1 }), menu([product({ price_cents: 2000 })]))
    expect(changed).toBe(true)
    expect(state.lines[0]?.unitPriceCents).toBe(2000)
  })

  it('remove itens indisponíveis ou excluídos', () => {
    expect(reconcileCart(withLines({ quantity: 1 }), menu([product({ is_available: false })])).state.lines).toHaveLength(0)
    expect(reconcileCart(withLines({ quantity: 1 }), menu([])).state.lines).toHaveLength(0)
  })

  it('mantém o carrinho intacto quando nada mudou', () => {
    expect(reconcileCart(withLines({ quantity: 1 }), menu([product()])).changed).toBe(false)
  })
})
