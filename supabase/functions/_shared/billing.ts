/**
 * Camada de cobrança no servidor (Supabase Edge Functions / Deno).
 *
 * PENDENTE DE CONFIGURAÇÃO: nenhum gateway foi escolhido. Para integrar,
 * implemente um `BillingAdapter` usando a documentação OFICIAL do gateway
 * escolhido (verificação de assinatura do webhook, criação de checkout) e
 * registre-o em `getAdapter`. Não há métodos de SDK nem endpoints
 * inventados aqui. Veja docs/BILLING.md.
 */
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'pending'

export interface NormalizedBillingEvent {
  providerEventId: string
  type: string
  storeId: string
  status: SubscriptionStatus
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  providerCustomerId: string | null
  providerSubscriptionId: string | null
  cancelAtPeriodEnd: boolean | null
  /** payload mínimo para auditoria — sem dados de cartão */
  payload: Record<string, unknown>
}

export interface BillingAdapter {
  readonly provider: string
  /**
   * Deve validar a assinatura criptográfica do webhook com o segredo do
   * gateway e lançar erro se inválida. Retorna null para eventos ignorados.
   */
  verifyAndParse(request: Request, rawBody: string): Promise<NormalizedBillingEvent | null>
  /** Cria a sessão de checkout hospedada pelo gateway e devolve a URL. */
  createCheckout(input: { storeId: string; userEmail: string; successUrl: string; cancelUrl: string }): Promise<{ url: string }>
}

export class BillingNotConfiguredError extends Error {
  constructor() {
    super('BILLING_NOT_CONFIGURED')
  }
}

export function getAdapter(): BillingAdapter {
  const provider = Deno.env.get('BILLING_PROVIDER') ?? ''
  switch (provider) {
    // case 'nome-do-gateway': return new NomeDoGatewayAdapter(Deno.env.get('BILLING_API_KEY')!, Deno.env.get('BILLING_WEBHOOK_SECRET')!)
    default:
      throw new BillingNotConfiguredError()
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders },
  })
}

export const corsHeaders = {
  'access-control-allow-origin': Deno.env.get('SITE_URL') ?? '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
}
