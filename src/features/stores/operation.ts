import { centsToInput, parseMoneyToCents } from '@/lib/format'
import { formatPhone, toWhatsappNumber } from '@/lib/phone'
import type { StoreRow, StoreUpdate } from '@/types/database'
import type { OperationValues } from './schemas'

export function operationDefaults(store: StoreRow): OperationValues {
  return {
    whatsapp: store.whatsapp ? formatPhone(store.whatsapp) : '',
    accepts_delivery: store.accepts_delivery,
    accepts_pickup: store.accepts_pickup,
    delivery_fee: store.delivery_fee_cents ? centsToInput(store.delivery_fee_cents) : '',
    min_order: centsToInput(store.min_order_cents),
    payment_methods: store.payment_methods,
  }
}

export function operationToUpdate(values: OperationValues): StoreUpdate {
  return {
    whatsapp: toWhatsappNumber(values.whatsapp),
    accepts_delivery: values.accepts_delivery,
    accepts_pickup: values.accepts_pickup,
    delivery_fee_cents: values.accepts_delivery ? (parseMoneyToCents(values.delivery_fee) ?? 0) : 0,
    min_order_cents: values.min_order ? parseMoneyToCents(values.min_order) : null,
    payment_methods: values.payment_methods,
  }
}
