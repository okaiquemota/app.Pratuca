import { randomUUID } from 'node:crypto'
import pg from 'pg'

const url = process.env.TEST_DATABASE_URL

/** Os testes de banco só rodam via `npm run test:db` (que sobe um Postgres temporário). */
export const hasDatabase = Boolean(url)

let pool: pg.Pool | undefined

function getPool(): pg.Pool {
  if (!url) throw new Error('TEST_DATABASE_URL não definido. Rode `npm run test:db`.')
  pool ??= new pg.Pool({ connectionString: url, max: 4 })
  return pool
}

export async function closePool(): Promise<void> {
  await pool?.end()
  pool = undefined
}

type Role = 'anon' | 'authenticated' | 'service_role'

/** Executa como superusuário (setup dos testes). */
export async function admin<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await getPool().query<T>(text, params)
  return res.rows
}

/** Executa uma consulta com o papel e o JWT simulados, como o PostgREST faria. */
export async function as<T extends pg.QueryResultRow = pg.QueryResultRow>(
  role: Role,
  userId: string | null,
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const client = await getPool().connect()
  try {
    await client.query('begin')
    const claims = JSON.stringify(userId ? { sub: userId, role } : { role })
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [claims])
    await client.query(`set local role ${role}`)
    const res = await client.query<T>(text, params)
    await client.query('commit')
    return res.rows
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function expectDbError(promise: Promise<unknown>, message: string | RegExp): Promise<void> {
  try {
    await promise
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error)
    if (typeof message === 'string' ? text === message || text.includes(message) : message.test(text)) return
    throw new Error(`Erro inesperado: "${text}" (esperado: ${String(message)})`, { cause: error })
  }
  throw new Error(`Esperava erro ${String(message)}, mas a operação foi concluída.`)
}

export async function createUser(name = 'Pessoa Teste'): Promise<string> {
  const rows = await admin<{ id: string }>(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [`${randomUUID()}@teste.local`, { full_name: name }],
  )
  return rows[0]!.id
}

export function uniqueSlug(prefix = 'loja'): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`
}

export interface TestStore {
  ownerId: string
  storeId: string
  slug: string
}

/** Cria usuário + loja publicada e aberta, pronta para receber pedidos. */
export async function createReadyStore(
  overrides: Record<string, unknown> = {},
): Promise<TestStore> {
  const ownerId = await createUser()
  const slug = uniqueSlug()
  const [store] = await as<{ id: string }>('authenticated', ownerId, `select id from public.create_store($1, $2)`, [
    'Marmitaria Teste',
    slug,
  ])
  const settings: Record<string, unknown> = {
    whatsapp: '5511987654321',
    is_published: true,
    is_open: true,
    delivery_fee_cents: 500,
    payment_methods: '{pix,cash}',
    ...overrides,
  }
  const keys = Object.keys(settings)
  const assignments = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
  await as('authenticated', ownerId, `update public.stores set ${assignments} where id = $1`, [
    store!.id,
    ...keys.map((k) => settings[k]),
  ])
  return { ownerId, storeId: store!.id, slug }
}

export async function createProduct(
  store: TestStore,
  values: { name?: string; price_cents?: number; is_available?: boolean; is_active?: boolean } = {},
): Promise<string> {
  const [row] = await as<{ id: string }>(
    'authenticated',
    store.ownerId,
    `insert into public.products (store_id, name, price_cents, is_available, is_active)
     values ($1, $2, $3, $4, $5) returning id`,
    [
      store.storeId,
      values.name ?? 'Marmita de Frango',
      values.price_cents ?? 1890,
      values.is_available ?? true,
      values.is_active ?? true,
    ],
  )
  return row!.id
}

export interface OrderInput {
  customer?: { name: string; phone: string }
  fulfillment?: 'delivery' | 'pickup'
  address?: Record<string, string> | null
  payment_method?: string
  change_for_cents?: number | null
  notes?: string | null
  expected_total_cents?: number | null
  items: Array<{ product_id: string; quantity: number; notes?: string; option_ids?: string[] }>
  [key: string]: unknown
}

export function orderPayload(input: OrderInput): OrderInput {
  return {
    customer: { name: 'Maria Silva', phone: '11987654321' },
    fulfillment: 'pickup',
    address: null,
    payment_method: 'pix',
    ...input,
  }
}

export interface OrderResult {
  order_id: string
  number: number
  status: string
  subtotal_cents: number
  delivery_fee_cents: number
  total_cents: number
  duplicate: boolean
  items: Array<{ product_name: string; quantity: number; unit_price_cents: number; line_total_cents: number; options: unknown[] }>
}

export async function placeOrder(
  slug: string,
  payload: OrderInput,
  key: string = randomUUID(),
): Promise<OrderResult> {
  const [row] = await as<{ result: OrderResult }>(
    'anon',
    null,
    `select public.create_public_order($1, $2, $3) as result`,
    [slug, key, payload],
  )
  return row!.result
}
