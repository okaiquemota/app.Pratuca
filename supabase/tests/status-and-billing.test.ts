import { afterAll, describe, expect, it } from 'vitest'
import {
  admin,
  as,
  closePool,
  createProduct,
  createReadyStore,
  expectDbError,
  hasDatabase,
  orderPayload,
  placeOrder,
} from './helpers'

async function newOrder(fulfillment: 'pickup' | 'delivery' = 'pickup') {
  const store = await createReadyStore()
  const product = await createProduct(store)
  const order = await placeOrder(
    store.slug,
    orderPayload({
      fulfillment,
      address: fulfillment === 'delivery' ? { street: 'Rua A', number: '1', neighborhood: 'Centro' } : null,
      items: [{ product_id: product, quantity: 1 }],
    }),
  )
  const setStatus = (status: string) =>
    as<{ status: string }>('authenticated', store.ownerId, `select (public.update_order_status($1, $2)).status`, [
      order.order_id,
      status,
    ])
  return { store, order, setStatus }
}

describe.skipIf(!hasDatabase)('transições de status', () => {
  afterAll(closePool)

  it('segue o fluxo completo de entrega e registra o histórico', async () => {
    const { store, order, setStatus } = await newOrder('delivery')
    for (const s of ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed']) {
      await setStatus(s)
    }
    const history = await as<{ from_status: string | null; to_status: string }>(
      'authenticated',
      store.ownerId,
      'select from_status, to_status from public.order_status_history where order_id = $1 order by id',
      [order.order_id],
    )
    expect(history.map((h) => h.to_status)).toEqual([
      'new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed',
    ])
    expect(history[1]?.from_status).toBe('new')
  })

  it('permite pular etapas para frente, mas não voltar', async () => {
    const { setStatus } = await newOrder()
    await setStatus('preparing')
    await expectDbError(setStatus('confirmed'), 'INVALID_STATUS_TRANSITION')
    await expectDbError(setStatus('preparing'), 'INVALID_STATUS_TRANSITION')
  })

  it('não permite "saiu para entrega" em pedido de retirada', async () => {
    const { setStatus } = await newOrder('pickup')
    await expectDbError(setStatus('out_for_delivery'), 'INVALID_STATUS_TRANSITION')
    await setStatus('ready')
    await setStatus('completed')
  })

  it('status finais não mudam', async () => {
    const a = await newOrder()
    await a.setStatus('canceled')
    await expectDbError(a.setStatus('confirmed'), 'INVALID_STATUS_TRANSITION')
    const b = await newOrder()
    await b.setStatus('completed')
    await expectDbError(b.setStatus('canceled'), 'INVALID_STATUS_TRANSITION')
  })
})

describe.skipIf(!hasDatabase)('assinatura e acesso', () => {
  it('teste vencido bloqueia novos pedidos, mas não apaga dados', async () => {
    const store = await createReadyStore()
    const product = await createProduct(store)
    await admin(`update public.subscriptions set trial_ends_at = now() - interval '1 minute' where store_id = $1`, [
      store.storeId,
    ])
    await expectDbError(
      placeOrder(store.slug, orderPayload({ items: [{ product_id: product, quantity: 1 }] })),
      'STORE_UNAVAILABLE',
    )
    const products = await as('authenticated', store.ownerId, 'select id from public.products')
    expect(products).toHaveLength(1)
    const [{ menu }] = (await as<{ menu: { store: { accepting_orders: boolean } } }>(
      'anon',
      null,
      'select public.get_public_menu($1) as menu',
      [store.slug],
    )) as [{ menu: { store: { accepting_orders: boolean } } }]
    expect(menu.store.accepting_orders).toBe(false)
  })

  it('evento de cobrança (service_role) ativa a assinatura de forma idempotente', async () => {
    const store = await createReadyStore()
    const call = () =>
      as<{ applied: boolean }>(
        'service_role',
        null,
        `select public.apply_subscription_event('gateway', 'evt_1_' || $1, 'subscription.paid', $1::uuid, 'active',
           now(), now() + interval '30 days', 'cus_1', 'sub_' || $1, false, '{}') as applied`,
        [store.storeId],
      )
    expect((await call())[0]?.applied).toBe(true)
    expect((await call())[0]?.applied).toBe(false)
    const [{ ok }] = (await as<{ ok: boolean }>('authenticated', store.ownerId, 'select public.get_store_access($1) as ok', [
      store.storeId,
    ])) as [{ ok: boolean }]
    expect(ok).toBe(true)
    const [sub] = await admin<{ status: string }>('select status from public.subscriptions where store_id = $1', [store.storeId])
    expect(sub?.status).toBe('active')
  })

  it('assinatura vencida além da carência bloqueia pedidos', async () => {
    const store = await createReadyStore()
    const product = await createProduct(store)
    await admin(
      `update public.subscriptions set status = 'past_due', current_period_end = now() - interval '4 days' where store_id = $1`,
      [store.storeId],
    )
    await expectDbError(
      placeOrder(store.slug, orderPayload({ items: [{ product_id: product, quantity: 1 }] })),
      'STORE_UNAVAILABLE',
    )
  })

  it('anonimização remove dados pessoais do cliente e preserva o pedido', async () => {
    const store = await createReadyStore()
    const product = await createProduct(store)
    const order = await placeOrder(
      store.slug,
      orderPayload({
        fulfillment: 'delivery',
        address: { street: 'Rua A', number: '1', neighborhood: 'Centro' },
        items: [{ product_id: product, quantity: 1 }],
      }),
    )
    const [customer] = await as<{ id: string }>('authenticated', store.ownerId, 'select id from public.customers')
    await as('authenticated', store.ownerId, 'select public.anonymize_customer($1)', [customer!.id])
    const [row] = await as<{ customer_name: string; customer_phone: string | null; delivery_address: unknown; total_cents: number }>(
      'authenticated',
      store.ownerId,
      'select customer_name, customer_phone, delivery_address, total_cents from public.orders where id = $1',
      [order.order_id],
    )
    expect(row).toEqual({
      customer_name: 'Cliente removido',
      customer_phone: null,
      delivery_address: null,
      total_cents: order.total_cents,
    })
  })
})
