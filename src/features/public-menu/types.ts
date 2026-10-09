import type { PaymentMethod } from '@/types/database'

/** Formato retornado por public.get_public_menu (somente dados públicos). */
export interface PublicOption {
  id: string
  name: string
  price_cents: number
  is_available: boolean
}

export interface PublicOptionGroup {
  id: string
  name: string
  min_select: number
  max_select: number
  options: PublicOption[]
}

export interface PublicProduct {
  id: string
  category_id: string | null
  name: string
  description: string | null
  price_cents: number
  image_path: string | null
  is_available: boolean
  option_groups: PublicOptionGroup[]
}

export interface OpeningHour {
  day: number
  open: string
  close: string
}

export interface PublicStore {
  slug: string
  name: string
  description: string | null
  welcome_message: string | null
  logo_path: string | null
  whatsapp: string | null
  phone: string | null
  address: string | null
  timezone: string
  opening_hours: OpeningHour[]
  accepts_delivery: boolean
  accepts_pickup: boolean
  delivery_fee_cents: number
  min_order_cents: number | null
  payment_methods: PaymentMethod[]
  is_open: boolean
  is_published: boolean
  accepting_orders: boolean
}

export interface PublicMenu {
  store: PublicStore
  preview: boolean
  daily_menu: { date: string; title: string | null; note: string | null } | null
  categories: Array<{ id: string; name: string }>
  products: PublicProduct[]
}

/** Resumo retornado por public.create_public_order. */
export interface PlacedOrder {
  order_id: string
  number: number
  status: string
  created_at: string
  customer_name: string
  fulfillment: 'delivery' | 'pickup'
  delivery_address: {
    street: string | null
    number: string | null
    complement: string | null
    neighborhood: string | null
    reference: string | null
  } | null
  payment_method: PaymentMethod
  change_for_cents: number | null
  notes: string | null
  subtotal_cents: number
  delivery_fee_cents: number
  total_cents: number
  duplicate: boolean
  store: { name: string; slug: string; whatsapp: string | null }
  items: Array<{
    product_name: string
    quantity: number
    unit_price_cents: number
    options_unit_cents: number
    options: Array<{ group_name: string; name: string; price_cents: number }>
    line_total_cents: number
    notes: string | null
  }>
}
