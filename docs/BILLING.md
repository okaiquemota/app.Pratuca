# Cobrança recorrente — como integrar o gateway

## Estado atual

- Estrutura pronta: `plans`, `subscriptions` (com estados), `billing_events` (idempotência), função `apply_subscription_event` (executável **somente** por `service_role`) e regras de acesso em `private.store_has_access`.
- Frontend: `src/features/billing/provider.ts`. Sem `VITE_BILLING_PROVIDER`, a página de assinatura informa que o pagamento online está em configuração — **nenhuma transação é simulada**.
- Edge Functions `billing-checkout` e `billing-webhook` respondem `501 billing_not_configured` até existir um adaptador.
- Enquanto isso, um administrador pode ativar uma loja manualmente pelo SQL Editor, chamando `apply_subscription_event` com um `provider_event_id` único (ex.: `manual-<data>-<loja>`).

## Passo a passo

1. **Escolha o gateway** (ex.: Stripe, Mercado Pago, Asaas, Pagar.me, Iugu) e crie, nele, o produto/plano de R$ 39,90/mês.
2. **Implemente um `BillingAdapter`** em `supabase/functions/_shared/` seguindo a documentação oficial do gateway:
   - `createCheckout`: cria a sessão de checkout/assinatura hospedada e devolve a URL. Envie o `store_id` como metadado/referência externa.
   - `verifyAndParse`: valida a **assinatura criptográfica** do webhook com o segredo do gateway (rejeite se inválida) e converte o evento em `NormalizedBillingEvent` (status, período, IDs).
3. Registre o adaptador em `getAdapter()` (`_shared/billing.ts`).
4. Configure os segredos (nunca no frontend):
   ```bash
   npx supabase secrets set BILLING_PROVIDER=<nome> BILLING_API_KEY=<...> BILLING_WEBHOOK_SECRET=<...> SITE_URL=https://app.pratuca.com.br
   ```
5. Faça o deploy:
   ```bash
   npx supabase functions deploy billing-checkout
   npx supabase functions deploy billing-webhook --no-verify-jwt
   ```
6. No painel do gateway, aponte o webhook para `https://<ref>.supabase.co/functions/v1/billing-webhook`.
7. No frontend, defina `VITE_BILLING_PROVIDER=<nome>` para exibir o botão "Assinar".
8. Teste no **modo sandbox** do gateway: pagamento aprovado → `active`; falha → `past_due`; cancelamento → `canceled`; reenvio do mesmo evento → ignorado.

## Mapeamento sugerido de estados

| Situação no gateway | `subscription_status` |
| --- | --- |
| Período de teste | `trialing` |
| Pagamento confirmado / assinatura em dia | `active` (+ `current_period_end`) |
| Cobrança falhou / em atraso | `past_due` |
| Cancelada | `canceled` (+ `cancel_at_period_end`) |
| Aguardando primeiro pagamento | `pending` |

Inadimplência nunca apaga dados: após 3 dias de carência, apenas novos pedidos públicos são pausados.
