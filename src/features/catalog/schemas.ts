import { z } from 'zod'
import { moneySchema } from '@/features/stores/schemas'

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da categoria.').max(60, 'Máximo de 60 caracteres.'),
})
export type CategoryValues = z.infer<typeof categorySchema>

const optionSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Informe o nome da opção.').max(60, 'Máximo de 60 caracteres.'),
  price: moneySchema({ required: false, max: 1000 }),
  is_available: z.boolean(),
})

const groupSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(1, 'Informe o nome do grupo.').max(60, 'Máximo de 60 caracteres.'),
    min_select: z.number({ message: 'Informe um número.' }).int().min(0).max(10),
    max_select: z.number({ message: 'Informe um número.' }).int().min(1, 'Mínimo 1.').max(20),
    options: z.array(optionSchema).min(1, 'Adicione pelo menos uma opção.').max(30),
  })
  .refine((g) => g.min_select <= g.max_select, { message: 'O mínimo não pode ser maior que o máximo.', path: ['min_select'] })
  .refine((g) => g.min_select <= g.options.length, {
    message: 'O mínimo é maior que a quantidade de opções.',
    path: ['min_select'],
  })

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do produto (mínimo 2 caracteres).').max(80, 'Máximo de 80 caracteres.'),
  description: z.string().trim().max(300, 'Máximo de 300 caracteres.'),
  price: moneySchema({ required: true, max: 1000, label: 'o preço' }),
  category_id: z.string(),
  is_available: z.boolean(),
  is_active: z.boolean(),
  option_groups: z.array(groupSchema).max(10),
})
export type ProductValues = z.infer<typeof productSchema>
