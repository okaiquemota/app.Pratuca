import { describe, expect, it } from 'vitest'
import { availableTransitions, canTransition, nextStatus } from './status'

describe('transições de status (espelho da regra do banco)', () => {
  it('avança no fluxo e permite pular etapas', () => {
    expect(canTransition('new', 'confirmed', 'pickup')).toBe(true)
    expect(canTransition('new', 'preparing', 'pickup')).toBe(true)
    expect(canTransition('preparing', 'completed', 'delivery')).toBe(true)
  })

  it('não volta e não repete status', () => {
    expect(canTransition('preparing', 'confirmed', 'pickup')).toBe(false)
    expect(canTransition('ready', 'ready', 'pickup')).toBe(false)
  })

  it('"saiu para entrega" apenas para entregas', () => {
    expect(canTransition('ready', 'out_for_delivery', 'pickup')).toBe(false)
    expect(canTransition('ready', 'out_for_delivery', 'delivery')).toBe(true)
  })

  it('cancelamento a partir de status não finais; finais são imutáveis', () => {
    expect(canTransition('out_for_delivery', 'canceled', 'delivery')).toBe(true)
    expect(canTransition('completed', 'canceled', 'delivery')).toBe(false)
    expect(canTransition('canceled', 'new', 'delivery')).toBe(false)
  })

  it('sugere o próximo passo natural', () => {
    expect(nextStatus('new', 'pickup')).toBe('confirmed')
    expect(nextStatus('ready', 'pickup')).toBe('completed')
    expect(nextStatus('ready', 'delivery')).toBe('out_for_delivery')
    expect(nextStatus('completed', 'delivery')).toBeNull()
  })

  it('lista as transições disponíveis', () => {
    expect(availableTransitions('ready', 'pickup')).toEqual(['completed', 'canceled'])
  })
})
