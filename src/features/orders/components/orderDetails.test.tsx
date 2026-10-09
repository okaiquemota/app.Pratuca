import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils'
import type * as OrdersApi from '../api'
import type { OrderWithItems } from '../api'
import { OrderDetailsDialog } from './OrderDetailsDialog'

const api = vi.hoisted(() => ({ updateOrderStatus: vi.fn(), fetchOrderHistory: vi.fn(), fetchOrders: vi.fn() }))
vi.mock('../api', async (original) => ({ ...(await original<typeof OrdersApi>()), ...api }))

const order = (overrides: Partial<OrderWithItems> = {}): OrderWithItems => ({
  id: 'o1', store_id: 's1', number: 12, customer_id: null, customer_name: 'Cliente Teste', customer_phone: '11912345678',
  fulfillment: 'pickup', delivery_address: null, payment_method: 'cash', change_for_cents: 5000, notes: null,
  subtotal_cents: 1890, delivery_fee_cents: 0, total_cents: 1890, status: 'new', status_updated_at: '', idempotency_key: 'k',
  daily_menu_id: null, created_at: '2026-10-09T15:00:00Z', updated_at: '',
  order_items: [{ id: 'i1', order_id: 'o1', store_id: 's1', product_id: 'p1', product_name: 'Marmita', unit_price_cents: 1890, options: [], options_unit_cents: 0, quantity: 1, line_total_cents: 1890, notes: 'sem cebola', position: 0, created_at: '' }],
  ...overrides,
})

describe('detalhes do pedido', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.fetchOrderHistory.mockResolvedValue([])
  })

  it('avança para o próximo status pelo backend', async () => {
    api.updateOrderStatus.mockResolvedValueOnce({})
    renderWithProviders(<OrderDetailsDialog order={order()} timeZone="America/Sao_Paulo" onClose={() => {}} />)
    expect(screen.getByText('Obs.: sem cebola')).toBeInTheDocument()
    expect(screen.getByText(/troco para R\$ 50,00/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))
    await waitFor(() => expect(api.updateOrderStatus).toHaveBeenCalledWith('o1', 'confirmed'))
  })

  it('pedido de retirada não oferece "saiu para entrega"', () => {
    renderWithProviders(<OrderDetailsDialog order={order({ status: 'ready' })} timeZone="America/Sao_Paulo" onClose={() => {}} />)
    expect(screen.getByRole('button', { name: 'Concluir pedido' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Saiu para entrega/ })).not.toBeInTheDocument()
  })

  it('cancelamento exige confirmação', async () => {
    api.updateOrderStatus.mockResolvedValueOnce({})
    renderWithProviders(<OrderDetailsDialog order={order()} timeZone="America/Sao_Paulo" onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar pedido' }))
    expect(api.updateOrderStatus).not.toHaveBeenCalled()
    expect(await screen.findByText('Cancelar o pedido #0012?')).toBeInTheDocument()
    const buttons = screen.getAllByRole('button', { name: 'Cancelar pedido' })
    await userEvent.click(buttons[buttons.length - 1]!)
    await waitFor(() => expect(api.updateOrderStatus).toHaveBeenCalledWith('o1', 'canceled'))
  })

  it('mostra o erro do servidor quando a transição é recusada', async () => {
    api.updateOrderStatus.mockRejectedValueOnce({ message: 'INVALID_STATUS_TRANSITION' })
    renderWithProviders(<OrderDetailsDialog order={order()} timeZone="America/Sao_Paulo" onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))
    expect(await screen.findByText('Essa mudança de status não é permitida.')).toBeInTheDocument()
  })

  it('pedidos finalizados não têm ações de status', () => {
    renderWithProviders(<OrderDetailsDialog order={order({ status: 'completed' })} timeZone="America/Sao_Paulo" onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Cancelar pedido' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Fechar' })).toHaveLength(2)
  })
})
