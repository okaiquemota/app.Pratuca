import { env } from '@/lib/env'
import { getSupabase } from '@/lib/supabase'

export async function signIn(email: string, password: string) {
  const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
}

/** Retorna `needsConfirmation` quando o projeto exige confirmar o e-mail. */
export async function signUp(input: { name: string; email: string; password: string }): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await getSupabase().auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: { full_name: input.name.trim() },
      emailRedirectTo: `${env.siteUrl}/app/comecar`,
    },
  })
  if (error) throw error
  // Quando o e-mail já existe e a confirmação está ativa, o Supabase devolve
  // um usuário sem identidades (para não revelar contas existentes).
  return { needsConfirmation: !data.session }
}

export async function signOut() {
  await getSupabase().auth.signOut()
}

export async function requestPasswordReset(email: string) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${env.siteUrl}/redefinir-senha`,
  })
  if (error) throw error
}

export async function updatePassword(password: string) {
  const { error } = await getSupabase().auth.updateUser({ password })
  if (error) throw error
}
