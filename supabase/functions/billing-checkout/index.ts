// Cria a sessão de checkout no gateway para a loja do usuário autenticado.
// Deploy: supabase functions deploy billing-checkout
import { createClient } from 'npm:@supabase/supabase-js@2'
import { BillingNotConfiguredError, corsHeaders, getAdapter, json } from '../_shared/billing.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const authorization = request.headers.get('authorization') ?? ''
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { authorization } },
    auth: { persistSession: false },
  })
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401)

  const body = (await request.json().catch(() => ({}))) as { store_id?: string }
  // RLS garante que só membros enxergam a loja
  const { data: store } = await supabase.from('stores').select('id, owner_id').eq('id', body.store_id ?? '').maybeSingle()
  if (!store || store.owner_id !== userData.user.id) return json({ error: 'forbidden' }, 403)

  try {
    const adapter = getAdapter()
    const site = Deno.env.get('SITE_URL') ?? ''
    const { url } = await adapter.createCheckout({
      storeId: store.id,
      userEmail: userData.user.email ?? '',
      successUrl: `${site}/app/assinatura?status=sucesso`,
      cancelUrl: `${site}/app/assinatura`,
    })
    return json({ url })
  } catch (error) {
    if (error instanceof BillingNotConfiguredError) return json({ error: 'billing_not_configured' }, 501)
    console.error('checkout falhou')
    return json({ error: 'checkout_failed' }, 500)
  }
})
