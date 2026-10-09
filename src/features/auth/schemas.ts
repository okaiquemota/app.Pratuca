import { z } from 'zod'

const email = z.string().trim().min(1, 'Informe seu e-mail.').email('E-mail inválido.').max(254)
const password = z
  .string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
  .max(72, 'A senha pode ter no máximo 72 caracteres.')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe sua senha.'),
})
export type LoginValues = z.infer<typeof loginSchema>

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.').max(120, 'Nome muito longo.'),
  email,
  password,
  acceptTerms: z.boolean().refine((v) => v, 'Você precisa aceitar os termos para continuar.'),
})
export type SignupValues = z.infer<typeof signupSchema>

export const forgotSchema = z.object({ email })
export type ForgotValues = z.infer<typeof forgotSchema>

export const resetSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: 'As senhas não conferem.', path: ['confirm'] })
export type ResetValues = z.infer<typeof resetSchema>
