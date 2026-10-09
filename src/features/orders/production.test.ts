import { describe, expect, it } from 'vitest'
import { buildProductionSummary, productionTotals, type ProductionInputOrder } from './production'

const opt = (name: string) => ({ group_name: 'Carne', name, price_cents: 0 })

describe('resumo de produção', () => {
  const orders: ProductionInputOrder[] = [
    {
      status: 'new',
      items: [
        { product_id: 'frango', product_name: 'Marmita de frango', quantity: 10, options: [] },
        { product_id: 'carne', product_name: 'Marmita de carne', quantity: 5, options: [] },
      ],
    },
    {
      status: 'preparing',
      items: [{ product_id: 'frango', product_name: 'Marmita de frango', quantity: 8, options: [] }],
    },
    {
      status: 'completed',
      items: [
        { product_id: 'carne', product_name: 'Marmita de carne', quantity: 7, options: [] },
        { product_id: 'veg', product_name: 'Marmita vegetariana', quantity: 7, options: [] },
      ],
    },
    {
      status: 'canceled',
      items: [{ product_id: 'frango', product_name: 'Marmita de frango', quantity: 100, options: [] }],
    },
  ]

  it('soma quantidades por produto e ignora cancelados', () => {
    const summary = buildProductionSummary(orders)
    expect(summary.map((l) => [l.name, l.total])).toEqual([
      ['Marmita de frango', 18],
      ['Marmita de carne', 12],
      ['Marmita vegetariana', 7],
    ])
  })

  it('separa o que falta produzir do que já foi produzido', () => {
    const [frango, carne, veg] = buildProductionSummary(orders)
    expect(frango).toMatchObject({ pending: 18, done: 0 })
    expect(carne).toMatchObject({ pending: 5, done: 7 })
    expect(veg).toMatchObject({ pending: 0, done: 7 })
    expect(productionTotals(buildProductionSummary(orders))).toEqual({ total: 37, pending: 23 })
  })

  it('detalha variações por opções escolhidas', () => {
    const summary = buildProductionSummary([
      {
        status: 'new',
        items: [
          { product_id: 'm', product_name: 'Marmita', quantity: 2, options: [opt('Frango')] },
          { product_id: 'm', product_name: 'Marmita', quantity: 3, options: [opt('Carne')] },
          { product_id: 'm', product_name: 'Marmita', quantity: 1, options: [opt('Frango')] },
        ],
      },
    ])
    expect(summary[0]?.total).toBe(6)
    expect(summary[0]?.variants).toEqual([
      { label: 'Carne', total: 3, pending: 3 },
      { label: 'Frango', total: 3, pending: 3 },
    ])
  })

  it('agrupa itens de produtos excluídos pelo nome do snapshot', () => {
    const summary = buildProductionSummary([
      {
        status: 'confirmed',
        items: [
          { product_id: null, product_name: 'Feijoada', quantity: 1, options: [] },
          { product_id: null, product_name: 'feijoada ', quantity: 2, options: [] },
        ],
      },
    ])
    expect(summary).toHaveLength(1)
    expect(summary[0]?.total).toBe(3)
  })

  it('retorna vazio quando não há pedidos', () => {
    expect(buildProductionSummary([])).toEqual([])
  })
})
