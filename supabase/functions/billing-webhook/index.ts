// Recebe webhooks do gateway de pagamentos e aplica o estado da
// assinatura com a service_role (nunca exposta ao navegador).
// Deploy: supabase functions deploy billing-webhook --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2'
import { BillingNotConfiguredError, getAdapter, json } from '../_shared/billing.ts'

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let adapter
  try {
    adapter = getAdapter()
  } catch (error) {
    if (error instanceof BillingNotConfiguredError) return json({ error: 'billing_not_configured' }, 501)
    throw error
  }

  const rawBody = await request.text()
  let event
  try {
    event = await adapter.verifyAndParse(request, rawBody)
  } catch {
    // assinatura inválida: não registra o corpo para não vazar dados
    return json({ error: 'invalid_signature' }, 400)
  }
  if (!event) return json({ received: true, ignored: true })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  const { data, error } = await admin.rpc('apply_subscription_event', {
    p_provider: adapter.provider,
    p_provider_event_id: event.providerEventId,
    p_event_type: event.type,
    p_store_id: event.storeId,
    p_status: event.status,
    p_current_period_start: event.currentPeriodStart,
    p_current_period_end: event.currentPeriodEnd,
    p_provider_customer_id: event.providerCustomerId,
    p_provider_subscription_id: event.providerSubscriptionId,
    p_cancel_at_period_end: event.cancelAtPeriodEnd,
    p_payload: event.payload,
  })

  if (error) {
    console.error('apply_subscription_event falhou', { code: error.code, event: event.type })
    return json({ error: 'processing_failed' }, 500)
  }
  return json({ received: true, applied: data })
})
