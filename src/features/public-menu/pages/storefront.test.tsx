import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils'
import type { PublicMenu } from '../types'
import PublicStorePage from './PublicStorePage'

vi.mock('@/lib/env', () => ({
  env: { supabaseUrl: 'https://exemplo.supabase.co', supabaseKey: 'k', siteUrl: 'http://localhost', supportEmail: '', supportWhatsapp: '', billingProvider: '' },
  isSupabaseConfigured: true,
}))
const api = vi.hoisted(() => ({ fetchPublicMenu: vi.fn(), createPublicOrder: vi.fn() }))
vi.mock('../api', () => api)

function menu(overrides: Partial<PublicMenu['store']> = {}): PublicMenu {
  return {
    store: {
      slug: 'sabor', name: 'Sabor da Nona', description: null, welcome_message: null, logo_path: null, whatsapp: '5511987654321',
      phone: null, address: 'Rua A, 1', timezone: 'America/Sao_Paulo', opening_hours: [], accepts_delivery: true, accepts_pickup: true,
      delivery_fee_cents: 400, min_order_cents: null, payment_methods: ['pix', 'cash'], is_open: true, is_published: true, accepting_orders: true,
      ...overrides,
    },
    preview: false,
    daily_menu: null,
    categories: [],
    products: [
      {
        id: 'p1', category_id: null, name: 'Marmita Tradicional', description: null, price_cents: 1890, image_path: null, is_available: true,
        option_groups: [{ id: 'g1', name: 'Escolha a carne', min_select: 1, max_select: 1, options: [
          { id: 'o1', name: 'Frango', price_cents: 0, is_available: true },
          { id: 'o2', name: 'Carne', price_cents: 300, is_available: true },
        ] }],
      },
      { id: 'p2', category_id: null, name: 'Suco', description: null, price_cents: 800, image_path: null, is_available: false, option_groups: [] },
    ],
  }
}

const placed = {
  order_id: 'x', number: 7, status: 'new', created_at: '2026-10-09T15:00:00Z', customer_name: 'Maria', fulfillment: 'delivery',
  delivery_address: { street: 'Rua B', number: '2', complement: null, neighborhood: 'Centro', reference: null }, payment_method: 'pix',
  change_for_cents: null, notes: null, subtotal_cents: 4380, delivery_fee_cents: 400, total_cents: 4780, duplicate: false,
  store: { name: 'Sabor da Nona', slug: 'sabor', whatsapp: '5511987654321' },
  items: [{ product_name: 'Marmita Tradicional', quantity: 2, unit_price_cents: 1890, options_unit_cents: 300, options: [{ group_name: 'Escolha a carne', name: 'Carne', price_cents: 300 }], line_total_cents: 4380, notes: null }],
}

const render = () => renderWithProviders(<PublicStorePage />, { route: '/loja/sabor', path: '/loja/:slug' })

async function addTwoWithCarne() {
  await userEvent.click(await screen.findByRole('button', { name: /Marmita Tradicional/ }))
  const dialog = screen.getByRole('dialog')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Aumentar quantidade' }))
  await userEvent.click(within(dialog).getByRole('button', { name: /^Adicionar/ }))
  expect(await within(dialog).findByText('Escolha uma opção.')).toBeInTheDocument()
  await userEvent.click(within(dialog).getByRole('radio', { name: /^Carne/ }))
  expect(within(dialog).getByRole('button', { name: /^Adicionar/ })).toHaveTextContent('R$ 43,80')
  await userEvent.click(within(dialog).getByRole('button', { name: /^Adicionar/ }))
}

async function fillCheckout() {
  await userEvent.click(screen.getByRole('button', { name: /Ver carrinho/ }))
  await userEvent.click(screen.getByRole('button', { name: /Continuar/ }))
  await userEvent.type(screen.getByLabelText(/Seu nome/), 'Maria')
  await userEvent.type(screen.getByLabelText(/Telefone/), '11912345678')
  await userEvent.type(screen.getByLabelText(/^Rua/), 'Rua B')
  await userEvent.type(screen.getByLabelText(/^Número/), '2')
  await userEvent.type(screen.getByLabelText(/^Bairro/), 'Centro')
  await userEvent.click(screen.getByRole('radio', { name: 'Pix' }))
}

describe('cardápio público', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.fetchPublicMenu.mockResolvedValue(menu())
  })

  it('monta o carrinho com opções e envia o pedido sem preços, mostrando o total com taxa', async () => {
    api.createPublicOrder.mockResolvedValueOnce(placed)
    render()
    await addTwoWithCarne()
    expect(screen.getByRole('button', { name: /Ver carrinho/ })).toHaveTextContent('2 itens')
    await fillCheckout()
    const submit = screen.getByRole('button', { name: /Fazer pedido/ })
    expect(submit).toHaveTextContent('R$ 47,80')
    await userEvent.click(submit)

    await waitFor(() => expect(api.createPublicOrder).toHaveBeenCalledTimes(1))
    const [slug, key, payload] = api.createPublicOrder.mock.calls[0]!
    expect(slug).toBe('sabor')
    expect(key).toMatch(/^[0-9a-f-]{36}$/)
    expect(payload.items).toEqual([{ product_id: 'p1', quantity: 2, option_ids: ['o2'] }])
    expect(payload.customer).toEqual({ name: 'Maria', phone: '11912345678' })
    expect(payload.expected_total_cents).toBe(4780)
    expect(JSON.stringify(payload.items)).not.toMatch(/cents|price/)

    expect(await screen.findByRole('heading', { name: 'Pedido #0007 registrado' })).toBeInTheDocument()
    const whatsapp = screen.getByRole('link', { name: /Enviar resumo pelo WhatsApp/ })
    expect(whatsapp.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/5511987654321\?text=/)
    expect(decodeURIComponent(whatsapp.getAttribute('href')!)).toContain('*Novo pedido #0007*')
    expect(screen.getByText(/seu pedido já está registrado/)).toBeInTheDocument()
  })

  it('reutiliza a mesma chave de idempotência ao tentar de novo após falha de rede', async () => {
    api.createPublicOrder.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(placed)
    render()
    await addTwoWithCarne()
    await fillCheckout()
    await userEvent.click(screen.getByRole('button', { name: /Fazer pedido/ }))
    expect(await screen.findByText('Sem conexão com o servidor. Verifique sua internet.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Fazer pedido/ }))
    await screen.findByRole('heading', { name: /registrado/ })
    const keys = api.createPublicOrder.mock.calls.map((c) => c[1])
    expect(keys).toHaveLength(2)
    expect(keys[0]).toBe(keys[1])
  })

  it('quando o preço muda no servidor, recarrega o cardápio e avisa o cliente', async () => {
    api.createPublicOrder.mockRejectedValueOnce({ message: 'PRICE_CHANGED' })
    render()
    await addTwoWithCarne()
    await fillCheckout()
    await userEvent.click(screen.getByRole('button', { name: /Fazer pedido/ }))
    expect(await screen.findByText(/preços do cardápio foram atualizados/)).toBeInTheDocument()
    expect(api.fetchPublicMenu).toHaveBeenCalledTimes(2)
  })

  it('loja fechada mostra o cardápio sem permitir pedidos', async () => {
    api.fetchPublicMenu.mockResolvedValue(menu({ is_open: false, accepting_orders: false }))
    render()
    expect(await screen.findByText('A loja não está recebendo pedidos agora')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Marmita Tradicional/ }))
    expect(within(screen.getByRole('dialog')).queryByRole('button', { name: /^Adicionar/ })).not.toBeInTheDocument()
  })

  it('produto esgotado não pode ser adicionado', async () => {
    render()
    await userEvent.click(await screen.findByRole('button', { name: /Suco/ }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Esgotado no momento')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /^Adicionar/ })).not.toBeInTheDocument()
  })

  it('loja inexistente mostra mensagem amigável', async () => {
    api.fetchPublicMenu.mockResolvedValue(null)
    render()
    expect(await screen.findByText('Loja não encontrada')).toBeInTheDocument()
  })
})
