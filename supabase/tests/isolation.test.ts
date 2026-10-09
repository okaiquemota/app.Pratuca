import { afterAll, describe, expect, it } from 'vitest'
import {
  admin,
  as,
  closePool,
  createProduct,
  createReadyStore,
  createUser,
  expectDbError,
  hasDatabase,
  orderPayload,
  placeOrder,
  uniqueSlug,
} from './helpers'

describe.skipIf(!hasDatabase)('isolamento entre lojas (RLS)', () => {
  afterAll(closePool)

  it('cria perfil, vínculo de proprietário e assinatura em teste ao criar a loja', async () => {
    const store = await createReadyStore()
    const profile = await as('authenticated', store.ownerId, 'select * from public.profiles')
    expect(profile).toHaveLength(1)
    const members = await as<{ role: string }>('authenticated', store.ownerId, 'select role from public.store_members')
    expect(members).toEqual([{ role: 'owner' }])
    const [sub] = await as<{ status: string; plan_code: string; days: number }>(
      'authenticated',
      store.ownerId,
      `select status, plan_code, round(extract(epoch from trial_ends_at - now()) / 86400)::int as days
       from public.subscriptions`,
    )
    expect(sub).toEqual({ status: 'trialing', plan_code: 'essencial', days: 7 })
  })

  it('um usuário não vê lojas, produtos, clientes nem pedidos de outra loja', async () => {
    const a = await createReadyStore()
    const b = await createReadyStore()
    const productB = await createProduct(b)
    await placeOrder(b.slug, orderPayload({ items: [{ product_id: productB, quantity: 1 }] }))

    for (const table of ['stores', 'products', 'customers', 'orders', 'order_items', 'subscriptions', 'store_members']) {
      const rows = await as<{ store_id?: string; id?: string }>('authenticated', a.ownerId, `select * from public.${table}`)
      const ids = rows.map((r) => r.store_id ?? r.id)
      expect(ids, table).not.toContain(b.storeId)
    }
  })

  it('não permite inserir produto em outra loja', async () => {
    const a = await createReadyStore()
    const b = await createReadyStore()
    await expectDbError(
      as('authenticated', a.ownerId, `insert into public.products (store_id, name, price_cents) values ($1, 'Invasor', 100)`, [
        b.storeId,
      ]),
      /row-level security/,
    )
  })

  it('não permite alterar ou excluir produto de outra loja (nenhuma linha afetada)', async () => {
    const a = await createReadyStore()
    const b = await createReadyStore()
    const productB = await createProduct(b, { price_cents: 1890 })
    await as('authenticated', a.ownerId, `update public.products set price_cents = 1 where id = $1`, [productB])
    await as('authenticated', a.ownerId, `delete from public.products where id = $1`, [productB])
    const [row] = await admin<{ price_cents: number }>('select price_cents from public.products where id = $1', [productB])
    expect(row?.price_cents).toBe(1890)
  })

  it('não permite mover produto próprio para a loja de outra pessoa', async () => {
    const a = await createReadyStore()
    const b = await createReadyStore()
    const productA = await createProduct(a)
    await expectDbError(
      as('authenticated', a.ownerId, `update public.products set store_id = $2 where id = $1`, [productA, b.storeId]),
      /row-level security|violates foreign key/,
    )
  })

  it('não permite usar categoria de outra loja (chave estrangeira composta)', async () => {
    const a = await createReadyStore()
    const b = await createReadyStore()
    const [catB] = await as<{ id: string }>(
      'authenticated',
      b.ownerId,
      `insert into public.categories (store_id, name) values ($1, 'Marmitas') returning id`,
      [b.storeId],
    )
    await expectDbError(
      as('authenticated', a.ownerId, `insert into public.products (store_id, category_id, name, price_cents) values ($1, $2, 'Xis', 100)`, [
        a.storeId,
        catB!.id,
      ]),
      /foreign key/,
    )
  })

  it('não permite alterar status de pedido de outra loja', async () => {
    const a = await createReadyStore()
    const b = await createReadyStore()
    const productB = await createProduct(b)
    const order = await placeOrder(b.slug, orderPayload({ items: [{ product_id: productB, quantity: 1 }] }))
    await expectDbError(
      as('authenticated', a.ownerId, `select public.update_order_status($1, 'confirmed')`, [order.order_id]),
      'ORDER_NOT_FOUND',
    )
  })

  it('cliente autenticado não altera pedidos diretamente (sem UPDATE/INSERT/DELETE)', async () => {
    const a = await createReadyStore()
    const product = await createProduct(a)
    const order = await placeOrder(a.slug, orderPayload({ items: [{ product_id: product, quantity: 1 }] }))
    await expectDbError(
      as('authenticated', a.ownerId, `update public.orders set total_cents = 1 where id = $1`, [order.order_id]),
      /permission denied/,
    )
    await expectDbError(
      as('authenticated', a.ownerId, `delete from public.orders where id = $1`, [order.order_id]),
      /permission denied/,
    )
  })

  it('proprietário não altera owner_id nem o contador de pedidos da loja', async () => {
    const a = await createReadyStore()
    const other = await createUser()
    await expectDbError(
      as('authenticated', a.ownerId, `update public.stores set owner_id = $2 where id = $1`, [a.storeId, other]),
      /permission denied/,
    )
    await expectDbError(
      as('authenticated', a.ownerId, `update public.stores set last_order_number = 0 where id = $1`, [a.storeId]),
      /permission denied/,
    )
  })

  it('membro não altera a própria assinatura', async () => {
    const a = await createReadyStore()
    await expectDbError(
      as('authenticated', a.ownerId, `update public.subscriptions set status = 'active'`),
      /permission denied/,
    )
    await expectDbError(
      as(
        'authenticated',
        a.ownerId,
        `select public.apply_subscription_event('x','e1','t',$1,'active',null,null,null,null,null,'{}')`,
        [a.storeId],
      ),
      /permission denied/,
    )
  })

  it('anon não acessa nenhuma tabela diretamente', async () => {
    for (const table of ['stores', 'products', 'customers', 'orders', 'subscriptions', 'profiles']) {
      await expectDbError(as('anon', null, `select * from public.${table}`), /permission denied/)
    }
    const plans = await as('anon', null, 'select code, price_cents from public.plans')
    expect(plans).toEqual([{ code: 'essencial', price_cents: 3990 }])
  })

  it('slug é único e validado no banco', async () => {
    const a = await createReadyStore()
    const userB = await createUser()
    await expectDbError(
      as('authenticated', userB, `select public.create_store('Outra', $1)`, [a.slug]),
      'SLUG_TAKEN',
    )
    await expectDbError(as('authenticated', userB, `select public.create_store('Outra', 'Com Espaço')`), 'INVALID_SLUG')
    await expectDbError(as('authenticated', userB, `select public.create_store('Outra', 'admin')`), 'INVALID_SLUG')
    const [{ available }] = (await as<{ available: boolean }>(
      'authenticated',
      userB,
      `select public.is_slug_available($1) as available`,
      [a.slug],
    )) as [{ available: boolean }]
    expect(available).toBe(false)
    const [{ free }] = (await as<{ free: boolean }>('authenticated', userB, `select public.is_slug_available($1) as free`, [
      uniqueSlug(),
    ])) as [{ free: boolean }]
    expect(free).toBe(true)
  })

  it('um usuário possui apenas uma loja no MVP', async () => {
    const a = await createReadyStore()
    await expectDbError(
      as('authenticated', a.ownerId, `select public.create_store('Segunda', $1)`, [uniqueSlug()]),
      'STORE_ALREADY_EXISTS',
    )
  })

  it('storage: membro só grava na pasta da própria loja', async () => {
    const a = await createReadyStore()
    const b = await createReadyStore()
    await as(
      'authenticated',
      a.ownerId,
      `insert into storage.objects (bucket_id, name) values ('store-media', $1)`,
      [`${a.storeId}/produtos/foto.webp`],
    )
    await expectDbError(
      as('authenticated', a.ownerId, `insert into storage.objects (bucket_id, name) values ('store-media', $1)`, [
        `${b.storeId}/produtos/foto.webp`,
      ]),
      /row-level security/,
    )
  })
})
