import { describe, expect, it } from 'vitest'
import { productSchema } from './schemas'

const base = { name: 'Marmita de Frango', description: '', price: '18,90', category_id: '', is_available: true, is_active: true, option_groups: [] }

describe('validação de produto', () => {
  it('aceita produto válido', () => {
    expect(productSchema.safeParse(base).success).toBe(true)
  })

  it('exige nome e preço válidos', () => {
    const result = productSchema.safeParse({ ...base, name: 'A', price: 'abc' })
    expect(result.success).toBe(false)
    const fields = result.error?.issues.map((i) => i.path.join('.'))
    expect(fields).toEqual(expect.arrayContaining(['name', 'price']))
  })

  it('rejeita preço acima do limite', () => {
    expect(productSchema.safeParse({ ...base, price: '5000,00' }).success).toBe(false)
  })

  it('valida grupos de adicionais (mínimo ≤ máximo e opções)', () => {
    const group = { name: 'Carne', min_select: 2, max_select: 1, options: [{ name: 'Frango', price: '', is_available: true }] }
    const result = productSchema.safeParse({ ...base, option_groups: [group] })
    expect(result.success).toBe(false)
    expect(productSchema.safeParse({ ...base, option_groups: [{ ...group, min_select: 1, options: [] }] }).success).toBe(false)
    expect(productSchema.safeParse({ ...base, option_groups: [{ ...group, min_select: 1 }] }).success).toBe(true)
  })
})
