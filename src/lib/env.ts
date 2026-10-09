/**
 * Variáveis públicas do frontend. Nada aqui é segredo: tudo que começa
 * com VITE_ vai para o JavaScript entregue ao navegador.
 */
function read(name: string): string {
  const value = (import.meta.env as Record<string, string | undefined>)[name]
  return typeof value === 'string' ? value.trim() : ''
}

export const env = {
  supabaseUrl: read('VITE_SUPABASE_URL'),
  supabaseKey: read('VITE_SUPABASE_PUBLISHABLE_KEY'),
  siteUrl: (read('VITE_SITE_URL') || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, ''),
  supportEmail: read('VITE_SUPPORT_EMAIL'),
  supportWhatsapp: read('VITE_SUPPORT_WHATSAPP'),
  billingProvider: read('VITE_BILLING_PROVIDER'),
}

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseKey)
