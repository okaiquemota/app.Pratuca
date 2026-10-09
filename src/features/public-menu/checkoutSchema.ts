import { z } from 'zod'
import { moneySchema } from '@/features/stores/schemas'
import { normalizeBrazilianPhone } from '@/lib/phone'

export const checkoutSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe seu nome.').max(80, 'Máximo de 80 caracteres.'),
    phone: z.string().trim().refine((v) => normalizeBrazilianPhone(v) !== null, 'Informe um telefone com DDD.'),
    fulfillment: z.enum(['delivery', 'pickup'], { message: 'Escolha entrega ou retirada.' }),
    street: z.string().trim().max(120),
    number: z.string().trim().max(20),
    complement: z.string().trim().max(60),
    neighborhood: z.string().trim().max(60),
    reference: z.string().trim().max(120),
    payment_method: z.string().min(1, 'Escolha a forma de pagamento.'),
    change_for: moneySchema({ required: false, max: 10000 }),
    notes: z.string().trim().max(500, 'Máximo de 500 caracteres.'),
  })
  .superRefine((v, ctx) => {
    if (v.fulfillment !== 'delivery') return
    if (!v.street) ctx.addIssue({ code: 'custom', path: ['street'], message: 'Informe a rua.' })
    if (!v.number) ctx.addIssue({ code: 'custom', path: ['number'], message: 'Informe o número.' })
    if (!v.neighborhood) ctx.addIssue({ code: 'custom', path: ['neighborhood'], message: 'Informe o bairro.' })
  })

export type CheckoutValues = z.infer<typeof checkoutSchema>
