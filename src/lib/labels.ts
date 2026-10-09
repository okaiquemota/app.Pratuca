import type { FulfillmentType, PaymentMethod } from '@/types/database'

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  meal_voucher: 'Vale-refeição',
}

export const PAYMENT_METHODS: PaymentMethod[] = ['pix', 'cash', 'credit_card', 'debit_card', 'meal_voucher']

export const FULFILLMENT_LABEL: Record<FulfillmentType, string> = {
  delivery: 'Entrega',
  pickup: 'Retirada',
}

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const
export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const
