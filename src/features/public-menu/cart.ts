import type { FulfillmentType } from '@/types/database'
import type { PublicMenu, PublicOptionGroup, PublicProduct } from './types'

/**
 * Carrinho do cardápio público — lógica pura (sem React).
 * Os valores aqui servem apenas para exibição: o servidor recalcula
 * tudo em create_public_order e rejeita divergências (PRICE_CHANGED).
 */
export const MAX_QUANTITY = 99
export const MAX_CART_LINES = 30

export interface CartOption {
  id: string
  name: string
  groupName: string
  priceCents: number
}

export interface CartLine {
  lineId: string
  productId: string
  name: string
  unitPriceCents: number
  options: CartOption[]
  quantity: number
  notes: string
}

export interface CartState {
  lines: CartLine[]
}

export type CartAction =
  | { type: 'add'; line: Omit<CartLine, 'lineId'>; lineId?: string }
  | { type: 'setQuantity'; lineId: string; quantity: number }
  | { type: 'remove'; lineId: string }
  | { type: 'clear' }
  | { type: 'replace'; lines: CartLine[] }

export const emptyCart: CartState = { lines: [] }

function lineSignature(line: Pick<CartLine, 'productId' | 'options' | 'notes'>): string {
  return [line.productId, line.options.map((o) => o.id).sort().join(','), line.notes.trim().toLowerCase()].join('|')
}

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1
  return Math.min(MAX_QUANTITY, Math.max(0, Math.trunc(quantity)))
}

let lineCounter = 0
function newLineId(): string {
  lineCounter += 1
  return `l${Date.now().toString(36)}${lineCounter}`
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const quantity = clampQuantity(action.line.quantity)
      if (quantity < 1) return state
      const signature = lineSignature(action.line)
      const existing = state.lines.find((l) => lineSignature(l) === signature)
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l === existing ? { ...l, quantity: clampQuantity(l.quantity + quantity) } : l,
          ),
        }
      }
      if (state.lines.length >= MAX_CART_LINES) return state
      return {
        lines: [...state.lines, { ...action.line, notes: action.line.notes.trim(), quantity, lineId: action.lineId ?? newLineId() }],
      }
    }
    case 'setQuantity': {
      const quantity = clampQuantity(action.quantity)
      if (quantity < 1) return { lines: state.lines.filter((l) => l.lineId !== action.lineId) }
      return { lines: state.lines.map((l) => (l.lineId === action.lineId ? { ...l, quantity } : l)) }
    }
    case 'remove':
      return { lines: state.lines.filter((l) => l.lineId !== action.lineId) }
    case 'clear':
      return emptyCart
    case 'replace':
      return { lines: action.lines }
  }
}

export function lineUnitCents(line: Pick<CartLine, 'unitPriceCents' | 'options'>): number {
  return line.unitPriceCents + line.options.reduce((sum, o) => sum + o.priceCents, 0)
}

export function lineTotalCents(line: CartLine): number {
  return lineUnitCents(line) * line.quantity
}

export function cartItemCount(state: CartState): number {
  return state.lines.reduce((sum, l) => sum + l.quantity, 0)
}

export interface CartTotals {
  subtotalCents: number
  deliveryFeeCents: number
  totalCents: number
  belowMinimum: boolean
  missingForMinimumCents: number
}

export function calculateTotals(
  state: CartState,
  options: { fulfillment: FulfillmentType | null; deliveryFeeCents: number; minOrderCents: number | null },
): CartTotals {
  const subtotalCents = state.lines.reduce((sum, l) => sum + lineTotalCents(l), 0)
  const deliveryFeeCents = options.fulfillment === 'delivery' ? options.deliveryFeeCents : 0
  const min = options.minOrderCents ?? 0
  const missing = Math.max(0, min - subtotalCents)
  return {
    subtotalCents,
    deliveryFeeCents,
    totalCents: subtotalCents + deliveryFeeCents,
    belowMinimum: missing > 0,
    missingForMinimumCents: missing,
  }
}

/** Valida a seleção de opções de um produto (mínimo/máximo por grupo). */
export function validateSelection(
  groups: PublicOptionGroup[],
  selectedIds: string[],
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  for (const group of groups) {
    const count = group.options.filter((o) => selectedIds.includes(o.id)).length
    if (count < group.min_select) {
      errors[group.id] =
        group.min_select === 1 ? 'Escolha uma opção.' : `Escolha pelo menos ${group.min_select} opções.`
    } else if (count > group.max_select) {
      errors[group.id] = `Escolha no máximo ${group.max_select}.`
    }
  }
  return { valid: Object.keys(errors).length === 0, errors }
}

export function buildCartOptions(product: PublicProduct, selectedIds: string[]): CartOption[] {
  const options: CartOption[] = []
  for (const group of product.option_groups) {
    for (const option of group.options) {
      if (selectedIds.includes(option.id)) {
        options.push({ id: option.id, name: option.name, groupName: group.name, priceCents: option.price_cents })
      }
    }
  }
  return options
}

/**
 * Sincroniza o carrinho salvo com o cardápio atual: remove itens que
 * deixaram de existir/estar disponíveis e atualiza preços e nomes.
 */
export function reconcileCart(state: CartState, menu: PublicMenu): { state: CartState; changed: boolean } {
  let changed = false
  const lines: CartLine[] = []
  for (const line of state.lines) {
    const product = menu.products.find((p) => p.id === line.productId)
    if (!product || !product.is_available) {
      changed = true
      continue
    }
    const optionIds = line.options.map((o) => o.id)
    const availableIds = product.option_groups.flatMap((g) => g.options.filter((o) => o.is_available).map((o) => o.id))
    if (optionIds.some((id) => !availableIds.includes(id)) || !validateSelection(product.option_groups, optionIds).valid) {
      changed = true
      continue
    }
    const options = buildCartOptions(product, optionIds)
    const updated: CartLine = { ...line, name: product.name, unitPriceCents: product.price_cents, options }
    if (updated.unitPriceCents !== line.unitPriceCents || lineUnitCents(updated) !== lineUnitCents(line) || updated.name !== line.name) {
      changed = true
    }
    lines.push(updated)
  }
  return { state: { lines }, changed }
}

/** Payload enviado para create_public_order — sem preços. */
export function toOrderItems(state: CartState): Array<{ product_id: string; quantity: number; notes?: string; option_ids: string[] }> {
  return state.lines.map((l) => ({
    product_id: l.productId,
    quantity: l.quantity,
    option_ids: l.options.map((o) => o.id),
    ...(l.notes.trim() ? { notes: l.notes.trim() } : {}),
  }))
}
