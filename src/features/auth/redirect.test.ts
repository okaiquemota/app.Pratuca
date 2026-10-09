import { describe, expect, it } from 'vitest'
import { safeNext } from './redirect'

describe('redirecionamento após login', () => {
  it('aceita apenas caminhos internos', () => {
    expect(safeNext('/app/pedidos')).toBe('/app/pedidos')
    expect(safeNext('https://malicioso.com')).toBe('/app')
    expect(safeNext('//malicioso.com')).toBe('/app')
    expect(safeNext('/\\malicioso.com')).toBe('/app')
    expect(safeNext(null)).toBe('/app')
  })
})
