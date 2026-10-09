import { env } from '@/lib/env'
import { getSupabase } from '@/lib/supabase'

/**
 * Integração de cobrança (gateway de pagamentos).
 *
 * Estado atual: PENDENTE DE CONFIGURAÇÃO. Nenhum gateway foi escolhido e
 * nenhuma credencial existe, então nenhuma cobrança é feita e nenhum
 * pagamento é simulado. A ativação de assinaturas acontece SOMENTE no
 * servidor, via webhook assinado → public.apply_subscription_event.
 *
 * Para integrar, veja docs/BILLING.md.
 */
export interface BillingGateway {
  readonly configured: boolean
  /** Retorna a URL do checkout hospedado pelo gateway. */
  startCheckout(storeId: string): Promise<{ url: string }>
}

class PendingBillingGateway implements BillingGateway {
  readonly configured = false
  async startCheckout(): Promise<{ url: string }> {
    throw new Error('BILLING_NOT_CONFIGURED')
  }
}

/** Chama a Edge Function billing-checkout, que conversa com o gateway no servidor. */
class EdgeFunctionBillingGateway implements BillingGateway {
  readonly configured = true
  async startCheckout(storeId: string): Promise<{ url: string }> {
    const { data, error } = await getSupabase().functions.invoke<{ url?: string }>('billing-checkout', {
      body: { store_id: storeId },
    })
    if (error || !data?.url) throw error ?? new Error('BILLING_NOT_CONFIGURED')
    const url = new URL(data.url)
    if (url.protocol !== 'https:') throw new Error('BILLING_NOT_CONFIGURED')
    return { url: url.toString() }
  }
}

export const billingGateway: BillingGateway = env.billingProvider ? new EdgeFunctionBillingGateway() : new PendingBillingGateway()
