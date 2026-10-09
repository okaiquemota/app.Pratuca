import { z } from 'zod'
import { normalizeBrazilianPhone } from '@/lib/phone'
import { parseMoneyToCents } from '@/lib/format'
import { PAYMENT_METHODS } from '@/lib/labels'
import type { PaymentMethod } from '@/types/database'
import { isValidSlug, RESERVED_SLUGS } from './slug'

export const storeNameSchema = z.string().trim().min(2, 'Informe o nome do seu negócio.').max(80, 'Máximo de 80 caracteres.')

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Use pelo menos 3 caracteres.')
  .max(48, 'Máximo de 48 caracteres.')
  .refine((s) => !RESERVED_SLUGS.has(s), 'Este endereço é reservado. Escolha outro.')
  .refine(isValidSlug, 'Use apenas letras minúsculas, números e hífens, sem hífen no início ou no fim.')

export const requiredPhoneSchema = z
  .string()
  .trim()
  .refine((v) => normalizeBrazilianPhone(v) !== null, 'Informe um número com DDD, ex.: (11) 98765-4321.')

export const optionalPhoneSchema = z
  .string()
  .trim()
  .refine((v) => v === '' || normalizeBrazilianPhone(v) !== null, 'Informe um número com DDD.')

/** Campo monetário de formulário (string "18,90") */
export function moneySchema({ min = 0, max = 1000, required = true, label = 'Valor' } = {}) {
  return z.string().trim().superRefine((value, ctx) => {
    if (value === '') {
      if (required) ctx.addIssue({ code: 'custom', message: `Informe ${label.toLowerCase()}.` })
      return
    }
    const cents = parseMoneyToCents(value)
    if (cents === null) ctx.addIssue({ code: 'custom', message: 'Valor inválido. Ex.: 18,90' })
    else if (cents < min * 100) ctx.addIssue({ code: 'custom', message: `O valor mínimo é R$ ${min.toFixed(2).replace('.', ',')}.` })
    else if (cents > max * 100) ctx.addIssue({ code: 'custom', message: `O valor máximo é R$ ${max.toLocaleString('pt-BR')}.` })
  })
}

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido')

export const openingHoursSchema = z
  .array(z.object({ day: z.number().int().min(0).max(6), open: timeSchema, close: timeSchema }))
  .max(21)

export const operationSchema = z
  .object({
    whatsapp: requiredPhoneSchema,
    accepts_delivery: z.boolean(),
    accepts_pickup: z.boolean(),
    delivery_fee: moneySchema({ required: false, max: 1000, label: 'Taxa de entrega' }),
    min_order: moneySchema({ required: false, max: 10000, label: 'Pedido mínimo' }),
    payment_methods: z.array(z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]])).min(1, 'Escolha ao menos uma forma de pagamento.'),
  })
  .refine((v) => v.accepts_delivery || v.accepts_pickup, {
    message: 'Escolha entrega, retirada ou ambos.',
    path: ['accepts_pickup'],
  })

export type OperationValues = z.infer<typeof operationSchema>

export const storeProfileSchema = z.object({
  name: storeNameSchema,
  slug: slugSchema,
  description: z.string().trim().max(500, 'Máximo de 500 caracteres.'),
  welcome_message: z.string().trim().max(280, 'Máximo de 280 caracteres.'),
  phone: optionalPhoneSchema,
  address: z.string().trim().max(200, 'Máximo de 200 caracteres.'),
})
export type StoreProfileValues = z.infer<typeof storeProfileSchema>
