import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { env, isSupabaseConfigured } from './env'

export type TypedSupabaseClient = SupabaseClient<Database>

let client: TypedSupabaseClient | null = null

/**
 * Cliente Supabase do navegador, criado com a chave PÚBLICA.
 * Toda a segurança depende de RLS e das funções do banco — nunca
 * da chave. A service_role jamais deve ser usada no frontend.
 */
export function getSupabase(): TypedSupabaseClient {
  if (!isSupabaseConfigured) {
    throw new SupabaseNotConfiguredError()
  }
  client ??= createClient<Database>(env.supabaseUrl, env.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
  })
  return client
}

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('SUPABASE_NOT_CONFIGURED')
    this.name = 'SupabaseNotConfiguredError'
  }
}

/** URL pública de uma imagem do bucket store-media. */
export function publicImageUrl(path: string | null | undefined): string | null {
  if (!path || !isSupabaseConfigured) return null
  return `${env.supabaseUrl}/storage/v1/object/public/store-media/${path.split('/').map(encodeURIComponent).join('/')}`
}
