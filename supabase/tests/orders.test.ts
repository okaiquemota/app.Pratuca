import { randomUUID } from 'node:crypto'
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

describe.skipIf(!hasDatabase)('criação de pedidos públicos', () => {
  afterAll(closePool)

  it('calcula subtotal, taxa e total no servidor e grava snapshots', async () => {
    const store = await createReadyStore({ delivery_fee_cents: 500 })
    const frango = await createProduct(store, { name: 'Marmita de Frango', price_cents: 1890 })
    const carne = await createProduct(store, { name: 'Marmita de Carne', price_cents: 2190 })

    const order = await placeOrder(
      store.slug,
      orderPayload({
        fulfillment: 'delivery',
        address: { street: 'Rua das Flores', number: '10', neighborhood: 'Centro' },
        items: [
          { product_id: frango, quantity: 2 },
          { product_id: carne, quantity: 1, notes: 'sem cebola' },
        ],
      }),
    )
    expect(order.subtotal_cents).toBe(1890 * 2 + 2190)
    expect(order.delivery_fee_cents).toBe(500)
    expect(order.total_cents).toBe(1890 * 2 + 2190 + 500)
    expect(order.number).toBe(1)
    expect(order.status).toBe('new')

    // alterar o preço depois não muda o histórico
    await as('authenticated', store.ownerId, `update public.products set price_cents = 9999, name = 'Outro' where id = $1`, [frango])
    const items = await as<{ product_name: string; unit_price_cents: number }>(
      'authenticated',
      store.ownerId,
      `select product_name, unit_price_cents from public.order_items where order_id = $1 order by position`,
      [order.order_id],
    )
    expect(items[0]).toEqual({ product_name: 'Marmita de Frango', unit_price_cents: 1890 })
  })

  it('ignora preços enviados pelo navegador', async () => {
    const store = await createReadyStore()
    const product = await createProduct(store, { price_cents: 1890 })
    const order = await placeOrder(
      store.slug,
      orderPayload({
        subtotal_cents: 1,
        total_cents: 1,
        delivery_fee_cents: 0,
        items: [{ product_id: product, quantity: 1, price_cents: 1, unit_price_cents: 1 } as never],
      }),
    )
    expect(order.total_cents).toBe(1890)
  })

  it('rejeita total esperado divergente (preço mudou ou foi manipulado)', async () => {
    const store = await createReadyStore()
    const product = await createProduct(store, { price_cents: 1890 })
    await expectDbError(
      placeOrder(store.slug, orderPayload({ expected_total_cents: 100, items: [{ product_id: product, quantity: 1 }] })),
      'PRICE_CHANGED',
    )
    const ok = await placeOrder(
      store.slug,
      orderPayload({ expected_total_cents: 1890, items: [{ product_id: product, quantity: 1 }] }),
    )
    expect(ok.total_cents).toBe(1890)
  })

  it('não cobra taxa de entrega em retirada', async () => {
    const store = await createReadyStore({ delivery_fee_cents: 700 })
    const product = await createProduct(store, { price_cents: 2000 })
    const order = await placeOrder(store.slug, orderPayload({ fulfillment: 'pickup', items: [{ product_id: product, quantity: 1 }] }))
    expect(order.delivery_fee_cents).toBe(0)
    expect(order.total_cents).toBe(2000)
  })

  it('é idempotente: reenvio com a mesma chave não duplica o pedido', async () => {
    const store = await createReadyStore()
    const product = await createProduct(store)
    const key = randomUUID()
    const payload = orderPayload({ items: [{ product_id: product, quantity: 1 }] })
    const first = await placeOrder(store.slug, payload, key)
    const second = await placeOrder(store.slug, payload, key)
    const results = await Promise.all([placeOrder(store.slug, payload, key), placeOrder(store.slug, payload, key)])
    expect(second.order_id).toBe(first.order_id)
    expect(second.duplicate).toBe(true)
    expect(results.every((r) => r.order_id === first.order_id)).toBe(true)
    const [{ count }] = (await admin<{ count: string }>('select count(*) from public.orders where store_id = $1', [
      store.storeId,
    ])) as [{ count: string }]
    expect(Number(count)).toBe(1)
  })

  it('pedidos simultâneos recebem números sequenciais únicos', async () => {
    const store = await createReadyStore()
    const product = await createProduct(store)
    const orders = await Promise.all(
      [1, 2, 3, 4].map((i) =>
        placeOrder(
          store.slug,
          orderPayload({ customer: { name: `Cliente ${i}`, phone: `1198765432${i}` }, items: [{ product_id: product, quantity: 1 }] }),
        ),
      ),
    )
    expect(orders.map((o) => o.number).sort()).toEqual([1, 2, 3, 4])
  })

  it('rejeita loja fechada, não publicada ou inexistente', async () => {
    const closed = await createReadyStore({ is_open: false })
    const product = await createProduct(closed)
    await expectDbError(placeOrder(closed.slug, orderPayload({ items: [{ product_id: product, quantity: 1 }] })), 'STORE_CLOSED')

    const draft = await createReadyStore({ is_published: false })
    const p2 = await createProduct(draft)
    await expectDbError(placeOrder(draft.slug, orderPayload({ items: [{ product_id: p2, quantity: 1 }] })), 'STORE_NOT_FOUND')
    await expectDbError(placeOrder('nao-existe-123', orderPayload({ items: [{ product_id: p2, quantity: 1 }] })), 'STORE_NOT_FOUND')
  })

  it('rejeita produto indisponível, desativado ou de outra loja', async () => {
    const store = await createReadyStore()
    const other = await createReadyStore()
    const unavailable = await createProduct(store, { is_available: false })
    const inactive = await createProduct(store, { is_active: false })
    const foreign = await createProduct(other)
    for (const id of [unavailable, inactive, foreign, randomUUID()]) {
      await expectDbError(placeOrder(store.slug, orderPayload({ items: [{ product_id: id, quantity: 1 }] })), 'PRODUCT_UNAVAILABLE')
    }
  })

  it('valida quantidade, carrinho vazio, cliente e endereço', async () => {
    const store = await createReadyStore()
    const product = await createProduct(store)
    const item = (quantity: number) => [{ product_id: product, quantity }]
    await expectDbError(placeOrder(store.slug, orderPayload({ items: item(0) })), 'INVALID_QUANTITY')
    await expectDbError(placeOrder(store.slug, orderPayload({ items: item(100) })), 'INVALID_QUANTITY')
    await expectDbError(placeOrder(store.slug, orderPayload({ items: item(1.5) })), 'INVALID_QUANTITY')
    await expectDbError(placeOrder(store.slug, orderPayload({ items: [] })), 'EMPTY_ORDER')
    await expectDbError(
      placeOrder(store.slug, orderPayload({ customer: { name: 'A', phone: '11987654321' }, items: item(1) })),
      'INVALID_CUSTOMER_NAME',
    )
    await expectDbError(
      placeOrder(store.slug, orderPayload({ customer: { name: 'Ana', phone: '123' }, items: item(1) })),
      'INVALID_CUSTOMER_PHONE',
    )
    await expectDbError(
      placeOrder(store.slug, orderPayload({ fulfillment: 'delivery', address: { street: 'Rua' }, items: item(1) })),
      'INVALID_ADDRESS',
    )
  })

  it('respeita modalidades, formas de pagamento e pedido mínimo da loja', async () => {
    const store = await createReadyStore({ accepts_delivery: false, payment_methods: '{pix}', min_order_cents: 3000 })
    const product = await createProduct(store, { price_cents: 2000 })
    await expectDbError(
      placeOrder(
        store.slug,
        orderPayload({
          fulfillment: 'delivery',
          address: { street: 'Rua', number: '1', neighborhood: 'Centro' },
          items: [{ product_id: product, quantity: 2 }],
        }),
      ),
      'INVALID_FULFILLMENT',
    )
    await expectDbError(
      placeOrder(store.slug, orderPayload({ payment_method: 'cash', items: [{ product_id: product, quantity: 2 }] })),
      'INVALID_PAYMENT_METHOD',
    )
    await expectDbError(
      placeOrder(store.slug, orderPayload({ items: [{ product_id: product, quantity: 1 }] })),
      'BELOW_MINIMUM_ORDER',
    )
    const ok = await placeOrder(store.slug, orderPayload({ items: [{ product_id: product, quantity: 2 }] }))
    expect(ok.total_cents).toBe(4000)
  })

  it('aplica adicionais com preço do servidor e regras mínimo/máximo', async () => {
    const store = await createReadyStore()
    const product = await createProduct(store, { price_cents: 2000 })
    const [group] = await as<{ id: string }>(
      'authenticated',
      store.ownerId,
      `insert into public.product_option_groups (store_id, product_id, name, min_select, max_select)
       values ($1, $2, 'Escolha a carne', 1, 1) returning id`,
      [store.storeId, product],
    )
    const [extras] = await as<{ id: string }>(
      'authenticated',
      store.ownerId,
      `insert into public.product_option_groups (store_id, product_id, name, min_select, max_select)
       values ($1, $2, 'Adicionais', 0, 2) returning id`,
      [store.storeId, product],
    )
    const opt = async (groupId: string, name: string, price: number, available = true) => {
      const [row] = await as<{ id: string }>(
        'authenticated',
        store.ownerId,
        `insert into public.product_options (store_id, group_id, name, price_cents, is_available)
         values ($1, $2, $3, $4, $5) returning id`,
        [store.storeId, groupId, name, price, available],
      )
      return row!.id
    }
    const frango = await opt(group!.id, 'Frango', 0)
    const carne = await opt(group!.id, 'Carne', 300)
    const ovo = await opt(extras!.id, 'Ovo', 200)
    const farofa = await opt(extras!.id, 'Farofa', 150)
    const bacon = await opt(extras!.id, 'Bacon', 400, false)

    const ok = await placeOrder(
      store.slug,
      orderPayload({ items: [{ product_id: product, quantity: 2, option_ids: [carne, ovo] }] }),
    )
    expect(ok.subtotal_cents).toBe((2000 + 300 + 200) * 2)
    expect(ok.items[0]?.options).toHaveLength(2)

    await expectDbError(
      placeOrder(store.slug, orderPayload({ items: [{ product_id: product, quantity: 1, option_ids: [] }] })),
      'INVALID_OPTIONS',
    )
    await expectDbError(
      placeOrder(store.slug, orderPayload({ items: [{ product_id: product, quantity: 1, option_ids: [frango, carne] }] })),
      'INVALID_OPTIONS',
    )
    await expectDbError(
      placeOrder(
        store.slug,
        orderPayload({ items: [{ product_id: product, quantity: 1, option_ids: [frango, ovo, farofa, bacon] }] }),
      ),
      'OPTION_UNAVAILABLE',
    )
    const other = await createProduct(store)
    await expectDbError(
      placeOrder(store.slug, orderPayload({ items: [{ product_id: other, quantity: 1, option_ids: [frango] }] })),
      'OPTION_UNAVAILABLE',
    )
  })

  it('cardápio do dia limita produtos e sobrescreve preços', async () => {
    const store = await createReadyStore()
    const inMenu = await createProduct(store, { name: 'Feijoada', price_cents: 2500 })
    const outMenu = await createProduct(store, { name: 'Strogonoff', price_cents: 2300 })
    const [menu] = await as<{ id: string }>(
      'authenticated',
      store.ownerId,
      `insert into public.daily_menus (store_id, menu_date, title)
       values ($1, (now() at time zone 'America/Sao_Paulo')::date, 'Sexta da feijoada') returning id`,
      [store.storeId],
    )
    await as(
      'authenticated',
      store.ownerId,
      `insert into public.daily_menu_items (daily_menu_id, store_id, product_id, price_cents) values ($1, $2, $3, 2200)`,
      [menu!.id, store.storeId, inMenu],
    )
    const [{ menu: publicMenu }] = (await as<{ menu: { products: Array<{ id: string; price_cents: number }> } }>(
      'anon',
      null,
      `select public.get_public_menu($1) as menu`,
      [store.slug],
    )) as [{ menu: { products: Array<{ id: string; price_cents: number }> } }]
    expect(publicMenu.products.map((p) => [p.id, p.price_cents])).toEqual([[inMenu, 2200]])

    const order = await placeOrder(store.slug, orderPayload({ items: [{ product_id: inMenu, quantity: 1 }] }))
    expect(order.total_cents).toBe(2200)
    await expectDbError(
      placeOrder(store.slug, orderPayload({ items: [{ product_id: outMenu, quantity: 1 }] })),
      'PRODUCT_UNAVAILABLE',
    )
  })

  it('limita pedidos repetidos do mesmo telefone (anti-spam)', async () => {
    const store = await createReadyStore()
    const product = await createProduct(store)
    for (let i = 0; i < 5; i++) {
      await placeOrder(store.slug, orderPayload({ items: [{ product_id: product, quantity: 1 }] }))
    }
    await expectDbError(placeOrder(store.slug, orderPayload({ items: [{ product_id: product, quantity: 1 }] })), 'RATE_LIMITED')
  })

  it('registra o cliente uma vez por telefone e conta os pedidos', async () => {
    const store = await createReadyStore()
    const product = await createProduct(store)
    await placeOrder(store.slug, orderPayload({ items: [{ product_id: product, quantity: 1 }] }))
    await placeOrder(
      store.slug,
      orderPayload({ customer: { name: 'Maria S.', phone: '(11) 98765-4321' }, items: [{ product_id: product, quantity: 1 }] }),
    )
    const customers = await as<{ name: string; phone: string; orders_count: number }>(
      'authenticated',
      store.ownerId,
      'select name, phone, orders_count from public.customers',
    )
    expect(customers).toEqual([{ name: 'Maria S.', phone: '11987654321', orders_count: 2 }])
  })

  it('cardápio público não expõe dados privados', async () => {
    const store = await createReadyStore()
    const product = await createProduct(store)
    await placeOrder(
      store.slug,
      orderPayload({ customer: { name: 'Maria Silva', phone: '21999990000' }, items: [{ product_id: product, quantity: 1 }] }),
    )
    const [{ menu }] = (await as<{ menu: unknown }>('anon', null, `select public.get_public_menu($1) as menu`, [
      store.slug,
    ])) as [{ menu: unknown }]
    const text = JSON.stringify(menu)
    expect(text).not.toContain(store.ownerId)
    expect(text).not.toContain(store.storeId)
    expect(text).not.toContain('Maria Silva')
    expect(text).not.toContain('21999990000')
    expect(text).not.toContain('owner_id')
  })

  it('loja não publicada só aparece em prévia para membros', async () => {
    const store = await createReadyStore({ is_published: false })
    const [{ menu: anonMenu }] = (await as<{ menu: unknown }>('anon', null, `select public.get_public_menu($1) as menu`, [
      store.slug,
    ])) as [{ menu: unknown }]
    expect(anonMenu).toBeNull()
    const [{ menu: ownerMenu }] = (await as<{ menu: { preview: boolean } }>(
      'authenticated',
      store.ownerId,
      `select public.get_public_menu($1) as menu`,
      [store.slug],
    )) as [{ menu: { preview: boolean } }]
    expect(ownerMenu.preview).toBe(true)
  })
})
