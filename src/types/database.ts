/**
 * Tipos do banco no formato gerado por `supabase gen types typescript`.
 * Escritos à mão a partir das migrações em supabase/migrations.
 * Ao alterar o schema, regenere com:
 *   npx supabase gen types typescript --project-id <ref> --schema public > src/types/database.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type OrderStatus = 'new' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'canceled'
export type FulfillmentType = 'delivery' | 'pickup'
export type PaymentMethod = 'pix' | 'cash' | 'credit_card' | 'debit_card' | 'meal_voucher'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'pending'
export type MemberRole = 'owner' | 'staff'

type Timestamps = { created_at: string; updated_at: string }

export type StoreRow = Timestamps & {
  id: string
  owner_id: string
  name: string
  slug: string
  description: string | null
  welcome_message: string | null
  logo_path: string | null
  phone: string | null
  whatsapp: string | null
  address: string | null
  timezone: string
  opening_hours: Json
  accepts_delivery: boolean
  accepts_pickup: boolean
  delivery_fee_cents: number
  min_order_cents: number | null
  payment_methods: PaymentMethod[]
  is_open: boolean
  is_published: boolean
  onboarding_step: number
  onboarding_completed_at: string | null
  last_order_number: number
}

export type StoreUpdate = Partial<
  Pick<
    StoreRow,
    | 'name'
    | 'slug'
    | 'description'
    | 'welcome_message'
    | 'logo_path'
    | 'phone'
    | 'whatsapp'
    | 'address'
    | 'timezone'
    | 'opening_hours'
    | 'accepts_delivery'
    | 'accepts_pickup'
    | 'delivery_fee_cents'
    | 'min_order_cents'
    | 'payment_methods'
    | 'is_open'
    | 'is_published'
    | 'onboarding_step'
    | 'onboarding_completed_at'
  >
>

export type CategoryRow = Timestamps & {
  id: string
  store_id: string
  name: string
  position: number
  is_active: boolean
}

export type ProductRow = Timestamps & {
  id: string
  store_id: string
  category_id: string | null
  name: string
  description: string | null
  price_cents: number
  image_path: string | null
  is_active: boolean
  is_available: boolean
  position: number
}

export type OptionGroupRow = Timestamps & {
  id: string
  store_id: string
  product_id: string
  name: string
  min_select: number
  max_select: number
  position: number
}

export type OptionRow = Timestamps & {
  id: string
  store_id: string
  group_id: string
  name: string
  price_cents: number
  is_available: boolean
  position: number
}

export type DailyMenuRow = Timestamps & {
  id: string
  store_id: string
  menu_date: string
  title: string | null
  note: string | null
  is_published: boolean
}

export type DailyMenuItemRow = {
  daily_menu_id: string
  store_id: string
  product_id: string
  price_cents: number | null
  is_available: boolean
  position: number
  created_at: string
}

export type CustomerRow = Timestamps & {
  id: string
  store_id: string
  name: string
  phone: string
  orders_count: number
  last_order_at: string | null
}

export type DeliveryAddress = {
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  reference: string | null
}

export type OrderRow = Timestamps & {
  id: string
  store_id: string
  number: number
  customer_id: string | null
  customer_name: string
  customer_phone: string | null
  fulfillment: FulfillmentType
  delivery_address: Json | null
  payment_method: PaymentMethod
  change_for_cents: number | null
  notes: string | null
  subtotal_cents: number
  delivery_fee_cents: number
  total_cents: number
  status: OrderStatus
  status_updated_at: string
  idempotency_key: string
  daily_menu_id: string | null
}

export type OrderItemOptionSnapshot = {
  group_name: string
  name: string
  price_cents: number
}

export type OrderItemRow = {
  id: string
  order_id: string
  store_id: string
  product_id: string | null
  product_name: string
  unit_price_cents: number
  options: Json
  options_unit_cents: number
  quantity: number
  line_total_cents: number
  notes: string | null
  position: number
  created_at: string
}

export type OrderStatusHistoryRow = {
  id: number
  order_id: string
  store_id: string
  from_status: OrderStatus | null
  to_status: OrderStatus
  changed_by: string | null
  created_at: string
}

export type SubscriptionRow = Timestamps & {
  id: string
  store_id: string
  plan_code: string
  status: SubscriptionStatus
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
  provider: string | null
  provider_customer_id: string | null
  provider_subscription_id: string | null
}

export type PlanRow = {
  code: string
  name: string
  price_cents: number
  currency: string
  billing_interval: 'month' | 'year'
  trial_days: number
  is_active: boolean
  created_at: string
}

export type ProfileRow = Timestamps & {
  id: string
  full_name: string | null
}

export type StoreMemberRow = {
  store_id: string
  user_id: string
  role: MemberRole
  created_at: string
}

type Table<Row, Insert, Update> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

type CatalogInsert<Row> = Partial<Omit<Row, 'store_id'>> & { store_id: string }

export type Database = {
  public: {
    Tables: {
      plans: Table<PlanRow, never, never>
      profiles: Table<ProfileRow, never, { full_name?: string | null }>
      stores: Table<StoreRow, never, StoreUpdate>
      store_members: Table<StoreMemberRow, never, never>
      subscriptions: Table<SubscriptionRow, never, never>
      categories: Table<CategoryRow, CatalogInsert<CategoryRow> & { name: string }, Partial<CategoryRow>>
      products: Table<ProductRow, CatalogInsert<ProductRow> & { name: string; price_cents: number }, Partial<ProductRow>>
      product_option_groups: Table<
        OptionGroupRow,
        CatalogInsert<OptionGroupRow> & { product_id: string; name: string },
        Partial<OptionGroupRow>
      >
      product_options: Table<OptionRow, CatalogInsert<OptionRow> & { group_id: string; name: string }, Partial<OptionRow>>
      daily_menus: Table<DailyMenuRow, CatalogInsert<DailyMenuRow> & { menu_date: string }, Partial<DailyMenuRow>>
      daily_menu_items: Table<
        DailyMenuItemRow,
        CatalogInsert<DailyMenuItemRow> & { daily_menu_id: string; product_id: string },
        Partial<DailyMenuItemRow>
      >
      customers: Table<CustomerRow, never, never>
      orders: Table<OrderRow, never, never>
      order_items: Table<OrderItemRow, never, never>
      order_status_history: Table<OrderStatusHistoryRow, never, never>
    }
    Views: { [_ in never]: never }
    Functions: {
      create_store: { Args: { p_name: string; p_slug: string }; Returns: StoreRow }
      is_slug_available: { Args: { p_slug: string }; Returns: boolean }
      get_store_access: { Args: { p_store_id: string }; Returns: boolean }
      get_public_menu: { Args: { p_slug: string }; Returns: Json }
      create_public_order: {
        Args: { p_slug: string; p_idempotency_key: string; p_order: Json }
        Returns: Json
      }
      update_order_status: { Args: { p_order_id: string; p_status: OrderStatus }; Returns: OrderRow }
      anonymize_customer: { Args: { p_customer_id: string }; Returns: undefined }
    }
    Enums: {
      order_status: OrderStatus
      fulfillment_type: FulfillmentType
      payment_method: PaymentMethod
      subscription_status: SubscriptionStatus
      member_role: MemberRole
    }
    CompositeTypes: { [_ in never]: never }
  }
}
